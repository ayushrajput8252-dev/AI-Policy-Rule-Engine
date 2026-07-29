import os
import uuid
from typing import List
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Document
from ..worker import process_document_task, process_url_task

router = APIRouter()
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".mp3", ".wav", ".m4a", ".ogg", ".flac", ".aac", ".webm", ".wma"}


class UrlUploadRequest(BaseModel):
    url: str

@router.post("/upload")
async def upload_documents(background_tasks: BackgroundTasks, files: List[UploadFile] = File(...), db: Session = Depends(get_db)):
    results = []
    
    for file in files:
        ext = os.path.splitext(file.filename)[1].lower() if file.filename else ""
        if ext not in ALLOWED_EXTENSIONS:
            results.append({"filename": file.filename, "status": "failed", "reason": f"Unsupported file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"})
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


@router.post("/upload-url")
async def upload_url(payload: UrlUploadRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    url = payload.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")
    if not (url.startswith("http://") or url.startswith("https://")):
        url = f"https://{url}"

    doc_id = str(uuid.uuid4())
    new_doc = Document(
        id=doc_id,
        name=url,
        metadata_={"status": "processing", "source": "url", "source_url": url}
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    background_tasks.add_task(process_url_task, doc_id, url)

    return {
        "message": "URL queued for crawling and indexing",
        "document_id": doc_id,
        "url": url,
        "status": "processing"
    }
