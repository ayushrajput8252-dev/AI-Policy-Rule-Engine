import os
import sys
import uuid
import asyncio
from dotenv import load_dotenv

# Load env before importing app modules
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

from app.worker import process_document_task

def run_test():
    file_path = r"C:\Users\AYUSH SINGH\Downloads\ai_engine\AI-Policy-Rule-Engine\Selection_Confirmation_Letter_OpenEyes - Ayush Singh.pdf"
    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}")
        sys.exit(1)
        
    doc_id = str(uuid.uuid4())
    print(f"Starting process_document_task for {file_path} with ID {doc_id}")
    
    # Call the task synchronously
    result = process_document_task(doc_id, file_path)
    
    print("\n--- Final Result ---")
    print(result)

if __name__ == "__main__":
    run_test()
