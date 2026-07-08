import pymupdf4llm
import sys

try:
    chunks = pymupdf4llm.to_markdown(doc="../2312.10997v5.pdf", page_chunks=True)
    if chunks:
        print("Keys:", chunks[0].keys())
        if 'metadata' in chunks[0]:
            print("Metadata:", chunks[0]['metadata'])
except Exception as e:
    print("Error:", e)
