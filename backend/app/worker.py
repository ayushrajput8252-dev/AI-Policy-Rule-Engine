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
        import time
        # Limit to 10 chunks for POC to finish processing quickly and sleep 5s to avoid Gemini API free-tier limits
        for c in chunks[:10]:
            time.sleep(5)
            text = c["content"]
            
            # 1. Candidate Detection
            detection = detect_candidate(text)
            if not detection["is_candidate"]:
                continue
                
            # 2. Rule Classification
            classification = classify_rule(text)
            if not classification["is_valid_rule"]:
                continue
                
            # 3. Rule Extraction
            try:
                extracted = extract_rule(text, classification["type"])
            except Exception as e:
                print(f"Extraction failed: {str(e)}")
                # If we hit rate limits, break early so we can at least save the rules we've extracted so far
                if '429' in str(e):
                    print("Hit rate limit, stopping extraction for this document.")
                    break
                continue
                
            # 4. Rule Validation (Disabled to save Gemini Quota)
            # 5. Canonicalization & Storage
            canonicalize_and_store_rule(
                document_id=document_id,
                page=c["page"],
                section=c["section"],
                rule_data=extracted,
                db_session=db
            )
            valid_rules_count += 1
        
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
