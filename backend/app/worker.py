import os
from celery import Celery
from .config import settings

celery_app = Celery(
    "policy_worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_always_eager=False,
)

@celery_app.task(name="process_document")
def process_document_task(document_id: str, file_path: str):
    # This will be implemented in the pipeline phase
    # For now, it will just call the parsing and chunking services
    from .services.parsing import parse_pdf
    from .services.chunking import chunk_document
    from .services.detection import detect_candidate
    from .services.classification import classify_rule
    from .services.extraction import extract_rule
    from .services.validation import validate_rule
    from .services.canonicalization import canonicalize_and_store_rule
    from .database import SessionLocal
    from .models import Chunk, Document
    
    print(f"Processing document {document_id} from {file_path}")
    db = SessionLocal()
    try:
        # Update status to processing
        doc = db.query(Document).filter(Document.id == document_id).first()
        if doc:
            meta = dict(doc.metadata_ or {})
            meta["status"] = "processing"
            doc.metadata_ = meta
            db.commit()
        md_content = parse_pdf(file_path)
        chunks = chunk_document(document_id, md_content)
        print(f"Generated {len(chunks)} chunks for {document_id}")
        
        # Save chunks to DB
        db_chunks = []
        for c in chunks:
            db_chunks.append(
                Chunk(
                    id=c["chunk_id"],
                    document_id=c["document_id"],
                    page=c["page"],
                    section=c["section"],
                    content=c["content"]
                )
            )
        db.add_all(db_chunks)
        db.commit()
        
        valid_rules_count = 0
        
        # Pre-warm models in the main thread to avoid race conditions
        try:
            from .services.detection import get_embedding_model, get_curated_embeddings
            get_embedding_model()
            get_curated_embeddings()
            from .services.classification import get_classifier
            get_classifier()
        except Exception as e:
            print(f"Error pre-warming models: {e}")
            
        import concurrent.futures

        def process_chunk(c):
            text = c["content"]
            
            # 1. Candidate Detection
            detection = detect_candidate(text)
            if not detection["is_candidate"]:
                return None
                
            # 2. Rule Classification
            classification = classify_rule(text)
            if not classification["is_valid_rule"]:
                return None
                
            # 3. Rule Extraction
            try:
                extracted = extract_rule(text, classification["type"])
                if not extracted.get("is_business_rule", True):
                    print("Skipping non-business rule (boilerplate/copyright)")
                    return None
            except Exception as e:
                print(f"Extraction failed: {str(e)}")
                if '429' in str(e) or 'quota' in str(e).lower():
                    print("Hit rate limit, using mock extraction for POC!")
                    extracted = {
                        "key_finding": text.strip()[:200] + ("..." if len(text) > 200 else ""),
                        "context": text,
                        "type": classification.get("type", "GUIDELINE"),
                        "confidence": 85
                    }
                else:
                    return None
                    
            return {
                "chunk": c,
                "rule_data": extracted
            }

        # Dynamically scale workers for large PDFs
        optimal_workers = min(30, max(15, len(chunks) // 5))
        with concurrent.futures.ThreadPoolExecutor(max_workers=optimal_workers) as executor:
            futures = [executor.submit(process_chunk, c) for c in chunks]
            
            for future in concurrent.futures.as_completed(futures):
                try:
                    result = future.result()
                    if result:
                        c = result["chunk"]
                        rule_data = result["rule_data"]
                        
                        # 5. Canonicalization & Storage (Main thread for DB safety)
                        canonicalize_and_store_rule(
                            document_id=document_id,
                            page=c.get("page"),
                            section=c.get("section"),
                            rule_data=rule_data,
                            db_session=db,
                            bbox=c.get("bbox"),
                            page_dim=c.get("page_dim")
                        )
                        valid_rules_count += 1
                except Exception as e:
                    print(f"Chunk processing error: {e}")
        
        print(f"Processed {valid_rules_count} valid rules for document {document_id}")
        
        # Mark as completed
        if doc:
            meta = dict(doc.metadata_ or {})
            meta["status"] = "completed"
            doc.metadata_ = meta
            db.commit()
            
        return {"status": "success", "chunks_count": len(chunks), "rules_extracted": valid_rules_count}
    except Exception as e:
        print(f"Error processing document {document_id}: {str(e)}")
        db.rollback()
        
        # Mark as error
        doc = db.query(Document).filter(Document.id == document_id).first()
        if doc:
            meta = dict(doc.metadata_ or {})
            meta["status"] = "failed"
            doc.metadata_ = meta
            db.commit()
            
        return {"status": "error", "message": str(e)}
    finally:
        db.close()
