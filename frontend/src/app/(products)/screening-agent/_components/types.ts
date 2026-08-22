export interface TranscriptTurn {
  id: string;
  role: "interviewer" | "candidate";
  text: string;
}

export type InterviewPhase =
  | "setup"
  | "starting"
  | "speaking"
  | "listening"
  | "recording"
  | "transcribing"
  | "thinking"
  | "evaluating"
  | "complete"
  | "error";

export type Recommendation = "Strong Hire" | "Hire" | "Lean Hire" | "No Hire" | "Review Needed";

export interface EvaluationResult {
  communication_score: number | null;
  relevance_score: number | null;
  confidence_score: number | null;
  overall_score: number | null;
  recommendation: Recommendation | string;
  summary: string;
  strengths: string[];
  areas_for_improvement: string[];
  matched_skills: string[];
  missing_skills: string[];
  key_takeaway: string;
  suggested_next_step: string;
  // Client-observed facts folded into the same report object rather than a
  // second round trip — timing/proctoring are known the moment the
  // interview ends, no LLM call needed for them.
  time_taken_sec: number | null;
  question_count: number | null;
  proctor_flags_count: number | null;
  integrity_score: number | null;
  report_id?: string;
  created_at?: string | null;
  candidate_name?: string | null;
  role_title?: string | null;
}

export type QuestionCategory = "greeting" | "resume" | "jd_role";

export interface ScreeningQuestionOut {
  id: string;
  category: QuestionCategory;
  text: string;
}

export interface ResumeProfileOut {
  candidate_name: string | null;
  skills: string[];
  past_roles: string[];
  projects: string[];
  tech_stack: string[];
  resume_highlight: string;
}

export interface ScreeningStartResponse {
  resume_profile: ResumeProfileOut;
  questions: ScreeningQuestionOut[];
}
