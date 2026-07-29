// Names/designations mirror the existing mock rosters in
// ../../app/onboarding/page.tsx (INITIAL_EMPLOYEES, MANAGERS) and
// ../../app/knowledge/page.tsx (EMPLOYEE, PULL_REQUESTS, PROJECTS) so the
// app's "people" stay consistent across pages. Weekly counters (tasks,
// tickets, meetings, productivity score, last-active, leaderboard points)
// are new mock fields — no such data exists in either source page.

export type PRStatus = "open" | "merged" | "pending" | "rejected";

export interface WeeklyPRStats {
  open: number;
  merged: number;
  pending: number;
  rejected: number;
}

export interface WeeklyEmployeeReport {
  id: string;
  name: string;
  avatarInitials: string;
  department: string;
  role: string;
  team: string;
  weeklySummary: string;
  tasksCompleted: number;
  prs: WeeklyPRStats;
  ticketsCompleted: number;
  documentsCreated: number;
  meetingsAttended: number;
  aiUsage: number | null;
  productivityScore: number;
  lastActive: string;
}

export interface WeeklyActivityItem {
  id: string;
  employeeName: string;
  type: "feature" | "bugfix" | "docs" | "pr_merged" | "review" | "commit" | "knowledge";
  title: string;
  detail: string;
  time: string;
}

export interface LeaderboardEntry {
  rank: number;
  employeeId: string;
  name: string;
  team: string;
  productivityScore: number;
  tasksCompleted: number;
  prsMerged: number;
  bugsFixed: number;
  knowledgeContributions: number;
  weeklyPoints: number;
}

export const WEEKLY_EMPLOYEE_REPORTS: WeeklyEmployeeReport[] = [
  {
    id: "e1",
    name: "Ayush Singh",
    avatarInitials: "AS",
    department: "Engineering",
    role: "AI Engineer",
    team: "Cross-Team",
    weeklySummary: "Shipped the vector search pipeline and RAG reranking module; led two cross-team design reviews.",
    tasksCompleted: 14,
    prs: { open: 2, merged: 5, pending: 1, rejected: 0 },
    ticketsCompleted: 6,
    documentsCreated: 3,
    meetingsAttended: 8,
    aiUsage: null,
    productivityScore: 96,
    lastActive: "12 minutes ago",
  },
  {
    id: "m1",
    name: "Rahul Sharma",
    avatarInitials: "RS",
    department: "Engineering",
    role: "Engineering Manager",
    team: "GenQue",
    weeklySummary: "Reviewed 3 PRs, ran weekly 1:1s, and unblocked the auth token refresh fix.",
    tasksCompleted: 9,
    prs: { open: 1, merged: 2, pending: 0, rejected: 0 },
    ticketsCompleted: 4,
    documentsCreated: 2,
    meetingsAttended: 11,
    aiUsage: null,
    productivityScore: 88,
    lastActive: "1 hour ago",
  },
  {
    id: "e2",
    name: "Krrish",
    avatarInitials: "K",
    department: "Design",
    role: "UI Designer",
    team: "GenQue",
    weeklySummary: "Delivered the onboarding flow redesign and reviewed component accessibility across GenQue.",
    tasksCompleted: 11,
    prs: { open: 1, merged: 2, pending: 1, rejected: 1 },
    ticketsCompleted: 5,
    documentsCreated: 4,
    meetingsAttended: 5,
    aiUsage: null,
    productivityScore: 84,
    lastActive: "3 hours ago",
  },
  {
    id: "e3",
    name: "Ketan",
    avatarInitials: "K",
    department: "Engineering",
    role: "MERN Stack Developer",
    team: "RAG Dynamic",
    weeklySummary: "Wired up the Docker compose refresh and started the RAG reranking integration tests.",
    tasksCompleted: 10,
    prs: { open: 2, merged: 1, pending: 1, rejected: 0 },
    ticketsCompleted: 3,
    documentsCreated: 1,
    meetingsAttended: 4,
    aiUsage: null,
    productivityScore: 79,
    lastActive: "5 hours ago",
  },
  {
    id: "e4",
    name: "Shreaya Singh",
    avatarInitials: "SS",
    department: "Engineering",
    role: "Software Developer",
    team: "RAG Dynamic",
    weeklySummary: "Paired on the evaluation metrics dashboard and closed two long-standing bug tickets.",
    tasksCompleted: 8,
    prs: { open: 0, merged: 1, pending: 2, rejected: 0 },
    ticketsCompleted: 2,
    documentsCreated: 2,
    meetingsAttended: 3,
    aiUsage: null,
    productivityScore: 75,
    lastActive: "Yesterday",
  },
  {
    id: "m2",
    name: "Priya Gupta",
    avatarInitials: "PG",
    department: "Compliance",
    role: "Engineering Manager",
    team: "CLAS",
    weeklySummary: "Drove the compliance rule engine review and documented the CLAS release checklist.",
    tasksCompleted: 7,
    prs: { open: 0, merged: 1, pending: 0, rejected: 1 },
    ticketsCompleted: 3,
    documentsCreated: 1,
    meetingsAttended: 9,
    aiUsage: null,
    productivityScore: 71,
    lastActive: "2 days ago",
  },
];

