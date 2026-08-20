"""Builds the ExtractionMeta response model from an ExtractionResult.
Shared by the single-file endpoints (main.py) and the batch pipeline
(scoring/pipeline.py) so both report identical extraction metadata."""
from app.extraction.file_ingestion import ExtractionResult
from app.models import ExtractionMeta, ExtractionWarning


def build_extraction_meta(filename: str, extraction: ExtractionResult) -> ExtractionMeta:
    return ExtractionMeta(
        source_filename=filename,
        file_type=extraction.file_type,
        extraction_method=extraction.extraction_method,
        char_count=extraction.char_count,
        has_tables=extraction.has_tables,
        has_images=extraction.has_images,
        likely_bad_extraction=extraction.likely_bad_extraction,
        warnings=[
            ExtractionWarning(code=w.split(":")[0], message=w) for w in extraction.warnings
        ],
    )
