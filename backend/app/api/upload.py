import os
import uuid
from typing import List
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Document
from ..worker import process_document_task

router = APIRouter()
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_documents(background_tasks: BackgroundTasks, files: List[UploadFile] = File(...), db: Session = Depends(get_db)):
    results = []
    
    for file in files:
        if not file.filename.endswith(".pdf"):
            results.append({"filename": file.filename, "status": "failed", "reason": "Only PDF files are supported."})
            continue
            
        doc_id = str(uuid.uuid4())
        file_path = os.path.join(UPLOAD_DIR, f"{doc_id}_{file.filename}")
        
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
            
        # Create DB record
        new_doc = Document(id=doc_id, name=file.filename)
        db.add(new_doc)
        db.commit()
        db.refresh(new_doc)
        
        # Queue processing task using BackgroundTasks instead of Celery
        # This will process in the same python process, avoiding Redis/Celery errors
        background_tasks.add_task(process_document_task, doc_id, file_path)
        
        results.append({
            "document_id": doc_id,
            "filename": file.filename,
            "status": "processing"
        })
        
    return {"message": "Files uploaded successfully and are processing", "results": results}
