# 🚀 AI Policy Rule Engine

![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white) ![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi) ![Celery](https://img.shields.io/badge/Celery-37814A?style=for-the-badge&logo=celery&logoColor=white) ![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?style=for-the-badge&logo=redis&logoColor=white) ![Pinecone](https://img.shields.io/badge/Pinecone-000000?style=for-the-badge&logo=pinecone&logoColor=white) ![Next JS](https://img.shields.io/badge/Next-black?style=for-the-badge&logo=next.js&logoColor=white)

An AI-powered platform that automatically reads complex documents (like compliance manuals or contracts) and extracts structured business rules. It turns messy, unstructured paragraphs into clean, searchable data.

## ✨ Why this project stands out (Engineering Highlights)
- **Scalable Background Processing**: Built with **Celery & Redis** to handle heavy AI workloads in the background, ensuring the main API never slows down or freezes.
- **Advanced AI Pipeline**: Instead of a basic "zero-shot" prompt, it uses a multi-step LLM process to guarantee high accuracy and zero hallucinations.
- **Lightning Fast RAG Search**: Integrated **Pinecone Vector DB** and local embeddings to enable instant semantic search across thousands of extracted rules.
- **Modern Full-Stack**: Engineered end-to-end with a responsive **Next.js** frontend, a **FastAPI** backend, and a strict **SQL** database schema.

## 🧠 How the AI Pipeline Works
The engine doesn't just guess; it follows a strict, step-by-step flow:
1. **Ingest**: Parses PDFs to retain document layout and context.
2. **Detect**: Uses NLP to identify which blocks of text actually contain rules.
3. **Classify**: Categorizes the text (e.g., *Rule*, *Guideline*, *Obligation*).
4. **Extract**: Structurally maps the text into rigid JSON (`Actor`, `Action`, `Condition`).
5. **Validate**: Self-evaluates the extracted data and rejects anything under 85% confidence.

## 🛠️ Tech Stack
- **Frontend**: Next.js (React 19), Tailwind CSS v4, shadcn/ui
- **Backend**: FastAPI (Python), Pydantic, SQLAlchemy, PostgreSQL/SQLite
- **AI & Infrastructure**: Google GenAI, Pinecone, Sentence-Transformers, Celery, Redis

## 🚀 Quick Start

**1. Start Backend & Background Worker**
```bash
cd backend
pip install -r requirements.txt

# Start the API (Terminal 1)
uvicorn app.main:app --reload

# Start the AI Worker (Terminal 2)
celery -A app.worker.celery_app worker --loglevel=info
```

**2. Start Frontend UI**
```bash
cd frontend
npm install
npm run dev
```