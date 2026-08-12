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
} from "lucide-react";
import { writeSyncedHires, clearSyncedHires } from "@/lib/hiringSync";

/* ═══════════════════════════════════════════════════════════
   TYPES & FIXED DEMO DATA
   ═══════════════════════════════════════════════════════════
   POC constraint: no backend, no APIs, no real parsing. Whatever PDFs the
   user drops in, the workflow always narrates these two fixed candidates —
   only the displayed resume filename reflects what was actually uploaded. */

interface Candidate {
  id: string;
  name: string;
  email: string;
  ats: number;
  experience: string;
  skills: string[];
  status: string;
  assignmentScore: number;
  recommendation: "Strong Hire" | "Hire";
  emailStatus: string;
  mcpStatus: string;
  avatarBg: string;
  avatarText: string;
}

const CANDIDATES: Candidate[] = [
  {
    id: "ayush-singh",
    name: "Ayush Singh",
    email: "ayush.singh.dev@gmail.com",
    ats: 91,
    experience: "4 Years",
    skills: ["React", "Node.js", "Python", "AWS", "FastAPI"],
    status: "Shortlisted",
    assignmentScore: 95,
    recommendation: "Strong Hire",
    emailStatus: "Delivered",
    mcpStatus: "Reply Received",
    avatarBg: "bg-blue-50 border-blue-200",
    avatarText: "text-blue-600",
  },
  {
    id: "hetvi",
    name: "Hetvi",
    email: "hetvi.shah.dev@gmail.com",
    ats: 84,
    experience: "3 Years",
    skills: ["FastAPI", "Docker", "PostgreSQL", "Django", "CI/CD"],
    status: "Shortlisted",
    assignmentScore: 88,
    recommendation: "Hire",
    emailStatus: "Delivered",
    mcpStatus: "Reply Received",
    avatarBg: "bg-emerald-50 border-emerald-200",
    avatarText: "text-emerald-600",
  },
];

const DEFAULT_FILENAMES = ["Ayush_Singh_Resume.pdf", "Hetvi_Resume.pdf"];

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

/* Lightweight, deterministic heuristics — no AI call. Reads the HR requirement
   textarea and produces a short, believable assignment brief from it. */
function buildAssignmentFromRequirement(text: string): GeneratedAssignment {
  const lower = text.toLowerCase();

  const bulletLines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^[•\-*]|^\d+[.)]/.test(l))
    .map((l) => l.replace(/^[•\-*]\s*|^\d+[.)]\s*/, "").trim())
    .filter(Boolean);

  let title = "Technical Assessment";
  if (/full[\s-]?stack/.test(lower)) title = "Full-Stack Engineer Assessment";
  else if (/backend|back-end|api/.test(lower)) title = "Backend Engineer Assessment";
  else if (/frontend|front-end|react|next\.?js|ui/.test(lower)) title = "Frontend Engineer Assessment";
  else if (/machine learning|\bml\b|\bai\b|llm/.test(lower)) title = "AI/ML Engineer Assessment";
  else if (/data engineer|etl|pipeline/.test(lower)) title = "Data Engineer Assessment";
  else if (/devops|infra|kubernetes|k8s/.test(lower)) title = "DevOps Engineer Assessment";

  const hourMatch = lower.match(/(\d+)\s*hour/);
  const dayMatch = lower.match(/(\d+)\s*day/);
  const duration = hourMatch ? `${hourMatch[1]} Hours` : dayMatch ? `${dayMatch[1]} Day${dayMatch[1] === "1" ? "" : "s"}` : DEFAULT_ASSIGNMENT.duration;

  const requirements = bulletLines.length > 0 ? bulletLines.slice(0, 6) : DEFAULT_ASSIGNMENT.requirements;

  let submission = DEFAULT_ASSIGNMENT.submission;
  if (/notebook|colab/.test(lower)) submission = "Jupyter Notebook";
  else if (/\bzip\b/.test(lower)) submission = "ZIP Upload";
  else if (/figma/.test(lower)) submission = "Figma File";

  return { title, duration, requirements, submission };
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════ */

