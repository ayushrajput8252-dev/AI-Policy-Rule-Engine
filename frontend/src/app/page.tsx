"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  motion,
  useInView,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import {
  Database, UserPlus, Brain, Bot, BarChart3, Shield,
  ChevronDown, ArrowRight, Menu, X, Zap, Users,
  Globe, CheckCircle2, Sparkles, Search, FileText,
  Lock, Cpu, Activity, Terminal, Eye,
} from "lucide-react";

/* ── Inline GitHub SVG (not in lucide-react v1.22+) ── */
function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HOOKS
   ═══════════════════════════════════════════════════════════════ */

function useCountUp(end: number, duration = 2200) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
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

function useCycleText(texts: string[], interval = 2500) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % texts.length), interval);
    return () => clearInterval(id);
  }, [texts.length, interval]);
  return texts[idx];
}

/* ═══════════════════════════════════════════════════════════════
   LANDING PAGE
   ═══════════════════════════════════════════════════════════════ */

export default function LandingPage() {
  const [mobileMenu, setMobileMenu] = useState(false);

  /* Mouse spotlight */
  const spotX = useMotionValue(0);
  const spotY = useMotionValue(0);
  const smoothX = useSpring(spotX, { stiffness: 40, damping: 25 });
  const smoothY = useSpring(spotY, { stiffness: 40, damping: 25 });

  useEffect(() => {
    const handler = (e: MouseEvent) => { spotX.set(e.clientX); spotY.set(e.clientY); };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, [spotX, spotY]);

  const navLinks = ["Platform", "Features", "Solutions", "Docs", "Pricing"];

  return (
    <div className="min-h-screen bg-[#060606] text-white overflow-x-hidden bg-grid-animated noise-overlay">
      {/* Mouse spotlight */}
      <motion.div
        className="pointer-events-none fixed inset-0 z-[2]"
        style={{
          background: useTransform(
            [smoothX, smoothY],
            ([x, y]) => `radial-gradient(600px circle at ${x}px ${y}px, rgba(59,130,246,0.04), transparent 60%)`
          ),
        }}
      />

      {/* ─── NAV ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50">
        <div className="absolute inset-0 bg-[#060606]/70 backdrop-blur-2xl border-b border-white/[0.04]" />
        <div className="relative max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-[8px] bg-gradient-to-br from-[#3B82F6] to-[#6366F1] flex items-center justify-center transition-transform group-hover:scale-105">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-[14px] tracking-[-0.02em]">Enterprise AI</span>
          </Link>

          <div className="hidden lg:flex items-center gap-0.5">
            {navLinks.map((l) => (
              <a key={l} href={`#${l.toLowerCase()}`} className="px-3 py-1.5 text-[13px] text-zinc-500 hover:text-zinc-200 transition-colors duration-200 rounded-md hover:bg-white/[0.03]">{l}</a>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-2">
            <a href="https://github.com" target="_blank" rel="noreferrer" className="p-1.5 text-zinc-600 hover:text-zinc-300 transition-colors"><GithubIcon className="w-4 h-4" /></a>
            <a href="#" className="text-[13px] text-zinc-500 hover:text-zinc-200 transition-colors px-3 py-1.5">Sign In</a>
            <motion.a href="#cta" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="text-[13px] font-medium bg-white text-[#060606] px-4 py-1.5 rounded-lg hover:bg-zinc-200 transition-colors">Book Demo</motion.a>
          </div>

          <button onClick={() => setMobileMenu(!mobileMenu)} className="lg:hidden p-2 text-zinc-400">
            {mobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        <AnimatePresence>
          {mobileMenu && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="lg:hidden relative bg-[#0a0a0a]/95 backdrop-blur-2xl border-b border-white/[0.04] px-6 pb-5 overflow-hidden">
              {navLinks.map((l) => (<a key={l} href={`#${l.toLowerCase()}`} onClick={() => setMobileMenu(false)} className="block py-2 text-sm text-zinc-500 hover:text-white">{l}</a>))}
              <a href="#cta" className="mt-3 block text-sm font-medium bg-white text-black px-4 py-2 rounded-lg text-center">Book Demo</a>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative pt-28 pb-16 md:pt-36 md:pb-24 overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute top-[-10%] left-[15%] w-[500px] h-[500px] rounded-full bg-[#3B82F6]/[0.06] blur-[100px] pointer-events-none" style={{ animation: "gradient-rotate 25s linear infinite" }} />
        <div className="absolute top-[10%] right-[10%] w-[400px] h-[400px] rounded-full bg-[#6366F1]/[0.04] blur-[100px] pointer-events-none" style={{ animation: "gradient-rotate 30s linear infinite reverse" }} />

        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-[1fr_420px] gap-20 items-start">
            {/* Left */}
            <div className="pt-8">
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const }} className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-white/[0.06] bg-white/[0.02] mb-8">
                <div className="w-1.5 h-1.5 rounded-full animate-status-dot" />
                <span className="text-[11px] text-zinc-500 tracking-wide">Now Generally Available</span>
              </motion.div>

              <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] as const }} className="text-[clamp(2.2rem,5vw,3.5rem)] font-bold leading-[1.05] tracking-[-0.035em] mb-5">
                Enterprise AI{" "}<br className="hidden sm:block" />
                <span className="gradient-text">Automation Platform</span>
                <br />
                <span className="text-zinc-400 font-medium">for Modern Organizations</span>
              </motion.h1>

              <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="text-[15px] text-zinc-500 leading-[1.7] mb-10 max-w-md">
                Automate repetitive workflows, deploy AI agents, connect enterprise systems, and securely scale knowledge across your organization.
              </motion.p>

              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="flex flex-wrap gap-3">
                <motion.a href="#cta" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-medium bg-gradient-to-r from-[#3B82F6] to-[#6366F1] text-white shadow-lg shadow-blue-500/15 transition-shadow hover:shadow-blue-500/25">
                  Start Free <ArrowRight className="w-3.5 h-3.5" />
                </motion.a>
                <motion.a href="#platform" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-medium border border-white/[0.08] text-zinc-400 hover:text-zinc-200 hover:border-white/[0.15] hover:bg-white/[0.03] transition-all">
                  View Architecture
                </motion.a>
              </motion.div>
            </div>

            {/* Right: Live AI Agent Workflow */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const }}
              className="hidden lg:block"
            >
              <LiveAgentWorkflow />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES BENTO GRID ─── */}
      <section id="features" className="py-20 relative z-10">
        <div className="max-w-6xl mx-auto px-6">
          <SectionHeader label="Capabilities" title="Built for Enterprise AI" />

          {/* Bento grid — intentionally asymmetric */}
          <div className="grid md:grid-cols-3 gap-4 mt-14">
            {/* Row 1: RAG (2 cols) + Onboarding (1 col) */}
            <div className="md:col-span-2">
              <TiltCard>
                <Link href="/rag" className="block h-full">
                  <RAGCard />
                </Link>
              </TiltCard>
            </div>
            <TiltCard><OnboardingCard /></TiltCard>

            {/* Row 2: Knowledge (1) + Automation (2) */}
            <TiltCard><KnowledgeCard /></TiltCard>
            <div className="md:col-span-2">
              <TiltCard><AutomationCard /></TiltCard>
            </div>

            {/* Row 3: Reports (1) + Security (1) + Integrations preview (1) */}
            <TiltCard><ReportsCard /></TiltCard>
            <TiltCard><SecurityCard /></TiltCard>
            <TiltCard>
              <div className="p-6 h-full flex flex-col justify-between">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-4"><Globe className="w-4 h-4 text-zinc-500" /></div>
                  <h3 className="text-[14px] font-semibold tracking-[-0.01em] mb-1.5">18+ Integrations</h3>
                  <p className="text-[12px] text-zinc-600 leading-relaxed">Microsoft Teams, Slack, Jira, GitHub, Salesforce, SAP, and more.</p>
                </div>
                <div className="flex flex-wrap gap-1 mt-4">
                  {["Teams", "Slack", "Jira", "GitHub", "SAP"].map((n) => (
                    <span key={n} className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.04] text-zinc-600">{n}</span>
                  ))}
                </div>
              </div>
            </TiltCard>
          </div>
        </div>
      </section>

      {/* ─── INTEGRATIONS MARQUEE ─── */}
      <section id="platform" className="py-20 border-t border-white/[0.03]">
        <div className="max-w-6xl mx-auto px-6 mb-12">
          <SectionHeader label="Integrations" title="Connect Your Entire Stack" subtitle="Seamlessly integrates with the tools your teams already use." />
        </div>
        <div className="space-y-3">
          <div className="overflow-hidden">
            <div className="flex animate-marquee gap-3" style={{ width: "max-content" }}>
              {[...INTEGRATIONS, ...INTEGRATIONS].map((n, i) => <IntegrationPill key={`a${i}`} name={n} />)}
            </div>
          </div>
          <div className="overflow-hidden">
            <div className="flex animate-marquee-reverse gap-3" style={{ width: "max-content" }}>
              {[...INTEGRATIONS.slice().reverse(), ...INTEGRATIONS.slice().reverse()].map((n, i) => <IntegrationPill key={`b${i}`} name={n} />)}
            </div>
          </div>
        </div>
      </section>

      {/* ─── WORKFLOW TIMELINE ─── */}
      <section className="py-28 border-t border-white/[0.03]">
        <div className="max-w-6xl mx-auto px-6">
          <SectionHeader label="How It Works" title="From Connection to Automation" />
          <WorkflowTimeline />
        </div>
      </section>

      {/* ─── STATISTICS ─── */}
      <section className="py-20 border-t border-white/[0.03]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard value={95} suffix="%" label="Retrieval Accuracy" delay={0} />
            <StatCard value={80} suffix="%" label="Faster Onboarding" delay={0.1} />
            <StatCard value={70} suffix="%" label="Less Manual Work" delay={0.2} />
            <StatCard value={10} suffix="M+" label="Documents Indexed" delay={0.3} />
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section id="cta" className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#3B82F6]/[0.03] to-transparent pointer-events-none" />
        <div className="max-w-2xl mx-auto px-6 text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-bold tracking-[-0.03em] mb-4 leading-tight">
              Automate Your Enterprise<br /><span className="gradient-text">with AI Agents</span>
            </h2>
            <p className="text-zinc-500 text-[15px] leading-relaxed mb-8 max-w-md mx-auto">
              Deploy enterprise-grade AI automation, advanced RAG, onboarding, knowledge transfer, and workflow orchestration from one platform.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <motion.a href="#" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="px-7 py-2.5 rounded-xl text-[13px] font-medium bg-gradient-to-r from-[#3B82F6] to-[#6366F1] text-white shadow-lg shadow-blue-500/15">Book Demo</motion.a>
              <motion.a href="#" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="px-7 py-2.5 rounded-xl text-[13px] font-medium border border-white/[0.08] text-zinc-400 hover:text-zinc-200 transition-all">Start Free</motion.a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-white/[0.03] py-14">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-[6px] bg-gradient-to-br from-[#3B82F6] to-[#6366F1] flex items-center justify-center"><Sparkles className="w-3 h-3 text-white" /></div>
                <span className="font-semibold text-[13px]">Enterprise AI</span>
              </div>
              <p className="text-[11px] text-zinc-600 leading-relaxed">Enterprise-grade AI automation.</p>
            </div>
            <FooterCol title="Platform" links={["AI Agents", "RAG Engine", "Onboarding", "Knowledge Transfer", "Workflow Builder"]} />
            <FooterCol title="Resources" links={["Documentation", "API Reference", "Guides", "Blog", "Changelog"]} />
            <FooterCol title="Developers" links={["API Docs", "SDKs", "MCP Integration", "GitHub", "Community"]} />
            <FooterCol title="Company" links={["About", "Careers", "Security", "Privacy", "Contact"]} />
          </div>
          <div className="border-t border-white/[0.03] pt-6 text-center">
            <p className="text-[11px] text-zinc-700">Built for Enterprise AI Automation · © {new Date().getFullYear()}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

