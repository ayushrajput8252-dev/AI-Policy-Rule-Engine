"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useInView, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";
import {
  Database,
  UserPlus,
  Brain,
  Bot,
  BarChart3,
  Shield,
  ChevronDown,
  ArrowRight,
  Menu,
  X,
  Search,
  Lock,
  FileText,
  Zap,
  Users,
  ClipboardCheck,
  ScrollText,
  Cpu,
  Globe,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
  );
}

/* ───────────────────────────────────────── helpers ─────────────────────────────────────────── */

function useCountUp(end: number, duration = 2000, startOnView = true) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const started = useRef(false);

  useEffect(() => {
    if (!startOnView || !inView || started.current) return;
    started.current = true;
    const startTime = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [inView, end, duration, startOnView]);

  return { count, ref };
}

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

/* ───────────────────────────────────────── component ─────────────────────────────────────────── */

export default function LandingPage() {
  const [mobileMenu, setMobileMenu] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      mouseX.set((e.clientX - innerWidth / 2) / 40);
      mouseY.set((e.clientY - innerHeight / 2) / 40);
    };
    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, [mouseX, mouseY]);

  const navLinks = ["Platform", "Features", "Solutions", "Customers", "Resources", "Docs", "Pricing"];

  const capabilities = [
    { label: "Advanced RAG Engine", color: "#3B82F6" },
    { label: "One-click Employee Onboarding", color: "#6366F1" },
    { label: "Knowledge Transfer Automation", color: "#8B5CF6" },
    { label: "AI Workflow Builder", color: "#A78BFA" },
    { label: "Multi-Agent Orchestration", color: "#3B82F6" },
    { label: "Enterprise Search", color: "#6366F1" },
    { label: "Secure Role-Based Access", color: "#8B5CF6" },
    { label: "Human-in-the-loop Approval", color: "#A78BFA" },
    { label: "Weekly Executive Reports", color: "#3B82F6" },
    { label: "Audit Logs", color: "#6366F1" },
    { label: "Multi-LLM Support", color: "#8B5CF6" },
    { label: "API & MCP Integrations", color: "#A78BFA" },
  ];

  const integrations = [
    "Microsoft Teams", "Slack", "Outlook", "Google Workspace",
    "Jira", "Confluence", "GitHub", "GitLab",
    "Docker", "Kubernetes", "Azure", "AWS",
    "Google Drive", "SharePoint", "Salesforce", "SAP",
    "Notion", "HubSpot",
  ];

  const workflowSteps = [
    "Connect Enterprise",
    "Import Knowledge",
    "Index Documents",
    "Deploy AI Agents",
    "Automate Workflows",
    "Human Approval",
    "Execute Actions",
    "Analytics Dashboard",
  ];

  /* ──────────────── RENDER ──────────────── */
  return (
    <div className="min-h-screen bg-[#090909] text-white overflow-x-hidden bg-grid-pattern">
      {/* ═══════════════════ 1. NAVIGATION ═══════════════════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5">
        <div className="absolute inset-0 bg-[#090909]/80 backdrop-blur-xl" />
        <div className="relative max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#6366F1] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-[15px] tracking-tight">Enterprise AI</span>
          </Link>

          {/* Desktop menu */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                className="px-3.5 py-2 text-[13px] text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
              >
                {link}
              </a>
            ))}
          </div>

          {/* Right */}
          <div className="hidden lg:flex items-center gap-3">
            <a href="https://github.com" target="_blank" rel="noreferrer" className="p-2 text-zinc-400 hover:text-white transition-colors">
              <GithubIcon className="w-[18px] h-[18px]" />
            </a>
            <a href="#" className="text-[13px] text-zinc-400 hover:text-white transition-colors px-3 py-2">
              Sign In
            </a>
            <a
              href="#cta"
              className="text-[13px] font-medium bg-white text-black px-4 py-2 rounded-lg hover:bg-zinc-200 transition-colors"
            >
              Book Demo
            </a>
          </div>

          {/* Mobile hamburger */}
          <button onClick={() => setMobileMenu(!mobileMenu)} className="lg:hidden p-2 text-zinc-400 hover:text-white">
            {mobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenu && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:hidden relative bg-[#111]/95 backdrop-blur-xl border-b border-white/5 px-6 pb-6 pt-2"
          >
            {navLinks.map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                onClick={() => setMobileMenu(false)}
                className="block py-2.5 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                {link}
              </a>
            ))}
            <div className="mt-4 flex flex-col gap-2">
              <a href="#" className="text-sm text-zinc-400 hover:text-white py-2">Sign In</a>
              <a href="#cta" className="text-sm font-medium bg-white text-black px-4 py-2.5 rounded-lg text-center">Book Demo</a>
            </div>
          </motion.div>
        )}
      </nav>

      {/* ═══════════════════ 2. HERO ═══════════════════ */}
      <section ref={heroRef} className="relative pt-32 pb-24 md:pt-40 md:pb-32 overflow-hidden">
        {/* Background gradient orbs */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#3B82F6]/8 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-20 right-1/4 w-[500px] h-[500px] bg-[#6366F1]/6 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Copy */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={stagger}
              className="max-w-xl"
            >
              <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 mb-8">
                <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] animate-pulse" />
                <span className="text-xs text-zinc-400">Now Generally Available</span>
              </motion.div>

              <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl lg:text-[56px] font-bold leading-[1.08] tracking-tight mb-6">
                Enterprise AI{" "}
                <span className="gradient-text">Automation Platform</span>
                <br />
                for Modern Organizations
              </motion.h1>

              <motion.p variants={fadeUp} className="text-lg text-zinc-400 leading-relaxed mb-10 max-w-lg">
                Automate repetitive workflows, deploy AI agents, connect enterprise systems, and securely scale knowledge across your organization.
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-wrap gap-4">
                <a
                  href="#cta"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium bg-gradient-to-r from-[#3B82F6] to-[#6366F1] text-white hover:brightness-110 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-500/20"
                >
                  Start Free
                  <ArrowRight className="w-4 h-4" />
                </a>
                <a
                  href="#platform"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium border border-white/10 text-zinc-300 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all"
                >
                  View Architecture
                </a>
              </motion.div>
            </motion.div>

            {/* Right: Workflow glass card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              style={{ x: springX, y: springY }}
              className="relative hidden lg:block"
            >
              <div className="glass-card-strong p-8 animate-pulse-glow">
                <WorkflowCard />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ 3 & 4. FEATURES SIDEBAR + CARDS ═══════════════════ */}
      <section id="features" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-[280px_1fr] gap-12">
            {/* Sidebar */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
              className="lg:sticky lg:top-24 lg:self-start"
            >
              <motion.p variants={fadeUp} className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-6">
                Platform Capabilities
              </motion.p>
              <div className="space-y-3">
                {capabilities.map((cap, i) => (
                  <motion.div
                    key={cap.label}
                    variants={fadeUp}
                    className="flex items-center gap-3 group cursor-default"
                  >
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cap.color }} />
                    <span className="text-sm text-zinc-500 group-hover:text-zinc-300 transition-colors">{cap.label}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Feature Cards Grid */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={stagger}
              className="grid md:grid-cols-2 gap-6"
            >
              {/* Card 1: Advanced RAG */}
              <motion.div variants={fadeUp}>
                <Link href="/rag">
                  <FeatureCard
                    icon={<Database className="w-5 h-5" />}
                    title="Advanced Enterprise RAG"
                    description="Index millions of documents, emails, PDFs, policies, SharePoint files and internal knowledge with semantic search, hybrid retrieval and citations."
                    bullets={["Hybrid Search", "Vector Database", "Semantic Retrieval", "Source Citations", "Multi-modal Documents"]}
                    accentColor="#3B82F6"
                  />
                </Link>
              </motion.div>

              {/* Card 2: Onboarding */}
              <motion.div variants={fadeUp}>
                <FeatureCard
                  icon={<UserPlus className="w-5 h-5" />}
                  title="One-click Employee Onboarding"
                  description=""
                  accentColor="#6366F1"
                >
                  <MiniWorkflow steps={["New Employee", "AI Agent", "Create Outlook", "Setup GitHub", "Provision Slack", "Install Software", "Ready in Minutes"]} />
                </FeatureCard>
              </motion.div>

              {/* Card 3: Knowledge Transfer */}
              <motion.div variants={fadeUp}>
                <FeatureCard
                  icon={<Brain className="w-5 h-5" />}
                  title="Knowledge Transfer"
                  description=""
                  accentColor="#8B5CF6"
                >
                  <KnowledgeTransferFlow />
                </FeatureCard>
              </motion.div>

              {/* Card 4: AI Automation */}
              <motion.div variants={fadeUp}>
                <FeatureCard
                  icon={<Bot className="w-5 h-5" />}
                  title="Enterprise Automation Agent"
                  description=""
                  accentColor="#3B82F6"
                >
                  <MiniWorkflow steps={["User Request", "Reasoning", "Tool Selection", "Approval", "Execution", "Notification"]} />
                </FeatureCard>
              </motion.div>

              {/* Card 5: Weekly Reports */}
              <motion.div variants={fadeUp}>
                <FeatureCard
                  icon={<BarChart3 className="w-5 h-5" />}
                  title="Weekly AI Insights"
                  description=""
                  accentColor="#6366F1"
                >
                  <ReportsDashboard />
                </FeatureCard>
              </motion.div>

              {/* Card 6: Enterprise Security */}
              <motion.div variants={fadeUp}>
                <FeatureCard
                  icon={<Shield className="w-5 h-5" />}
                  title="Enterprise Ready"
                  description=""
                  accentColor="#8B5CF6"
                >
                  <SecurityList />
                </FeatureCard>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ 5. INTEGRATIONS ═══════════════════ */}
      <section id="platform" className="py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 mb-16">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="text-center"
          >
            <motion.p variants={fadeUp} className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-4">
              Integrations
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Connect Your Entire Stack
            </motion.h2>
            <motion.p variants={fadeUp} className="text-zinc-400 max-w-lg mx-auto">
              Seamlessly integrates with the tools your teams already use.
            </motion.p>
          </motion.div>
        </div>

        {/* Marquee row 1 */}
        <div className="overflow-hidden mb-4">
          <div className="flex animate-marquee gap-4" style={{ width: "max-content" }}>
            {[...integrations, ...integrations].map((name, i) => (
              <IntegrationBadge key={`${name}-${i}`} name={name} />
            ))}
          </div>
        </div>
        {/* Marquee row 2 (reverse) */}
        <div className="overflow-hidden">
          <div className="flex animate-marquee-reverse gap-4" style={{ width: "max-content" }}>
            {[...integrations.slice().reverse(), ...integrations.slice().reverse()].map((name, i) => (
              <IntegrationBadge key={`rev-${name}-${i}`} name={name} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ 6. PLATFORM WORKFLOW ═══════════════════ */}
      <section className="py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.p variants={fadeUp} className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-4">
              How It Works
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold tracking-tight">
              From Connection to Automation
            </motion.h2>
          </motion.div>

          {/* Horizontal timeline */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
            className="relative"
          >
            {/* Desktop: horizontal */}
            <div className="hidden md:grid md:grid-cols-4 lg:grid-cols-8 gap-0 relative">
              {/* Connector line */}
              <div className="absolute top-8 left-[6%] right-[6%] h-px bg-gradient-to-r from-[#3B82F6]/40 via-[#6366F1]/40 to-[#8B5CF6]/40 z-0" />
              {workflowSteps.map((step, i) => (
                <motion.div
                  key={step}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0, transition: { delay: i * 0.12, duration: 0.5 } },
                  }}
                  className="relative flex flex-col items-center text-center px-2 z-10"
                >
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 hover:bg-white/10 hover:border-white/20 transition-all">
                    <span className="text-lg font-bold gradient-text">{i + 1}</span>
                  </div>
                  <span className="text-xs text-zinc-400 leading-tight">{step}</span>
                </motion.div>
              ))}
            </div>

            {/* Mobile: vertical */}
            <div className="md:hidden space-y-4">
              {workflowSteps.map((step, i) => (
                <motion.div
                  key={step}
                  variants={{
                    hidden: { opacity: 0, x: -20 },
                    visible: { opacity: 1, x: 0, transition: { delay: i * 0.08, duration: 0.4 } },
                  }}
                  className="flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold gradient-text">{i + 1}</span>
                  </div>
                  <span className="text-sm text-zinc-400">{step}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════ 7. STATISTICS ═══════════════════ */}
      <section className="py-24 border-t border-white/5">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            <StatCard value={95} suffix="%" label="Retrieval Accuracy" />
            <StatCard value={80} suffix="%" label="Faster Employee Onboarding" />
            <StatCard value={70} suffix="%" label="Reduction in Manual Work" />
            <StatCard value={10} suffix="M+" label="Documents Indexed" />
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════ 8. CTA ═══════════════════ */}
      <section id="cta" className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#3B82F6]/5 to-transparent pointer-events-none" />
        <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
              Automate Your Enterprise{" "}
              <span className="gradient-text">with AI Agents</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-zinc-400 text-lg leading-relaxed mb-10 max-w-xl mx-auto">
              Deploy enterprise-grade AI automation, advanced RAG, onboarding, knowledge transfer, and workflow orchestration from one platform.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-4">
              <a
                href="#"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-medium bg-gradient-to-r from-[#3B82F6] to-[#6366F1] text-white hover:brightness-110 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-500/20"
              >
                Book Demo
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-medium border border-white/10 text-zinc-300 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all"
              >
                Start Free
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════ FOOTER ═══════════════════ */}
      <footer className="border-t border-white/5 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
            {/* Logo */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#6366F1] flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="font-bold text-sm">Enterprise AI</span>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Enterprise-grade AI automation for modern organizations.
              </p>
            </div>

            {/* Columns */}
            <FooterColumn
              title="Platform"
              links={["AI Agents", "RAG Engine", "Onboarding", "Knowledge Transfer", "Workflow Builder", "Analytics"]}
            />
            <FooterColumn
              title="Resources"
              links={["Documentation", "API Reference", "Guides", "Blog", "Changelog", "Status"]}
            />
            <FooterColumn
              title="Developers"
              links={["API Docs", "SDKs", "MCP Integration", "GitHub", "Community", "Support"]}
            />
            <FooterColumn
              title="Company"
              links={["About", "Careers", "Security", "Privacy", "Terms", "Contact"]}
            />
          </div>

          <div className="border-t border-white/5 pt-8 text-center">
            <p className="text-xs text-zinc-600">
              Built for Enterprise AI Automation · © {new Date().getFullYear()} Enterprise AI
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════════════════════════ */

/* ── Hero Workflow Card ── */
function WorkflowCard() {
  const steps = [
    { label: "Employee Request", icon: <Users className="w-4 h-4" /> },
    { label: "AI Automation Agent", icon: <Bot className="w-4 h-4" /> },
    { label: "Advanced RAG Engine", icon: <Database className="w-4 h-4" /> },
    { label: "Company Knowledge Base", icon: <Brain className="w-4 h-4" /> },
    { label: "Business Applications", icon: <Globe className="w-4 h-4" /> },
    { label: "Automated Actions", icon: <Zap className="w-4 h-4" /> },
  ];

  const apps = ["Microsoft Teams", "Outlook", "Slack", "GitHub", "Jira", "Confluence", "SharePoint", "SAP", "Salesforce"];

  return (
    <div className="space-y-0">
      {steps.map((step, i) => (
        <div key={step.label}>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + i * 0.15, duration: 0.5 }}
            className="flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-white/5 transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3B82F6]/20 to-[#6366F1]/20 border border-white/10 flex items-center justify-center text-[#3B82F6] group-hover:border-[#3B82F6]/30 transition-colors shrink-0">
              {step.icon}
            </div>
            <span className="text-sm text-zinc-300 font-medium">{step.label}</span>
          </motion.div>

          {/* Apps list under Business Applications */}
          {step.label === "Business Applications" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.5 }}
              className="ml-14 mb-2 flex flex-wrap gap-1.5"
            >
              {apps.map((app) => (
                <span key={app} className="text-[10px] px-2 py-1 rounded-md bg-white/5 text-zinc-500 border border-white/5">
                  {app}
                </span>
              ))}
            </motion.div>
          )}

          {/* Arrow connector */}
          {i < steps.length - 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 + i * 0.15 }}
              className="flex justify-center py-1"
            >
              <ChevronDown className="w-4 h-4 text-[#3B82F6]/40 animate-arrow-bounce" />
            </motion.div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Feature Card ── */
function FeatureCard({
  icon,
  title,
  description,
  bullets,
  accentColor,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  bullets?: string[];
  accentColor: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="glass-card p-6 h-full group hover:bg-white/[0.04] transition-all duration-300 hover:border-white/10 cursor-pointer relative overflow-hidden">
      {/* Accent glow */}
      <div
        className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ backgroundColor: `${accentColor}20` }}
      />

      <div className="relative z-10">
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center mb-5 border border-white/10"
          style={{ background: `${accentColor}15`, color: accentColor }}
        >
          {icon}
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold mb-3 tracking-tight">{title}</h3>

        {/* Description */}
        {description && <p className="text-sm text-zinc-500 leading-relaxed mb-4">{description}</p>}

        {/* Bullets */}
        {bullets && (
          <div className="flex flex-wrap gap-2">
            {bullets.map((b) => (
              <span key={b} className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 text-zinc-400 border border-white/5">
                {b}
              </span>
            ))}
          </div>
        )}

        {/* Custom children content */}
        {children}
      </div>
    </div>
  );
}

/* ── Mini Workflow (for Onboarding & Automation cards) ── */
function MiniWorkflow({ steps }: { steps: string[] }) {
  return (
    <div className="space-y-0 mt-2">
      {steps.map((step, i) => (
        <div key={step}>
          <div className="flex items-center gap-2.5 py-1.5">
            <div className="w-5 h-5 rounded-md bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              <span className="text-[9px] text-zinc-500 font-medium">{i + 1}</span>
            </div>
            <span className="text-xs text-zinc-500">{step}</span>
          </div>
          {i < steps.length - 1 && (
            <div className="flex justify-start ml-2.5">
              <ChevronDown className="w-3 h-3 text-zinc-700" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Knowledge Transfer Flow ── */
function KnowledgeTransferFlow() {
  const left = ["Senior Employee", "Upload Documents", "Record Screen", "Meeting Notes"];
  const right = ["Knowledge Graph", "New Employee"];

  return (
    <div className="mt-2">
      <div className="space-y-0 mb-3">
        {left.map((item, i) => (
          <div key={item}>
            <div className="flex items-center gap-2.5 py-1.5">
              <div className="w-5 h-5 rounded-md bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                <span className="text-[9px] text-zinc-500 font-medium">{i + 1}</span>
              </div>
              <span className="text-xs text-zinc-500">{item}</span>
            </div>
            {i < left.length - 1 && (
              <div className="flex justify-start ml-2.5">
                <ChevronDown className="w-3 h-3 text-zinc-700" />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-start ml-2.5 mb-2">
        <ChevronDown className="w-3 h-3 text-[#8B5CF6]/40" />
      </div>
      <div className="text-[10px] text-zinc-600 ml-8 mb-2">AI creates →</div>

      {right.map((item, i) => (
        <div key={item}>
          <div className="flex items-center gap-2.5 py-1.5">
            <div className="w-5 h-5 rounded-md bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 flex items-center justify-center shrink-0">
              <span className="text-[9px] text-[#8B5CF6] font-medium">✦</span>
            </div>
            <span className="text-xs text-zinc-400 font-medium">{item}</span>
          </div>
          {i < right.length - 1 && (
            <div className="flex justify-start ml-2.5">
              <ChevronDown className="w-3 h-3 text-[#8B5CF6]/30" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Reports Dashboard ── */
function ReportsDashboard() {
  const metrics = [
    { label: "Automations Executed", value: "1,245" },
    { label: "Time Saved", value: "312 Hours" },
    { label: "Documents Indexed", value: "95K" },
    { label: "Cost Saved", value: "$18K" },
  ];

  return (
    <div className="mt-3">
      <div className="grid grid-cols-2 gap-2 mb-3">
        {metrics.map((m) => (
          <div key={m.label} className="bg-white/[0.03] border border-white/5 rounded-lg p-3">
            <div className="text-sm font-semibold text-white">{m.value}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">{m.label}</div>
          </div>
        ))}
      </div>
      <div className="text-[10px] text-zinc-600 text-center">
        Weekly report sent every Monday
      </div>
    </div>
  );
}

/* ── Security List ── */
function SecurityList() {
  const items = ["SSO", "RBAC", "Audit Logs", "Encryption", "GDPR", "SOC2", "On-prem", "Cloud"];

  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      {items.map((item) => (
        <div key={item} className="flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/70 shrink-0" />
          <span className="text-xs text-zinc-400">{item}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Integration Badge ── */
function IntegrationBadge({ name }: { name: string }) {
  return (
    <div className="shrink-0 px-5 py-3 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-zinc-500 hover:text-zinc-300 hover:border-white/10 hover:bg-white/[0.06] transition-all cursor-default whitespace-nowrap">
      {name}
    </div>
  );
}

/* ── Stat Card ── */
function StatCard({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const { count, ref } = useCountUp(value);

  return (
    <motion.div variants={fadeUp} className="glass-card p-8 text-center hover:bg-white/[0.04] transition-all duration-300">
      <div className="text-4xl sm:text-5xl font-bold tracking-tight mb-2">
        <span ref={ref} className="gradient-text">
          {count}
        </span>
        <span className="gradient-text">{suffix}</span>
      </div>
      <p className="text-sm text-zinc-500">{label}</p>
    </motion.div>
  );
}

/* ── Footer Column ── */
function FooterColumn({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">{title}</h4>
      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={link}>
            <a href="#" className="text-sm text-zinc-600 hover:text-zinc-300 transition-colors">
              {link}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
