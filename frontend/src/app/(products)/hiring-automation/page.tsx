"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Zap, Upload, FileText, ScanSearch, Mail, Target, ClipboardList,
  Award, ShieldCheck, UserPlus, BookOpen, CheckCircle2, Loader2, X, Search,
  ArrowUpDown, ChevronLeft, ChevronRight, Sparkles, Send, RotateCcw, Users,
  KeyRound, Laptop2, Building2, ScrollText, Video, CalendarClock, ClipboardCheck,
  Plug, Radio, Filter, GitBranch, PartyPopper, Bot, MailCheck, Star, ArrowUpRight,
  AlertTriangle,
} from "lucide-react";
import { writeSyncedHires, clearSyncedHires } from "@/lib/hiringSync";

/* ═══════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════
   Bulk Upload → Resume Parser → ATS + Email Extraction → Requirement Matching
   → Assignment Generator all call the real backend (/api/v1/hiring/*): actual
   PDF text extraction (PyMuPDF) plus LLM-based structured extraction/scoring
   (Groq-primary, Gemini-fallback — see backend/app/services/hiring_service.py).
   Bulk-send (MCP email), Onboarding, and Knowledge Transfer stay simulated —
   there's no SMTP/MCP/Okta/Slack integration wired into this project — but they
   run on the real parsed candidates, which then hand off via sessionStorage to
   the existing Onboarding / Knowledge Transfer pages. */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const AVATAR_PALETTE = [
  { bg: "bg-blue-50 border-blue-200", text: "text-blue-600" },
  { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-600" },
  { bg: "bg-violet-50 border-violet-200", text: "text-violet-600" },
  { bg: "bg-amber-50 border-amber-200", text: "text-amber-600" },
  { bg: "bg-rose-50 border-rose-200", text: "text-rose-600" },
  { bg: "bg-cyan-50 border-cyan-200", text: "text-cyan-600" },
];

interface Candidate {
  id: string;
  filename: string;
  name: string;
  email: string | null;
  phone: string | null;
  experience: string;
  skills: string[];
  summary: string;
  ats: number;
  status: string;
  matchScore: number | null;
  matchedSkills: string[];
  missingSkills: string[];
  recommendation: "Strong Hire" | "Hire" | "Consider" | "Not a Fit" | null;
  emailStatus: string;
  mcpStatus: string;
  avatarBg: string;
  avatarText: string;
}

function candidateFromParsed(raw: Record<string, unknown>, index: number): Candidate {
  const palette = AVATAR_PALETTE[index % AVATAR_PALETTE.length];
  return {
    id: (raw.id as string) || `candidate-${index}`,
    filename: (raw.filename as string) || `resume-${index + 1}.pdf`,
    name: (raw.name as string) || (raw.filename as string) || `Candidate ${index + 1}`,
    email: (raw.email as string) || null,
    phone: (raw.phone as string) || null,
    experience: (raw.experience as string) || "Not specified",
    skills: Array.isArray(raw.skills) ? (raw.skills as string[]) : [],
    summary: (raw.summary as string) || "",
    ats: typeof raw.ats_score === "number" ? raw.ats_score : 0,
    status: "Shortlisted",
    matchScore: null,
    matchedSkills: [],
    missingSkills: [],
    recommendation: null,
    emailStatus: "Pending",
    mcpStatus: "Pending",
    avatarBg: palette.bg,
    avatarText: palette.text,
  };
}

const PIPELINE_NODES = [
  { key: "upload", title: "Bulk PDF Upload", desc: "Ingests resumes from HR bulk upload", icon: Upload },
  { key: "parser", title: "Resume Parser", desc: "Extracts structured text & entities", icon: ScanSearch },
  { key: "ats", title: "ATS + Email Extraction", desc: "Scores resumes, extracts contact info", icon: Mail },
  { key: "matching", title: "Requirement Matching", desc: "Matches skills to role requirements", icon: Target },
  { key: "assignment", title: "Assignment Generator", desc: "Drafts a personalized take-home task", icon: ClipboardList },
  { key: "evaluation", title: "Candidate Evaluation", desc: "Scores submissions & ranks candidates", icon: Award },
  { key: "review", title: "HR & Hiring Manager Review", desc: "Human approval gate before onboarding", icon: ShieldCheck },
  { key: "onboarding", title: "Onboarding Agent", desc: "Provisions accounts & equipment", icon: UserPlus },
  { key: "knowledge", title: "Knowledge Transfer Agent", desc: "Assigns docs, videos & training", icon: BookOpen },
] as const;

const ONBOARDING_STEPS = [
  { label: "Create Employee", icon: UserPlus },
  { label: "Generate Credentials", icon: KeyRound },
  { label: "Assign Equipment", icon: Laptop2 },
  { label: "Create Workspace", icon: Building2 },
  { label: "Welcome Email", icon: Mail },
];

const KT_STEPS = [
  { label: "Assign Documents", icon: FileText },
  { label: "Assign Videos", icon: Video },
  { label: "Assign Policies", icon: ScrollText },
  { label: "Schedule Sessions", icon: CalendarClock },
  { label: "Track Completion", icon: ClipboardCheck },
];

const GEN_STEPS = ["Thinking...", "Creating task...", "Personalizing assignment...", "Ready"];
const MCP_STEPS = ["Connecting...", "Personalizing Email...", "Sending...", "Completed"];

const REQUIREMENT_PLACEHOLDER = `Create a backend assignment using FastAPI.

Include:
• Authentication
• CRUD APIs
• Docker
• Unit Tests

Expected completion:
48 Hours`;

type Stage =
  | "idle" | "parsing" | "spreadsheet" | "generating" | "assignment"
  | "sending" | "evaluation" | "onboarding" | "knowledge" | "done";
type NodeStatus = "pending" | "active" | "done";

interface GeneratedAssignment {
  title: string;
  duration: string;
  requirements: string[];
  submission: string;
}

const DEFAULT_ASSIGNMENT: GeneratedAssignment = {
  title: "Backend Engineer Assessment",
  duration: "48 Hours",
  requirements: ["FastAPI", "JWT Authentication", "Docker", "PostgreSQL", "Unit Tests"],
  submission: "GitHub Repository",
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/* Runs a real API call alongside a minimum visible delay, so fast responses
   still read as a deliberate pipeline stage instead of a jarring instant
   flash — but a slow backend call is never cut short to fit the animation. */
async function withMinDelay<T>(promise: Promise<T>, ms: number): Promise<T> {
  const [result] = await Promise.all([promise, sleep(ms)]);
  return result;
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════ */

export default function HiringAutomationPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [stage, setStage] = useState<Stage>("idle");
  const [completedNodes, setCompletedNodes] = useState<number[]>([]);
  const [activeNode, setActiveNode] = useState<number | null>(null);
  const [parsingLog, setParsingLog] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [requirement, setRequirement] = useState("");
  const [genStep, setGenStep] = useState(0);
  const [assignment, setAssignment] = useState<GeneratedAssignment>(DEFAULT_ASSIGNMENT);
  const [mcpStep, setMcpStep] = useState(0);
  const [approvals, setApprovals] = useState<Record<string, boolean>>({});
  const [onboardProgress, setOnboardProgress] = useState(0);
  const [ktProgress, setKtProgress] = useState(0);
  const runId = useRef(0);

  // Invalidates any in-flight animation chain (runNode/sleep timers) on unmount — otherwise
  // a pending setTimeout from a chain still running when the user navigates away (e.g. via
  // the "Open Onboarding Agent" link mid-animation) would call setState after unmount.
  useEffect(() => () => { runId.current += 1; }, []);

  const nodeStatus = (idx: number): NodeStatus =>
    completedNodes.includes(idx) ? "done" : activeNode === idx ? "active" : "pending";

  const runNode = (idx: number, ms: number) =>
    new Promise<void>((resolve) => {
      setActiveNode(idx);
      setTimeout(() => {
        setCompletedNodes((prev) => (prev.includes(idx) ? prev : [...prev, idx]));
        setActiveNode(null);
        resolve();
      }, ms);
    });

  const handleAddFiles = (list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list).filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    setFiles((prev) => [...prev, ...incoming]);
  };
  const handleRemoveFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const handleProcess = async () => {
    if (files.length === 0 || stage !== "idle") return;
    const myRun = ++runId.current;
    setApiError(null);
    setStage("parsing");
    setParsingLog(`Uploading ${files.length} resume${files.length === 1 ? "" : "s"} to the parsing engine…`);
    await runNode(0, 500);
    if (myRun !== runId.current) return;

    setParsingLog("Resume Parser extracting text, sections & entities (PyMuPDF + LLM)…");
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));

    let parsed: Record<string, unknown>[];
    try {
      const res = await withMinDelay(
        fetch(`${API_URL}/api/v1/hiring/parse-resumes`, { method: "POST", body: formData }),
        1200
      );
      if (myRun !== runId.current) return;
      if (!res.ok) throw new Error(`Resume parsing failed (${res.status})`);
      const data = await res.json();
      parsed = data.candidates || [];
    } catch (err) {
      if (myRun !== runId.current) return;
      setApiError(err instanceof Error ? err.message : "Could not reach the resume parsing backend.");
      setStage("idle");
      return;
    }
    if (myRun !== runId.current) return;
    await runNode(1, 300);
    if (myRun !== runId.current) return;

    const failed = parsed.filter((p) => p.status === "failed");
    const ok = parsed.filter((p) => p.status !== "failed").map((p, i) => candidateFromParsed(p, i));
    if (ok.length === 0) {
      setApiError(failed[0]?.reason as string || "No resumes could be parsed.");
      setStage("idle");
      return;
    }

    setParsingLog(`ATS engine scored ${ok.length} resume${ok.length === 1 ? "" : "s"} & extracted contact info.`);
    setCandidates(ok);
    await runNode(2, 500);
    if (myRun !== runId.current) return;
    setStage("spreadsheet");
  };

  const handleGenerateAssignment = async () => {
    if (stage !== "spreadsheet" || !requirement.trim() || candidates.length === 0) return;
    const myRun = runId.current;
    setApiError(null);
    setStage("generating");

    try {
      const matchRes = await withMinDelay(
        fetch(`${API_URL}/api/v1/hiring/match`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            candidates: candidates.map((c) => ({
              id: c.id, name: c.name, experience: c.experience, skills: c.skills, summary: c.summary, ats_score: c.ats,
            })),
            requirement,
            role_title: "the open role",
          }),
        }),
        1100
      );
      if (myRun !== runId.current) return;
      if (!matchRes.ok) throw new Error(`Requirement matching failed (${matchRes.status})`);
      const matchData = await matchRes.json();
      const byId = new Map((matchData.results || []).map((r: Record<string, unknown>) => [r.id, r]));
      setCandidates((prev) => prev.map((c) => {
        const m = byId.get(c.id) as Record<string, unknown> | undefined;
        if (!m) return c;
        return {
          ...c,
          matchScore: typeof m.match_score === "number" ? m.match_score : c.matchScore,
          matchedSkills: Array.isArray(m.matched_skills) ? (m.matched_skills as string[]) : c.matchedSkills,
          missingSkills: Array.isArray(m.missing_skills) ? (m.missing_skills as string[]) : c.missingSkills,
          recommendation: (m.recommendation as Candidate["recommendation"]) || c.recommendation,
        };
      }));
    } catch (err) {
      if (myRun !== runId.current) return;
      setApiError(err instanceof Error ? err.message : "Could not reach the requirement matching backend.");
      setStage("spreadsheet");
      return;
    }
    if (myRun !== runId.current) return;
    await runNode(3, 400);
    if (myRun !== runId.current) return;

    for (let s = 0; s < GEN_STEPS.length - 1; s++) {
      setGenStep(s);
      await sleep(500);
      if (myRun !== runId.current) return;
    }

    try {
      const asgRes = await withMinDelay(
        fetch(`${API_URL}/api/v1/hiring/assignment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requirement, role_title: "the open role" }),
        }),
        600
      );
      if (myRun !== runId.current) return;
      if (!asgRes.ok) throw new Error(`Assignment generation failed (${asgRes.status})`);
      setAssignment(await asgRes.json());
    } catch (err) {
      if (myRun !== runId.current) return;
      setApiError(err instanceof Error ? err.message : "Could not reach the assignment generation backend.");
      setStage("spreadsheet");
      return;
    }
    setGenStep(GEN_STEPS.length - 1);
    if (myRun !== runId.current) return;
    await runNode(4, 500);
    if (myRun !== runId.current) return;
    setStage("assignment");
  };

  const handleBulkSend = async () => {
    if (stage !== "assignment") return;
    const myRun = runId.current;
    setStage("sending");
    for (let s = 0; s < MCP_STEPS.length; s++) {
      setMcpStep(s);
      await sleep(700);
      if (myRun !== runId.current) return;
    }
    setCandidates((prev) => prev.map((c) => ({ ...c, emailStatus: "Delivered", mcpStatus: "Reply Received" })));
    await runNode(5, 900);
    if (myRun !== runId.current) return;
    setStage("evaluation");
  };

  const handleConfirm = (id: string) => setApprovals((prev) => ({ ...prev, [id]: true }));

  useEffect(() => {
    if (stage !== "evaluation") return;
    if (candidates.length === 0 || !candidates.every((c) => approvals[c.id])) return;
    const myRun = runId.current;
    (async () => {
      await runNode(6, 900);
      if (myRun !== runId.current) return;
      writeSyncedHires(candidates.map((c) => ({
        id: c.id, name: c.name, email: c.email || "unknown@example.com", designation: "Backend Engineer",
        ats: c.ats, experience: c.experience, skills: c.skills,
      })));
      setStage("onboarding");
      for (let s = 0; s <= ONBOARDING_STEPS.length; s++) {
        setOnboardProgress(s);
        await sleep(550);
        if (myRun !== runId.current) return;
      }
      await runNode(7, 800);
      if (myRun !== runId.current) return;
      setStage("knowledge");
      for (let s = 0; s <= KT_STEPS.length; s++) {
        setKtProgress(s);
        await sleep(550);
        if (myRun !== runId.current) return;
      }
      await runNode(8, 800);
      if (myRun !== runId.current) return;
      setStage("done");
    })();
  }, [approvals, stage, candidates]);

  const handleReset = () => {
    runId.current += 1;
    clearSyncedHires();
    setFiles([]);
    setStage("idle");
    setCompletedNodes([]);
    setActiveNode(null);
    setParsingLog("");
    setCandidates([]);
    setApiError(null);
    setRequirement("");
    setGenStep(0);
    setAssignment(DEFAULT_ASSIGNMENT);
    setMcpStep(0);
    setApprovals({});
    setOnboardProgress(0);
    setKtProgress(0);
  };

  const stageIndex: Record<Stage, number> = {
    idle: 0, parsing: 1, spreadsheet: 2, generating: 3, assignment: 4,
    sending: 5, evaluation: 6, onboarding: 7, knowledge: 8, done: 9,
  };
  const reached = (s: Stage) => stageIndex[stage] >= stageIndex[s];

  return (
    <div className="min-h-screen bg-white text-zinc-900 bg-white-grid relative selection:bg-blue-500/20">
      {/* NAV */}
      <nav className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-zinc-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-bold text-zinc-900 hover:text-blue-600 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Platform</span>
          </Link>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span className="text-sm font-bold text-zinc-900">Agentic Hiring Pipeline</span>
          </div>
          <button
            onClick={handleReset}
            className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-700 hover:bg-zinc-200 transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Restart Demo</span>
          </button>
        </div>
      </nav>

      {/* CONDENSED STICKY PIPELINE — stays pinned under the nav while scrolling */}
      <PipelineStickyBar nodeStatus={nodeStatus} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-10 relative z-10">
        {/* HERO */}
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-200 bg-zinc-50 mb-4">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-mono font-bold text-zinc-600">9-AGENT PIPELINE READY</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 mb-2">End-to-End Agentic Hiring Workflow</h1>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Upload resumes and watch autonomous agents parse, match, assign, evaluate, and onboard — with a human approval gate before anything touches a real system.
          </p>
        </div>

        {/* PIPELINE VISUALIZATION */}
        <PipelineFlow nodeStatus={nodeStatus} />

        {/* UPLOAD */}
        <UploadPanel
          files={files}
          stage={stage}
          error={apiError}
          onAdd={handleAddFiles}
          onRemove={handleRemoveFile}
          onProcess={handleProcess}
        />

        {/* PARSING TICKER */}
        <AnimatePresence>
          {stage === "parsing" && <ParsingTicker log={parsingLog} />}
        </AnimatePresence>

        {/* CANDIDATE SPREADSHEET */}
        <AnimatePresence>
          {reached("spreadsheet") && candidates.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <CandidateSpreadsheet candidates={candidates} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* HUMAN IN THE LOOP */}
        <AnimatePresence>
          {reached("spreadsheet") && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <HumanInLoopPanel
                requirement={requirement}
                setRequirement={setRequirement}
                onGenerate={handleGenerateAssignment}
                locked={stage !== "spreadsheet"}
                candidateCount={candidates.length}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ASSIGNMENT GENERATION TICKER */}
        <AnimatePresence>
          {stage === "generating" && <AssignmentTicker step={genStep} />}
        </AnimatePresence>

        {/* ASSIGNMENT CARD */}
        <AnimatePresence>
          {reached("assignment") && (
            <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}>
              <AssignmentCard assignment={assignment} onBulkSend={handleBulkSend} locked={stage !== "assignment"} sent={reached("sending")} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* MCP EMAIL TOOL */}
        <AnimatePresence>
          {stage === "sending" && <McpSendPanel step={mcpStep} candidates={candidates} />}
        </AnimatePresence>

        {/* EVALUATION TABLE */}
        <AnimatePresence>
          {reached("evaluation") && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <EvaluationTable candidates={candidates} approvals={approvals} onConfirm={handleConfirm} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ONBOARDING AGENT */}
        <AnimatePresence>
          {reached("onboarding") && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <OnboardingPanel progress={onboardProgress} candidateCount={candidates.length} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* KNOWLEDGE TRANSFER AGENT */}
        <AnimatePresence>
          {reached("knowledge") && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <KnowledgeTransferPanel progress={ktProgress} candidateCount={candidates.length} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* COMPLETION */}
        <AnimatePresence>
          {stage === "done" && <CompletionBanner onReset={handleReset} candidates={candidates} />}
        </AnimatePresence>
      </main>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PIPELINE VISUALIZATION
   ═══════════════════════════════════════════════════════════ */

function PipelineFlow({ nodeStatus }: { nodeStatus: (idx: number) => NodeStatus }) {
  const doneCount = PIPELINE_NODES.filter((_, i) => nodeStatus(i) === "done").length;
  const activeIdx = PIPELINE_NODES.findIndex((_, i) => nodeStatus(i) === "active");
  const isRunning = activeIdx !== -1;

  return (
    <div className="rounded-2xl bg-white border border-zinc-200 p-4 sm:p-5 shadow-sm relative overflow-hidden">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="relative flex items-center justify-center w-6 h-6 rounded-lg bg-blue-50 border border-blue-200 text-blue-600">
            {isRunning && <span className="absolute inset-0 rounded-lg bg-blue-400/40 animate-ping" />}
            <Bot className="w-3.5 h-3.5 relative" />
          </span>
          <span className="text-xs font-bold text-zinc-900 uppercase tracking-wide">Live Agent Workflow</span>
        </div>
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-600 flex items-center gap-1.5">
          {isRunning && <Radio className="w-2.5 h-2.5 text-blue-600 animate-pulse" />}
          {doneCount}/{PIPELINE_NODES.length} STAGES COMPLETE
        </span>
      </div>

      <div className="h-1.5 bg-zinc-100 rounded-full relative overflow-hidden mb-4">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
          animate={{ width: `${(doneCount / PIPELINE_NODES.length) * 100}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
        {isRunning && (
          <div className="absolute top-0 bottom-0 w-12 bg-gradient-to-r from-transparent via-blue-300 to-transparent animate-track-packet" />
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch gap-1.5">
        {PIPELINE_NODES.map((node, i) => {
          const status = nodeStatus(i);
          const Icon = node.icon;
          return (
            <Fragment key={node.key}>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={
                  status === "active"
                    ? { opacity: 1, y: 0, scale: 1.03, boxShadow: ["0 0 0px rgba(37,99,235,0.0)", "0 0 22px rgba(37,99,235,0.45)", "0 0 0px rgba(37,99,235,0.0)"] }
                    : { opacity: 1, y: 0, scale: 1, boxShadow: "0 0 0px rgba(37,99,235,0)" }
                }
                transition={
                  status === "active"
                    ? { boxShadow: { duration: 1.6, repeat: Infinity, ease: "easeInOut" }, default: { duration: 0.3 } }
                    : { delay: i * 0.03, duration: 0.3 }
                }
                className={`relative w-full sm:w-[124px] shrink-0 rounded-xl border p-2.5 flex flex-col justify-between gap-1.5 min-h-[92px] overflow-hidden ${
                  status === "active"
                    ? "bg-blue-600 border-blue-600 text-white"
                    : status === "done"
                    ? "bg-emerald-50/70 border-emerald-300"
                    : "bg-white border-zinc-200"
                }`}
              >
                {status === "active" && (
                  <motion.div
                    className="absolute inset-x-0 h-6 bg-white/10 pointer-events-none"
                    initial={{ top: "-20%" }}
                    animate={{ top: "110%" }}
                    transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
                  />
                )}
                <div className="flex items-center justify-between relative">
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                      status === "active" ? "bg-white/20 text-white" : status === "done" ? "bg-emerald-100 text-emerald-700" : "bg-blue-50 text-blue-600"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  {status === "active" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {status === "done" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                </div>
                <div className="relative">
                  <div className={`text-[10.5px] font-bold leading-tight ${status === "active" ? "text-white" : "text-zinc-900"}`}>{node.title}</div>
                  <div className={`text-[9px] leading-tight mt-0.5 ${status === "active" ? "text-blue-100" : "text-zinc-500"}`}>{node.desc}</div>
                </div>
              </motion.div>
              {i < PIPELINE_NODES.length - 1 && (
                <div className="hidden sm:flex items-center justify-center w-3 shrink-0 relative overflow-hidden">
                  <div className={`h-px w-3 transition-colors duration-300 ${status === "done" ? "bg-emerald-400" : "bg-zinc-200"}`} />
                  {status === "active" && (
                    <motion.div
                      className="absolute w-1 h-1 rounded-full bg-blue-500"
                      initial={{ left: "-10%" }}
                      animate={{ left: "110%" }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    />
                  )}
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

function PipelineStickyBar({ nodeStatus }: { nodeStatus: (idx: number) => NodeStatus }) {
  const doneCount = PIPELINE_NODES.filter((_, i) => nodeStatus(i) === "done").length;
  const activeIdx = PIPELINE_NODES.findIndex((_, i) => nodeStatus(i) === "active");
  const isRunning = activeIdx !== -1;
  const pct = Math.round((doneCount / PIPELINE_NODES.length) * 100);

  return (
    <div className="sticky top-14 z-20 bg-white/90 backdrop-blur-md border-b border-zinc-200/70">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2 flex items-center gap-3">
        <div className="flex items-center gap-1.5 shrink-0">
          <Bot className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-[10px] font-bold text-zinc-700 uppercase tracking-wide hidden sm:inline">Live Agent Workflow</span>
        </div>
        <div className="flex-1 flex items-center gap-1 min-w-0 overflow-x-auto scrollbar-hide">
          {PIPELINE_NODES.map((node, i) => {
            const status = nodeStatus(i);
            return (
              <span
                key={node.key}
                title={node.title}
                className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
                  status === "done" ? "bg-emerald-500" : status === "active" ? "bg-blue-600 animate-pulse" : "bg-zinc-200"
                }`}
              />
            );
          })}
        </div>
        <span className="text-[10px] font-mono font-bold text-zinc-500 shrink-0 flex items-center gap-1">
          {isRunning && <Radio className="w-2.5 h-2.5 text-blue-600 animate-pulse" />}
          {isRunning ? PIPELINE_NODES[activeIdx].title : `${pct}%`}
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   UPLOAD PANEL
   ═══════════════════════════════════════════════════════════ */

function UploadPanel({
  files, stage, error, onAdd, onRemove, onProcess,
}: {
  files: File[]; stage: Stage; error: string | null;
  onAdd: (l: FileList | null) => void; onRemove: (i: number) => void; onProcess: () => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const locked = stage !== "idle";

  return (
    <div className="rounded-2xl bg-white border border-zinc-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Upload className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-zinc-900">Bulk PDF Upload</h3>
        </div>
        <span className="text-[10px] font-mono text-zinc-400">Sent to the backend for real PDF parsing & ATS scoring</span>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
        </div>
      )}

      <label
        onDragOver={(e) => { e.preventDefault(); if (!locked) setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!locked) onAdd(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center gap-2 px-6 py-10 rounded-2xl border-2 border-dashed text-center transition-colors ${
          locked
            ? "border-zinc-200 bg-zinc-50 text-zinc-400 cursor-not-allowed"
            : dragOver
            ? "border-blue-400 bg-blue-50/60 text-blue-700 cursor-pointer"
            : "border-zinc-300 bg-zinc-50/60 text-zinc-500 hover:border-blue-300 hover:bg-blue-50/30 cursor-pointer"
        }`}
      >
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${locked ? "bg-zinc-100" : "bg-blue-50 border border-blue-200"}`}>
          <Upload className={`w-5 h-5 ${locked ? "text-zinc-400" : "text-blue-600"}`} />
        </div>
        <div className="text-sm font-bold text-zinc-800">Drag & drop resume PDFs here</div>
        <div className="text-xs text-zinc-500">or click to browse · multiple files supported</div>
        <input type="file" accept=".pdf,application/pdf" multiple disabled={locked} className="hidden" onChange={(e) => onAdd(e.target.files)} />
      </label>

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {files.map((f, i) => (
            <span key={`${f.name}-${i}`} className="text-[11px] font-mono px-2.5 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-700 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span className="max-w-[160px] truncate">{f.name}</span>
              <span className="text-zinc-400">{(f.size / 1024).toFixed(0)} KB</span>
              {!locked && (
                <button onClick={() => onRemove(i)} className="hover:text-red-600 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-5 flex-wrap gap-3">
        <span className="text-[11px] font-mono text-zinc-400">
          {files.length === 0 ? "No files added yet" : `${files.length} file(s) queued`}
        </span>
        <button
          onClick={onProcess}
          disabled={files.length === 0 || stage !== "idle"}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {stage === "parsing" ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing…</>
          ) : stage !== "idle" ? (
            <><CheckCircle2 className="w-3.5 h-3.5" /> Processed</>
          ) : (
            <><Zap className="w-3.5 h-3.5" /> Process</>
          )}
        </button>
      </div>
    </div>
  );
}

function ParsingTicker({ log }: { log: string }) {
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
      <div className="rounded-xl bg-blue-50/70 border border-blue-200/90 text-blue-950 font-mono text-[12px] p-4 flex items-center gap-2.5">
        <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
        <AnimatePresence mode="wait">
          <motion.span key={log} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} className="font-semibold">
            {log}
          </motion.span>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CANDIDATE SPREADSHEET
   ═══════════════════════════════════════════════════════════ */

type SortKey = "name" | "ats" | "experience";

function SortIcon({ active }: { active: boolean }) {
  return <ArrowUpDown className={`w-3 h-3 ${active ? "text-blue-600" : "text-zinc-300"}`} />;
}

function CandidateSpreadsheet({ candidates }: { candidates: Candidate[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("ats");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const rows = candidates.map((c) => ({ ...c, resumeFile: c.filename }));
  const statuses = ["All", ...Array.from(new Set(rows.map((r) => r.status)))];

  const filtered = useMemo(() => rows.filter((r) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || r.name.toLowerCase().includes(q) || (r.email || "").toLowerCase().includes(q) || r.skills.some((s) => s.toLowerCase().includes(q));
    const matchesStatus = statusFilter === "All" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  }), [rows, search, statusFilter]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "ats") cmp = a.ats - b.ats;
      else cmp = a.experience.localeCompare(b.experience);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const toggleSelectAll = () => setSelected((sel) => (sel.length === paged.length ? [] : paged.map((r) => r.id)));
  const toggleSelect = (id: string) => setSelected((sel) => (sel.includes(id) ? sel.filter((s) => s !== id) : [...sel, id]));

  return (
    <div className="rounded-2xl bg-white border border-zinc-200 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2"><Users className="w-4 h-4 text-blue-600" />Candidate Spreadsheet</h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">Resume Parser + ATS output, ready for human review</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search candidates…"
              className="pl-8 pr-3 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs focus:outline-none focus:border-blue-400 w-40"
            />
          </div>
          <div className="relative">
            <Filter className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="pl-8 pr-6 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs appearance-none focus:outline-none focus:border-blue-400"
            >
              {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-zinc-50 text-zinc-500 border-b border-zinc-200">
              <th className="px-4 py-2.5 text-left w-8">
                <input type="checkbox" checked={paged.length > 0 && selected.length === paged.length} onChange={toggleSelectAll} className="rounded border-zinc-300" />
              </th>
              <th className="px-3 py-2.5 text-left font-bold cursor-pointer select-none" onClick={() => toggleSort("name")}>
                <span className="flex items-center gap-1">Candidate Name <SortIcon active={sortKey === "name"} /></span>
              </th>
              <th className="px-3 py-2.5 text-left font-bold">Email</th>
              <th className="px-3 py-2.5 text-left font-bold cursor-pointer select-none" onClick={() => toggleSort("ats")}>
                <span className="flex items-center gap-1">ATS Score <SortIcon active={sortKey === "ats"} /></span>
              </th>
              <th className="px-3 py-2.5 text-left font-bold">Resume Status</th>
              <th className="px-3 py-2.5 text-left font-bold cursor-pointer select-none" onClick={() => toggleSort("experience")}>
                <span className="flex items-center gap-1">Experience <SortIcon active={sortKey === "experience"} /></span>
              </th>
              <th className="px-3 py-2.5 text-left font-bold">Skills</th>
              <th className="px-3 py-2.5 text-left font-bold">Current Status</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((r, i) => (
              <tr key={r.id} className={`border-b border-zinc-100 hover:bg-blue-50/30 transition-colors ${i % 2 === 1 ? "bg-zinc-50/40" : ""}`}>
                <td className="px-4 py-3"><input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggleSelect(r.id)} className="rounded border-zinc-300" /></td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 ${r.avatarBg} ${r.avatarText}`}>{r.name[0]}</div>
                    <div>
                      <div className="font-bold text-zinc-900">{r.name}</div>
                      <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-1"><FileText className="w-2.5 h-2.5" />{r.resumeFile}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 font-mono text-zinc-600">{r.email || "—"}</td>
                <td className="px-3 py-3">
                  <span className={`font-mono font-bold px-2 py-0.5 rounded-full border ${r.ats >= 90 ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-blue-50 border-blue-200 text-blue-700"}`}>{r.ats}%</span>
                </td>
                <td className="px-3 py-3"><span className="text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />Parsed</span></td>
                <td className="px-3 py-3 text-zinc-700">{r.experience}</td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-1 max-w-[220px]">
                    {r.skills.map((s) => <span key={s} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-zinc-600">{s}</span>)}
                  </div>
                </td>
                <td className="px-3 py-3"><span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-3 flex items-center justify-between border-t border-zinc-100 text-[11px] text-zinc-500">
        <span>{selected.length > 0 ? `${selected.length} selected · ` : ""}Showing {paged.length} of {sorted.length} candidates</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1} className="p-1 rounded border border-zinc-200 disabled:opacity-40 hover:bg-zinc-50"><ChevronLeft className="w-3.5 h-3.5" /></button>
          <span className="font-mono">Page {currentPage} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="p-1 rounded border border-zinc-200 disabled:opacity-40 hover:bg-zinc-50"><ChevronRight className="w-3.5 h-3.5" /></button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   HUMAN IN THE LOOP + ASSIGNMENT GENERATION
   ═══════════════════════════════════════════════════════════ */

function HumanInLoopPanel({
  requirement, setRequirement, onGenerate, locked, candidateCount,
}: {
  requirement: string; setRequirement: (v: string) => void; onGenerate: () => void; locked: boolean; candidateCount: number;
}) {
  return (
    <div className="rounded-2xl bg-white border border-zinc-200 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck className="w-4 h-4 text-blue-600" />
        <h3 className="text-sm font-bold text-zinc-900">Human in the Loop</h3>
      </div>
      <p className="text-[11px] text-zinc-500 mb-4">Review the shortlisted candidates above and define the assignment requirements before the AI drafts and sends tasks.</p>
      <textarea
        value={requirement}
        onChange={(e) => setRequirement(e.target.value)}
        placeholder={REQUIREMENT_PLACEHOLDER}
        rows={8}
        disabled={locked}
        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-xs font-mono leading-relaxed focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 resize-none disabled:opacity-60"
      />
      <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
        <span className="text-[11px] text-zinc-400 font-mono">Applies to {candidateCount} shortlisted candidate{candidateCount === 1 ? "" : "s"}</span>
        <button
          onClick={onGenerate}
          disabled={locked || !requirement.trim()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-bold hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Generate Assignment
        </button>
      </div>
    </div>
  );
}

function AssignmentTicker({ step }: { step: number }) {
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0">
          <Bot className="w-4 h-4" />
        </div>
        <div className="flex-1 flex items-center gap-2">
          {GEN_STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <span className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-full border transition-all ${
                i < step ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : i === step ? "bg-white/10 border-white/30 text-white"
                  : "border-white/10 text-zinc-500"
              }`}>
                {i === step && i < GEN_STEPS.length - 1 && <Loader2 className="w-3 h-3 inline mr-1 animate-spin" />}
                {i < step && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                {label}
              </span>
              {i < GEN_STEPS.length - 1 && <span className="text-zinc-700">→</span>}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function AssignmentCard({
  assignment, onBulkSend, locked, sent,
}: { assignment: GeneratedAssignment; onBulkSend: () => void; locked: boolean; sent: boolean }) {
  return (
    <div className="rounded-2xl bg-blue-50/40 border border-blue-200 p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3 flex-wrap gap-3">
        <div>
          <div className="text-[10px] font-mono font-bold uppercase tracking-wide text-blue-600 mb-1 flex items-center gap-1.5"><Sparkles className="w-3 h-3" />AI-Generated Assignment · Short Brief</div>
          <h3 className="text-base font-extrabold text-zinc-900">{assignment.title}</h3>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] text-zinc-500 font-mono">Duration</div>
          <div className="text-sm font-bold text-blue-700">{assignment.duration}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {assignment.requirements.map((req) => (
          <span key={req} className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-700 bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />{req}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-blue-200/60 pt-3 flex-wrap gap-3">
        <div className="text-[11px] text-zinc-600 font-mono flex items-center gap-1.5"><GitBranch className="w-3.5 h-3.5" /> Submission: {assignment.submission}</div>
        <button
          onClick={onBulkSend}
          disabled={locked}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
        >
          {sent ? <><CheckCircle2 className="w-3.5 h-3.5" /> Sent to Candidates</> : <><Send className="w-3.5 h-3.5" /> Bulk Send Assignment</>}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MCP EMAIL TOOL
   ═══════════════════════════════════════════════════════════ */

function McpSendPanel({ step, candidates }: { step: number; candidates: Candidate[] }) {
  const sending = step >= 2 && step < 3;
  const completed = step >= 3;
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
      <div className="rounded-2xl bg-white border border-zinc-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Plug className="w-4 h-4 text-amber-600" />
          <h3 className="text-sm font-bold text-zinc-900">MCP Email Tool</h3>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 flex items-center gap-1">
            <Radio className="w-2.5 h-2.5 animate-pulse" /> {MCP_STEPS[step]}
          </span>
          <span className="text-[10px] font-mono text-zinc-400 ml-auto">Simulated — no SMTP/MCP email tool is wired up yet</span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-24 h-20 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center gap-1 shrink-0 overflow-hidden">
            {sending && (
              <motion.div
                className="absolute inset-0 bg-amber-400/10"
                animate={{ opacity: [0.2, 0.6, 0.2] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
            <Mail className="w-5 h-5 text-amber-400 relative" />
            <span className="text-[9px] font-mono text-zinc-400 relative">MCP Server</span>
          </div>

          <div className="flex-1 grid sm:grid-cols-2 gap-3">
            {candidates.map((c, ci) => (
              <div key={c.id} className="relative rounded-xl border border-zinc-200 bg-zinc-50 p-3 flex items-center gap-2.5 overflow-hidden">
                {sending && [0, 1].map((k) => (
                  <motion.div
                    key={k}
                    className="absolute top-1/2 -translate-y-1/2"
                    initial={{ left: "-10%", opacity: 0 }}
                    animate={{ left: "90%", opacity: [0, 1, 1, 0] }}
                    transition={{ duration: 1.1, repeat: Infinity, ease: "linear", delay: k * 0.55 + ci * 0.15 }}
                  >
                    <Mail className="w-3.5 h-3.5 text-amber-500" />
                  </motion.div>
                ))}
                <div className={`w-7 h-7 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 ${c.avatarBg} ${c.avatarText}`}>{c.name[0]}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-zinc-900 truncate">{c.name}</div>
                  <div className="text-[10px] text-zinc-500 font-mono truncate">{c.email || "no email extracted"}</div>
                </div>
                {completed && <MailCheck className="w-4 h-4 text-emerald-600 shrink-0" />}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5 mt-4">
          {MCP_STEPS.map((s, i) => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-blue-600" : "bg-zinc-100"}`} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   EVALUATION TABLE
   ═══════════════════════════════════════════════════════════ */

function EvaluationTable({
  candidates, approvals, onConfirm,
}: { candidates: Candidate[]; approvals: Record<string, boolean>; onConfirm: (id: string) => void }) {
  return (
    <div className="rounded-2xl bg-white border border-zinc-200 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-zinc-100">
        <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2"><Award className="w-4 h-4 text-blue-600" />Candidate Evaluation</h3>
        <p className="text-[11px] text-zinc-500 mt-0.5">Match score is real (requirement-to-resume fit) · this demo doesn&apos;t collect real assignment submissions · confirm each candidate to trigger onboarding</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-zinc-50 text-zinc-500 border-b border-zinc-200">
              <th className="px-4 py-2.5 text-left font-bold">Candidate</th>
              <th className="px-3 py-2.5 text-left font-bold">ATS</th>
              <th className="px-3 py-2.5 text-left font-bold">Match Score</th>
              <th className="px-3 py-2.5 text-left font-bold">Email Status</th>
              <th className="px-3 py-2.5 text-left font-bold">MCP Status</th>
              <th className="px-3 py-2.5 text-left font-bold">Recommendation</th>
              <th className="px-3 py-2.5 text-left font-bold">HR Approval</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c, i) => {
              const approved = !!approvals[c.id];
              return (
                <tr key={c.id} className={`border-b border-zinc-100 hover:bg-blue-50/30 transition-colors ${i % 2 === 1 ? "bg-zinc-50/40" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 ${c.avatarBg} ${c.avatarText}`}>{c.name[0]}</div>
                      <span className="font-bold text-zinc-900">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 font-mono font-bold text-zinc-700">{c.ats}%</td>
                  <td className="px-3 py-3">
                    <span className="font-mono font-bold px-2 py-0.5 rounded-full border bg-blue-50 border-blue-200 text-blue-700">{c.matchScore ?? "—"}%</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-1 w-fit"><MailCheck className="w-3 h-3" />{c.emailStatus}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 flex items-center gap-1 w-fit"><Plug className="w-3 h-3" />{c.mcpStatus}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 w-fit ${
                      c.recommendation === "Strong Hire" ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : c.recommendation === "Not a Fit" ? "bg-red-50 border-red-200 text-red-700"
                        : c.recommendation === "Consider" ? "bg-amber-50 border-amber-200 text-amber-700"
                        : "bg-blue-50 border-blue-200 text-blue-700"
                    }`}>
                      <Star className="w-3 h-3" />{c.recommendation || "Pending"}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <button
                      onClick={() => onConfirm(c.id)}
                      disabled={approved}
                      className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                        approved ? "bg-emerald-50 border border-emerald-200 text-emerald-700 cursor-default" : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      {approved ? <><CheckCircle2 className="w-3 h-3" /> Approved</> : "Confirm"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ONBOARDING AGENT
   ═══════════════════════════════════════════════════════════ */

function OnboardingPanel({ progress, candidateCount }: { progress: number; candidateCount: number }) {
  const done = progress >= ONBOARDING_STEPS.length;
  return (
    <div className="rounded-2xl bg-white border border-zinc-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-zinc-900">Onboarding Agent</h3>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700">AUTO-TRIGGERED</span>
        </div>
        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
          done ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-blue-50 border-blue-200 text-blue-700"
        }`}>
          {done ? <><CheckCircle2 className="w-3 h-3" /> Completed</> : <><Loader2 className="w-3 h-3 animate-spin" /> Provisioning…</>}
        </span>
      </div>
      <p className="text-[11px] text-zinc-500 mb-4">Handing off {candidateCount} approved hire{candidateCount === 1 ? "" : "s"} to the existing onboarding system.</p>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {ONBOARDING_STEPS.map((s, i) => {
          const stepDone = i < progress;
          const active = i === progress;
          const Icon = s.icon;
          return (
            <div key={s.label} className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border text-center transition-all ${
              stepDone ? "bg-emerald-50/70 border-emerald-200" : active ? "bg-blue-50 border-blue-200" : "bg-white border-zinc-200"
            }`}>
              <Icon className={`w-4 h-4 ${stepDone ? "text-emerald-600" : active ? "text-blue-600" : "text-zinc-400"}`} />
              <span className="text-[9.5px] sm:text-[10px] font-mono font-bold text-zinc-700 leading-tight">{s.label}</span>
              {stepDone ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : active ? <Loader2 className="w-3 h-3 text-blue-600 animate-spin" /> : null}
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {done && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-100 flex-wrap gap-3">
              <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> {candidateCount} employee{candidateCount === 1 ? "" : "s"} created — synced to the Onboarding workspace</span>
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-bold hover:bg-blue-600 transition-colors shadow-sm"
              >
                Open Onboarding Agent <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   KNOWLEDGE TRANSFER AGENT
   ═══════════════════════════════════════════════════════════ */

function KnowledgeTransferPanel({ progress, candidateCount }: { progress: number; candidateCount: number }) {
  const done = progress >= KT_STEPS.length;
  const running = !done;
  return (
    <div className="rounded-2xl bg-white border border-zinc-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-zinc-900">Knowledge Transfer Agent</h3>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700">AUTO-TRIGGERED</span>
        </div>
        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
          done ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-blue-50 border-blue-200 text-blue-700"
        }`}>
          {done ? <><CheckCircle2 className="w-3 h-3" /> Completed</> : <><Loader2 className="w-3 h-3 animate-spin" /> Syncing…</>}
        </span>
      </div>
      <p className="text-[11px] text-zinc-500 mb-4">Assigning onboarding docs, videos & training to {candidateCount} new hire{candidateCount === 1 ? "" : "s"}.</p>

      <div className="flex items-center gap-2 sm:gap-4 mb-4">
        <div className="w-16 h-14 sm:w-20 sm:h-16 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center gap-1 shrink-0">
          <ScrollText className="w-4 h-4 text-amber-400" />
          <span className="text-[8px] sm:text-[9px] font-mono text-zinc-400 text-center px-1">Knowledge Base</span>
        </div>
        <div className="flex-1 min-w-[36px] relative h-8">
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-dashed border-zinc-300" />
          {running && [0, 1, 2].map((k) => (
            <motion.div
              key={k}
              className="absolute top-1/2 -translate-y-1/2"
              initial={{ left: "0%", opacity: 0 }}
              animate={{ left: "96%", opacity: [0, 1, 1, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: k * 0.4, ease: "linear" }}
            >
              <FileText className="w-3.5 h-3.5 text-blue-500" />
            </motion.div>
          ))}
        </div>
        <div className="w-16 h-14 sm:w-20 sm:h-16 rounded-xl bg-blue-50 border border-blue-200 flex flex-col items-center justify-center gap-1 shrink-0">
          <Users className="w-4 h-4 text-blue-600" />
          <span className="text-[8px] sm:text-[9px] font-mono text-blue-600 text-center px-1">New Hires</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {KT_STEPS.map((s, i) => {
          const stepDone = i < progress;
          const active = i === progress;
          const Icon = s.icon;
          return (
            <div key={s.label} className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border text-center transition-all ${
              stepDone ? "bg-emerald-50/70 border-emerald-200" : active ? "bg-blue-50 border-blue-200" : "bg-white border-zinc-200"
            }`}>
              <Icon className={`w-4 h-4 ${stepDone ? "text-emerald-600" : active ? "text-blue-600" : "text-zinc-400"}`} />
              <span className="text-[9.5px] sm:text-[10px] font-mono font-bold text-zinc-700 leading-tight">{s.label}</span>
              {stepDone ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : active ? <Loader2 className="w-3 h-3 text-blue-600 animate-spin" /> : null}
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {done && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-100 flex-wrap gap-3">
              <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Docs, videos & policies assigned as new employees</span>
              <Link
                href="/knowledge"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-bold hover:bg-blue-600 transition-colors shadow-sm"
              >
                Open Knowledge Transfer <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   COMPLETION BANNER
   ═══════════════════════════════════════════════════════════ */

function CompletionBanner({ onReset, candidates }: { onReset: () => void; candidates: Candidate[] }) {
  const n = candidates.length;
  const stats = [
    { label: "Candidates Onboarded", value: `${n}/${n}` },
    { label: "Assignments Sent", value: `${n}/${n}` },
    { label: "Knowledge Transfer", value: "100%" },
    { label: "Human Approvals", value: `${n}/${n}` },
  ];
  const names = candidates.map((c) => c.name);
  const namesText = names.length <= 1
    ? names[0] || "The candidate"
    : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  return (
    <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="rounded-2xl bg-zinc-900 border border-zinc-800 p-8 text-center relative overflow-hidden">
      <div className="absolute -top-16 -right-16 w-56 h-56 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="relative">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400 mx-auto mb-4">
          <PartyPopper className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-extrabold text-white mb-1.5">Hiring Workflow Complete</h3>
        <p className="text-xs text-zinc-400 max-w-md mx-auto mb-6">All 9 agents executed end-to-end on real parsed resumes, with a human approval gate before onboarding — {namesText} {n === 1 ? "is" : "are"} fully onboarded.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto mb-6">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl bg-white/5 border border-white/10 p-3">
              <div className="text-lg font-extrabold text-white font-mono">{s.value}</div>
              <div className="text-[10px] text-zinc-400">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/onboarding" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white text-xs font-bold hover:bg-white/20 transition-colors">
            <UserPlus className="w-3.5 h-3.5" /> Open Onboarding Agent
          </Link>
          <Link href="/knowledge" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white text-xs font-bold hover:bg-white/20 transition-colors">
            <BookOpen className="w-3.5 h-3.5" /> Open Knowledge Transfer
          </Link>
          <button onClick={onReset} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-zinc-900 text-xs font-bold hover:bg-zinc-100 transition-colors">
            <RotateCcw className="w-3.5 h-3.5" /> Restart Demo
          </button>
        </div>
      </div>
    </motion.div>
  );
}
