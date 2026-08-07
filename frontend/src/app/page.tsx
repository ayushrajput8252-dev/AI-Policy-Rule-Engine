"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useInView, AnimatePresence } from "framer-motion";
import WeeklyReportModal from "@/components/weekly-report/WeeklyReportModal";
import { askAssistant } from "@/components/ai-assistant/AIAssistantWidget";
import {
  Database, UserPlus, Brain, Bot, BarChart3, Shield,
  ArrowRight, Menu, X, Zap, Users, Globe, CheckCircle2,
  Sparkles, Search, FileText, Cpu, Activity, Play, ArrowUpRight, Radio, Terminal, Pause, SkipForward,
  MessageSquare, Layers, Server, Cloud, Plug, Share2, CheckSquare,
  Wallet, CalendarCheck, FileCheck,
  FolderOpen,
} from "lucide-react";

/* ── Inline GitHub Icon ── */
function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

/* ── Inline LinkedIn Icon ── */
function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.7a1.63 1.63 0 1 0 1.63 1.63A1.63 1.63 0 0 0 7.86 6.7z" />
    </svg>
  );
}

/* ── Doodle Underline ── */
function DoodleUnderline({ className = "w-48 text-blue-600" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M3 11C40 4 90 13 197 6M15 14C65 8 135 12 185 10"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        className="doodle-path"
      />
    </svg>
  );
}

/* ── Floating Hero Doodles: payroll / attendance / policy ──
   Clickable shortcuts into the AI Assistant widget — each one opens it with a
   relevant question already asked, via the same window event the widget listens
   for (see askAssistant in AIAssistantWidget), so no prop-drilling is needed. */