const INTEGRATIONS = ["Microsoft Teams", "Slack", "Outlook", "Google Workspace", "Jira", "Confluence", "GitHub", "GitLab", "Docker", "Kubernetes", "Azure", "AWS", "Google Drive", "SharePoint", "Salesforce", "SAP", "Notion", "HubSpot"];

/* ── Section Header ── */
function SectionHeader({ label, title, subtitle }: { label: string; title: string; subtitle?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.5 }} className="text-center max-w-lg mx-auto">
      <p className="text-[11px] font-medium text-zinc-600 uppercase tracking-[0.15em] mb-3">{label}</p>
      <h2 className="text-[clamp(1.5rem,3vw,2rem)] font-bold tracking-[-0.03em]">{title}</h2>
      {subtitle && <p className="text-zinc-500 text-[14px] mt-2">{subtitle}</p>}
    </motion.div>
  );
}

/* ── 3D Tilt Card Wrapper ── */
function TiltCard({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const rotX = useMotionValue(0);
  const rotY = useMotionValue(0);
  const sRotX = useSpring(rotX, { stiffness: 200, damping: 20 });
  const sRotY = useSpring(rotY, { stiffness: 200, damping: 20 });

  const onMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    rotX.set(-y * 6);
    rotY.set(x * 6);
  }, [rotX, rotY]);

  const onLeave = useCallback(() => { rotX.set(0); rotY.set(0); }, [rotX, rotY]);

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX: sRotX, rotateY: sRotY, transformPerspective: 800 }}
      whileInView={{ opacity: 1, y: 0 }}
      initial={{ opacity: 0, y: 24 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5 }}
      className="h-full rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.09] hover:bg-white/[0.03] transition-all duration-300 overflow-hidden group cursor-default"
    >
      {children}
    </motion.div>
  );
}

