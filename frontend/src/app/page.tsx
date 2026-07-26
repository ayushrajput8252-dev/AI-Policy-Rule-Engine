"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  Database, UserPlus, Brain, Bot, BarChart3, Shield,
  ArrowRight, Menu, X, Zap, Users, Globe, CheckCircle2,
  Sparkles, Search, FileText, Cpu, Activity, Play, ArrowUpRight, Crosshair, Network
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

function useCycleText(texts: string[], interval = 2200) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % texts.length), interval);
    return () => clearInterval(id);
  }, [texts.length, interval]);
  return texts[idx];
}

export default function LandingPage() {
  const [mobileMenu, setMobileMenu] = useState(false);
  const [archModalOpen, setArchModalOpen] = useState(false);

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
                  Autonomous Policy
                  <DoodleUnderline className="absolute left-0 -bottom-2.5 w-full text-blue-600" />
                </span>
                <br />
                & RAG Engine
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
            </div>

            {/* Right Column: Hero Agent Matrix */}
            <div className="hidden lg:block relative">
              <HeroAgentMatrix />
            </div>
          </div>
        </div>
      </section>

      {/* ─── CAPABILITIES BENTO GRID ─── */}
      <section id="capabilities" className="py-20 relative z-10 border-t border-zinc-200/80 bg-zinc-50/50">
        <div className="max-w-6xl mx-auto px-6">
          <SectionHeader
            badge="Platform Capabilities"
            title="Engineered for High-Consequence Enterprise Scale"
            subtitle="Autonomous reasoning, RAG vector indexing, and zero-trust orchestration."
          />

          <div className="grid md:grid-cols-3 gap-6 mt-14">
            {/* Card 1: RAG (Interactive Vector Console) */}
            <div className="md:col-span-2">
              <RAGCardInteractive />
            </div>

            {/* Card 2: Onboarding */}
            <OnboardingCardInteractive />

            {/* Card 3: Knowledge Graph Engine */}
            <KnowledgeCardInteractive />

            {/* Card 4: Automation Agent */}
            <div className="md:col-span-2">
              <AutomationCardInteractive />
            </div>

            {/* Card 5: Reports */}
            <ReportsCardWhite />

            {/* Card 6: Security */}
            <SecurityCardWhite />

            {/* Card 7: Integrations */}
            <IntegrationsCardInteractive />
          </div>
        </div>
      </section>

      {/* ─── WORKFLOW ARCHITECTURE TIMELINE ─── */}
      <section id="architecture" className="py-28 border-t border-zinc-200/80 bg-zinc-50/50">
        <div className="max-w-6xl mx-auto px-6">
          <SectionHeader
            badge="Interactive Agent Pipeline"
            title="From Knowledge Import to Automated Action"
            subtitle="Continuous, deterministic AI orchestration pipeline."
          />
          <WorkflowTimelineInteractive onOpenModal={() => setArchModalOpen(true)} />
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

      {/* ─── ARCHITECTURE MODAL ─── */}
      <AnimatePresence>
        {archModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.96, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 15 }}
              className="bg-white border border-zinc-300 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans"
            >
              <div className="p-4 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-bold text-zinc-900">
                    AgenticFlow AI System Architecture
                  </span>
                </div>
                <button
                  onClick={() => setArchModalOpen(false)}
                  className="p-1 rounded-md hover:bg-zinc-200 text-zinc-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
                <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200">
                  <div className="text-xs font-mono font-bold text-blue-800 mb-1">
                    ● DETERMINISTIC MULTI-AGENT EXECUTION PIPELINE
                  </div>
                  <p className="text-xs text-blue-900 leading-relaxed">
                    Click any node in the architecture pipeline to view live vector metrics and tool execution protocols.
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    { title: "1. Document Ingestion", sub: "PDF / OCR / SharePoint Parse", latency: "14ms" },
                    { title: "2. Vector Embedding Engine", sub: "Hybrid Qdrant / Chroma Rerank", latency: "22ms" },
                    { title: "3. Multi-Agent Reasoning", sub: "Claude 3.5 Sonnet / GPT-4o DAG", latency: "180ms" },
                    { title: "4. Tool & MCP Orchestration", sub: "Slack, Jira, GitHub, SAP APIs", latency: "45ms" },
                    { title: "5. Human Gate Approval", sub: "RBAC Zero-Trust Audit Log", latency: "Immediate" },
                    { title: "6. Deterministic Output", sub: "JSON Payload & Action Dispatch", latency: "8ms" },
                  ].map((node) => (
                    <div
                      key={node.title}
                      className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 hover:border-blue-500 hover:bg-white transition-all cursor-pointer shadow-sm"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-zinc-900">{node.title}</span>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          {node.latency}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-600 font-mono">{node.sub}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between">
                <span className="text-xs font-mono text-zinc-600">System Status: 100% Operational</span>
                <Link
                  href="/rag"
                  onClick={() => setArchModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors"
                >
                  Test in /rag Workspace →
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

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

function HeroAgentMatrix() {
  const status = useCycleText(
    ["Thinking...", "Querying Vector DB...", "Orchestrating MCP Tools...", "Executing Action...", "Awaiting Verification...", "Completed ✓"],
    2000
  );

  const nodes = [
    { label: "Employee Request", sub: "Slack / Teams Webhook", icon: <Users className="w-3.5 h-3.5 text-blue-600" /> },
    { label: "AI Reasoning Agent", sub: "Claude 3.5 Sonnet / GPT-4o", icon: <Bot className="w-3.5 h-3.5 text-blue-600" /> },
    { label: "Advanced RAG Engine", sub: "Hybrid Retrieval + Vector Rank", icon: <Database className="w-3.5 h-3.5 text-blue-600" /> },
    { label: "Enterprise Knowledge Base", sub: "SharePoint & Confluence Index", icon: <Brain className="w-3.5 h-3.5 text-blue-600" /> },
    { label: "Integrated Business Apps", sub: "GitHub, Jira, SAP, Salesforce", icon: <Globe className="w-3.5 h-3.5 text-blue-600" /> },
    { label: "Automated Action Dispatcher", sub: "Deterministic Execution", icon: <Zap className="w-3.5 h-3.5 text-blue-600" /> },
  ];

  return (
    <div className="rounded-2xl bg-white border border-zinc-200 p-6 shadow-xl relative">
      <div className="flex items-center justify-between border-b border-zinc-200 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-agent-pulse" />
          <span className="text-xs font-mono font-bold text-zinc-900 uppercase tracking-wider">Agent Trace Log</span>
        </div>
        <AnimatePresence mode="wait">
          <motion.span
            key={status}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            className="text-[11px] font-mono text-blue-600 font-semibold px-2 py-0.5 rounded bg-blue-50 border border-blue-100"
          >
            {status}
          </motion.span>
        </AnimatePresence>
      </div>

      <div className="space-y-1">
        {nodes.map((n, i) => (
          <div key={n.label}>
            <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-zinc-50 transition-colors border border-transparent hover:border-zinc-200/80">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200/80 flex items-center justify-center shrink-0">
                  {n.icon}
                </div>
                <div>
                  <div className="text-xs font-semibold text-zinc-800">{n.label}</div>
                  <div className="text-[10px] text-zinc-500 font-mono">{n.sub}</div>
                </div>
              </div>
              <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                ACTIVE
              </span>
            </div>

            {i < nodes.length - 1 && (
              <div className="flex justify-center h-4 relative">
                <div className="w-px h-full bg-blue-200" />
                <div
                  className="absolute w-1.5 h-1.5 rounded-full bg-blue-600 animate-data-packet"
                  style={{ animationDelay: `${i * 0.3}s` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── HIGHLY INTERACTIVE RAG CARD ── */
function RAGCardInteractive() {
  const sampleQueries = [
    { query: "Expense Policy Limits", match: 98.4, chunks: 4, page: 2, bbox: "[120, 40, 300, 80]" },
    { query: "Termination Notice Period", match: 94.2, chunks: 3, page: 5, bbox: "[60, 100, 280, 60]" },
    { query: "NDA & IP Ownership", match: 99.1, chunks: 5, page: 1, bbox: "[90, 30, 350, 90]" },
    { query: "Remote Work Stipend", match: 96.8, chunks: 4, page: 3, bbox: "[110, 80, 320, 70]" },
  ];
  const [selectedIdx, setSelectedIdx] = useState(0);
  const currentQ = sampleQueries[selectedIdx];

  return (
    <div className="p-6 h-full flex flex-col justify-between bg-white border border-zinc-200/90 rounded-2xl shadow-sm hover:border-blue-300 transition-colors">
      <div>
        {/* Highlighted Feature Badges */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
            🎯 Hybrid Vector Search
          </span>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
            📌 Page BBox Citations
          </span>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200">
            ⚡ Top-K Retrieval
          </span>
        </div>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-[16px] font-bold text-zinc-900">Advanced Enterprise RAG Engine</h3>
            <p className="text-[11px] font-mono text-zinc-500">Realtime Vector Indexing & Source Target Mapping</p>
          </div>
        </div>

        <p className="text-[13px] text-zinc-600 leading-relaxed mb-4">
          Index millions of PDFs, policies, and SharePoint files with semantic search, hybrid reranking, and exact page bounding-box target citations.
        </p>

        {/* Interactive Query Switcher Bar */}
        <div className="space-y-2 mb-4">
          <div className="text-[11px] font-mono font-bold text-zinc-700 flex items-center justify-between">
            <span>Simulate Real Vector Queries:</span>
            <span className="text-blue-600">Click to test →</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {sampleQueries.map((q, i) => (
              <button
                key={q.query}
                onClick={(e) => {
                  e.preventDefault();
                  setSelectedIdx(i);
                }}
                className={`text-[11px] font-mono px-3 py-2 rounded-xl border text-left transition-all flex items-center justify-between ${
                  selectedIdx === i
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm font-bold"
                    : "bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100"
                }`}
              >
                <span className="truncate">🔍 {q.query}</span>
                {selectedIdx === i && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
              </button>
            ))}
          </div>
        </div>

        {/* Live Vector Match Box */}
        <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2 font-mono text-xs mb-4">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-zinc-500">Selected Vector Target:</span>
            <span className="font-bold text-zinc-900">{currentQ.query}</span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-zinc-500">Cosine Similarity Score:</span>
              <span className="font-bold text-blue-600">{currentQ.match}% Match</span>
            </div>
            <div className="h-2 rounded-full bg-zinc-200 overflow-hidden">
              <motion.div
                key={selectedIdx}
                initial={{ width: 0 }}
                animate={{ width: `${currentQ.match}%` }}
                transition={{ duration: 0.6 }}
                className="h-full bg-blue-600 rounded-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 border-t border-zinc-200/80 text-zinc-600">
            <div>
              <span className="text-zinc-400">Target Location:</span> <strong className="text-zinc-800">Page {currentQ.page}</strong>
            </div>
            <div>
              <span className="text-zinc-400">BBox:</span> <strong className="text-blue-700">{currentQ.bbox}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
        <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-600 font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>Bounding Box Crosshair Mapped</span>
        </div>

        <Link
          href="/rag"
          className="inline-flex items-center gap-1 text-xs font-mono font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200"
        >
          <span>Open Full /rag Workspace</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
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
    <div className="p-6 h-full bg-white border border-zinc-200/90 rounded-2xl shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
          <UserPlus className="w-5 h-5" />
        </div>
        <button
          onClick={runTrigger}
          disabled={isRunning}
          className="text-[10px] font-mono font-bold bg-blue-600 text-white px-2.5 py-1 rounded-lg hover:bg-blue-700 transition-all flex items-center gap-1 disabled:opacity-50"
        >
          <Play className="w-3 h-3 fill-white" />
          <span>{isRunning ? "Running..." : "Run Agent"}</span>
        </button>
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

/* ── HIGHLY INTERACTIVE KNOWLEDGE TRANSFER CARD ── */
function KnowledgeCardInteractive() {
  const nodes = [
    { label: "Senior Staff", desc: "Transcripts & Meeting Records", metrics: "142 Records Synced" },
    { label: "Docs & PDFs", desc: "Unstructured Document Index", metrics: "8,420 Pages Parsed" },
    { label: "Vector Mesh", desc: "HNSW Semantic Knowledge Mesh", metrics: "12,400 Knowledge Triples" },
    { label: "AI Agent", desc: "Active Knowledge Synthesizer", metrics: "Context Buffer Ready" },
    { label: "New Hire", desc: "Instant Day 1 Q&A Answers", metrics: "0.2s Retrieval Speed" },
  ];
  const [activeIdx, setActiveIdx] = useState(2);
  const currentNode = nodes[activeIdx];

  return (
    <div className="p-6 h-full flex flex-col justify-between bg-white border border-zinc-200/90 rounded-2xl shadow-sm hover:border-blue-300 transition-colors">
      <div>
        {/* Highlighted Feature Badges */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
            🎙️ Meeting OCR
          </span>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
            🧠 Brain Graph
          </span>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
            ⚡ Instant RAG
          </span>
        </div>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-zinc-900">Knowledge Transfer Engine</h3>
            <p className="text-[11px] font-mono text-zinc-500">Autonomous Knowledge Graph Mesh</p>
          </div>
        </div>

        <p className="text-[12px] text-zinc-600 leading-relaxed mb-4">
          Capture senior employee knowledge, meeting transcripts, and codebases into an active graph for instant team onboarding.
        </p>

        {/* Node Switcher Pills */}
        <div className="space-y-1.5 mb-3">
          <div className="text-[10px] font-mono font-bold text-zinc-600">Inspect Knowledge Mesh Nodes:</div>
          <div className="flex flex-wrap gap-1">
            {nodes.map((n, i) => (
              <button
                key={n.label}
                onClick={() => setActiveIdx(i)}
                className={`text-[10px] font-mono px-2.5 py-1 rounded-lg border transition-all ${
                  activeIdx === i
                    ? "bg-blue-600 text-white border-blue-600 font-bold shadow-sm"
                    : "bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100"
                }`}
              >
                {n.label}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Node Details Box */}
        <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-mono text-zinc-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-blue-600">● {currentNode.label}</span>
            <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-bold">
              {currentNode.metrics}
            </span>
          </div>
          <p className="text-[11px] text-zinc-600">{currentNode.desc}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 pt-3 border-t border-zinc-100 text-[11px] font-mono text-zinc-500">
        <Network className="w-3.5 h-3.5 text-blue-600" />
        <span>Graph mesh synced in real-time</span>
      </div>
    </div>
  );
}

function AutomationCardInteractive() {
  const [activeTab, setActiveTab] = useState(0);
  const stages = [
    { title: "1. Intent Parsing", detail: "NL Query parsed into structured AST intent." },
    { title: "2. Tool Selection", detail: "MCP Registry dispatched [GitHub, Jira, Slack]." },
    { title: "3. Approval Gate", detail: "Human RBAC Level 4 Authorization passed." },
    { title: "4. Execution", detail: "Deterministic API Transaction dispatched." },
  ];

  return (
    <div className="p-6 h-full bg-white border border-zinc-200/90 rounded-2xl shadow-sm">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4 text-blue-600">
            <Bot className="w-5 h-5" />
          </div>
          <h3 className="text-[16px] font-bold text-zinc-900 mb-2">Enterprise Automation Agent</h3>
          <p className="text-[13px] text-zinc-600 leading-relaxed mb-4">
            Autonomous multi-step reasoning, MCP tool selection, human-in-the-loop approvals, and deterministic execution.
          </p>

          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-mono text-zinc-800">
            <div className="font-bold text-blue-600 mb-1">{stages[activeTab].title}</div>
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
                  ? "bg-blue-600 text-white border-blue-600 font-bold shadow-sm"
                  : "bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100"
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

function ReportsCardWhite() {
  const metrics = [
    { label: "Automations", value: 1245, suffix: "" },
    { label: "Hours Saved", value: 312, suffix: "" },
    { label: "Docs Indexed", value: 95, suffix: "K" },
    { label: "Cost Saved", value: 18, suffix: "K" },
  ];

  return (
    <div className="p-6 h-full bg-white border border-zinc-200/90 rounded-2xl shadow-sm">
      <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4 text-blue-600">
        <BarChart3 className="w-5 h-5" />
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

function SecurityCardWhite() {
  const items = ["SSO / SAML", "RBAC", "Audit Logs", "AES-256", "GDPR", "SOC2 Type II"];
  return (
    <div className="p-6 h-full bg-white border border-zinc-200/90 rounded-2xl shadow-sm">
      <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4 text-blue-600">
        <Shield className="w-5 h-5" />
      </div>
      <h3 className="text-[15px] font-bold text-zinc-900 mb-3">Enterprise Ready Security</h3>
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => (
          <div key={item} className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-700 bg-zinc-50 px-2 py-1 rounded border border-zinc-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function IntegrationsCardInteractive() {
  return (
    <div className="p-6 h-full flex flex-col justify-between bg-white border border-zinc-200/90 rounded-2xl shadow-sm">
      <div>
        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4 text-blue-600">
          <Globe className="w-5 h-5" />
        </div>
        <h3 className="text-[15px] font-bold text-zinc-900 mb-1.5">18+ Native Integrations</h3>
        <p className="text-[12px] text-zinc-600 leading-relaxed">
          Teams, Slack, Jira, GitHub, Salesforce, SAP, SharePoint, and custom MCP connectors.
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-4">
        {["Teams", "Slack", "Jira", "GitHub", "SAP"].map((n) => (
          <span key={n} className="text-[10px] font-mono px-2 py-1 rounded bg-zinc-50 text-zinc-800 border border-zinc-200">
            {n}
          </span>
        ))}
      </div>
    </div>
  );
}

function WorkflowTimelineInteractive({ onOpenModal }: { onOpenModal: () => void }) {
  const steps = [
    { num: 1, title: "Connect Enterprise Apps" },
    { num: 2, title: "Import Knowledge & Policy" },
    { num: 3, title: "Index Document Vectors" },
    { num: 4, title: "Deploy AI Agents" },
    { num: 5, title: "Automate Workflows" },
    { num: 6, title: "Human Approval Gate" },
    { num: 7, title: "Execute Actions" },
    { num: 8, title: "Analytics Dashboard" },
  ];

  return (
    <div className="mt-12 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
        {steps.map((s) => (
          <div
            key={s.title}
            onClick={onOpenModal}
            className="p-3 rounded-xl border border-zinc-200 bg-white hover:border-blue-400 transition-all cursor-pointer font-mono text-xs flex flex-col justify-between h-20 shadow-sm"
          >
            <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 font-bold text-[10px] flex items-center justify-center">
              {s.num}
            </div>
            <span className="font-bold text-[11px] text-zinc-800">{s.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCardWhite({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const { count, ref } = useCountUp(value);
  return (
    <div className="rounded-2xl bg-white border border-zinc-200 p-6 text-center shadow-sm hover:shadow-md transition-shadow">
      <div className="text-[clamp(2.2rem,4vw,3rem)] font-extrabold text-blue-600 tracking-tight mb-1 font-mono">
        <span ref={ref}>{count}</span>
        {suffix}
      </div>
      <p className="text-[13px] font-semibold text-zinc-700">{label}</p>
    </div>
  );
}
