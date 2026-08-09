"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { askAssistant } from "@/components/ai-assistant/AIAssistantWidget";
import {
  ArrowLeft, Phone, Sparkles, ArrowRight, Globe, Clock, MessageSquare, RefreshCw,
  BarChart3, CheckCircle2, Upload, FileText, Code2, MessageCircle,
  User, MapPin, Briefcase, Languages, ShieldCheck, Target, PhoneMissed,
  Loader2, Bot,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   DATA
   POC: fully client-side, no calls are placed and no backend is
   involved — every "call", score, and candidate here is simulated.
   Agent persona is named after this project's builder, matching the
   self-referential branding used across the rest of the demo.
   ═══════════════════════════════════════════════════════════ */

const AGENT_NAME = "Ayush";

const WAVEFORM_HEIGHTS = [40, 68, 52, 88, 60, 76, 44, 92, 62, 72, 48, 82, 58, 38];

const CALL_SCRIPT = [
  { from: "agent", text: "Hi John — got five minutes about the role?" },
  { from: "candidate", text: "Sure, I'm actively looking." },
  { from: "agent", text: "Tell me about a system you scaled recently." },
];

const CALL_REPORT = [
  { label: "Intent & interest", value: 92 },
  { label: "Technical", value: 82 },
  { label: "Communication", value: 88 },
];

const HERO_STATS = [
  { value: "10+", label: "languages & accents" },
  { value: "24/7", label: "candidate outreach" },
  { value: "0", label: "recruiter dials needed" },
  { value: "~2 min", label: "to set up" },
];

const MEET_FEATURES = [
  { title: "Natural & adaptive", desc: "Holds a real conversation and follows the thread. It doesn't feel like an AI call.", icon: MessageSquare },
  { title: "Always on", desc: "Calls 24/7 and retries no-answers — so candidates pick up when it suits them.", icon: Clock },
  { title: "Speaks their language", desc: "The candidate's language and accent, matched on the fly.", icon: Globe },
  { title: "Scores what matters", desc: "Turns every call into a clear, ranked read for your team.", icon: BarChart3 },
];

const SCORES = [
  { label: "Intent & Interest", desc: "Are they genuinely looking, and how keen on this role.", value: 92, icon: Target },
  { label: "Technical & Role Fit", desc: "Depth on the skills the role needs, probed live.", value: 82, icon: Code2 },
  { label: "Communication & Confidence", desc: "Clarity and confidence in how they speak.", value: 88, icon: MessageCircle },
  { label: "Personality & Fit", desc: "Working style and attitude cues from the conversation.", value: 85, icon: User },
];

const CAPTURED_TAGS = [
  { label: "Experience", icon: Briefcase },
  { label: "Location", icon: MapPin },
  { label: "Work mode", icon: Code2 },
  { label: "Compensation", icon: BarChart3 },
  { label: "Notice period", icon: Clock },
  { label: "Availability", icon: CheckCircle2 },
  { label: "+ more", icon: Sparkles },
];

type CandidateStatus = "answered" | "no_answer" | "scheduled";
const DEFAULT_CANDIDATES: { name: string; status: CandidateStatus }[] = [
  { name: "Priya Sharma", status: "answered" },
  { name: "Lia Pareek", status: "answered" },
  { name: "John Doe", status: "answered" },
  { name: "Anjali Menon", status: "no_answer" },
  { name: "Arjun Mehta", status: "scheduled" },
  { name: "Diya Gupta", status: "scheduled" },
];

const HIGHLIGHT_PILLS = [
  { label: "Natural & adaptive", icon: MessageSquare },
  { label: "Accent-matched", icon: Globe },
  { label: "24/7 outreach", icon: Clock },
  { label: "No-bias scoring", icon: ShieldCheck },
  { label: "Auto-retry", icon: RefreshCw },
  { label: "Ranked shortlist", icon: BarChart3 },
  { label: "10+ languages", icon: Languages },
];

const LANGUAGES = ["Hindi", "Gujarati", "Telugu", "Tamil", "English", "German", "中文", "Français"];
const ACCENTS = ["South Indian accent", "American", "British", "+ more"];

const TRANSCRIPT_PREVIEW = [
  { from: "agent", text: "So you led the migration — what was the hardest part?" },
  { from: "candidate", text: "Honestly, the data layer. We had downtime concerns." },
  { from: "agent", text: "Makes sense. How did you handle the cutover without downtime?" },
];

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════ */

export default function TelephonicAgentPage() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 bg-white-grid relative selection:bg-blue-500/20">
      <nav className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-zinc-200/80 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-bold text-zinc-900 hover:text-blue-600 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Platform</span>
          </Link>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-bold text-zinc-900">Telephonic Agent</span>
          </div>
          <Link
            href="/hiring-automation"
            className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-700 hover:bg-zinc-200 transition-colors hidden sm:inline-flex items-center gap-1.5"
          >
            Open Hiring Pipeline <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      <HeroSection />
      <MeetAgentSection />
      <ScoresSection />
      <ThreeStepSection />
      <OnTheCallSection />
      <ClosingCtaBanner />

      <footer className="border-t border-zinc-200 bg-white py-10">
        <div className="max-w-6xl mx-auto px-6 text-center text-[12px] text-zinc-500 font-mono">
          AgenticFlow AI · Telephonic Agent is a simulated product demo — no real calls are placed.
        </div>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SECTION 1 — HERO + LIVE CALL DEMO
   ═══════════════════════════════════════════════════════════ */

function HeroSection() {
  return (
    <section className="relative pt-24 pb-16 md:pt-32 overflow-hidden">
      <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
        <span className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-blue-600 font-semibold px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 mb-6">
          <Sparkles className="w-3.5 h-3.5" /> AI Voice Screening for Hiring Teams
        </span>

        <h1 className="text-[clamp(2rem,4.5vw,3.2rem)] font-extrabold tracking-tight leading-[1.1] mb-5">
          <span className="text-blue-600">Telephonic Agent</span> AI Voice Screening for Recruitment.
        </h1>

        <p className="text-[16px] text-zinc-600 leading-relaxed max-w-xl mx-auto mb-8">
          {AGENT_NAME}, our AI voice agent, calls your candidates in 10+ languages, screens for role fit, and delivers a ranked shortlist to your dashboard the same day. No calls. No coordination. Just decisions.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 mb-5">
          <Link
            href="/hiring-automation"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-all"
          >
            Try Telephonic Agent <ArrowRight className="w-4 h-4" />
          </Link>
          <button
            onClick={() => askAssistant("I'd like to book a demo of the Telephonic Agent voice screening product.")}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-semibold border border-zinc-200 text-zinc-700 bg-white hover:bg-zinc-50 hover:border-zinc-300 transition-all"
          >
            Book a Demo
          </button>
        </div>

        <p className="text-[12px] text-zinc-500 flex items-center justify-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> Works with your existing process. <span className="font-semibold text-zinc-700">No new ATS.</span>
        </p>
      </div>

      <div className="max-w-3xl mx-auto px-6 mt-14 relative z-10">
        <LiveCallDemoCard />
      </div>

      <div className="max-w-4xl mx-auto px-6 mt-16 pt-10 border-t border-zinc-200 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {HERO_STATS.map((s) => (
            <div key={s.label}>
              <div className="text-xl sm:text-2xl font-extrabold text-blue-600 font-mono">{s.value}</div>
              <div className="text-[12px] text-zinc-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LiveCallDemoCard() {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white shadow-xl overflow-hidden">
      <div className="p-4 sm:p-5 flex items-center justify-between border-b border-zinc-100">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
            AS
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-zinc-900 truncate">{AGENT_NAME} · Telephonic Agent</div>
            <div className="text-[11px] text-emerald-600 font-mono flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> On a call · 02:14
            </div>
          </div>
        </div>
        <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 flex items-center gap-1 shrink-0">
          <Globe className="w-3 h-3" /> English
        </span>
      </div>

      {/* live waveform */}
      <div className="flex items-center gap-1 h-10 px-5 py-3 bg-zinc-50/60">
        {WAVEFORM_HEIGHTS.map((h, i) => (
          <motion.div
            key={i}
            className="flex-1 bg-blue-500 rounded-full"
            style={{ minHeight: 3 }}
            animate={{ height: [`${h * 0.35}%`, `${h}%`, `${h * 0.5}%`] }}
            transition={{ duration: 0.9 + (i % 5) * 0.15, repeat: Infinity, ease: "easeInOut", delay: i * 0.05 }}
          />
        ))}
      </div>

      <div className="relative p-5 space-y-3 min-h-[170px]">
        {CALL_SCRIPT.map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.5, duration: 0.4 }}
            className={`flex ${line.from === "candidate" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[75%] sm:max-w-[60%] px-3.5 py-2 rounded-xl text-[13px] leading-snug ${
                line.from === "agent" ? "bg-blue-50 text-blue-900 border border-blue-100" : "bg-zinc-100 text-zinc-700"
              }`}
            >
              {line.text}
            </div>
          </motion.div>
        ))}

        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 1.6, duration: 0.4 }}
          className="absolute bottom-2 right-2 sm:right-3 w-52 rounded-xl border border-zinc-200 shadow-lg bg-white p-3"
        >
          <div className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider mb-2">Call Report</div>
          <div className="space-y-2">
            {CALL_REPORT.map((r) => (
              <div key={r.label}>
                <div className="flex items-center justify-between text-[10.5px] mb-1">
                  <span className="text-zinc-600">{r.label}</span>
                  <span className="font-bold text-blue-700">{r.value}%</span>
                </div>
                <div className="h-1 bg-zinc-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-blue-600 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${r.value}%` }}
                    transition={{ delay: 1.9, duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SECTION 2 — MEET THE AGENT
   ═══════════════════════════════════════════════════════════ */

function MeetAgentSection() {
  const [left, right] = [MEET_FEATURES.slice(0, 2), MEET_FEATURES.slice(2)];
  return (
    <section className="py-20 sm:py-24 border-t border-zinc-200/80 bg-zinc-50/50">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center max-w-xl mx-auto mb-14">
          <span className="text-xs font-mono uppercase tracking-widest text-blue-600 font-semibold px-2.5 py-1 rounded bg-blue-50 border border-blue-200">
            Meet {AGENT_NAME}
          </span>
          <h2 className="text-[clamp(1.6rem,3vw,2.2rem)] font-extrabold text-zinc-900 tracking-tight mt-4">
            The voice on your first-round calls
          </h2>
          <p className="text-zinc-600 text-[15px] mt-2 leading-relaxed">
            {AGENT_NAME} is the AI agent inside Telephonic Agent. It calls, listens, adapts, and scores every conversation.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 items-stretch">
          <div className="flex flex-col gap-5">
            {left.map((f) => <FeatureMiniCard key={f.title} {...f} />)}
          </div>

          <AgentProfileCard />

          <div className="flex flex-col gap-5">
            {right.map((f) => <FeatureMiniCard key={f.title} {...f} />)}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureMiniCard({ title, desc, icon: Icon }: { title: string; desc: string; icon: ComponentType<{ className?: string }> }) {
  return (
    <div className="flex-1 rounded-2xl bg-white border border-zinc-200 p-5">
      <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-3">
        <Icon className="w-4 h-4" />
      </div>
      <h3 className="text-[14px] font-bold text-zinc-900 mb-1">{title}</h3>
      <p className="text-[12.5px] text-zinc-500 leading-relaxed">{desc}</p>
    </div>
  );
}

function AgentProfileCard() {
  return (
    <div className="relative rounded-3xl bg-gradient-to-br from-blue-600 via-blue-600 to-sky-500 p-8 flex flex-col items-center justify-center text-center shadow-xl shadow-blue-600/20 overflow-hidden min-h-[260px]">
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      <div className="relative w-20 h-20 rounded-full bg-white/95 border-4 border-white/40 flex items-center justify-center text-blue-700 font-extrabold text-2xl shadow-lg mb-4">
        AS
      </div>
      <div className="relative text-lg font-extrabold text-white">{AGENT_NAME}</div>
      <div className="relative text-[12px] text-blue-100 font-mono mt-1">Telephonic Agent · AgenticFlow AI</div>
      <div className="relative flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-full bg-white/15 border border-white/20 text-[11px] font-mono text-white">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Always on
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SECTION 3 — SCORECARDS
   ═══════════════════════════════════════════════════════════ */

function ScoresSection() {
  return (
    <section className="py-20 sm:py-24 border-t border-zinc-200/80">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center max-w-xl mx-auto mb-14">
          <span className="text-xs font-mono uppercase tracking-widest text-blue-600 font-semibold px-2.5 py-1 rounded bg-blue-50 border border-blue-200">
            What You Get Back
          </span>
          <h2 className="text-[clamp(1.6rem,3vw,2.2rem)] font-extrabold text-zinc-900 tracking-tight mt-4">
            A clear read on <span className="text-blue-600">every candidate</span>
          </h2>
          <p className="text-zinc-600 text-[15px] mt-2 leading-relaxed">
            The moment a call ends, {AGENT_NAME} turns the conversation into a scored, ranked profile.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5 mb-10">
          {SCORES.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="rounded-2xl bg-white border border-zinc-200 p-5">
                <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4">
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="text-[14px] font-bold text-zinc-900 mb-1">{s.label}</h3>
                <p className="text-[12px] text-zinc-500 leading-relaxed mb-4 min-h-[36px]">{s.desc}</p>
                <div className="flex items-center gap-2.5">
                  <span className="text-[15px] font-extrabold text-blue-700 font-mono shrink-0">{s.value}%</span>
                  <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-blue-600 rounded-full"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${s.value}%` }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{ duration: 0.9, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center">
          <div className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider mb-3">Also Captured on Every Call</div>
          <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
            {CAPTURED_TAGS.map((t) => {
              const Icon = t.icon;
              return (
                <span key={t.label} className="text-[12px] font-medium px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5" /> {t.label}
                </span>
              );
            })}
          </div>
          <p className="text-[12px] text-zinc-500">Every score links back to the full call transcript.</p>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   SECTION 4 — THREE STEPS (interactive)
   ═══════════════════════════════════════════════════════════ */

function ThreeStepSection() {
  const [step, setStep] = useState(1);
  const [jobTitle, setJobTitle] = useState("Frontend Developer");
  const [location, setLocation] = useState("Bangalore");
  const [experience, setExperience] = useState("3");
  const [workType, setWorkType] = useState("Full Time");

  return (
    <section className="py-20 sm:py-24 border-t border-zinc-200/80 bg-zinc-50/50">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center max-w-xl mx-auto mb-14">
          <h2 className="text-[clamp(1.6rem,3vw,2.2rem)] font-extrabold text-zinc-900 tracking-tight">
            From role to first calls in <span className="text-blue-600">three steps</span>
          </h2>
          <p className="text-zinc-600 text-[15px] mt-2 leading-relaxed">
            Set the role, hand over your list, let {AGENT_NAME} call.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 items-start">
          {/* Step 1 */}
          <StepShell num={1} label="Define Your Role" state={step > 1 ? "done" : "active"}>
            <div className="rounded-2xl bg-white border border-zinc-200 shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 border-b border-zinc-100 text-[12px] font-bold text-zinc-700">New Role</div>
              <div className="p-4 space-y-3">
                <LabeledInput label="Job Title" icon={Briefcase} value={jobTitle} onChange={setJobTitle} disabled={step > 1} />
                <LabeledInput label="Location" icon={MapPin} value={location} onChange={setLocation} disabled={step > 1} />
                <div className="grid grid-cols-2 gap-3">
                  <LabeledInput label="Experience" value={experience} onChange={setExperience} disabled={step > 1} />
                  <LabeledSelect label="Work Type" value={workType} onChange={setWorkType} options={["Full Time", "Part Time", "Contract"]} disabled={step > 1} />
                </div>
                <button
                  onClick={() => setStep((s) => Math.max(s, 2))}
                  disabled={step > 1}
                  className="w-full mt-1 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-[13px] font-bold hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-default flex items-center justify-center gap-1.5"
                >
                  {step > 1 ? <><CheckCircle2 className="w-3.5 h-3.5" /> Role Launched</> : "Launch Role"}
                </button>
              </div>
            </div>
          </StepShell>

          {/* Step 2 */}
          <StepShell num={2} label="Upload Your Data" state={step > 2 ? "done" : step === 2 ? "active" : "pending"}>
            <div className={`rounded-2xl bg-white border border-zinc-200 shadow-sm overflow-hidden transition-opacity ${step < 2 ? "opacity-50 pointer-events-none" : ""}`}>
              <div className="px-4 py-2.5 border-b border-zinc-100 text-[12px] font-bold text-zinc-700">Upload CSV</div>
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-[12px] font-semibold">
                  <Upload className="w-3.5 h-3.5" /> Upload the file
                </div>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-500 text-[12px]">
                  <FileText className="w-3.5 h-3.5" /> Resume / pdf
                </div>
                <div className="px-3 py-3 rounded-lg border border-dashed border-zinc-300 text-zinc-400 text-[11.5px] text-center">
                  Drop your file here or browse
                </div>
                <button
                  onClick={() => setStep((s) => Math.max(s, 3))}
                  disabled={step < 2 || step > 2}
                  className="w-full mt-1 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-[13px] font-bold hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-default flex items-center justify-center gap-1.5"
                >
                  {step > 2 ? <><CheckCircle2 className="w-3.5 h-3.5" /> Uploaded</> : "Upload"}
                </button>
              </div>
            </div>
          </StepShell>

          {/* Step 3 */}
          <StepShell num={3} label="Start Scheduling" state={step >= 3 ? "done" : "pending"}>
            <div className={`rounded-2xl bg-white border border-zinc-200 shadow-sm overflow-hidden transition-opacity ${step < 3 ? "opacity-50 pointer-events-none" : ""}`}>
              <div className="px-4 py-2.5 border-b border-zinc-100 text-[12px] font-bold text-zinc-700">Candidate Status</div>
              <div className="p-2">
                {DEFAULT_CANDIDATES.map((c, i) => (
                  <motion.div
                    key={c.name}
                    initial={false}
                    animate={step >= 3 ? { opacity: 1, x: 0 } : { opacity: 0, x: -6 }}
                    transition={{ delay: step >= 3 ? 0.15 * i : 0, duration: 0.35 }}
                    className="flex items-center justify-between px-2.5 py-2 rounded-lg"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[9px] font-bold text-blue-700 shrink-0">
                        {c.name[0]}
                      </div>
                      <span className="text-[12.5px] text-zinc-800 truncate">{c.name}</span>
                    </div>
                    <CandidateStatusBadge status={c.status} />
                  </motion.div>
                ))}
              </div>
            </div>
          </StepShell>
        </div>

        <p className="text-center text-[12.5px] text-zinc-500 mt-8 flex items-center justify-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-blue-500" /> Setting up a role takes about <span className="font-bold text-zinc-800">2 minutes.</span>
        </p>
      </div>
    </section>
  );
}

function StepShell({ num, label, state, children }: { num: number; label: string; state: "pending" | "active" | "done"; children: ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
          state === "done" ? "bg-emerald-500 text-white" : state === "active" ? "bg-blue-600 text-white" : "bg-zinc-200 text-zinc-500"
        }`}>
          {state === "done" ? <CheckCircle2 className="w-3.5 h-3.5" /> : num}
        </span>
        <span className={`text-[11px] font-mono font-bold uppercase tracking-wider ${state === "pending" ? "text-zinc-400" : "text-zinc-700"}`}>{label}</span>
      </div>
      {children}
    </div>
  );
}

function LabeledInput({
  label, icon: Icon, value, onChange, disabled,
}: { label: string; icon?: ComponentType<{ className?: string }>; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-zinc-500 mb-1 block">{label}</span>
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-200 focus-within:border-blue-400">
        {Icon && <Icon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
        <input
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-[13px] text-zinc-800 focus:outline-none disabled:text-zinc-500"
        />
      </div>
    </label>
  );
}

function LabeledSelect({
  label, value, onChange, options, disabled,
}: { label: string; value: string; onChange: (v: string) => void; options: string[]; disabled?: boolean }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-zinc-500 mb-1 block">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-200 text-[13px] text-zinc-800 focus:outline-none focus:border-blue-400 disabled:text-zinc-500 appearance-none"
      >
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </label>
  );
}

function CandidateStatusBadge({ status }: { status: CandidateStatus }) {
  if (status === "answered") {
    return <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Answered</span>;
  }
  if (status === "no_answer") {
    return <span className="text-[11px] font-semibold text-amber-600 flex items-center gap-1"><PhoneMissed className="w-3.5 h-3.5" /> No answer</span>;
  }
  return <span className="text-[11px] font-semibold text-blue-600 flex items-center gap-1"><Loader2 className="w-3.5 h-3.5" /> Scheduled</span>;
}

/* ═══════════════════════════════════════════════════════════
   SECTION 5 — ON THE CALL
   ═══════════════════════════════════════════════════════════ */

function OnTheCallSection() {
  return (
    <section className="py-20 sm:py-24 border-t border-zinc-200/80">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="text-xs font-mono uppercase tracking-widest text-blue-600 font-semibold px-2.5 py-1 rounded bg-blue-50 border border-blue-200">
            On the Call
          </span>
          <h2 className="text-[clamp(1.6rem,3vw,2.2rem)] font-extrabold text-zinc-900 tracking-tight mt-4">
            Calls candidates <span className="text-blue-600">actually take</span>
          </h2>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 mb-14">
          {HIGHLIGHT_PILLS.map((p) => {
            const Icon = p.icon;
            return (
              <span key={p.label} className="text-[12px] font-medium px-3.5 py-1.5 rounded-full bg-white border border-zinc-200 text-zinc-700 flex items-center gap-1.5 shadow-2xs">
                <Icon className="w-3.5 h-3.5 text-blue-600" /> {p.label}
              </span>
            );
          })}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-[18px] font-bold text-zinc-900 mb-2">Multilingual &amp; accent-aware</h3>
            <p className="text-[13.5px] text-zinc-600 leading-relaxed">
              {AGENT_NAME} speaks Hindi, Gujarati, Telugu, Tamil and English — and matches the accent, from South Indian to American or British. Screen a multi-city or global pipeline without a recruiter for every language.
            </p>
          </div>

          <div className="rounded-2xl bg-white border border-zinc-200 p-5">
            <div className="flex flex-wrap gap-2 mb-3">
              {LANGUAGES.map((l) => (
                <span key={l} className="text-[12px] font-semibold px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700">{l}</span>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {ACCENTS.map((a) => (
                <span key={a} className="text-[12px] font-semibold px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-700">{a}</span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-zinc-200 p-5 space-y-2.5">
            {TRANSCRIPT_PREVIEW.map((line, i) => (
              <div key={i} className={`flex ${line.from === "candidate" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-[12.5px] leading-snug ${
                  line.from === "agent" ? "bg-blue-50 text-blue-900 border border-blue-100" : "bg-zinc-100 text-zinc-700"
                }`}>
                  {line.text}
                </div>
              </div>
            ))}
          </div>

          <div>
            <h3 className="text-[18px] font-bold text-zinc-900 mb-2">Natural, adaptive, responsive</h3>
            <p className="text-[13.5px] text-zinc-600 leading-relaxed">
              {AGENT_NAME} listens and responds as the candidate speaks, follows the thread, and adjusts to each person. It holds a real conversation — it doesn&apos;t feel like an AI call at all.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   SECTION 6 — CLOSING CTA
   ═══════════════════════════════════════════════════════════ */

function ClosingCtaBanner() {
  return (
    <section className="py-20 border-t border-zinc-200/80 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        <div className="relative rounded-[2rem] overflow-hidden p-10 sm:p-14 text-center bg-gradient-to-br from-blue-600 via-blue-600 to-sky-500 shadow-2xl shadow-blue-600/25">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white mx-auto mb-5">
              <Bot className="w-6 h-6" />
            </div>
            <h2 className="text-[clamp(1.5rem,3.5vw,2.1rem)] font-extrabold text-white tracking-tight mb-3">
              Your recruiters have better things to do than dial
            </h2>
            <p className="text-blue-100 text-[15px] max-w-lg mx-auto mb-8">
              Hand the first round to {AGENT_NAME}. Get a ranked shortlist — and your team&apos;s week back.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => askAssistant("I'd like to book a demo of the Telephonic Agent voice screening product.")}
                className="px-6 py-3 rounded-xl text-[14px] font-semibold bg-white/15 border border-white/25 text-white hover:bg-white/25 transition-colors"
              >
                Book a Demo
              </button>
              <Link
                href="/hiring-automation"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-semibold bg-white text-blue-700 hover:bg-blue-50 transition-colors shadow-sm"
              >
                Try Telephonic Agent <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
