import os
import sys
import uuid
from dotenv import load_dotenv

# Load env before importing app modules
load_dotenv(".env")
sys.path.insert(0, 'backend')

from app.main import app  # This initializes the DB
from app.worker import process_document_task

def run_test():
    file_path = "2312.10997v5.pdf"
        
    doc_id = str(uuid.uuid4())
    print(f"Starting process_document_task for {file_path} with ID {doc_id}")
    
    # Call the task synchronously
    result = process_document_task(doc_id, file_path)
    
    print("\n--- Final Result ---")
    print(result)

if __name__ == "__main__":
    run_test()
