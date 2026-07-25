import os
import time
from app.worker import process_document_task
from app.database import SessionLocal, engine
from app.models import Document, Base

# Create tables
Base.metadata.create_all(bind=engine)

db = SessionLocal()
doc_id = "test-doc-batch-001"
file_path = "../2312.10997v5.pdf"

# Clean up existing test doc
db.query(Document).filter(Document.id == doc_id).delete()
db.commit()

# Create test document
doc = Document(id=doc_id, name="Test Batch Doc")
db.add(doc)
db.commit()
db.close()

print(f"Starting batch document processing for {doc_id}...")
start_time = time.time()
res = process_document_task(doc_id, file_path)
elapsed = time.time() - start_time

print(f"Processing Completed in {elapsed:.2f} seconds!")
print(f"Result: {res}")
