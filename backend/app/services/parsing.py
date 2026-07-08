import fitz

def parse_pdf(file_path: str) -> list[dict]:
    """
    Parses a PDF file and returns a list of text blocks with their bounding boxes.
    """
    try:
        doc = fitz.open(file_path)
        blocks_data = []
        for page_num in range(len(doc)):
            page = doc[page_num]
            page_w = page.rect.width
            page_h = page.rect.height
            blocks = page.get_text("blocks")
            for b in blocks:
                # b is (x0, y0, x1, y1, text, block_no, block_type)
                x0, y0, x1, y1, text, block_no, block_type = b
                if block_type != 0:
                    continue # skip images
                text = text.strip()
                if not text:
                    continue
                blocks_data.append({
                    "page": page_num + 1,
                    "text": text,
                    "bbox": [x0, y0, x1 - x0, y1 - y0],
                    "page_dim": [page_w, page_h]
                })
        return blocks_data
    except Exception as e:
        raise Exception(f"Failed to parse PDF {file_path}: {str(e)}")
