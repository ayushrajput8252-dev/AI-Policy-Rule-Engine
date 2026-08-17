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

export interface EvaluationResult {
  communication_score: number | null;
  relevance_score: number | null;
  confidence_score: number | null;
  summary: string;
  strengths: string;
  areas_for_improvement: string;
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
