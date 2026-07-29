"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  X, BarChart3, Users, GitPullRequest, CheckCircle2, Activity,
  Trophy, Award, FileText, Calendar, TrendingUp,
} from "lucide-react";
import {
  WEEKLY_EMPLOYEE_REPORTS,
  WEEKLY_ACTIVITY_FEED,
  WEEKLY_LEADERBOARD,
  WEEKLY_EXEC_SUMMARY,
  WEEKLY_PRODUCTIVITY_METRICS,
  type WeeklyEmployeeReport,
  type WeeklyActivityItem,
  type PRStatus,
} from "./weeklyReportData";

/* ═══════════════════════════════════════════════════════════
   HOOKS (mirrors useCountUp in app/page.tsx / useAnimatedCounter in app/knowledge/page.tsx)
   ═══════════════════════════════════════════════════════════ */

function useCountUp(end: number, duration = 1200) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const started = useRef(false);

  useEffect(() => {
    if (!inView || started.current) return;
    started.current = true;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      setCount(Math.floor((1 - Math.pow(1 - p, 3)) * end));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, end, duration]);

  return { count, ref };
}

function StatSpan({ end, suffix = "" }: { end: number; suffix?: string }) {
  const { count, ref } = useCountUp(end);
  return (
    <span>
      <span ref={ref}>{count}</span>
      {suffix}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════
   SHARED HELPERS
   ═══════════════════════════════════════════════════════════ */

const PR_STATUS_STYLES: Record<PRStatus, string> = {
  merged: "bg-indigo-50 border-indigo-200 text-indigo-700",
  open: "bg-emerald-50 border-emerald-200 text-emerald-700",
  pending: "bg-amber-50 border-amber-200 text-amber-700",
  rejected: "bg-red-50 border-red-200 text-red-600",
};

const ACTIVITY_TYPE_COLORS: Record<WeeklyActivityItem["type"], string> = {
  feature: "bg-blue-50 border-blue-200 text-blue-700",
  bugfix: "bg-red-50 border-red-200 text-red-600",
  docs: "bg-zinc-100 border-zinc-200 text-zinc-600",
  pr_merged: "bg-indigo-50 border-indigo-200 text-indigo-700",
  review: "bg-amber-50 border-amber-200 text-amber-700",
  commit: "bg-zinc-100 border-zinc-200 text-zinc-600",
  knowledge: "bg-emerald-50 border-emerald-200 text-emerald-700",
};

function AvatarCircle({ initials, size = "w-10 h-10" }: { initials: string; size?: string }) {
  return (
    <div className={`${size} rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 text-xs font-bold shrink-0`}>
      {initials}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MODAL SHELL
   ═══════════════════════════════════════════════════════════ */

const SECTIONS = [
  { id: "summary", label: "Executive Summary" },
  { id: "employees", label: "Weekly Employee Report" },
  { id: "activity", label: "Weekly Activity Feed" },
  { id: "leaderboard", label: "Team Leaderboard" },
  { id: "metrics", label: "Productivity Metrics" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export default function WeeklyReportModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [activeSection, setActiveSection] = useState<SectionId>("summary");

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-zinc-900/40 backdrop-blur-md flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.96, y: 15 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 15 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-zinc-200/90 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans relative"
          >
            {/* Header */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 bg-zinc-50/90 border-b border-zinc-200/80 flex items-center justify-between gap-2 z-20 shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs shrink-0">
                  <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-zinc-900 truncate">Weekly Executive Report</h3>
                  <p className="hidden sm:block text-xs text-zinc-500">Employee activity, weekly changes, and team leaderboard for the current week</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Section tabs */}
            <div className="px-4 sm:px-6 py-2 border-b border-zinc-200/60 bg-white/90 shrink-0">
              <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                {SECTIONS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveSection(s.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                      activeSection === s.id
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white relative scrollbar-thin">
              {activeSection === "summary" && <ExecutiveSummarySection />}
              {activeSection === "employees" && <EmployeeReportSection />}
              {activeSection === "activity" && <ActivityFeedSection />}
              {activeSection === "leaderboard" && <LeaderboardSection />}
              {activeSection === "metrics" && <ProductivityMetricsSection />}
            </div>

            {/* Footer */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 bg-zinc-50/90 border-t border-zinc-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 z-20 shrink-0">
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-600 text-center sm:text-left">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{WEEKLY_EXEC_SUMMARY.totalEmployees} team members reporting this week</span>
              </div>
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-md shadow-blue-600/20"
              >
                Close Report
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════════════════════
   1. EXECUTIVE SUMMARY
   ═══════════════════════════════════════════════════════════ */

function ExecutiveSummarySection() {
  const tiles = [
    { label: "Team Members", value: WEEKLY_EXEC_SUMMARY.totalEmployees, suffix: "", icon: <Users className="w-4 h-4" /> },
    { label: "Tasks Completed", value: WEEKLY_EXEC_SUMMARY.totalTasksCompleted, suffix: "", icon: <CheckCircle2 className="w-4 h-4" /> },
    { label: "PRs Merged", value: WEEKLY_EXEC_SUMMARY.totalPRsMerged, suffix: "", icon: <GitPullRequest className="w-4 h-4" /> },
    { label: "Avg Productivity", value: WEEKLY_EXEC_SUMMARY.avgProductivityScore, suffix: "%", icon: <TrendingUp className="w-4 h-4" /> },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <h4 className="text-sm font-bold text-zinc-900 mb-4 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-blue-600" /> This Week at a Glance
      </h4>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map((t) => (
          <div key={t.label} className="p-4 rounded-2xl bg-white border border-zinc-200 hover:border-blue-300 transition-all">
            <div className="flex items-center gap-2 mb-2 text-blue-600">
              {t.icon}
              <span className="text-[11px] font-bold text-zinc-500 uppercase">{t.label}</span>
            </div>
            <div className="text-2xl font-extrabold text-zinc-900 font-mono">
              <StatSpan end={t.value} suffix={t.suffix} />
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-zinc-500 mt-6 leading-relaxed">
        Executive Digest compiled from this week&apos;s tasks, pull requests, tickets, and meetings across the team. See the
        Weekly Employee Report and Team Leaderboard tabs for a full breakdown.
      </p>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   2. WEEKLY EMPLOYEE REPORT
   ═══════════════════════════════════════════════════════════ */

function PRStatusPill({ status, count }: { status: PRStatus; count: number }) {
  return (
    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border capitalize ${PR_STATUS_STYLES[status]}`}>
      {status}: {count}
    </span>
  );
}

function EmployeeReportCard({ employee, index }: { employee: WeeklyEmployeeReport; index: number }) {
  const stats = [
    { label: "Tasks", value: employee.tasksCompleted },
    { label: "Tickets", value: employee.ticketsCompleted },
    { label: "Docs Created", value: employee.documentsCreated },
    { label: "Meetings", value: employee.meetingsAttended },
    { label: "Productivity", value: `${employee.productivityScore}%` },
    { label: "AI Usage", value: employee.aiUsage === null ? "N/A" : employee.aiUsage },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="p-5 rounded-2xl bg-white border border-zinc-200 hover:border-blue-300 transition-all"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
        <AvatarCircle initials={employee.avatarInitials} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-zinc-900">{employee.name}</div>
          <div className="text-[11px] text-zinc-500">{employee.role} · {employee.department}</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Last active {employee.lastActive}</div>
        </div>
        <div className="flex flex-wrap gap-1.5 shrink-0">
          <PRStatusPill status="open" count={employee.prs.open} />
          <PRStatusPill status="merged" count={employee.prs.merged} />
          <PRStatusPill status="pending" count={employee.prs.pending} />
          <PRStatusPill status="rejected" count={employee.prs.rejected} />
        </div>
      </div>

      <p className="text-xs text-zinc-600 leading-relaxed mb-4">{employee.weeklySummary}</p>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-center">
            <div className="text-sm font-extrabold text-zinc-900 font-mono">{s.value}</div>
            <div className="text-[9px] font-bold text-zinc-500 uppercase">{s.label}</div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function EmployeeReportSection() {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <h4 className="text-sm font-bold text-zinc-900 mb-4 flex items-center gap-2">
        <Users className="w-4 h-4 text-blue-600" /> Weekly Employee Activity ({WEEKLY_EMPLOYEE_REPORTS.length})
      </h4>
      <div className="space-y-3">
        {WEEKLY_EMPLOYEE_REPORTS.map((employee, i) => (
          <EmployeeReportCard key={employee.id} employee={employee} index={i} />
        ))}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   3. WEEKLY ACTIVITY FEED
   ═══════════════════════════════════════════════════════════ */

function ActivityFeedSection() {
  const [filter, setFilter] = useState("all");
  const employees = ["all", ...new Set(WEEKLY_ACTIVITY_FEED.map((a) => a.employeeName))];
  const filtered = filter === "all" ? WEEKLY_ACTIVITY_FEED : WEEKLY_ACTIVITY_FEED.filter((a) => a.employeeName === filter);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h4 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-600" /> What Changed This Week
        </h4>
        <div className="flex gap-1 overflow-x-auto">
          {employees.map((name) => (
            <button
              key={name}
              onClick={() => setFilter(name)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                filter === name ? "bg-blue-600 text-white" : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              {name === "all" ? "All" : name}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="p-4 rounded-xl bg-white border border-zinc-200 hover:border-blue-300 transition-all"
          >
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <div className="text-sm font-bold text-zinc-900">{item.title}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{item.detail}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] text-zinc-400">{item.time}</div>
                <div className="text-[10px] font-mono font-bold text-blue-600 mt-0.5">{item.employeeName}</div>
              </div>
            </div>
            <span className={`inline-block mt-2 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border capitalize ${ACTIVITY_TYPE_COLORS[item.type]}`}>
              {item.type.replace("_", " ")}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   4. TEAM LEADERBOARD
   ═══════════════════════════════════════════════════════════ */

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border bg-amber-50 border-amber-200 text-amber-700">
        <Trophy className="w-3 h-3" /> #1
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border bg-zinc-100 border-zinc-300 text-zinc-600">
        <Award className="w-3 h-3" /> #2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border bg-orange-50 border-orange-200 text-orange-700">
        <Award className="w-3 h-3" /> #3
      </span>
    );
  }
  return <span className="text-xs font-mono font-bold text-zinc-400 w-8 text-center">#{rank}</span>;
}

function LeaderboardSection() {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <h4 className="text-sm font-bold text-zinc-900 mb-4 flex items-center gap-2">
        <Trophy className="w-4 h-4 text-blue-600" /> Team Leaderboard — Weekly Points
      </h4>
      <div className="space-y-2">
        {WEEKLY_LEADERBOARD.map((entry, i) => (
          <motion.div
            key={entry.employeeId}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-white border border-zinc-200 hover:border-blue-300 transition-all"
          >
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <RankBadge rank={entry.rank} />
              <AvatarCircle initials={entry.name.split(" ").map((w) => w[0]).join("")} size="w-9 h-9" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-zinc-900 truncate">{entry.name}</div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-600">
                  {entry.team}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 sm:flex sm:items-center gap-3 sm:gap-4 text-center w-full sm:w-auto sm:ml-auto">
              <div>
                <div className="text-sm font-extrabold text-zinc-900 font-mono">{entry.productivityScore}%</div>
                <div className="text-[9px] font-bold text-zinc-500 uppercase">Score</div>
              </div>
              <div>
                <div className="text-sm font-extrabold text-zinc-900 font-mono">{entry.tasksCompleted}</div>
                <div className="text-[9px] font-bold text-zinc-500 uppercase">Tasks</div>
              </div>
              <div>
                <div className="text-sm font-extrabold text-zinc-900 font-mono">{entry.prsMerged}</div>
                <div className="text-[9px] font-bold text-zinc-500 uppercase">PRs</div>
              </div>
              <div>
                <div className="text-sm font-extrabold text-zinc-900 font-mono">{entry.bugsFixed}</div>
                <div className="text-[9px] font-bold text-zinc-500 uppercase">Bugs</div>
              </div>
              <div>
                <div className="text-sm font-extrabold text-zinc-900 font-mono">{entry.knowledgeContributions}</div>
                <div className="text-[9px] font-bold text-zinc-500 uppercase">Knowledge</div>
              </div>
              <div>
                <div className="text-base font-extrabold text-blue-600 font-mono">{entry.weeklyPoints}</div>
                <div className="text-[9px] font-bold text-zinc-500 uppercase">Points</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   5. WEEKLY PRODUCTIVITY METRICS
   ═══════════════════════════════════════════════════════════ */

function ProductivityMetricsSection() {
  const tiles = [
    { label: "Tasks Completed", value: WEEKLY_PRODUCTIVITY_METRICS.totalTasksCompleted },
    { label: "PRs Merged", value: WEEKLY_PRODUCTIVITY_METRICS.totalPRsMerged },
    { label: "Tickets Closed", value: WEEKLY_PRODUCTIVITY_METRICS.totalTicketsClosed },
    { label: "Docs Created", value: WEEKLY_PRODUCTIVITY_METRICS.totalDocsCreated },
    { label: "Meetings Attended", value: WEEKLY_PRODUCTIVITY_METRICS.totalMeetings },
    { label: "Avg Productivity", value: `${WEEKLY_PRODUCTIVITY_METRICS.avgProductivityScore}%` },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <h4 className="text-sm font-bold text-zinc-900 mb-4 flex items-center gap-2">
        <FileText className="w-4 h-4 text-blue-600" /> Weekly Productivity Metrics
      </h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {tiles.map((m) => (
          <div key={m.label} className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-center">
            <div className="text-lg font-extrabold text-zinc-900 font-mono">{m.value}</div>
            <div className="text-[10px] font-bold text-zinc-500 uppercase">{m.label}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 mt-4 text-[10px] text-zinc-500 font-mono">
        <Calendar className="w-3 h-3 text-blue-600" /> Aggregated across the current reporting week
      </div>
    </motion.div>
  );
}