export const WEEKLY_ACTIVITY_FEED: WeeklyActivityItem[] = [
  { id: "a1", employeeName: "Ayush Singh", type: "pr_merged", title: "Merged: Implement vector search pipeline", detail: "12 files changed across the GenQue retrieval layer.", time: "12 minutes ago" },
  { id: "a2", employeeName: "Rahul Sharma", type: "review", title: "Reviewed auth token refresh fix", detail: "Approved with two minor comments on error handling.", time: "1 hour ago" },
  { id: "a3", employeeName: "Krrish", type: "feature", title: "Shipped onboarding flow redesign", detail: "Updated role-selector and employee-card components.", time: "2 hours ago" },
  { id: "a4", employeeName: "Ketan", type: "commit", title: "Updated Docker compose config", detail: "Refreshed base images for the RAG Dynamic service.", time: "3 hours ago" },
  { id: "a5", employeeName: "Ayush Singh", type: "feature", title: "Added RAG reranking module", detail: "Introduced a cross-encoder reranker ahead of generation.", time: "3 hours ago" },
  { id: "a6", employeeName: "Shreaya Singh", type: "bugfix", title: "Fixed evaluation dashboard NaN scores", detail: "Root cause: division by zero on empty result sets.", time: "5 hours ago" },
  { id: "a7", employeeName: "Priya Gupta", type: "docs", title: "Documented CLAS release checklist", detail: "Added rollback steps and compliance sign-off gates.", time: "6 hours ago" },
  { id: "a8", employeeName: "Krrish", type: "review", title: "Reviewed accessibility pass on GenQue UI", detail: "Flagged 3 contrast issues, all resolved same day.", time: "Yesterday" },
  { id: "a9", employeeName: "Ketan", type: "pr_merged", title: "Merged: RAG reranking integration tests", detail: "Added coverage for the new reranker module.", time: "Yesterday" },
  { id: "a10", employeeName: "Ayush Singh", type: "knowledge", title: "Ran cross-team RAG architecture session", detail: "Walked GenQue and CLAS teams through the dual-tier reasoning design.", time: "Yesterday" },
  { id: "a11", employeeName: "Rahul Sharma", type: "knowledge", title: "Shared onboarding runbook with new hires", detail: "Covered repo access flow and manager assignment steps.", time: "2 days ago" },
  { id: "a12", employeeName: "Shreaya Singh", type: "commit", title: "Closed two long-standing bug tickets", detail: "Resolved stale session and duplicate-chunk indexing issues.", time: "2 days ago" },
  { id: "a13", employeeName: "Priya Gupta", type: "review", title: "Reviewed compliance rule engine PR", detail: "Requested tighter validation on obligation-type rules.", time: "3 days ago" },
];

export const WEEKLY_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, employeeId: "e1", name: "Ayush Singh", team: "Cross-Team", productivityScore: 96, tasksCompleted: 14, prsMerged: 5, bugsFixed: 3, knowledgeContributions: 4, weeklyPoints: 70 },
  { rank: 2, employeeId: "e2", name: "Krrish", team: "GenQue", productivityScore: 84, tasksCompleted: 11, prsMerged: 2, bugsFixed: 2, knowledgeContributions: 3, weeklyPoints: 44 },
  { rank: 3, employeeId: "m1", name: "Rahul Sharma", team: "GenQue", productivityScore: 88, tasksCompleted: 9, prsMerged: 2, bugsFixed: 1, knowledgeContributions: 5, weeklyPoints: 41 },
  { rank: 4, employeeId: "e3", name: "Ketan", team: "RAG Dynamic", productivityScore: 79, tasksCompleted: 10, prsMerged: 1, bugsFixed: 2, knowledgeContributions: 1, weeklyPoints: 33 },
  { rank: 5, employeeId: "e4", name: "Shreaya Singh", team: "RAG Dynamic", productivityScore: 75, tasksCompleted: 8, prsMerged: 1, bugsFixed: 1, knowledgeContributions: 2, weeklyPoints: 28 },
  { rank: 6, employeeId: "m2", name: "Priya Gupta", team: "CLAS", productivityScore: 71, tasksCompleted: 7, prsMerged: 1, bugsFixed: 0, knowledgeContributions: 3, weeklyPoints: 25 },
];

function sum(values: number[]): number {
  return values.reduce((total, v) => total + v, 0);
}

export const WEEKLY_EXEC_SUMMARY = {
  totalEmployees: WEEKLY_EMPLOYEE_REPORTS.length,
  totalTasksCompleted: sum(WEEKLY_EMPLOYEE_REPORTS.map((e) => e.tasksCompleted)),
  totalPRsMerged: sum(WEEKLY_EMPLOYEE_REPORTS.map((e) => e.prs.merged)),
  avgProductivityScore: Math.round(
    sum(WEEKLY_EMPLOYEE_REPORTS.map((e) => e.productivityScore)) / WEEKLY_EMPLOYEE_REPORTS.length
  ),
};

export const WEEKLY_PRODUCTIVITY_METRICS = {
  totalTasksCompleted: WEEKLY_EXEC_SUMMARY.totalTasksCompleted,
  totalPRsMerged: WEEKLY_EXEC_SUMMARY.totalPRsMerged,
  totalTicketsClosed: sum(WEEKLY_EMPLOYEE_REPORTS.map((e) => e.ticketsCompleted)),
  totalDocsCreated: sum(WEEKLY_EMPLOYEE_REPORTS.map((e) => e.documentsCreated)),
  totalMeetings: sum(WEEKLY_EMPLOYEE_REPORTS.map((e) => e.meetingsAttended)),
  avgProductivityScore: WEEKLY_EXEC_SUMMARY.avgProductivityScore,
};
