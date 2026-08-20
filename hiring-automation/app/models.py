"""Pydantic response schemas shared across the API."""
from typing import List, Optional

from pydantic import BaseModel, Field


class ExtractionWarning(BaseModel):
    code: str
    message: str


class ExtractionMeta(BaseModel):
    source_filename: str
    file_type: str
    extraction_method: str
    char_count: int
    has_tables: bool
    has_images: bool
    likely_bad_extraction: bool
    warnings: List[ExtractionWarning] = Field(default_factory=list)


class MatchedSkill(BaseModel):
    skill: str
    category: str
    matched_text: str
    match_type: str  # "exact" | "alias" | "fuzzy"


class EducationEntry(BaseModel):
    degree: Optional[str] = None
    field: Optional[str] = None
    institution: Optional[str] = None
    raw_line: str


class ResumeInfo(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_urls: List[str] = Field(default_factory=list)
    years_of_experience: Optional[float] = None
    years_of_experience_source: Optional[str] = None
    education: List[EducationEntry] = Field(default_factory=list)
    skills: List[MatchedSkill] = Field(default_factory=list)
    section_headers_found: List[str] = Field(default_factory=list)


class ExtractResponse(BaseModel):
    meta: ExtractionMeta
    info: ResumeInfo
    raw_text_preview: str


class JobDescriptionInfo(BaseModel):
    required_skills: List[MatchedSkill] = Field(default_factory=list)
    preferred_skills: List[MatchedSkill] = Field(default_factory=list)
    had_explicit_sections: bool


class SkillMatchBreakdown(BaseModel):
    score: float
    matched_required: List[str]
    missing_required: List[str]
    matched_preferred: List[str]
    missing_preferred: List[str]
    total_required: int
    total_preferred: int


class SemanticBreakdown(BaseModel):
    score: float
    model: str


class FormattingBreakdown(BaseModel):
    score: float
    starting_score: int = 100
    deductions: List[str] = Field(default_factory=list)


class ScoreBreakdown(BaseModel):
    final_score: float
    weights: dict
    keyword_match: SkillMatchBreakdown
    semantic_similarity: SemanticBreakdown
    formatting: FormattingBreakdown


class ScoreResponse(BaseModel):
    meta: ExtractionMeta
    resume_info: ResumeInfo
    job_description: JobDescriptionInfo
    score: ScoreBreakdown


class CandidateError(BaseModel):
    code: str
    message: str


class CandidateResult(BaseModel):
    filename: str
    rank: Optional[int] = None
    error: Optional[CandidateError] = None
    meta: Optional[ExtractionMeta] = None
    resume_info: Optional[ResumeInfo] = None
    score: Optional[ScoreBreakdown] = None


class BatchTiming(BaseModel):
    total_wall_seconds: float
    extraction_seconds: float
    semantic_batch_seconds: float
    file_count: int
    succeeded_count: int
    failed_count: int


class BatchScoreResponse(BaseModel):
    job_description: JobDescriptionInfo
    candidates: List[CandidateResult] = Field(default_factory=list)
    timing: BatchTiming
