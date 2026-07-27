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
        
        from .services.canonicalization import store_chunks_batch_in_pinecone
        from .services.extraction import extract_rules_batch
        from concurrent.futures import ThreadPoolExecutor
        
        # 1. Parallel Task A: Index raw document chunks into Pinecone for Normal Chunk RAG
        # 2. Parallel Task B: Extract structured rules from chunks
        with ThreadPoolExecutor(max_workers=2) as executor:
            chunk_indexing_future = executor.submit(store_chunks_batch_in_pinecone, chunks)
            
            valid_rules_count = 0
            BATCH_SIZE = 10
            
            for i in range(0, len(chunks), BATCH_SIZE):
                batch = chunks[i : i + BATCH_SIZE]
                batch_results = extract_rules_batch(batch)
                
                for res in batch_results:
                    chunk_idx = res.get("chunk_index")
                    if chunk_idx is not None and 0 <= chunk_idx < len(batch):
                        c = batch[chunk_idx]
                    else:
                        c = batch[0] if batch else {}
                        
                    if not res.get("is_candidate", True):
                        continue
                        
                    extracted = {
                        "key_finding": res.get("key_finding", c.get("content", "")[:200]),
                        "context": res.get("condition") or c.get("content", ""),
                        "actor": res.get("actor", "N/A"),
                        "action": res.get("action", "N/A"),
                        "type": res.get("type", "GUIDELINE"),
                        "confidence": res.get("confidence", 85)
                    }
                    
                    canonicalize_and_store_rule(
                        document_id=document_id,
                        page=c.get("page"),
                        section=c.get("section"),
                        rule_data=extracted,
                        db_session=db,
                        bbox=c.get("bbox"),
                        page_dim=c.get("page_dim")
                    )
                    valid_rules_count += 1
                    
            chunk_indexing_future.result() # ensure chunk indexing completed
        
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