/* ── Live Agent Workflow (Hero) ── */
function LiveAgentWorkflow() {
  const status = useCycleText(["Thinking...", "Planning...", "Searching knowledge...", "Calling tools...", "Executing...", "Completed ✓"], 2000);
  const nodes = [
    { label: "Employee Request", icon: <Users className="w-3.5 h-3.5" /> },
    { label: "AI Automation Agent", icon: <Bot className="w-3.5 h-3.5" /> },
    { label: "Advanced RAG Engine", icon: <Database className="w-3.5 h-3.5" /> },
    { label: "Knowledge Base", icon: <Brain className="w-3.5 h-3.5" /> },
    { label: "Business Apps", icon: <Globe className="w-3.5 h-3.5" /> },
    { label: "Automated Actions", icon: <Zap className="w-3.5 h-3.5" /> },
  ];
  const apps = ["Teams", "Outlook", "Slack", "GitHub", "Jira", "Confluence", "SharePoint", "SAP"];

  return (
    <div className="rounded-2xl bg-white/[0.02] border border-white/[0.05] p-6 backdrop-blur-sm">
      {/* Status bar */}
      <div className="flex items-center gap-2 mb-5 pb-3 border-b border-white/[0.04]">
        <div className="w-1.5 h-1.5 rounded-full animate-status-dot" />
        <AnimatePresence mode="wait">
          <motion.span key={status} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }} className="text-[11px] text-zinc-500 font-mono">{status}</motion.span>
        </AnimatePresence>
      </div>

      {nodes.map((node, i) => (
        <div key={node.label}>
          <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/[0.03] transition-colors">
            <div className={`w-7 h-7 rounded-lg bg-[#3B82F6]/[0.08] border border-[#3B82F6]/[0.12] flex items-center justify-center text-[#3B82F6]/70 shrink-0 ${i === 1 ? "animate-node-pulse" : ""}`}>
              {node.icon}
            </div>
            <span className="text-[12px] text-zinc-400">{node.label}</span>
          </div>
          {/* Apps under Business Apps */}
          {node.label === "Business Apps" && (
            <div className="ml-10 mb-1 flex flex-wrap gap-1 mt-1">
              {apps.map((a) => (
                <span key={a} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.03] border border-white/[0.04] text-zinc-600">{a}</span>
              ))}
            </div>
          )}
          {/* Animated connector */}
          {i < nodes.length - 1 && (
            <div className="flex items-center justify-center h-5 relative">
              <div className="w-px h-full bg-gradient-to-b from-[#3B82F6]/20 to-transparent" />
              <div className="absolute w-1 h-1 rounded-full bg-[#3B82F6]/50 animate-data-packet" style={{ animationDelay: `${i * 0.3}s` }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════ FEATURE CARDS ═══════════════ */

/* ── RAG Card (large) ── */
function RAGCard() {
  const [progress, setProgress] = useState([0, 0, 0, 0]);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const t = setTimeout(() => setProgress([85, 70, 92, 98]), 300);
    return () => clearTimeout(t);
  }, [inView]);

  return (
    <div ref={ref} className="p-6 h-full flex flex-col md:flex-row gap-6">
      <div className="flex-1 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-[#3B82F6]/[0.08] border border-[#3B82F6]/[0.12] flex items-center justify-center mb-4">
          <Database className="w-4 h-4 text-[#3B82F6]/70" />
        </div>
        <h3 className="text-[15px] font-semibold tracking-[-0.01em] mb-2">Advanced Enterprise RAG</h3>
        <p className="text-[12px] text-zinc-600 leading-relaxed mb-4">Index millions of documents with semantic search, hybrid retrieval and source citations.</p>
        <div className="flex flex-wrap gap-1.5">
          {["Hybrid Search", "Vector DB", "Semantic Retrieval", "Citations", "Multi-modal"].map((b) => (
            <span key={b} className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.05] text-zinc-500">{b}</span>
          ))}
        </div>
      </div>
      {/* Live RAG visualization */}
      <div className="w-full md:w-48 shrink-0 space-y-2.5 pt-2">
        <div className="flex items-center gap-2 mb-3">
          <Search className="w-3 h-3 text-zinc-600" />
          <div className="flex-1 h-6 rounded-md bg-white/[0.03] border border-white/[0.05] flex items-center px-2">
            <span className="text-[10px] text-zinc-600 font-mono">query: policy docs</span>
            <span className="ml-0.5 w-px h-3 bg-[#3B82F6]/60 animate-cursor" />
          </div>
        </div>
        {[
          { label: "Searching", val: progress[0] },
          { label: "Embedding", val: progress[1] },
          { label: "Hybrid Match", val: progress[2] },
          { label: "Retrieved", val: progress[3] },
        ].map((item, i) => (
          <div key={item.label} className="space-y-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-zinc-600">{item.label}</span>
              <span className="text-zinc-500 font-mono">{item.val}%</span>
            </div>
            <div className="h-1 rounded-full bg-white/[0.04] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${item.val}%` }}
                transition={{ duration: 1.5, delay: 0.3 + i * 0.2, ease: [0.25, 0.46, 0.45, 0.94] as const }}
                className="h-full rounded-full bg-gradient-to-r from-[#3B82F6]/60 to-[#6366F1]/60"
              />
            </div>
          </div>
        ))}
        <div className="flex items-center gap-1.5 pt-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-500/60" />
          <span className="text-[10px] text-emerald-500/60 font-mono">Citation Ready</span>
        </div>
      </div>
    </div>
  );
}

/* ── Onboarding Card ── */
function OnboardingCard() {
  const steps = ["Create Email", "Create Teams", "Create GitHub", "Create Jira", "Install Software"];
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActive((a) => (a + 1) % (steps.length + 1)), 1800);
    return () => clearInterval(id);
  }, [steps.length]);

  return (
    <div className="p-6 h-full">
      <div className="w-8 h-8 rounded-lg bg-[#6366F1]/[0.08] border border-[#6366F1]/[0.12] flex items-center justify-center mb-4">
        <UserPlus className="w-4 h-4 text-[#6366F1]/70" />
      </div>
      <h3 className="text-[14px] font-semibold tracking-[-0.01em] mb-1.5">One-click Onboarding</h3>
      <p className="text-[12px] text-zinc-600 leading-relaxed mb-4">Provision accounts in minutes.</p>
      <div className="space-y-2">
        {steps.map((s, i) => {
          const done = i < active;
          const current = i === active;
          return (
            <div key={s} className="flex items-center gap-2.5">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-all duration-500 ${done ? "bg-emerald-500/20 border border-emerald-500/30" : current ? "bg-[#6366F1]/20 border border-[#6366F1]/30" : "bg-white/[0.03] border border-white/[0.06]"}`}>
                {done && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500/80" />}
                {current && <div className="w-1.5 h-1.5 rounded-full bg-[#6366F1]/60 animate-pulse" />}
              </div>
              <span className={`text-[11px] transition-colors duration-300 ${done ? "text-zinc-400" : current ? "text-zinc-300" : "text-zinc-700"}`}>{s}</span>
              <span className={`ml-auto text-[9px] font-mono ${done ? "text-emerald-500/50" : current ? "text-[#6366F1]/50" : "text-zinc-800"}`}>
                {done ? "✓" : current ? "..." : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Knowledge Transfer Card ── */
function KnowledgeCard() {
  return (
    <div className="p-6 h-full">
      <div className="w-8 h-8 rounded-lg bg-[#8B5CF6]/[0.08] border border-[#8B5CF6]/[0.12] flex items-center justify-center mb-4">
        <Brain className="w-4 h-4 text-[#8B5CF6]/70" />
      </div>
      <h3 className="text-[14px] font-semibold tracking-[-0.01em] mb-1.5">Knowledge Transfer</h3>
      <p className="text-[12px] text-zinc-600 leading-relaxed mb-4">Capture, index, and transfer institutional knowledge.</p>
      {/* Animated graph */}
      <div className="relative h-32">
        <svg className="w-full h-full" viewBox="0 0 200 120">
          {/* Edges */}
          {[[40,30,100,20],[100,20,160,40],[40,30,80,70],[100,20,120,65],[80,70,120,65],[120,65,160,40],[80,70,140,100],[120,65,140,100]].map(([x1,y1,x2,y2], i) => (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(139,92,246,0.1)" strokeWidth="1" className="animate-connection-glow" style={{ animationDelay: `${i * 0.4}s` }} />
          ))}
          {/* Nodes */}
          {[[40,30,"S"],[100,20,"D"],[160,40,"M"],[80,70,"G"],[120,65,"AI"],[140,100,"N"]].map(([cx,cy,label], i) => (
            <g key={i}>
              <circle cx={Number(cx)} cy={Number(cy)} r="12" fill="rgba(139,92,246,0.06)" stroke="rgba(139,92,246,0.15)" strokeWidth="1" className="animate-node-pulse" style={{ animationDelay: `${i * 0.5}s` }} />
              <text x={Number(cx)} y={Number(cy) + 3} textAnchor="middle" fill="rgba(139,92,246,0.5)" fontSize="7" fontWeight="600">{String(label)}</text>
            </g>
          ))}
        </svg>
        <div className="absolute bottom-0 left-0 right-0 text-[9px] text-zinc-700 flex justify-between px-2">
          <span>Senior → Documents → AI → Graph → New Employee</span>
        </div>
      </div>
    </div>
  );
}

/* ── Automation Card (large) ── */
function AutomationCard() {
  const status = useCycleText(["Reasoning...", "Planning execution...", "Selecting tools...", "Awaiting approval...", "Executing action...", "✓ Completed"], 1800);
  const agentSteps = ["Request", "Reason", "Plan", "Tools", "Approve", "Execute", "Notify"];

  return (
    <div className="p-6 h-full">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#3B82F6]/[0.08] border border-[#3B82F6]/[0.12] flex items-center justify-center mb-4">
            <Bot className="w-4 h-4 text-[#3B82F6]/70" />
          </div>
          <h3 className="text-[15px] font-semibold tracking-[-0.01em] mb-2">Enterprise Automation Agent</h3>
          <p className="text-[12px] text-zinc-600 leading-relaxed mb-4">Multi-step reasoning, tool orchestration, and human-in-the-loop approval workflows.</p>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full animate-status-dot" />
            <AnimatePresence mode="wait">
              <motion.span key={status} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[11px] text-zinc-500 font-mono">{status}</motion.span>
            </AnimatePresence>
          </div>
        </div>
        {/* Agent pipeline */}
        <div className="flex md:flex-col gap-0 items-center md:w-44 shrink-0">
          {agentSteps.map((s, i) => (
            <div key={s} className="flex md:flex-col items-center">
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-[9px] text-zinc-500 font-mono hover:bg-white/[0.06] hover:border-white/[0.1] transition-all">
                {s.slice(0, 3)}
              </div>
              {i < agentSteps.length - 1 && (
                <div className="w-3 md:w-px h-px md:h-3 relative overflow-visible">
                  <div className="absolute inset-0 bg-white/[0.06]" />
                  <div className="absolute w-1 h-1 rounded-full bg-[#3B82F6]/40 animate-data-packet" style={{ animationDelay: `${i * 0.25}s` }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Reports Card ── */
function ReportsCard() {
  const metrics = [
    { label: "Automations", value: 1245, suffix: "" },
    { label: "Hours Saved", value: 312, suffix: "" },
    { label: "Docs Indexed", value: 95, suffix: "K" },
    { label: "Cost Saved", value: 18, suffix: "K" },
  ];
  return (
    <div className="p-6 h-full">
      <div className="w-8 h-8 rounded-lg bg-[#6366F1]/[0.08] border border-[#6366F1]/[0.12] flex items-center justify-center mb-4">
        <BarChart3 className="w-4 h-4 text-[#6366F1]/70" />
      </div>
      <h3 className="text-[14px] font-semibold tracking-[-0.01em] mb-3">Weekly AI Insights</h3>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {metrics.map((m) => (
          <LiveMetric key={m.label} label={m.label} end={m.value} suffix={m.suffix} />
        ))}
      </div>
      <div className="text-[10px] text-zinc-700 flex items-center gap-1.5">
        <Activity className="w-3 h-3" /> Report sent every Monday
      </div>
    </div>
  );
}

function LiveMetric({ label, end, suffix }: { label: string; end: number; suffix: string }) {
  const { count, ref } = useCountUp(end);
  return (
    <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-2.5">
      <div className="text-[13px] font-semibold text-white">
        <span ref={ref}>{count.toLocaleString()}</span>{suffix}
      </div>
      <div className="text-[9px] text-zinc-600 mt-0.5">{label}</div>
    </div>
  );
}

/* ── Security Card ── */
function SecurityCard() {
  const items = ["SSO", "RBAC", "Audit Logs", "Encryption", "GDPR", "SOC2", "On-prem", "Cloud"];
  return (
    <div className="p-6 h-full">
      <div className="w-8 h-8 rounded-lg bg-[#8B5CF6]/[0.08] border border-[#8B5CF6]/[0.12] flex items-center justify-center mb-4">
        <Shield className="w-4 h-4 text-[#8B5CF6]/70" />
      </div>
      <h3 className="text-[14px] font-semibold tracking-[-0.01em] mb-3">Enterprise Ready</h3>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        {items.map((item, i) => (
          <motion.div key={item} initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06, duration: 0.3 }} className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-500/50 shrink-0" />
            <span className="text-[11px] text-zinc-500">{item}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ── Integration Pill ── */
function IntegrationPill({ name }: { name: string }) {
  return (
    <div className="shrink-0 px-4 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04] text-[12px] text-zinc-600 hover:text-zinc-400 hover:border-white/[0.08] hover:bg-white/[0.04] transition-all whitespace-nowrap cursor-default">
      {name}
    </div>
  );
}

/* ── Workflow Timeline ── */
function WorkflowTimeline() {
  const steps = ["Connect Enterprise", "Import Knowledge", "Index Documents", "Deploy AI Agents", "Automate Workflows", "Human Approval", "Execute Actions", "Analytics Dashboard"];
  return (
    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={{ visible: { transition: { staggerChildren: 0.08 } } }} className="mt-14">
      <div className="hidden md:flex items-start relative">
        <div className="absolute top-6 left-[4%] right-[4%] h-px bg-gradient-to-r from-[#3B82F6]/15 via-[#6366F1]/15 to-[#8B5CF6]/15" />
        {steps.map((s, i) => (
          <motion.div
            key={s}
            variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}
            className="flex-1 flex flex-col items-center text-center px-1 relative z-10"
          >
            <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-3 hover:bg-white/[0.06] hover:border-white/[0.1] transition-all">
              <span className="text-[13px] font-bold gradient-text">{i + 1}</span>
            </div>
            <span className="text-[11px] text-zinc-500 leading-snug">{s}</span>
          </motion.div>
        ))}
      </div>
      <div className="md:hidden space-y-3">
        {steps.map((s, i) => (
          <motion.div key={s} variants={{ hidden: { opacity: 0, x: -16 }, visible: { opacity: 1, x: 0 } }} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center shrink-0">
              <span className="text-[12px] font-bold gradient-text">{i + 1}</span>
            </div>
            <span className="text-[13px] text-zinc-500">{s}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

/* ── Stat Card ── */
function StatCard({ value, suffix, label, delay }: { value: number; suffix: string; label: string; delay: number }) {
  const { count, ref } = useCountUp(value);
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay }} className="rounded-2xl bg-white/[0.02] border border-white/[0.05] p-7 text-center hover:bg-white/[0.03] hover:border-white/[0.08] transition-all duration-300">
      <div className="text-[clamp(2rem,4vw,2.8rem)] font-bold tracking-[-0.03em] mb-1">
        <span ref={ref} className="gradient-text">{count}</span>
        <span className="gradient-text">{suffix}</span>
      </div>
      <p className="text-[12px] text-zinc-600">{label}</p>
    </motion.div>
  );
}

/* ── Footer Column ── */
function FooterCol({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <h4 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-[0.1em] mb-3">{title}</h4>
      <ul className="space-y-2">
        {links.map((l) => (<li key={l}><a href="#" className="text-[12px] text-zinc-700 hover:text-zinc-400 transition-colors">{l}</a></li>))}
      </ul>
    </div>
  );
}
