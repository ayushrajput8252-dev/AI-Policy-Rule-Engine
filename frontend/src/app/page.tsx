"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  motion,
  useInView,
  AnimatePresence,
} from "framer-motion";
import {
  Database, UserPlus, Brain, Bot, BarChart3, Shield,
  ChevronDown, ArrowRight, Menu, X, Zap, Users,
  Globe, CheckCircle2, Sparkles, Search, FileText,
  Lock, Cpu, Activity, Terminal, Code2, Layers, Check,
  Play, RefreshCw, Radio, ExternalLink, Sliders, Server, ArrowUpRight
} from "lucide-react";

/* ── Inline GitHub Icon ── */
function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   RICH SVG DOODLES & SKETCH ANNOTATIONS
   ═══════════════════════════════════════════════════════════════ */

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

function DoodleArrow({ className = "w-12 h-12 text-blue-600" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M8 48C20 32 35 18 50 12M50 12L34 10M50 12L46 26"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DoodleSparkle({ className = "w-6 h-6 text-blue-500" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 2v20M2 12h20M5 5l14 14M5 19L19 5" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CUSTOM HOOKS (ZERO LAG)
   ═══════════════════════════════════════════════════════════════ */

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

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function LandingPage() {
  const [mobileMenu, setMobileMenu] = useState(false);
  const [archModalOpen, setArchModalOpen] = useState(false);

  const navLinks = ["Platform", "Capabilities", "Architecture", "Docs", "Pricing"];

  return (
    <div className="min-h-screen bg-white text-zinc-900 overflow-x-hidden bg-white-grid relative selection:bg-blue-500/20">
      {/* ─── NAVIGATION ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50">
        <div className="absolute inset-0 bg-white/80 backdrop-blur-md border-b border-zinc-200/80" />
        <div className="relative max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4 text-blue-400" />
            </div>
            <span className="font-bold text-[15px] tracking-tight text-zinc-900">
              Enterprise <span className="text-blue-600 font-mono text-xs uppercase ml-1 px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200">Agentic</span>
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((l) => (
              <a
                key={l}
                href={`#${l.toLowerCase()}`}
                className="px-3.5 py-1.5 text-[13px] font-medium text-zinc-600 hover:text-zinc-900 transition-colors rounded-md hover:bg-zinc-100/80"
              >
                {l}
              </a>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="p-2 text-zinc-600 hover:text-zinc-900 transition-colors rounded-lg hover:bg-zinc-100"
            >
              <GithubIcon className="w-4 h-4" />
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
                  key={l}
                  href={`#${l.toLowerCase()}`}
                  onClick={() => setMobileMenu(false)}
                  className="block py-2 text-sm text-zinc-700 hover:text-blue-600 font-medium"
                >
                  {l}
                </a>
              ))}
              <button
                onClick={() => {
                  setMobileMenu(false);
                  setArchModalOpen(true);
                }}
                className="mt-3 w-full text-sm font-medium bg-zinc-900 text-white px-4 py-2.5 rounded-lg text-center"
              >
                View Architecture
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ─── HERO SECTION ─── */}
      <section className="relative pt-28 pb-16 md:pt-36 md:pb-24 overflow-hidden z-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-[1fr_440px] gap-12 items-start">
            {/* Left Column */}
            <div className="pt-4 relative">
              <div className="absolute -top-8 left-0 hidden md:flex items-center gap-1.5 text-xs text-blue-700 font-mono bg-blue-50 border border-blue-200 px-3 py-1 rounded-full animate-doodle-float">
                <DoodleSparkle className="w-3.5 h-3.5 text-blue-600" />
                <span>Next-Gen Autonomous Enterprise Agents</span>
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-200 bg-zinc-50 mb-6">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[12px] font-medium text-zinc-600">Enterprise AI Engine v4.2 Ready</span>
              </div>

              <h1 className="text-[clamp(2.3rem,5vw,3.6rem)] font-extrabold leading-[1.08] tracking-tight text-zinc-900 mb-6">
                Enterprise AI{" "}
                <span className="relative inline-block text-blue-600">
                  Automation Agent
                  <DoodleUnderline className="absolute left-0 -bottom-2.5 w-full text-blue-600" />
                </span>
                <br />
                Platform for Modern Work
              </h1>

              <p className="text-[16px] text-zinc-600 leading-relaxed mb-10 max-w-lg">
                Automate complex enterprise workflows, orchestrate autonomous AI agents, index organizational knowledge with RAG, and scale secure execution across all systems.
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

              <div className="mt-10 flex items-center gap-3 pt-6 border-t border-zinc-200/80">
                <DoodleArrow className="w-8 h-8 text-zinc-400 rotate-12" />
                <span className="text-xs font-mono text-zinc-500">
                  <strong className="text-zinc-800">100% Deterministic:</strong> Full audit logs, RBAC permissions & human-in-the-loop controls.
                </span>
              </div>
            </div>

            {/* Right Column: Hero Agent Matrix */}
            <div className="hidden lg:block relative">
              <div className="absolute -top-5 -right-3 z-20 bg-amber-100 text-amber-900 border border-amber-300 font-mono text-[11px] px-2.5 py-1 rounded-md shadow-sm transform rotate-3 flex items-center gap-1">
                <span>✦ Agent Reasoning Loop</span>
              </div>
              <HeroAgentMatrix />
            </div>
          </div>
        </div>
      </section>

      {/* ─── CAPABILITIES BENTO GRID (ULTRA AGENTIC) ─── */}
      <section id="capabilities" className="py-20 relative z-10 border-t border-zinc-200/80 bg-zinc-50/50">
        <div className="max-w-6xl mx-auto px-6">
          <SectionHeader
            badge="Platform Capabilities"
            title="Engineered for High-Consequence Enterprise Scale"
            subtitle="Autonomous reasoning, RAG vector indexing, and zero-trust orchestration."
          />

          <div className="grid md:grid-cols-3 gap-6 mt-14">
            {/* Card 1: RAG (Interactive Embedding Simulator) */}
            <div className="md:col-span-2">
              <RAGCardInteractive />
            </div>

            {/* Card 2: Onboarding (Interactive Task Provisioner) */}
            <OnboardingCardInteractive />

            {/* Card 3: Knowledge Graph (Interactive Vector Mesh) */}
            <KnowledgeCardInteractive />

            {/* Card 4: Automation Agent (Interactive Agent DAG Inspector) */}
            <div className="md:col-span-2">
              <AutomationCardInteractive />
            </div>

            {/* Card 5: Reports */}
            <ReportsCardWhite />

            {/* Card 6: Security */}
            <SecurityCardWhite />

            {/* Card 7: 18+ Integrations */}
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
              <div className="flex flex-wrap gap-1.5 mt-5">
                {["Teams", "Slack", "Jira", "GitHub", "SAP", "Outlook", "Salesforce"].map((n) => (
                  <span key={n} className="text-[10px] font-mono px-2 py-1 rounded bg-zinc-100 text-zinc-700 border border-zinc-200">
                    {n}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── INTEGRATIONS MARQUEE ─── */}
      <section className="py-20 border-t border-zinc-200/80 bg-white">
        <div className="max-w-6xl mx-auto px-6 mb-12">
          <SectionHeader
            badge="Ecosystem"
            title="Integrates Seamlessly with Your Stack"
            subtitle="No vendor lock-in. Plugs directly into your existing enterprise infrastructure."
          />
        </div>
        <div className="space-y-3">
          <div className="overflow-hidden">
            <div className="flex animate-marquee-light gap-4" style={{ width: "max-content" }}>
              {[...INTEGRATIONS, ...INTEGRATIONS].map((n, i) => (
                <IntegrationPillWhite key={`a${i}`} name={n} />
              ))}
            </div>
          </div>
          <div className="overflow-hidden">
            <div className="flex animate-marquee-reverse-light gap-4" style={{ width: "max-content" }}>
              {[...INTEGRATIONS.slice().reverse(), ...INTEGRATIONS.slice().reverse()].map((n, i) => (
                <IntegrationPillWhite key={`b${i}`} name={n} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── WORKFLOW ARCHITECTURE TIMELINE (INTERACTIVE AGENTIC SIMULATOR) ─── */}
      <section id="architecture" className="py-28 border-t border-zinc-200/80 bg-zinc-50/50">
        <div className="max-w-6xl mx-auto px-6">
          <SectionHeader
            badge="Interactive Agent Pipeline"
            title="From Knowledge Import to Automated Action"
            subtitle="Click any step below to simulate real-time agent execution protocols."
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

      {/* ─── INTERACTIVE ARCHITECTURE MODAL ─── */}
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
                    Enterprise AI Agentic System Architecture (Interactive Inspector)
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
                    Click any node in the architecture pipeline to view live vector metrics, token throughput, and tool execution protocol.
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

                <div className="p-4 rounded-xl bg-zinc-900 text-zinc-100 font-mono text-xs shadow-inner">
                  <div className="flex items-center gap-2 mb-2 text-emerald-400">
                    <Activity className="w-4 h-4" />
                    <span className="font-bold">SYSTEM TELEMETRY LOG</span>
                  </div>
                  <div className="space-y-1 text-[11px] text-zinc-400">
                    <div>[0.000s] Webhook trigger received from enterprise Slack workspace.</div>
                    <div>[0.014s] Query vector embedded. Top-K 5 chunks retrieved from vector store.</div>
                    <div>[0.180s] Agent DAG generated 2 tool executions: [GitHub.issue_create, Jira.assign].</div>
                    <div>[0.225s] Human-in-the-loop RBAC check: PASSED (Level 4 Authorization).</div>
                    <div>[0.233s] Actions executed deterministically. Output JSON returned.</div>
                  </div>
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
      <section id="cta" className="py-28 border-t border-zinc-200/80 bg-gradient-to-b from-white to-blue-50/40 relative">
        <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-mono mb-4 border border-blue-200">
            <DoodleSparkle className="w-3.5 h-3.5 text-blue-600" />
            <span>Ready for Enterprise Deployment</span>
          </div>
          <h2 className="text-[clamp(2rem,4vw,3rem)] font-extrabold text-zinc-900 tracking-tight mb-4">
            Automate Your Organization <br />
            <span className="text-blue-600">with Enterprise AI Agents</span>
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
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded bg-zinc-900 text-white flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <span className="font-bold text-[14px] text-zinc-900">Enterprise AI</span>
              </div>
              <p className="text-[12px] text-zinc-500 leading-relaxed">
                Autonomous AI automation & RAG platform for modern enterprise teams.
              </p>
            </div>
            <FooterCol title="Platform" links={["AI Agents", "RAG Engine", "Onboarding", "Knowledge Transfer", "Workflow Builder"]} />
            <FooterCol title="Resources" links={["Documentation", "API Reference", "Guides", "Blog", "Changelog"]} />
            <FooterCol title="Developers" links={["API Docs", "SDKs", "MCP Integration", "GitHub", "Community"]} />
            <FooterCol title="Company" links={["About", "Careers", "Security", "Privacy", "Contact"]} />
          </div>
          <div className="border-t border-zinc-100 pt-6 text-center">
            <p className="text-[12px] text-zinc-500 font-mono">
              Built for Enterprise AI Automation · © {new Date().getFullYear()} Enterprise AI Platform
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SUB-COMPONENTS (WHITE THEME & HIGHLY AGENTIC)
   ═══════════════════════════════════════════════════════════════ */

const INTEGRATIONS = [
  "Microsoft Teams", "Slack", "Outlook", "Google Workspace",
  "Jira", "Confluence", "GitHub", "GitLab",
  "Docker", "Kubernetes", "Azure", "AWS",
  "Google Drive", "SharePoint", "Salesforce", "SAP",
];

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

/* ── Hero Agent Matrix ── */
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

/* ── Interactive RAG Card with Live Query Switcher ── */
function RAGCardInteractive() {
  const sampleQueries = [
    { query: "Expense Policy Limits", match: 98.4, chunks: 4 },
    { query: "Termination Notice Period", match: 94.2, chunks: 3 },
    { query: "NDA & IP Ownership", match: 99.1, chunks: 5 },
  ];
  const [selectedIdx, setSelectedIdx] = useState(0);

  return (
    <div className="p-6 h-full flex flex-col md:flex-row gap-6 bg-white border border-zinc-200/90 rounded-2xl shadow-sm hover:border-blue-300 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4 text-blue-600">
          <Database className="w-5 h-5" />
        </div>
        <h3 className="text-[16px] font-bold text-zinc-900 mb-2">Advanced Enterprise RAG</h3>
        <p className="text-[13px] text-zinc-600 leading-relaxed mb-4">
          Index millions of PDFs, emails, SharePoint files, and policies with semantic search, hybrid reranking, and citation tracing.
        </p>

        {/* Interactive Query Switcher Buttons */}
        <div className="space-y-1.5 mb-4">
          <div className="text-[11px] font-mono text-zinc-500">Simulate Test Vector Queries:</div>
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
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
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
          Open Full Interactive Workspace <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>

      {/* RAG Interactive Execution Inspector */}
      <div className="w-full md:w-56 shrink-0 space-y-3 p-3.5 bg-zinc-50 rounded-xl border border-zinc-200">
        <div className="flex items-center gap-2 border-b border-zinc-200 pb-2">
          <Search className="w-3.5 h-3.5 text-blue-600" />
          <div className="flex-1 text-[11px] font-mono font-bold text-zinc-900 truncate">
            {sampleQueries[selectedIdx].query}
          </div>
        </div>

        <div className="space-y-2 font-mono text-[10px]">
          <div className="flex justify-between">
            <span className="text-zinc-500">Similarity Score:</span>
            <span className="font-bold text-blue-600">{sampleQueries[selectedIdx].match}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Chunks Retrieved:</span>
            <span className="font-bold text-zinc-900">{sampleQueries[selectedIdx].chunks} Vector Chunks</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Vector Metric:</span>
            <span className="text-emerald-600 font-semibold">Cosine HNSW</span>
          </div>
        </div>

        <div className="h-1.5 rounded-full bg-zinc-200 overflow-hidden">
          <motion.div
            key={selectedIdx}
            initial={{ width: 0 }}
            animate={{ width: `${sampleQueries[selectedIdx].match}%` }}
            transition={{ duration: 0.8 }}
            className="h-full rounded-full bg-blue-600"
          />
        </div>

        <div className="flex items-center gap-1.5 pt-1 text-[10px] text-emerald-600 font-mono font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Bounding Box Mapped</span>
        </div>
      </div>
    </div>
  );
}

/* ── Interactive Onboarding Card ── */
function OnboardingCardInteractive() {
  const steps = ["Outlook Account", "Teams Channel", "GitHub Org Access", "Jira License", "Software Provision"];
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

/* ── Interactive Knowledge Graph Card ── */
function KnowledgeCardInteractive() {
  const [activeNode, setActiveNode] = useState("AI Agent");
  const nodes = [
    { label: "Senior Staff", desc: "Transcripts & Meeting Records" },
    { label: "Docs", desc: "PDF & Policy Index" },
    { label: "AI Agent", desc: "Active Knowledge Synthesizer" },
    { label: "Graph", desc: "HNSW Semantic Knowledge Mesh" },
    { label: "Hire", desc: "Instant Access for New Employees" },
  ];

  return (
    <div className="p-6 h-full bg-white border border-zinc-200/90 rounded-2xl shadow-sm">
      <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4 text-blue-600">
        <Brain className="w-5 h-5" />
      </div>
      <h3 className="text-[15px] font-bold text-zinc-900 mb-1.5">Knowledge Transfer Engine</h3>
      <p className="text-[12px] text-zinc-600 leading-relaxed mb-3">
        Hover on graph nodes to inspect knowledge synthesis path:
      </p>

      {/* Node Selector Pills */}
      <div className="flex flex-wrap gap-1 mb-3">
        {nodes.map((n) => (
          <button
            key={n.label}
            onClick={() => setActiveNode(n.label)}
            className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-all ${
              activeNode === n.label
                ? "bg-blue-600 text-white border-blue-600 font-bold"
                : "bg-zinc-100 text-zinc-700 border-zinc-200"
            }`}
          >
            {n.label}
          </button>
        ))}
      </div>

      <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl text-[11px] font-mono text-blue-900">
        <span className="font-bold">{activeNode}:</span> {nodes.find((n) => n.label === activeNode)?.desc}
      </div>
    </div>
  );
}

/* ── Interactive Automation Agent DAG Card ── */
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

        {/* Stage Selector Tabs */}
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

/* ── Reports Card White ── */
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

/* ── Security Card White ── */
function SecurityCardWhite() {
  const items = ["SSO / SAML", "RBAC", "Audit Logs", "AES-256", "GDPR", "SOC2 Type II", "On-Prem", "GovCloud"];
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

/* ── Integration Pill White ── */
function IntegrationPillWhite({ name }: { name: string }) {
  return (
    <div className="shrink-0 px-4 py-2 rounded-xl bg-white border border-zinc-200 shadow-sm text-xs font-semibold text-zinc-700 hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-default whitespace-nowrap">
      {name}
    </div>
  );
}

/* ── Interactive Workflow Timeline Visualizer ── */
function WorkflowTimelineInteractive({ onOpenModal }: { onOpenModal: () => void }) {
  const steps = [
    { num: 1, title: "Connect Apps", status: "OAuth2 Ready", protocol: "Slack, Teams, Jira, SAP", detail: "Initializes enterprise webhook protocol listeners and active OAuth2 handshakes." },
    { num: 2, title: "Import Knowledge", status: "Parsing PDF", protocol: "OCR & PDF Chunker", detail: "Streams unstructured documents into semantic chunking parser at 1,240 pages/sec." },
    { num: 3, title: "Index Vectors", status: "Embedding", protocol: "Qdrant HNSW 1536d", detail: "Generates high-dimensional vector embeddings with cosine similarity indexing." },
    { num: 4, title: "Deploy AI Agents", status: "Active DAG", protocol: "Claude 3.5 / GPT-4o", detail: "Spawns autonomous agent reasoning kernel with memory buffer allocation." },
    { num: 5, title: "Automate Workflows", status: "Orchestrating", protocol: "MCP Registry Dispatch", detail: "Executes tool selection matrix across GitHub, Jira, SAP, and Salesforce." },
    { num: 6, title: "Human Approval", status: "RBAC Level 4", protocol: "Zero-Trust Audit Gate", detail: "Enforces manager authorization gate before high-consequence system mutations." },
    { num: 7, title: "Execute Actions", status: "200 OK", protocol: "Idempotent API Call", detail: "Dispatches deterministic, signed API transactions with full audit logging." },
    { num: 8, title: "Analytics Dashboard", status: "Live Digest", protocol: "Executive Metrics", detail: "Aggregates latency throughput, token metrics, and cost savings telemetry." },
  ];

  const [activeStep, setActiveStep] = useState(2);
  const [autoPlay, setAutoPlay] = useState(true);

  useEffect(() => {
    if (!autoPlay) return;
    const iv = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 3200);
    return () => clearInterval(iv);
  }, [autoPlay, steps.length]);

  const current = steps[activeStep];

  return (
    <div className="mt-12 space-y-6">
      {/* Step Selector Pills */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
        {steps.map((s, i) => (
          <button
            key={s.title}
            onClick={() => {
              setAutoPlay(false);
              setActiveStep(i);
            }}
            className={`p-3 rounded-xl border text-left transition-all font-mono text-xs flex flex-col justify-between h-20 ${
              activeStep === i
                ? "bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-400/30"
                : "bg-white text-zinc-800 border-zinc-200 hover:border-blue-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center ${activeStep === i ? "bg-white text-blue-600" : "bg-blue-50 text-blue-600"}`}>
                {s.num}
              </span>
              {activeStep === i && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
            </div>
            <span className="font-bold truncate text-[11px]">{s.title}</span>
          </button>
        ))}
      </div>

      {/* Live Agentic Stage Inspector Box */}
      <div className="bg-white border border-zinc-200/90 rounded-2xl p-6 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold text-blue-600 px-2.5 py-1 rounded bg-blue-50 border border-blue-200 uppercase">
              STAGE {current.num} / 8 :: {current.title}
            </span>
            <span className="text-xs font-mono text-emerald-600 font-semibold flex items-center gap-1">
              <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-500" />
              {current.status}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoPlay(!autoPlay)}
              className="text-[11px] font-mono text-zinc-600 hover:text-zinc-900 border border-zinc-200 px-2.5 py-1 rounded-lg bg-zinc-50"
            >
              {autoPlay ? "⏸ Pause Flow" : "▶ Resume Flow"}
            </button>
            <button
              onClick={onOpenModal}
              className="text-[11px] font-mono font-bold bg-zinc-900 text-white px-3 py-1 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Inspect DAG Modal ↗
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 font-mono text-xs">
          <div>
            <div className="text-zinc-400 text-[10px] uppercase mb-1">Protocol / Engine:</div>
            <div className="font-bold text-zinc-900">{current.protocol}</div>
          </div>
          <div className="md:col-span-2">
            <div className="text-zinc-400 text-[10px] uppercase mb-1">Live Agent Execution Protocol:</div>
            <div className="text-zinc-700 leading-relaxed">{current.detail}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Stat Card White ── */
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

/* ── Footer Column ── */
function FooterCol({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <h4 className="text-[11px] font-mono font-bold text-zinc-900 uppercase tracking-widest mb-3">{title}</h4>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l}>
            <a href="#" className="text-[12px] text-zinc-600 hover:text-blue-600 font-medium transition-colors">
              {l}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