export default function HiringAutomationPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [stage, setStage] = useState<Stage>("idle");
  const [completedNodes, setCompletedNodes] = useState<number[]>([]);
  const [activeNode, setActiveNode] = useState<number | null>(null);
  const [parsingLog, setParsingLog] = useState("");
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

  const resumeFileNames = CANDIDATES.map((_, i) => files[i]?.name || DEFAULT_FILENAMES[i]);

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
    setStage("parsing");
    setParsingLog("Uploading bulk PDF batch to ingestion queue…");
    await runNode(0, 800);
    if (myRun !== runId.current) return;
    setParsingLog("Resume Parser extracting text, sections & entities…");
    await runNode(1, 1400);
    if (myRun !== runId.current) return;
    setParsingLog("ATS engine scoring resumes & extracting emails…");
    await runNode(2, 1300);
    if (myRun !== runId.current) return;
    setParsingLog("2 candidates parsed and added to the spreadsheet.");
    setStage("spreadsheet");
  };

  const handleGenerateAssignment = async () => {
    if (stage !== "spreadsheet" || !requirement.trim()) return;
    const myRun = runId.current;
    setStage("generating");
    await runNode(3, 1100);
    if (myRun !== runId.current) return;
    for (let s = 0; s < GEN_STEPS.length; s++) {
      setGenStep(s);
      await sleep(650);
      if (myRun !== runId.current) return;
    }
    setAssignment(buildAssignmentFromRequirement(requirement));
    await runNode(4, 700);
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
    await runNode(5, 900);
    if (myRun !== runId.current) return;
    setStage("evaluation");
  };

  const handleConfirm = (id: string) => setApprovals((prev) => ({ ...prev, [id]: true }));

  useEffect(() => {
    if (stage !== "evaluation") return;
    if (!CANDIDATES.every((c) => approvals[c.id])) return;
    const myRun = runId.current;
    (async () => {
      await runNode(6, 900);
      if (myRun !== runId.current) return;
      writeSyncedHires(CANDIDATES.map((c) => ({
        id: c.id, name: c.name, email: c.email, designation: "Backend Engineer",
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
  }, [approvals, stage]);

  const handleReset = () => {
    runId.current += 1;
    clearSyncedHires();
    setFiles([]);
    setStage("idle");
    setCompletedNodes([]);
    setActiveNode(null);
    setParsingLog("");
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
          {reached("spreadsheet") && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <CandidateSpreadsheet candidates={CANDIDATES} resumeFileNames={resumeFileNames} />
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
          {stage === "sending" && <McpSendPanel step={mcpStep} candidates={CANDIDATES} />}
        </AnimatePresence>

        {/* EVALUATION TABLE */}
        <AnimatePresence>
          {reached("evaluation") && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <EvaluationTable candidates={CANDIDATES} approvals={approvals} onConfirm={handleConfirm} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ONBOARDING AGENT */}
        <AnimatePresence>
          {reached("onboarding") && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <OnboardingPanel progress={onboardProgress} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* KNOWLEDGE TRANSFER AGENT */}
        <AnimatePresence>
          {reached("knowledge") && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <KnowledgeTransferPanel progress={ktProgress} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* COMPLETION */}
        <AnimatePresence>
          {stage === "done" && <CompletionBanner onReset={handleReset} />}
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
  files, stage, onAdd, onRemove, onProcess,
}: {
  files: File[]; stage: Stage;
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
        <span className="text-[10px] font-mono text-zinc-400">Simulated locally — no files leave your browser</span>
      </div>

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
          {files.length === 0 ? "No files added yet" : `${files.length} file(s) queued · pipeline always resolves 2 candidates`}
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

function CandidateSpreadsheet({ candidates, resumeFileNames }: { candidates: Candidate[]; resumeFileNames: string[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("ats");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const rows = candidates.map((c, i) => ({ ...c, resumeFile: resumeFileNames[i] }));
  const statuses = ["All", ...Array.from(new Set(rows.map((r) => r.status)))];

  const filtered = useMemo(() => rows.filter((r) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || r.skills.some((s) => s.toLowerCase().includes(q));
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
                <td className="px-3 py-3 font-mono text-zinc-600">{r.email}</td>
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
  requirement, setRequirement, onGenerate, locked,
}: {
  requirement: string; setRequirement: (v: string) => void; onGenerate: () => void; locked: boolean;
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
        <span className="text-[11px] text-zinc-400 font-mono">Applies to 2 shortlisted candidates</span>
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
                  <div className="text-[10px] text-zinc-500 font-mono truncate">{c.email}</div>
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
        <p className="text-[11px] text-zinc-500 mt-0.5">Assignment scores are simulated · confirm each candidate to trigger onboarding</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-zinc-50 text-zinc-500 border-b border-zinc-200">
              <th className="px-4 py-2.5 text-left font-bold">Candidate</th>
              <th className="px-3 py-2.5 text-left font-bold">ATS</th>
              <th className="px-3 py-2.5 text-left font-bold">Assignment Score</th>
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
                    <span className="font-mono font-bold px-2 py-0.5 rounded-full border bg-blue-50 border-blue-200 text-blue-700">{c.assignmentScore}%</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-1 w-fit"><MailCheck className="w-3 h-3" />{c.emailStatus}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 flex items-center gap-1 w-fit"><Plug className="w-3 h-3" />{c.mcpStatus}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 w-fit ${
                      c.recommendation === "Strong Hire" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-blue-50 border-blue-200 text-blue-700"
                    }`}>
                      <Star className="w-3 h-3" />{c.recommendation}
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

function OnboardingPanel({ progress }: { progress: number }) {
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
      <p className="text-[11px] text-zinc-500 mb-4">Handing off both approved hires to the existing onboarding system.</p>

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
              <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> 2 employees created — synced to the Onboarding workspace</span>
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

function KnowledgeTransferPanel({ progress }: { progress: number }) {
  const done = progress >= KT_STEPS.length;
  const running = !done;
  return (
    <div className="rounded-2xl bg-white border border-zinc-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
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

function CompletionBanner({ onReset }: { onReset: () => void }) {
  const stats = [
    { label: "Candidates Onboarded", value: "2/2" },
    { label: "Assignments Sent", value: "2/2" },
    { label: "Knowledge Transfer", value: "100%" },
    { label: "Human Approvals", value: "2/2" },
  ];
  return (
    <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="rounded-2xl bg-zinc-900 border border-zinc-800 p-8 text-center relative overflow-hidden">
      <div className="absolute -top-16 -right-16 w-56 h-56 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="relative">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400 mx-auto mb-4">
          <PartyPopper className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-extrabold text-white mb-1.5">Hiring Workflow Complete</h3>
        <p className="text-xs text-zinc-400 max-w-md mx-auto mb-6">All 9 agents executed autonomously end-to-end, with a human approval gate before onboarding — Ayush Singh and Hetvi are fully onboarded.</p>
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
