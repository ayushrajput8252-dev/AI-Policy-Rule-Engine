FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PORT=8000
EXPOSE 8000

# Shell form so $PORT expands at container start.
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