function FloatingHeroDoodles() {
  const doodles = [
    {
      label: "Payroll",
      icon: <Wallet className="w-3.5 h-3.5" />,
      className: "top-2 right-6 sm:right-10",
      delay: "0s",
      query: "Tell me about our payroll process and salary cycles.",
    },
    {
      label: "Attendance",
      icon: <CalendarCheck className="w-3.5 h-3.5" />,
      className: "-bottom-10 left-4 sm:left-10",
      delay: "1.2s",
      query: "How does attendance and leave tracking work?",
    },
    {
      label: "Policy",
      icon: <FileCheck className="w-3.5 h-3.5" />,
      className: "-bottom-2 right-16 sm:right-28",
      delay: "2.1s",
      query: "What HR policies should I know about?",
    },
  ];

  return (
    <div className="hidden md:block absolute inset-0 pointer-events-none">
      {doodles.map((d) => (
        <button
          key={d.label}
          type="button"
          onClick={() => askAssistant(d.query)}
          title={`Ask the AI assistant about ${d.label.toLowerCase()}`}
          className={`absolute pointer-events-auto animate-doodle-float hover:[animation-play-state:paused] group ${d.className}`}
          style={{ animationDelay: d.delay }}
        >
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-sm border border-zinc-200 shadow-sm text-zinc-500 transition-all group-hover:-translate-y-0.5 group-hover:shadow-md group-hover:border-blue-300 group-hover:bg-white group-hover:text-blue-700 cursor-pointer">
            <span className="text-blue-500 group-hover:text-blue-600">{d.icon}</span>
            <span className="text-[11px] font-mono font-semibold tracking-wide">{d.label}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ── Count Up Hook ── */
function useCountUp(end: number, duration = 1800) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const started = useRef(false);

  useEffect(() => {
    if (!inView || started.current) return;
    started.current = true;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      setCount(Math.floor((1 - Math.pow(1 - p, 4)) * end));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, end, duration]);
  return { count, ref };
}

export default function LandingPage() {
  const [mobileMenu, setMobileMenu] = useState(false);
  const [archModalOpen, setArchModalOpen] = useState(false);
  const [weeklyReportOpen, setWeeklyReportOpen] = useState(false);

  const navLinks = [
    { label: "Platform", href: "#platform" },
    { label: "Capabilities", href: "#capabilities" },
    { label: "Architecture", href: "#architecture" },
    { label: "Pricing", href: "#pricing" },
  ];

  return (
    <div className="min-h-screen bg-white text-zinc-900 overflow-x-hidden bg-white-grid relative selection:bg-blue-500/20">
      {/* ─── NAVIGATION ─── */}
      <nav className="fixed top-0 left-0 right-0 z-40">
        <div className="absolute inset-0 bg-white/80 backdrop-blur-md border-b border-zinc-200/80 shadow-xs" />
        <div className="relative max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-105 transition-transform">
              <Zap className="w-4 h-4 text-blue-400 fill-blue-400" />
            </div>
            <span className="font-bold text-[16px] tracking-tight text-zinc-900">
              AgenticFlow <span className="text-blue-600 font-mono text-xs uppercase ml-1 px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200">AI</span>
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="px-3.5 py-1.5 text-[13px] font-medium text-zinc-600 hover:text-zinc-900 transition-colors rounded-md hover:bg-zinc-100/80"
              >
                {l.label}
              </a>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-2.5">
            <a
              href="https://github.com/ayushrajput8252-dev/AI-Policy-Rule-Engine"
              target="_blank"
              rel="noreferrer"
              title="GitHub Repository"
              className="p-2 text-zinc-600 hover:text-zinc-900 transition-colors rounded-lg hover:bg-zinc-100"
            >
              <GithubIcon className="w-4 h-4" />
            </a>

            <a
              href="https://www.linkedin.com/in/ayush-singh-aiml/"
              target="_blank"
              rel="noreferrer"
              title="Ayush Singh - LinkedIn"
              className="p-2 text-zinc-600 hover:text-blue-600 transition-colors rounded-lg hover:bg-zinc-100"
            >
              <LinkedinIcon className="w-4 h-4" />
            </a>

            <Link
              href="/rag"
              className="text-[13px] font-mono text-blue-600 hover:text-blue-700 transition-colors px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 font-semibold"
            >
              Open /rag Workspace
            </Link>
            <button
              onClick={() => setArchModalOpen(true)}
              className="text-[13px] font-medium bg-zinc-900 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors shadow-sm"
            >
              View Architecture
            </button>
          </div>

          <button onClick={() => setMobileMenu(!mobileMenu)} className="lg:hidden p-2 text-zinc-700">
            {mobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <AnimatePresence>
          {mobileMenu && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden relative bg-white border-b border-zinc-200 px-6 pb-5 overflow-hidden"
            >
              {navLinks.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={() => setMobileMenu(false)}
                  className="block py-2 text-sm text-zinc-700 hover:text-blue-600 font-medium"
                >
                  {l.label}
                </a>
              ))}
              <div className="flex items-center gap-3 pt-2 pb-3 border-t border-zinc-100 mt-2">
                <a
                  href="https://github.com/ayushrajput8252-dev/AI-Policy-Rule-Engine"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs text-zinc-700 font-medium"
                >
                  <GithubIcon className="w-4 h-4" /> GitHub
                </a>
                <a
                  href="https://www.linkedin.com/in/ayush-singh-aiml/"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs text-blue-600 font-medium"
                >
                  <LinkedinIcon className="w-4 h-4" /> LinkedIn
                </a>
              </div>
              <Link href="/rag" className="block text-sm font-bold bg-blue-600 text-white px-4 py-2.5 rounded-lg text-center">
                Open /rag Workspace
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ─── HERO SECTION ─── */}
      <section id="platform" className="relative pt-28 pb-16 md:pt-36 md:pb-24 overflow-hidden z-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-[1fr_440px] gap-12 items-start">
            {/* Left Column */}
            <div className="pt-4 relative">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-200 bg-zinc-50 mb-6">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[12px] font-medium text-zinc-600">The #1 Enterprise Agentic AI Engine</span>
              </div>

              <h1 className="text-[clamp(2.3rem,5vw,3.6rem)] font-extrabold leading-[1.08] tracking-tight text-zinc-900 mb-6">
                AgenticFlow AI —{" "}
                <span className="relative inline-block text-blue-600">
                  Talent Intelligence
                  <DoodleUnderline className="absolute left-0 -bottom-2.5 w-full text-blue-600" />
                </span>
                <br />
                Platform
              </h1>

              <p className="text-[16px] text-zinc-600 leading-relaxed mb-10 max-w-lg">
                Automate complex enterprise policy extraction, orchestrate autonomous multi-agent reasoning, index document vectors with hybrid RAG, and execute deterministic actions.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href="/rag"
                  className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl text-[14px] font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-all"
                >
                  Launch RAG Workspace <ArrowRight className="w-4 h-4" />
                </Link>

                <button
                  onClick={() => setArchModalOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-[14px] font-semibold border border-zinc-200 text-zinc-700 bg-white hover:bg-zinc-50 hover:border-zinc-300 transition-all"
                >
                  <Cpu className="w-4 h-4 text-blue-600" />
                  View Architecture
                </button>
              </div>

              <FloatingHeroDoodles />
            </div>

            {/* Right Column: Hero Agent Matrix */}
            <div className="hidden lg:block relative">
              <HeroAgentMatrixDynamic />
            </div>
          </div>
        </div>
      </section>

      {/* ─── CAPABILITIES BENTO GRID ─── */}
      <section id="capabilities" className="py-20 relative z-10 border-t border-zinc-200/80 bg-zinc-50/50">
        <div className="max-w-6xl mx-auto px-6">
          <SectionHeader
            badge="Performance Capabilities"
            title="Engineered for High-Consequence Enterprise Scale"
            subtitle="Autonomous reasoning, RAG vector indexing, and zero-trust orchestration."
          />

          <div className="grid md:grid-cols-3 gap-6 mt-14">
            {/* Card 1: RAG */}
            <div className="md:col-span-2">
              <RAGCardInteractive />
            </div>

            {/* Card 2: Onboarding */}
            <OnboardingCardInteractive />

            {/* Card 3: Knowledge Graph */}
            <KnowledgeCardInteractive />

            {/* Card 4: Automation Agent */}
            <div className="md:col-span-2">
              <AutomationCardInteractive />
            </div>

            {/* Card 5: Reports */}
            <ReportsCardWhite onOpenReport={() => setWeeklyReportOpen(true)} />

            {/* Card 6: Security */}
            <SecurityCardWhite />

            {/* Card 7: Native Integrations with Brand Icons */}
            <IntegrationsCardInteractive />
          </div>
        </div>
      </section>

      {/* ─── WORKFLOW ARCHITECTURE TIMELINE ─── */}
      <section id="architecture" className="py-28 border-t border-zinc-200/80 bg-zinc-50/50">
        <div className="max-w-6xl mx-auto px-6">
          <SectionHeader
            badge="Realtime AI Pipeline"
            title="From Knowledge Import to Automated Action"
            subtitle="Continuous floating data orchestration pipeline from start to finish."
          />
          <WorkflowTimelineFloatingPipeline onOpenModal={() => setArchModalOpen(true)} />
        </div>
      </section>

      {/* ─── STATS ─── */}
      <section className="py-20 border-t border-zinc-200/80 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCardWhite value={95} suffix="%" label="Retrieval Accuracy" />
            <StatCardWhite value={80} suffix="%" label="Faster Onboarding" />
            <StatCardWhite value={70} suffix="%" label="Manual Work Reduced" />
            <StatCardWhite value={10} suffix="M+" label="Documents Indexed" />
          </div>
        </div>
      </section>

      {/* ─── ARCHITECTURE MODAL WITH BURNING LINES ─── */}
      <BurningArchitectureModal isOpen={archModalOpen} onClose={() => setArchModalOpen(false)} />

      {/* ─── WEEKLY EXECUTIVE REPORT MODAL ─── */}
      <WeeklyReportModal isOpen={weeklyReportOpen} onClose={() => setWeeklyReportOpen(false)} />

      {/* ─── CTA & FOOTER ─── */}
      <section id="pricing" className="py-28 border-t border-zinc-200/80 bg-gradient-to-b from-white to-blue-50/40 relative">
        <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-[clamp(2rem,4vw,3rem)] font-extrabold text-zinc-900 tracking-tight mb-4">
            Automate Your Organization <br />
            <span className="text-blue-600">with AgenticFlow AI</span>
          </h2>
          <p className="text-zinc-600 text-[16px] leading-relaxed mb-8 max-w-lg mx-auto">
            Deploy enterprise-grade AI automation, RAG document search, onboarding workflows, and tool orchestration in hours.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/rag"
              className="px-8 py-3.5 rounded-xl text-[14px] font-semibold bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
            >
              Open /rag Workspace
            </Link>
            <button
              onClick={() => setArchModalOpen(true)}
              className="px-8 py-3.5 rounded-xl text-[14px] font-semibold border border-zinc-300 text-zinc-800 bg-white hover:bg-zinc-50 transition-all"
            >
              View Architecture
            </button>
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-200 bg-white py-14">
        <div className="max-w-6xl mx-auto px-6 text-center space-y-3">
          <div className="flex justify-center items-center gap-4 text-xs font-semibold text-zinc-600">
            <a href="https://github.com/ayushrajput8252-dev/AI-Policy-Rule-Engine" target="_blank" rel="noreferrer" className="hover:text-zinc-900 flex items-center gap-1">
              <GithubIcon className="w-4 h-4" /> GitHub Repository
            </a>
            <span>•</span>
            <a href="https://www.linkedin.com/in/ayush-singh-aiml/" target="_blank" rel="noreferrer" className="hover:text-blue-600 flex items-center gap-1">
              <LinkedinIcon className="w-4 h-4 text-blue-600" /> Ayush Singh (LinkedIn)
            </a>
          </div>
          <p className="text-[12px] text-zinc-500 font-mono">
            AgenticFlow AI · Autonomous Enterprise AI Platform · © {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SUB-COMPONENTS & ULTRA-PREMIUM ARCHITECTURE MODAL
   ═══════════════════════════════════════════════════════════════ */

const KERNEL_SUB_AGENTS = [
  { label: "Reasoning Agent", icon: <Bot className="w-3 h-3" />, color: "bg-blue-500" },
  { label: "Retrieval Agent", icon: <Search className="w-3 h-3" />, color: "bg-indigo-500" },
  { label: "Tool Agent", icon: <Zap className="w-3 h-3" />, color: "bg-amber-500" },
  { label: "Validator Agent", icon: <CheckCircle2 className="w-3 h-3" />, color: "bg-emerald-500" },
];

const KERNEL_TRACE_LINES = [
  "Reasoning Agent → parsing intent, dispatching retrieval request ↓",
  "Retrieval Agent → querying Pinecone HNSW index, top-k=5 ↓",
  "Tool Agent → invoking MCP connector, awaiting response ↓",
  "Validator Agent → scoring extraction confidence ≥ 85% ↓",
];

function BurningArchitectureModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [selectedNode, setSelectedNode] = useState(0);
  const [kernelLine, setKernelLine] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    const iv = setInterval(() => {
      setKernelLine((prev) => (prev + 1) % KERNEL_TRACE_LINES.length);
    }, 2000);
    return () => clearInterval(iv);
  }, [isOpen]);

  const nodes = [
    { title: "Document Ingestion", sub: "PDF / OCR / Audio Transcribe", latency: "14ms", details: "Parses PDF bounding boxes & transcribes audio files with Faster-Whisper.", icon: <FileText className="w-4 h-4" />, agentIndex: 1 },
    { title: "Vector Embedding Engine", sub: "BGE / Pinecone HNSW Vector Store", latency: "22ms", details: "Generates high-dimensional vector embeddings and indexes into Pinecone.", icon: <Database className="w-4 h-4" />, agentIndex: 1 },
    { title: "Multi-Agent Reasoning", sub: "Gemini 2.5 / Dual-Tier RAG", latency: "180ms", details: "Dual-tier fallback reasoning engine (Rule-based -> Raw Chunk RAG -> Missing).", icon: <Bot className="w-4 h-4" />, agentIndex: 0 },
    { title: "Tool & MCP Orchestration", sub: "Slack, GitHub, Jira, Teams APIs", latency: "45ms", details: "Orchestrates Model Context Protocol server tools and webhook connectors.", icon: <Plug className="w-4 h-4" />, agentIndex: 2 },
    { title: "Human Gate Approval", sub: "RBAC Zero-Trust Audit Log", latency: "Immediate", details: "Enforces Level 4 human-in-the-loop authorization gates for system safety.", icon: <Shield className="w-4 h-4" />, agentIndex: 3 },
    { title: "Deterministic Output", sub: "JSON Payload & Voice Synthesis", latency: "8ms", details: "Dispatches signed structured payloads and triggers gTTS Voice Output.", icon: <Zap className="w-4 h-4" />, agentIndex: 0 },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-zinc-900/40 backdrop-blur-md flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.96, y: 15 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 15 }}
            className="bg-white border border-zinc-200/90 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans relative"
          >
            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 bg-zinc-50/90 border-b border-zinc-200/80 flex items-start sm:items-center justify-between gap-2 z-20">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs shrink-0">
                  <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-zinc-900 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span>System Execution Architecture</span>
                    <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white text-blue-700 border border-blue-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                      {KERNEL_SUB_AGENTS.length} AGENTS LIVE
                    </span>
                  </h3>
                  <p className="hidden sm:block text-xs text-zinc-500 mt-0.5">Multi-agent kernel streaming reasoning, retrieval, and tool-execution traces to each node below</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6 bg-zinc-50/40 relative scrollbar-thin">
              {/* AGENT STATUS BAR — unified kernel control strip */}
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative rounded-2xl bg-zinc-900 border border-zinc-800 p-4 sm:p-5 shadow-lg shadow-zinc-900/10 overflow-hidden"
              >
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
                <div className="relative flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-400/30 flex items-center justify-center text-blue-400">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-white text-sm font-bold flex items-center gap-2">
                        Multi-Agent Kernel
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                      </div>
                      <div className="text-[10px] text-zinc-400 font-mono">Orchestrating {nodes.length} pipeline nodes</div>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-wrap items-center gap-1.5 md:justify-end">
                    {KERNEL_SUB_AGENTS.map((agent, i) => (
                      <div
                        key={agent.label}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-mono font-bold transition-all ${
                          kernelLine === i ? "bg-white/10 border-white/30 text-white" : "border-white/10 text-zinc-400"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${agent.color} ${kernelLine === i ? "animate-ping" : "opacity-40"}`} />
                        {agent.icon}
                        <span>{agent.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="relative mt-4 pt-3 border-t border-white/10 flex items-center gap-1.5 text-[11px] font-mono text-blue-300">
                  <Radio className="w-3.5 h-3.5 animate-pulse shrink-0" />
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={kernelLine}
                      initial={{ opacity: 0, y: 3 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -3 }}
                      transition={{ duration: 0.2 }}
                    >
                      {KERNEL_TRACE_LINES[kernelLine]}
                    </motion.span>
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* SECTION DIVIDER */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-zinc-200" />
                <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                  {nodes.length} Pipeline Nodes
                </span>
                <div className="h-px flex-1 bg-zinc-200" />
              </div>

              {/* NODE CARDS GRID */}
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 relative z-20">
                {nodes.map((node, index) => {
                  const isSelected = selectedNode === index;
                  const agent = KERNEL_SUB_AGENTS[node.agentIndex];
                  return (
                    <motion.div
                      key={node.title}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => setSelectedNode(index)}
                      className={`relative p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer overflow-hidden group ${
                        isSelected
                          ? "bg-blue-50/40 border-blue-500 ring-2 ring-blue-500/20 shadow-md"
                          : "bg-white border-zinc-200/90 hover:border-blue-300 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                            isSelected ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600"
                          }`}>
                            {node.icon}
                          </div>
                          <span className="text-xs font-bold text-zinc-900 leading-tight">{node.title}</span>
                        </div>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                          isSelected ? "bg-blue-100 text-blue-700 border-blue-300" : "bg-zinc-100 text-zinc-600 border-zinc-200"
                        }`}>
                          {node.latency}
                        </span>
                      </div>

                      <p className="text-[12px] text-zinc-500 font-mono mb-3 leading-relaxed">{node.sub}</p>

                      <div className={`p-3 rounded-xl border text-[11px] font-sans leading-relaxed transition-all mb-3 ${
                        isSelected
                          ? "bg-white border-blue-200 text-zinc-800 shadow-2xs font-medium"
                          : "bg-zinc-50/70 border-zinc-200/70 text-zinc-600"
                      }`}>
                        {node.details}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${agent.color}`} />
                        <span className="text-[10px] font-mono font-bold text-zinc-500">{agent.label}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 bg-zinc-50/90 border-t border-zinc-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 z-20">
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-600 text-center sm:text-left">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{KERNEL_SUB_AGENTS.length} agents orchestrating {nodes.length} execution nodes</span>
              </div>
              <Link
                href="/rag"
                onClick={onClose}
                className="w-full sm:w-auto text-center px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-md shadow-blue-600/20"
              >
                Launch RAG Workspace →
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SectionHeader({ badge, title, subtitle }: { badge: string; title: string; subtitle?: string }) {
  return (
    <div className="text-center max-w-xl mx-auto">
      <span className="text-xs font-mono uppercase tracking-widest text-blue-600 font-semibold px-2.5 py-1 rounded bg-blue-50 border border-blue-200">
        {badge}
      </span>
      <h2 className="text-[clamp(1.6rem,3vw,2.2rem)] font-extrabold text-zinc-900 tracking-tight mt-4">
        {title}
      </h2>
      {subtitle && <p className="text-zinc-600 text-[15px] mt-2 leading-relaxed">{subtitle}</p>}
    </div>
  );
}

/* ── 1. CLEAN LIGHT AGENT TRACE LOG BOX (BLENDED WITH UI) ── */
function HeroAgentMatrixDynamic() {
  const [activeStep, setActiveStep] = useState(1);
  const [isPaused, setIsPaused] = useState(false);

  const steps = [
    {
      num: 1,
      name: "Employee Webhook Request",
      sub: "Slack / Teams Event Listener",
      icon: <Users className="w-3.5 h-3.5 text-blue-600" />,
      log: "> [0.012s] Incoming webhook payload parsed: user='@ayush', event='POLICY_QUERY'",
    },
    {
      num: 2,
      name: "AI Reasoning Agent Kernel",
      sub: "Claude 3.5 Sonnet / GPT-4o DAG",
      icon: <Bot className="w-3.5 h-3.5 text-blue-600" />,
      log: "> [0.084s] Intent classified: EXPOSE_POLICY_RULES. Spawning RAG retriever agent...",
    },
    {
      num: 3,
      name: "Advanced Vector RAG Engine",
      sub: "Qdrant HNSW + Hybrid Rerank",
      icon: <Database className="w-3.5 h-3.5 text-blue-600" />,
      log: "> [0.142s] HNSW vector search score=0.984. 4 chunks passed confidence threshold (>92%).",
    },
    {
      num: 4,
      name: "Enterprise Knowledge Mesh",
      sub: "SharePoint & Notion Graph",
      icon: <Brain className="w-3.5 h-3.5 text-blue-600" />,
      log: "> [0.188s] Linked document bounding box citation: Page 2 [120, 40, 300, 80].",
    },
    {
      num: 5,
      name: "MCP Tool Orchestrator",
      sub: "Dispatched GitHub & Jira APIs",
      icon: <Globe className="w-3.5 h-3.5 text-blue-600" />,
      log: "> [0.220s] MCP Tool Dispatches: [GitHub.issue_create, Jira.assign_ticket].",
    },
    {
      num: 6,
      name: "Deterministic Dispatcher",
      sub: "Idempotent Transaction Signed",
      icon: <Zap className="w-3.5 h-3.5 text-blue-600" />,
      log: "> [0.248s] Idempotent transaction token 0x9f32 signed. Audit Log verified. Status: 200 OK",
    },
  ];

  useEffect(() => {
    if (isPaused) return;
    const iv = setInterval(() => {
      setActiveStep((prev) => (prev % steps.length) + 1);
    }, 2200);
    return () => clearInterval(iv);
  }, [isPaused, steps.length]);

  const currentStep = steps[activeStep - 1];

  return (
    <div className="rounded-2xl bg-white border border-zinc-200 p-6 shadow-xl relative overflow-hidden">
      <div className="flex items-center justify-between border-b border-zinc-200 pb-3 mb-4 font-mono text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping" />
          <span className="font-bold text-zinc-900 uppercase">Step-by-Step Agent Trace</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-1 rounded hover:bg-zinc-100 text-zinc-600 transition-colors"
            title={isPaused ? "Play trace" : "Pause trace"}
          >
            {isPaused ? <Play className="w-3.5 h-3.5 text-blue-600 fill-blue-600" /> : <Pause className="w-3.5 h-3.5 text-zinc-600" />}
          </button>
          <button
            onClick={() => setActiveStep((prev) => (prev % steps.length) + 1)}
            className="p-1 rounded hover:bg-zinc-100 text-zinc-600 transition-colors"
            title="Next Step"
          >
            <SkipForward className="w-3.5 h-3.5 text-zinc-600" />
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        {steps.map((s) => {
          const isDone = s.num < activeStep;
          const isCurrent = s.num === activeStep;

          return (
            <div key={s.num}>
              <div
                onClick={() => {
                  setIsPaused(true);
                  setActiveStep(s.num);
                }}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isCurrent
                    ? "bg-blue-50/80 border-blue-300 shadow-sm"
                    : isDone
                    ? "bg-white border-zinc-200/70 opacity-90"
                    : "bg-zinc-50/50 border-zinc-200/50 opacity-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-lg font-mono text-[10px] font-bold flex items-center justify-center shrink-0 ${isCurrent ? "bg-blue-600 text-white" : isDone ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-600"}`}>
                    {s.num}
                  </div>
                  <div>
                    <div className={`text-xs font-bold ${isCurrent ? "text-blue-900" : "text-zinc-800"}`}>
                      {s.name}
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono">{s.sub}</div>
                  </div>
                </div>

                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${isCurrent ? "bg-blue-600 text-white border-blue-600 animate-pulse" : isDone ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-zinc-100 text-zinc-500 border-zinc-200"}`}>
                  {isCurrent ? "EXECUTING..." : isDone ? "PASSED ✓" : "QUEUED"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Clean Blended Light Terminal Log Ticker */}
      <div className="mt-4 p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/90 text-blue-950 font-mono text-[11px] shadow-xs space-y-1">
        <div className="flex items-center justify-between text-[10px] text-blue-700 border-b border-blue-200/80 pb-1.5 mb-1 font-bold">
          <span className="flex items-center gap-1.5 text-blue-800">
            <Terminal className="w-3.5 h-3.5 text-blue-600" /> LIVE TRACE LOG
          </span>
          <span className="px-1.5 py-0.5 rounded bg-blue-100 border border-blue-300">STEP {activeStep} / 6</span>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep.num}
            initial={{ opacity: 0, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            className="text-blue-950 font-semibold leading-relaxed"
          >
            {currentStep.log}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function RAGCardInteractive() {
  const sampleQueries = [
    { query: "Expense Policy Limits", match: 98.4, page: 2 },
    { query: "Termination Notice", match: 94.2, page: 5 },
    { query: "NDA & IP Ownership", match: 99.1, page: 1 },
  ];
  const [selectedIdx, setSelectedIdx] = useState(0);

  return (
    <div className="cpu-burn-card p-6 h-full flex flex-col md:flex-row gap-6 bg-white border border-zinc-200/90 rounded-2xl shadow-sm">
      <div className="flex-1 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4 text-blue-600">
          <Database className="w-5 h-5" />
        </div>
        <h3 className="text-[16px] font-bold text-zinc-900 mb-2">Advanced Enterprise RAG</h3>
        <p className="text-[13px] text-zinc-600 leading-relaxed mb-4">
          Index millions of PDFs, emails, SharePoint files, and policies with semantic search, hybrid reranking, and citation tracing.
        </p>

        <div className="space-y-1.5 mb-4">
          <div className="text-[11px] font-mono text-zinc-500">Test Vector Queries:</div>
          <div className="flex flex-wrap gap-1.5">
            {sampleQueries.map((q, i) => (
              <button
                key={q.query}
                onClick={(e) => {
                  e.preventDefault();
                  setSelectedIdx(i);
                }}
                className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border transition-all ${
                  selectedIdx === i
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm font-bold"
                    : "bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100"
                }`}
              >
                🔍 {q.query}
              </button>
            ))}
          </div>
        </div>

        <Link
          href="/rag"
          className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-blue-600 hover:text-blue-700"
        >
          Open RAG Workspace <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="w-full md:w-56 shrink-0 space-y-3 p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
          <span className="text-[10px] font-bold text-blue-600">RAG AGENT ACTIVE</span>
          <span className="text-[10px] text-emerald-600 font-bold">98.4% ACC</span>
        </div>

        <div className="space-y-2 text-[10px]">
          <div className="flex justify-between">
            <span className="text-zinc-500">Target Query:</span>
            <span className="font-bold text-zinc-900 truncate max-w-[100px]">{sampleQueries[selectedIdx].query}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Target Page:</span>
            <span className="font-bold text-blue-600">Page {sampleQueries[selectedIdx].page}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Cosine Match:</span>
            <span className="font-bold text-emerald-600">{sampleQueries[selectedIdx].match}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function OnboardingCardInteractive() {
  const steps = ["Outlook Account", "Teams Channel", "GitHub Access", "Jira License", "Software Provision"];
  const [active, setActive] = useState(2);
  const [isRunning, setIsRunning] = useState(false);

  const runTrigger = () => {
    setIsRunning(true);
    setActive(0);
    let current = 0;
    const iv = setInterval(() => {
      current++;
      setActive(current);
      if (current >= steps.length) {
        clearInterval(iv);
        setIsRunning(false);
      }
    }, 800);
  };

  return (
    <div className="cpu-burn-card p-6 h-full bg-white border border-zinc-200/90 rounded-2xl shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
          <UserPlus className="w-5 h-5" />
        </div>
        <Link
          href="/onboarding"
          className="text-[10px] font-mono font-bold bg-blue-600 text-white px-2.5 py-1 rounded-lg hover:bg-blue-700 transition-all flex items-center gap-1"
        >
          <Play className="w-3 h-3 fill-white" />
          <span>Run Agent</span>
        </Link>
      </div>

      <h3 className="text-[15px] font-bold text-zinc-900 mb-1.5">One-click Employee Onboarding</h3>
      <p className="text-[12px] text-zinc-600 leading-relaxed mb-4">
        Automatically provision accounts, access permissions, and software in seconds.
      </p>

      <div className="space-y-1.5">
        {steps.map((s, i) => {
          const done = i < active;
          const current = i === active;
          return (
            <div key={s} className="flex items-center justify-between px-2.5 py-1.5 rounded bg-zinc-50 border border-zinc-200/80">
              <span className={`text-[11px] font-mono ${done ? "text-zinc-700 font-medium" : current ? "text-blue-700 font-bold" : "text-zinc-400"}`}>
                {s}
              </span>
              <span className={`text-[10px] font-mono ${done ? "text-emerald-600 font-bold" : current ? "text-blue-600 font-bold animate-pulse" : "text-zinc-400"}`}>
                {done ? "✓ Done" : current ? "Processing..." : "Pending"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KnowledgeCardInteractive() {
  const nodes = [
    { label: "Senior Staff", desc: "Transcripts & Meeting Records" },
    { label: "Docs", desc: "PDF & Policy Index" },
    { label: "AI Agent", desc: "Active Knowledge Synthesizer" },
    { label: "Graph", desc: "HNSW Semantic Knowledge Mesh" },
    { label: "Hire", desc: "Instant Access for New Employees" },
  ];
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % nodes.length);
    }, 2200);
    return () => clearInterval(iv);
  }, [nodes.length]);

  const activeNode = nodes[activeIdx];

  return (
    <div className="cpu-burn-card p-6 h-full bg-white border border-zinc-200/90 rounded-2xl shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
          <Brain className="w-5 h-5" />
        </div>
        <Link
          href="/knowledge"
          className="text-[10px] font-mono font-bold bg-blue-600 text-white px-2.5 py-1 rounded-lg hover:bg-blue-700 transition-all flex items-center gap-1"
        >
          <ArrowUpRight className="w-3 h-3" />
          <span>Try Engine</span>
        </Link>
      </div>
      <h3 className="text-[15px] font-bold text-zinc-900 mb-1.5">Knowledge Transfer Engine</h3>
      <p className="text-[12px] text-zinc-600 leading-relaxed mb-3">
        Capture senior employee knowledge, meeting notes, and codebases into an active graph.
      </p>

      <div className="flex flex-wrap gap-1 mb-3">
        {nodes.map((n, idx) => (
          <button
            key={n.label}
            onClick={() => setActiveIdx(idx)}
            className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-all ${
              activeIdx === idx
                ? "bg-blue-600 text-white border-blue-600 font-bold shadow-xs"
                : "bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200"
            }`}
          >
            {n.label}
          </button>
        ))}
      </div>

      <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl text-[11px] font-mono text-blue-900">
        <span className="font-bold">{activeNode.label}:</span> {activeNode.desc}
      </div>
    </div>
  );
}

function AutomationCardInteractive() {
  const [activeTab, setActiveTab] = useState(0);
  const stages = [
    { title: "Live Agent Workflow", detail: "Multi-agent kernel orchestrates the end-to-end hiring pipeline autonomously." },
    { title: "Resume Intelligence", detail: "Parses bulk resumes, extracting ATS scores, skills, and contact signals." },
    { title: "Candidate Processing", detail: "Matches requirements, generates assignments, and evaluates submissions." },
    { title: "Human Review & Approval", detail: "HR & hiring managers confirm every candidate before onboarding fires." },
    { title: "Hiring Automation", detail: "Onboarding and knowledge transfer agents run automatically on approval." },
  ];

  useEffect(() => {
    const iv = setInterval(() => {
      setActiveTab((prev) => (prev + 1) % stages.length);
    }, 2400);
    return () => clearInterval(iv);
  }, [stages.length]);

  return (
    <div className="cpu-burn-card p-6 h-full bg-gradient-to-br from-amber-50/80 via-yellow-50/40 to-amber-50/60 border border-amber-200/90 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
      
      {/* ── Background Premium Doodles & Subtle Rays ── */}
      {/* Sparkle Doodle Overlay */}
      <svg
        className="absolute -top-3 -right-3 w-28 h-28 text-amber-500/20 pointer-events-none group-hover:scale-105 transition-transform duration-700"
        viewBox="0 0 100 100"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="4 4"
      >
        <path d="M 50 10 Q 65 35 90 50 Q 65 65 50 90 Q 35 65 10 50 Q 35 35 50 10 Z" />
        <circle cx="50" cy="50" r="10" fill="currentColor" fillOpacity="0.08" />
      </svg>

      {/* Hand-drawn Star Doodle */}
      <svg
        className="absolute bottom-2 right-1/3 w-16 h-16 text-yellow-600/12 pointer-events-none"
        viewBox="0 0 80 80"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M 40 10 L 44 28 L 62 28 L 47 38 L 53 56 L 40 45 L 27 56 L 33 38 L 18 28 L 36 28 Z" />
        <path d="M 12 15 L 18 25 M 68 15 L 62 25" strokeDasharray="2 2" />
      </svg>

      {/* Subtle Glow Rays */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-amber-200/20 rounded-bl-full pointer-events-none blur-lg" />

      {/* ── Card Content ── */}
      <div className="flex flex-col md:flex-row gap-6 relative z-10">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100/90 border border-amber-200/90 flex items-center justify-center text-amber-700 shadow-xs">
              <Bot className="w-5 h-5" />
            </div>
            <Link
              href="/hiring-automation"
              className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-mono font-bold bg-zinc-900 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 transition-all shadow-sm"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>Test Power</span>
            </Link>
          </div>
          <h3 className="text-[16px] font-bold text-zinc-900 mb-2">Enterprise Automation Agent</h3>
          <p className="text-[13px] text-zinc-600 leading-relaxed mb-4">
            Autonomous multi-step reasoning, MCP tool selection, human-in-the-loop approvals, and deterministic execution — see it run a full agentic hiring pipeline.
          </p>

          <div className="p-3 bg-white/90 backdrop-blur-sm border border-amber-200/80 rounded-xl text-xs font-mono text-zinc-800 shadow-xs">
            <div className="font-bold text-amber-800 mb-1 flex items-center justify-between">
              <span>{stages[activeTab].title}</span>
              <span className="text-[10px] text-amber-700/80 font-normal">STEP {activeTab + 1}/4</span>
            </div>
            <div className="text-[11px] text-zinc-600">{stages[activeTab].detail}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-1 gap-1.5 md:w-48 shrink-0">
          {stages.map((s, i) => (
            <button
              key={s.title}
              onClick={() => setActiveTab(i)}
              className={`p-2 rounded-lg border text-left text-[11px] font-mono transition-all ${
                activeTab === i
                  ? "bg-amber-500 text-zinc-950 font-bold border-amber-500 shadow-xs"
                  : "bg-white/80 text-zinc-700 border-zinc-200/80 hover:bg-amber-100/40"
              }`}
            >
              {s.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReportsCardWhite({ onOpenReport }: { onOpenReport: () => void }) {
  const metrics = [
    { label: "Automations", value: 1245, suffix: "" },
    { label: "Hours Saved", value: 312, suffix: "" },
    { label: "Docs Indexed", value: 95, suffix: "K" },
    { label: "Cost Saved", value: 18, suffix: "K" },
  ];

  return (
    <div className="cpu-burn-card p-6 h-full bg-white border border-zinc-200/90 rounded-2xl shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
          <BarChart3 className="w-5 h-5" />
        </div>
        <button
          onClick={onOpenReport}
          className="text-[10px] font-mono font-bold bg-blue-600 text-white px-2.5 py-1 rounded-lg hover:bg-blue-700 transition-all flex items-center gap-1"
        >
          <ArrowUpRight className="w-3 h-3" />
          <span>Try</span>
        </button>
      </div>
      <h3 className="text-[15px] font-bold text-zinc-900 mb-3">Weekly Executive Insights</h3>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {metrics.map((m) => (
          <div key={m.label} className="bg-zinc-50 border border-zinc-200 rounded-lg p-2.5">
            <div className="text-[14px] font-bold text-zinc-900 font-mono">
              <StatSpan end={m.value} suffix={m.suffix} />
            </div>
            <div className="text-[10px] text-zinc-500 font-medium">{m.label}</div>
          </div>
        ))}
      </div>
      <div className="text-[10px] text-zinc-500 font-mono flex items-center gap-1.5">
        <Activity className="w-3 h-3 text-blue-600" /> Executive Digest dispatched weekly
      </div>
    </div>
  );
}

function StatSpan({ end, suffix }: { end: number; suffix: string }) {
  const { count, ref } = useCountUp(end);
  return (
    <span>
      <span ref={ref}>{count.toLocaleString()}</span>
      {suffix}
    </span>
  );
}

/* ── Security folder taxonomy — mirrors what a real enterprise security/compliance
   surface tracks. Each "folder" drills down into the concrete data points it covers. ── */
const SECURITY_CATEGORY_LABELS = [
  "Role Based Access Control (RBAC)",
  "Audit Logs",
  "Activity Monitoring",
  "Backup & Disaster Recovery",
  "Secure File Uploads",
];

function SecurityCardWhite() {
  return (
    <div className="cpu-burn-card p-6 h-full bg-white border border-zinc-200/90 rounded-2xl shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
          <Shield className="w-5 h-5" />
        </div>
        <Link
          href="/security"
          className="text-[10px] font-mono font-bold bg-blue-600 text-white px-2.5 py-1 rounded-lg hover:bg-blue-700 transition-all flex items-center gap-1"
        >
          <FolderOpen className="w-3 h-3" />
          <span>View</span>
        </Link>
      </div>
      <h3 className="text-[15px] font-bold text-zinc-900 mb-3">Enterprise Ready Security</h3>
      <div className="space-y-1.5">
        {SECURITY_CATEGORY_LABELS.map((item) => (
          <div key={item} className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-700 bg-zinc-50 px-2.5 py-1.5 rounded-lg border border-zinc-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 3. NATIVE INTEGRATIONS CARD WITH BRAND ICONS ── */
function IntegrationsCardInteractive() {
  const integrations = [
    { name: "Teams", icon: <MessageSquare className="w-3.5 h-3.5 text-indigo-600" /> },
    { name: "Slack", icon: <Users className="w-3.5 h-3.5 text-purple-600" /> },
    { name: "Jira", icon: <CheckSquare className="w-3.5 h-3.5 text-blue-600" /> },
    { name: "GitHub", icon: <GithubIcon className="w-3.5 h-3.5 text-zinc-800" /> },
    { name: "Salesforce", icon: <Cloud className="w-3.5 h-3.5 text-sky-500" /> },
    { name: "SAP", icon: <Server className="w-3.5 h-3.5 text-blue-800" /> },
    { name: "SharePoint", icon: <Share2 className="w-3.5 h-3.5 text-teal-600" /> },
    { name: "MCP", icon: <Plug className="w-3.5 h-3.5 text-amber-600" /> },
  ];

  return (
    <div className="cpu-burn-card p-6 h-full flex flex-col justify-between bg-white border border-zinc-200/90 rounded-2xl shadow-sm">
      <div>
        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4 text-blue-600">
          <Globe className="w-5 h-5" />
        </div>
        <h3 className="text-[15px] font-bold text-zinc-900 mb-1.5">18+ Native Integrations</h3>
        <p className="text-[12px] text-zinc-600 leading-relaxed mb-4">
          Teams, Slack, Jira, GitHub, Salesforce, SAP, SharePoint, and custom MCP connectors.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {integrations.map((item) => (
          <span
            key={item.name}
            className="text-[11px] font-mono px-2.5 py-1.5 rounded-lg bg-zinc-50 text-zinc-800 border border-zinc-200 flex items-center gap-1.5 shadow-2xs hover:bg-blue-50 hover:border-blue-200 transition-colors"
          >
            {item.icon}
            <span className="font-semibold">{item.name}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function WorkflowTimelineFloatingPipeline({ onOpenModal }: { onOpenModal: () => void }) {
  const steps = [
    { num: 1, title: "Connect Apps", detail: "Initializes enterprise webhook listeners and active OAuth2 handshakes." },
    { num: 2, title: "Import Knowledge", detail: "Streams unstructured PDF documents into semantic OCR chunking parser." },
    { num: 3, title: "Index Vectors", detail: "Generates high-dimensional vector embeddings with HNSW cosine similarity." },
    { num: 4, title: "Deploy AI Agents", detail: "Spawns autonomous agent reasoning kernel with state memory buffer." },
    { num: 5, title: "Automate Workflows", detail: "Executes tool selection matrix across GitHub, Jira, SAP, and Slack." },
    { num: 6, title: "Human Approval", detail: "Enforces Level 4 manager authorization gate before system mutation." },
    { num: 7, title: "Execute Actions", detail: "Dispatches signed idempotent API transactions with full audit logging." },
    { num: 8, title: "Analytics Dashboard", detail: "Aggregates latency throughput, token metrics, and cost savings." },
  ];

  const [activeStep, setActiveStep] = useState(1);

  useEffect(() => {
    const iv = setInterval(() => {
      setActiveStep((prev) => (prev % steps.length) + 1);
    }, 2500);
    return () => clearInterval(iv);
  }, [steps.length]);

  const current = steps[activeStep - 1];

  return (
    <div className="mt-12 space-y-6">
      <div className="relative p-2 bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="h-1 bg-zinc-100 rounded-full relative overflow-hidden mb-4 mx-2">
          <div
            className="h-full bg-blue-600 transition-all duration-500 rounded-full"
            style={{ width: `${(activeStep / steps.length) * 100}%` }}
          />
          <div className="absolute top-0 bottom-0 w-8 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-track-packet" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
          {steps.map((s) => {
            const isActive = activeStep === s.num;
            const isPassed = s.num < activeStep;

            return (
              <div
                key={s.title}
                onClick={() => setActiveStep(s.num)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer font-mono text-xs flex flex-col justify-between h-20 relative overflow-hidden ${
                  isActive
                    ? "bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-400/30"
                    : isPassed
                    ? "bg-blue-50/50 text-blue-900 border-blue-200"
                    : "bg-white text-zinc-800 border-zinc-200 hover:border-blue-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center ${isActive ? "bg-white text-blue-600" : isPassed ? "bg-blue-200 text-blue-800" : "bg-blue-50 text-blue-600"}`}>
                    {s.num}
                  </span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
                </div>
                <span className="font-bold text-[11px] truncate">{s.title}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-mono text-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-bold uppercase text-[10px]">
              FLOATING DATA PACKET :: STAGE {current.num} OF 8
            </span>
            <span className="text-emerald-600 font-bold flex items-center gap-1 text-[10px]">
              <Radio className="w-3 h-3 animate-pulse text-emerald-500" /> ACTIVE DATA STREAM
            </span>
          </div>
          <div className="text-sm font-bold text-zinc-900">{current.title}</div>
          <div className="text-zinc-600 leading-relaxed text-[11px] max-w-xl">{current.detail}</div>
        </div>

        <button
          onClick={onOpenModal}
          className="shrink-0 px-4 py-2.5 rounded-xl bg-zinc-900 text-white font-bold hover:bg-blue-600 transition-colors shadow-sm text-xs"
        >
          Inspect Architecture Modal ↗
        </button>
      </div>
    </div>
  );
}

function StatCardWhite({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const { count, ref } = useCountUp(value);
  return (
    <div className="cpu-burn-card rounded-2xl bg-white border border-zinc-200 p-6 text-center shadow-sm">
      <div className="text-[clamp(2.2rem,4vw,3rem)] font-extrabold text-blue-600 tracking-tight mb-1 font-mono">
        <span ref={ref}>{count}</span>
        {suffix}
      </div>
      <p className="text-[13px] font-semibold text-zinc-700">{label}</p>
    </div>
  );
}
