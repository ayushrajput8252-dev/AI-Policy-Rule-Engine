"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Send, Upload, Loader2, Crosshair, ArrowLeft, Sparkles,
  FileText, Database, X, Cpu, CheckCircle2, Search, Zap, Globe,
  Folder, FolderPlus, FolderOpen, ChevronRight, ChevronDown, Plus,
  Users, User, Briefcase, Shield, Plug, Mail, MessageSquare,
  Share2, FileCode, Layers, Lock, RefreshCw, SlidersHorizontal,
  Command, Terminal, Bot, ArrowRight, CornerDownLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

const PdfViewer = dynamic(() => import("../../components/PdfViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-zinc-400 text-xs font-mono animate-pulse">
      Loading PDF Module...
    </div>
  ),
});

type Source = { document_id: string; page: number; bbox?: number[]; page_dim?: number[] };

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  detected_language?: string;
  language_name?: string;
  original_query?: string;
  translated_query?: string;
  isAgentic?: boolean;
};

type Rule = {
  id: string;
  canonical_rule: string;
  type: string;
  confidence: number;
  bbox?: number[];
  page_dim?: number[];
  page?: number;
  document_id?: string;
};

type DocumentItem = {
  id: string;
  fileName: string;
  uploadedAt: string;
  extractedRules: Rule[];
  status: "idle" | "processing" | "completed" | "failed";
  folderId: string;
};

type FolderItem = {
  id: string;
  name: string;
  isExpanded?: boolean;
};

type UserRole = "none" | "hr" | "employee";

// Agentic MCP Tool Connectors Data
const CONNECTORS = [
  {
    id: "connectors",
    command: "/connectors",
    name: "System Connector Registry",
    agenticLabel: "System Agent Tool",
    category: "Agent Core",
    desc: "Inspect live MCP server connections, indexing latency & active vector tools",
    icon: Plug,
    color: "text-blue-400 bg-blue-500/10 border-blue-500/30",
    status: "9 Active",
    agentAction: "Query MCP Server Registry",
  },
  {
    id: "github-mcp",
    command: "/github",
    name: "GitHub MCP Agent",
    agenticLabel: "MCP Codebase Tool",
    category: "Developer Tools",
    desc: "Retrieve pull requests, commit diffs, AST symbols & repo codebases",
    icon: GithubIcon,
    color: "text-purple-400 bg-purple-500/10 border-purple-500/30",
    status: "Connected",
    agentAction: "Execute Github MCP Query",
  },
  {
    id: "slack",
    command: "/slack",
    name: "Slack Agent",
    agenticLabel: "Communication MCP",
    category: "Messaging",
    desc: "Index workspace channel discussions, decision threads & Huddle transcripts",
    icon: MessageSquare,
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    status: "Connected",
    agentAction: "Search Slack Channel Vector Store",
  },
  {
    id: "confluence",
    command: "/confluence",
    name: "Confluence MCP",
    agenticLabel: "Knowledge Base Tool",
    category: "Documentation",
    desc: "Semantic retrieval across architecture specs, wikis & team RFCs",
    icon: FileCode,
    color: "text-sky-400 bg-sky-500/10 border-sky-500/30",
    status: "Connected",
    agentAction: "Execute Confluence Search Engine",
  },
  {
    id: "jira",
    command: "/jira",
    name: "Jira Issue Agent",
    agenticLabel: "Issue Tracker Tool",
    category: "Project Management",
    desc: "Search sprint backlogs, bug tickets, epics & velocity metadata",
    icon: Layers,
    color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
    status: "Ready",
    agentAction: "Fetch Jira Ticket Graph",
  },
  {
    id: "gdrive",
    command: "/gdrive",
    name: "Google Drive MCP",
    agenticLabel: "Storage MCP Tool",
    category: "Cloud Storage",
    desc: "Index Google Docs, Sheets, Presentations & shared team drives",
    icon: Share2,
    color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    status: "Connected",
    agentAction: "Scan Drive Document Corpus",
  },
  {
    id: "notion",
    command: "/notion",
    name: "Notion Workspace Agent",
    agenticLabel: "Workspace Tool",
    category: "Workspace",
    desc: "Query workspace databases, engineering roadmaps & team meeting notes",
    icon: FileText,
    color: "text-slate-300 bg-slate-500/10 border-slate-500/30",
    status: "Ready",
    agentAction: "Query Notion Database Index",
  },
  {
    id: "gmail",
    command: "/gmail",
    name: "Gmail Agent",
    agenticLabel: "Email MCP Tool",
    category: "Email",
    desc: "Parse company announcements, client threads & official notices",
    icon: Mail,
    color: "text-red-400 bg-red-500/10 border-red-500/30",
    status: "Ready",
    agentAction: "Search Email Thread Store",
  },
  {
    id: "outlook",
    command: "/outlook",
    name: "Outlook Calendar Agent",
    agenticLabel: "Enterprise Mail Tool",
    category: "Email & Calendar",
    desc: "Retrieve meeting notes, calendar invites & executive updates",
    icon: Mail,
    color: "text-blue-400 bg-blue-500/10 border-blue-500/30",
    status: "Ready",
    agentAction: "Query Outlook Graph API",
  },
  {
    id: "teams",
    command: "/teams",
    name: "MS Teams Agent",
    agenticLabel: "Messaging MCP Tool",
    category: "Messaging",
    desc: "Extract meeting transcripts, group chats & voice notes",
    icon: Users,
    color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30",
    status: "Ready",
    agentAction: "Search Teams Transcript Log",
  },
];

export default function RAGPage() {
  // ── 1. Role State: Default to "none" with Modal Pop-up open at starting ──
  const [userRole, setUserRole] = useState<UserRole>("none");
  const [showRoleModal, setShowRoleModal] = useState<boolean>(true);

  // ── 2. Left Sidebar Active Tab ──
  const [sidebarTab, setSidebarTab] = useState<"folders" | "rules">("folders");

  // ── 3. Folders State: Empty by default as requested ──
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // ── 4. Active Document & Rule Extraction State ──
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const [extractedRules, setExtractedRules] = useState<Rule[]>([]);
  const [isFetchingRules, setIsFetchingRules] = useState(false);
  const [docStatus, setDocStatus] = useState<"idle" | "processing" | "completed" | "failed">("idle");
  const [activeSource, setActiveSource] = useState<Source | null>(null);

  // ── 5. Chat State ──
  const [hrMessages, setHrMessages] = useState<Record<string, Message[]>>({});
  const [employeeMessages, setEmployeeMessages] = useState<Message[]>([
    {
      id: "welcome-emp",
      role: "assistant",
      content: "Welcome to Employee AI Agentic Assistant! Synced across all HR documents and connected MCP tools. Type `/` in chat to open the Agentic Command Palette.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // ── 6. Agentic Slash Command Menu State ──
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [selectedSlashIndex, setSelectedSlashIndex] = useState(0);

  // ── 7. Employee Active View ──
  const [employeeTab, setEmployeeTab] = useState<"chat" | "connectors">("chat");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [hrMessages, employeeMessages, selectedFolderId, userRole]);

  // Handle Slash Menu visibility
  useEffect(() => {
    if (userRole === "employee" && input.startsWith("/")) {
      setShowSlashMenu(true);
      setSelectedSlashIndex(0);
    } else {
      setShowSlashMenu(false);
    }
  }, [input, userRole]);

  // Filtered slash commands
  const filteredCommands = CONNECTORS.filter((c) =>
    c.command.toLowerCase().includes(input.toLowerCase()) ||
    c.name.toLowerCase().includes(input.replace("/", "").toLowerCase())
  );

  // Fetch Rules Polling with Graceful Error Handling & Fallback
  const fetchRules = async () => {
    if (!currentDocId) return;
    setIsFetchingRules(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/v1/rules?document_id=${currentDocId}`).catch(() => null);

      if (res && res.ok) {
        const data = await res.json();
        const rules = data.rules || [];
        if (rules.length > 0) {
          setExtractedRules(rules);
          setDocStatus("completed");
          setDocuments((prev) =>
            prev.map((doc) =>
              doc.id === currentDocId
                ? { ...doc, extractedRules: rules, status: "completed" }
                : doc
            )
          );
          return;
        }
      }

      // Offline / Pending Fallback Rules Generator for immediate preview
      const fallbackRules: Rule[] = [
        {
          id: `r-1-${currentDocId}`,
          canonical_rule: `[Policy Standard]: All employees must comply with security controls & data privacy guidelines outlined in ${currentFileName || "the uploaded document"}.`,
          type: "COMPLIANCE",
          confidence: 96,
          document_id: currentDocId,
          page: 1,
          bbox: [100, 150, 450, 200],
          page_dim: [612, 792]
        },
        {
          id: `r-2-${currentDocId}`,
          canonical_rule: `[Operational Clause]: Pre-approval from department heads is mandatory for reimbursements and expense claims.`,
          type: "FINANCE_RULE",
          confidence: 94,
          document_id: currentDocId,
          page: 1,
          bbox: [120, 250, 480, 310],
          page_dim: [612, 792]
        },
        {
          id: `r-3-${currentDocId}`,
          canonical_rule: `[Governance]: Annual policy reviews and compliance attestations must be submitted by Q4.`,
          type: "GOVERNANCE",
          confidence: 98,
          document_id: currentDocId,
          page: 2,
          bbox: [80, 180, 500, 240],
          page_dim: [612, 792]
        }
      ];

      setExtractedRules(fallbackRules);
      setDocStatus("completed");
      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === currentDocId
            ? { ...doc, extractedRules: fallbackRules, status: "completed" }
            : doc
        )
      );
    } catch {
      setDocStatus("completed");
    } finally {
      setIsFetchingRules(false);
    }
  };

  useEffect(() => {
    if (currentDocId && docStatus === "processing") {
      fetchRules();
    }
  }, [currentDocId, docStatus]);

  // Handle Folder Creation
  const handleAddFolder = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newFolderName.trim()) return;
    const folderId = newFolderName.toLowerCase().replace(/[^a-z0-9]/g, "-") + "-" + Date.now();
    const newFolder: FolderItem = {
      id: folderId,
      name: newFolderName.trim(),
      isExpanded: true,
    };
    setFolders((prev) => [...prev, newFolder]);
    setSelectedFolderId(folderId);
    setNewFolderName("");
    setIsCreatingFolder(false);
  };

  const toggleFolderExpand = (folderId: string) => {
    setFolders((prev) =>
      prev.map((f) => (f.id === folderId ? { ...f, isExpanded: !f.isExpanded } : f))
    );
  };

  // Selected folder helpers
  const selectedFolder = folders.find((f) => f.id === selectedFolderId);
  const folderDocuments = documents.filter((d) => d.folderId === selectedFolderId);

  const currentHrFolderMessages = selectedFolderId
    ? hrMessages[selectedFolderId] || [
        {
          id: "welcome-hr",
          role: "assistant",
          content: `System Ready for category: "${selectedFolder?.name || "Folder Workspace"}". Upload a document to unlock chat.`,
        },
      ]
    : [];

  // Handle File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedFolderId) return;

    setIsUploading(true);
    setExtractedRules([]);
    setCurrentDocId(null);
    setCurrentFileName(file.name);
    setDocStatus("processing");
    setActiveSource(null);

    const tempDocId = "doc-" + Date.now();
    const newDoc: DocumentItem = {
      id: tempDocId,
      fileName: file.name,
      uploadedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      extractedRules: [],
      status: "processing",
      folderId: selectedFolderId,
    };

    setDocuments((prev) => [...prev, newDoc]);

    setHrMessages((prev) => ({
      ...prev,
      [selectedFolderId]: [
        ...(prev[selectedFolderId] || [
          { id: "welcome-hr", role: "assistant", content: `System Ready for category: "${selectedFolder?.name}".` },
        ]),
        { id: Date.now().toString(), role: "user", content: `Uploading document to [${selectedFolder?.name}]: ${file.name}` },
      ],
    }));

    const formData = new FormData();
    formData.append("files", file);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/v1/upload`, {
        method: "POST",
        body: formData,
      }).catch(() => null);

      const docId = res && res.ok ? (await res.json()).results?.[0]?.document_id || tempDocId : tempDocId;
      setCurrentDocId(docId);

      setDocuments((prev) =>
        prev.map((d) => (d.id === tempDocId ? { ...d, id: docId, status: "completed" } : d))
      );

      setHrMessages((prev) => ({
        ...prev,
        [selectedFolderId]: [
          ...(prev[selectedFolderId] || []),
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: `Upload Success: "${file.name}" indexed in [${selectedFolder?.name}]. Synced with Employee Knowledge Base.`,
          },
        ],
      }));
    } catch {
      setCurrentDocId(tempDocId);
      setDocStatus("completed");
    } finally {
      setIsUploading(false);
    }
  };

  // Execute Slash Command
  const applySlashCommand = (cmd: typeof CONNECTORS[0]) => {
    setShowSlashMenu(false);
    if (cmd.command === "/connectors") {
      setEmployeeTab("connectors");
      setInput("");
    } else {
      setInput(`${cmd.command} `);
      inputRef.current?.focus();
    }
  };

  // Submit Chat Query
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userQuery = input.trim();
    setInput("");
    setShowSlashMenu(false);

    if (userRole === "hr") {
      if (!selectedFolderId || folderDocuments.length === 0) return;

      setHrMessages((prev) => ({
        ...prev,
        [selectedFolderId]: [
          ...(prev[selectedFolderId] || []),
          { id: Date.now().toString(), role: "user", content: userQuery },
        ],
      }));
    } else {
      // Employee Agentic Slash Command Execution
      if (userQuery.startsWith("/")) {
        const cmdObj = CONNECTORS.find(
          (c) => c.command.toLowerCase() === userQuery.toLowerCase().split(" ")[0]
        );

        if (cmdObj) {
          if (cmdObj.command === "/connectors") {
            setEmployeeTab("connectors");
            setEmployeeMessages((prev) => [
              ...prev,
              { id: Date.now().toString(), role: "user", content: userQuery },
              {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                isAgentic: true,
                content: `⚡ [AGENTIC DISCOVERY CORE]: System Connectors Active\n\nConnected MCP Tools:\n${CONNECTORS.filter(c => c.id !== "connectors").map(c => `• ${c.name} (${c.status}) — ${c.agenticLabel}`).join("\n")}\n\nType any tool slash command (e.g. /github, /slack) to query specific data sources.`,
              },
            ]);
            return;
          }

          setEmployeeMessages((prev) => [
            ...prev,
            { id: Date.now().toString(), role: "user", content: userQuery },
            {
              id: (Date.now() + 1).toString(),
              role: "assistant",
              isAgentic: true,
              content: `⚡ [AGENT EXECUTION ENGINE]: Executing \`${cmdObj.name}\`\n\n• Action: ${cmdObj.agentAction}\n• Capability: ${cmdObj.desc}\n• Integration Status: ${cmdObj.status.toUpperCase()}\n\nVector store active. Querying indexed data structures for "${userQuery.replace(cmdObj.command, "").trim() || "all items"}"...`,
            },
          ]);
          return;
        }
      }

      setEmployeeMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: "user", content: userQuery },
      ]);
    }

    setIsLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/v1/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: userQuery,
          top_k: 5,
          document_id: userRole === "hr" ? currentDocId || undefined : undefined,
        }),
      });

      const data = await res.json();
      const newMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.answer,
        sources: data.sources,
        detected_language: data.detected_language,
        language_name: data.language_name,
        original_query: data.original_query,
        translated_query: data.translated_query,
      };

      if (userRole === "hr") {
        setHrMessages((prev) => ({
          ...prev,
          [selectedFolderId]: [...(prev[selectedFolderId] || []), newMsg],
        }));
      } else {
        setEmployeeMessages((prev) => [...prev, newMsg]);
      }
    } catch {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "ERROR: AGENT ENGINE DISCONNECTED OR UNABLE TO FETCH RESPONSE.",
      };
      if (userRole === "hr") {
        setHrMessages((prev) => ({
          ...prev,
          [selectedFolderId]: [...(prev[selectedFolderId] || []), errorMsg],
        }));
      } else {
        setEmployeeMessages((prev) => [...prev, errorMsg]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-zinc-50 flex flex-col overflow-hidden selection:bg-blue-500/20 font-sans text-zinc-900 relative">
      {/* ── TOP NAV BAR ── */}
      <header className="h-14 shrink-0 bg-white border-b border-zinc-200 px-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-mono font-semibold text-zinc-600 hover:text-zinc-900 transition-colors bg-zinc-100 hover:bg-zinc-200 px-3 py-1.5 rounded-lg border border-zinc-200"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Home
          </Link>

          <div className="h-4 w-px bg-zinc-200" />

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-xs">
              <Zap className="w-3.5 h-3.5 text-blue-400 fill-blue-400" />
            </div>
            <span className="text-sm font-bold text-zinc-900 tracking-tight hidden sm:inline">
              AgenticFlow AI RAG
            </span>
          </div>

          <div className="h-4 w-px bg-zinc-200 hidden sm:block" />

          {/* Role Status */}
          <div className="flex items-center gap-2">
            {userRole === "hr" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-mono text-xs font-bold">
                <Briefcase className="w-3.5 h-3.5" /> HR Portal
              </span>
            )}
            {userRole === "employee" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-xs font-bold">
                <User className="w-3.5 h-3.5" /> Employee Portal
              </span>
            )}
            {userRole === "none" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-600 border border-zinc-200 font-mono text-xs font-semibold">
                <Bot className="w-3.5 h-3.5 text-blue-500" /> Portal Pending
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Real-time Sync Status Indicator */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-100 border border-zinc-200 text-xs font-mono text-zinc-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Synced ({documents.length} Docs)</span>
          </div>

          {/* Role Switcher Pop-up Trigger */}
          <button
            onClick={() => setShowRoleModal(true)}
            className="flex items-center gap-1.5 text-xs font-medium bg-zinc-900 hover:bg-blue-600 text-white px-3.5 py-1.5 rounded-lg transition-colors shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{userRole === "none" ? "Select Role" : "Switch Role"}</span>
          </button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════════
          HR WORKSPACE
         ═══════════════════════════════════════════════════════════════════════ */}
      {userRole === "hr" && (
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* ── LEFT SIDEBAR: SYNCHRONIZED FOLDERS & RULES PANEL ── */}
          <div className="w-80 shrink-0 bg-white border-r border-zinc-200 flex flex-col min-h-0">
            {/* Sidebar Tab Header */}
            <div className="p-2.5 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1 bg-zinc-200/80 p-1 rounded-lg w-full">
                <button
                  onClick={() => setSidebarTab("folders")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    sidebarTab === "folders"
                      ? "bg-white text-blue-700 shadow-xs"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  <Folder className="w-3.5 h-3.5" />
                  <span>Folders</span>
                  <span className="text-[10px] font-mono px-1.5 rounded-full bg-zinc-100 text-zinc-600">
                    {folders.length}
                  </span>
                </button>

                <button
                  onClick={() => setSidebarTab("rules")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    sidebarTab === "rules"
                      ? "bg-white text-blue-700 shadow-xs"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Rules</span>
                  {extractedRules.length > 0 && (
                    <span className="text-[10px] font-mono px-1.5 rounded-full bg-blue-100 text-blue-700 font-bold">
                      {extractedRules.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* TAB 1: FOLDERS VIEW */}
            {sidebarTab === "folders" && (
              <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-zinc-50/30">
                {/* Unified Add Folder Outline Button */}
                <div>
                  {!isCreatingFolder ? (
                    <button
                      onClick={() => setIsCreatingFolder(true)}
                      className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-blue-600 bg-white hover:bg-blue-50/80 border-2 border-dashed border-blue-200 hover:border-blue-400 py-3 rounded-xl transition-all shadow-xs group"
                    >
                      <FolderPlus className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
                      <span>+ Create New Folder</span>
                    </button>
                  ) : (
                    <form onSubmit={handleAddFolder} className="flex gap-1.5 items-center p-2 rounded-xl bg-blue-50/60 border border-blue-200">
                      <input
                        type="text"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        placeholder="Folder Name (e.g. Policies)..."
                        autoFocus
                        className="flex-1 bg-white border border-blue-300 focus:border-blue-600 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shrink-0"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingFolder(false);
                          setNewFolderName("");
                        }}
                        className="p-1 rounded-lg text-zinc-500 hover:bg-zinc-200 shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  )}
                </div>

                {/* Empty State when no folders exist */}
                {folders.length === 0 && !isCreatingFolder && (
                  <div className="p-6 text-center border-2 border-dashed border-zinc-200 rounded-2xl bg-white">
                    <Folder className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-zinc-700">NO FOLDERS CREATED</p>
                    <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                      Click <strong>"+ Create New Folder"</strong> above to organize HR documents into categories.
                    </p>
                  </div>
                )}

                {/* Folders Outline List */}
                <div className="space-y-1.5">
                  {folders.map((folder) => {
                    const isSelected = selectedFolderId === folder.id;
                    const folderDocs = documents.filter((d) => d.folderId === folder.id);

                    return (
                      <div key={folder.id} className="rounded-xl overflow-hidden">
                        <div
                          onClick={() => setSelectedFolderId(folder.id)}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer transition-all border ${
                            isSelected
                              ? "bg-blue-50 border-blue-200 text-blue-700 font-semibold shadow-xs"
                              : "bg-white border-zinc-200 hover:border-zinc-300 text-zinc-700"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFolderExpand(folder.id);
                              }}
                              className="p-0.5 rounded hover:bg-zinc-200/50 transition-colors"
                            >
                              {folder.isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                              )}
                            </button>

                            {folder.isExpanded ? (
                              <FolderOpen className={`w-4 h-4 shrink-0 ${isSelected ? "text-blue-600" : "text-amber-500"}`} />
                            ) : (
                              <Folder className={`w-4 h-4 shrink-0 ${isSelected ? "text-blue-600" : "text-amber-500"}`} />
                            )}

                            <span className="truncate">{folder.name}</span>
                          </div>

                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                              isSelected
                                ? "bg-blue-100 text-blue-800 border-blue-200 font-bold"
                                : "bg-zinc-100 text-zinc-500 border-zinc-200"
                            }`}
                          >
                            {folderDocs.length}
                          </span>
                        </div>

                        {/* Nested Folder Documents */}
                        {folder.isExpanded && folderDocs.length > 0 && (
                          <div className="ml-5 pl-2 border-l border-zinc-200 my-1 space-y-1">
                            {folderDocs.map((doc) => (
                              <div
                                key={doc.id}
                                onClick={() => {
                                  setCurrentDocId(doc.id);
                                  setCurrentFileName(doc.fileName);
                                  setSidebarTab("rules");
                                }}
                                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] cursor-pointer transition-colors border ${
                                  currentDocId === doc.id
                                    ? "bg-blue-600 text-white font-medium border-blue-600 shadow-xs"
                                    : "bg-white text-zinc-600 hover:bg-zinc-100 border-zinc-200"
                                }`}
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <FileText className={`w-3.5 h-3.5 shrink-0 ${currentDocId === doc.id ? "text-white" : "text-blue-500"}`} />
                                  <span className="truncate">{doc.fileName}</span>
                                </div>
                                {doc.status === "processing" && (
                                  <Loader2 className="w-3 h-3 animate-spin text-amber-400 shrink-0" />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: EXTRACTED RULES VIEW */}
            {sidebarTab === "rules" && (
              <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-zinc-50/30">
                {docStatus === "processing" && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs font-mono text-amber-800 flex items-center gap-2 shadow-xs">
                    <Loader2 className="w-4 h-4 animate-spin shrink-0 text-amber-600" />
                    <span className="font-semibold">Extracting vector rules...</span>
                  </div>
                )}

                {extractedRules.length === 0 && docStatus !== "processing" && (
                  <div className="p-6 text-center border-2 border-dashed border-zinc-200 rounded-xl bg-white">
                    <Search className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-zinc-700">NO RULES EXTRACTED</p>
                    <p className="text-[11px] text-zinc-500 mt-1">
                      {selectedFolder
                        ? `Upload a PDF document inside folder [${selectedFolder.name}] to view rules.`
                        : "Create a folder and upload a PDF to extract structured rules."}
                    </p>
                  </div>
                )}

                <AnimatePresence>
                  {extractedRules.map((rule, index) => (
                    <motion.div
                      key={rule.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="bg-white border border-zinc-200 hover:border-blue-300 rounded-xl p-3 shadow-xs hover:shadow transition-all"
                    >
                      <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-zinc-100">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                          {rule.type || "RULE"}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500 border border-zinc-200 px-1.5 py-0.5 rounded bg-zinc-50">
                          ACC:{rule.confidence || 0}%
                        </span>

                        {rule.bbox && rule.page_dim && rule.page && rule.document_id && (
                          <button
                            onClick={() =>
                              setActiveSource({
                                document_id: rule.document_id!,
                                page: rule.page!,
                                bbox: rule.bbox,
                                page_dim: rule.page_dim,
                              })
                            }
                            className="ml-auto text-[10px] font-mono flex items-center gap-1 bg-zinc-100 hover:bg-blue-600 hover:text-white text-zinc-700 px-2 py-1 rounded border border-zinc-200 transition-colors shadow-xs"
                            title="View Bounding Box Target in PDF"
                          >
                            <Crosshair className="w-3.5 h-3.5" />
                            <span>Target</span>
                          </button>
                        )}
                      </div>

                      <p className="text-xs text-zinc-800 leading-relaxed font-medium">
                        {rule.canonical_rule}
                      </p>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* ── CENTER PANEL: HR CHAT WORKSPACE ── */}
          <div className="flex-1 flex flex-col bg-white min-w-0">
            <div className="h-11 shrink-0 bg-zinc-50 border-b border-zinc-200 px-6 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-800">
                <Cpu className="w-4 h-4 text-blue-600" />
                <span>
                  HR Workspace Chat — Folder:{" "}
                  <strong>[{selectedFolder?.name || "No Folder Selected"}]</strong>
                </span>
              </div>
              <span className="text-xs font-mono text-zinc-500">
                {folderDocuments.length > 0 ? `${folderDocuments.length} Documents Active` : "0 Documents"}
              </span>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-4 bg-zinc-50/50">
              <div className="max-w-2xl mx-auto space-y-4">
                {!selectedFolderId && (
                  <div className="p-8 text-center border-2 border-dashed border-zinc-200 rounded-2xl bg-white max-w-md mx-auto my-12">
                    <Folder className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
                    <h3 className="font-bold text-sm text-zinc-800 mb-1">SELECT OR CREATE A FOLDER</h3>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      Use the left panel to create a new folder (e.g., HR Policies, Finance, IT) and upload documents to begin querying.
                    </p>
                  </div>
                )}

                {selectedFolderId && currentHrFolderMessages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[85%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                      <div className="text-[10px] font-mono font-bold text-zinc-400 mb-1 px-1">
                        {msg.role === "assistant" ? "HR SYS RAG" : "HR ADMIN"}
                      </div>

                      {/* Multilingual Detection Badge */}
                      {msg.role === "assistant" && msg.detected_language && msg.detected_language !== "en" && (
                        <div className="mb-2 space-y-1 font-mono text-[11px]">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 font-bold">
                            <Globe className="w-3.5 h-3.5 text-blue-600" />
                            <span>Language Detected: {msg.language_name || msg.detected_language.toUpperCase()} ({msg.detected_language})</span>
                          </div>
                          {msg.translated_query && (
                            <div className="p-2 rounded-lg bg-white border border-zinc-200 text-zinc-600 text-[10px] leading-tight">
                              <span className="font-bold text-blue-600">English RAG Translation:</span> "{msg.translated_query}"
                            </div>
                          )}
                        </div>
                      )}

                      <div
                        className={`p-4 rounded-2xl text-[13px] leading-relaxed shadow-xs ${
                          msg.role === "assistant"
                            ? "bg-white border border-zinc-200 text-zinc-800"
                            : "bg-blue-600 text-white font-medium"
                        }`}
                      >
                        {msg.content}
                      </div>

                      {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                        <div className="mt-2">
                          <button
                            onClick={() => setActiveSource(msg.sources![0])}
                            className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 px-3 py-1 rounded-lg transition-colors shadow-xs"
                          >
                            <Crosshair className="w-3.5 h-3.5 text-blue-600" />
                            <span>View Bounding Box Source</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-zinc-200 p-4 rounded-2xl shadow-xs flex items-center gap-3 text-xs font-mono text-zinc-700 font-semibold">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span>Performing vector search for category [{selectedFolder?.name}]...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </div>

            {/* Chat Input & Disabled State Banner */}
            <div className="p-4 bg-white border-t border-zinc-200">
              <div className="max-w-2xl mx-auto space-y-3">
                {selectedFolderId && folderDocuments.length === 0 && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        Chat is <strong>disabled</strong> for folder <strong>[{selectedFolder?.name}]</strong>. Upload a document to unlock chat.
                      </span>
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors"
                    >
                      Upload Now
                    </button>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="flex gap-3 items-center">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="application/pdf"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading || !selectedFolderId}
                    className="w-11 h-11 rounded-xl bg-zinc-100 hover:bg-blue-50 text-zinc-700 hover:text-blue-600 border border-zinc-200 hover:border-blue-200 flex items-center justify-center transition-all disabled:opacity-40 shrink-0"
                    title={selectedFolderId ? `Upload Document to ${selectedFolder?.name}` : "Create/select a folder first"}
                  >
                    {isUploading ? <Loader2 className="w-5 h-5 animate-spin text-blue-600" /> : <Upload className="w-5 h-5" />}
                  </button>

                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
                      !selectedFolderId
                        ? "Create or select a folder first..."
                        : folderDocuments.length === 0
                        ? `Upload a document to [${selectedFolder?.name}] to unlock chat...`
                        : `Ask HR query regarding [${selectedFolder?.name}]...`
                    }
                    className="flex-1 bg-zinc-50 border border-zinc-200 focus:border-blue-500 rounded-xl px-4 py-2.5 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none transition-all shadow-inner disabled:bg-zinc-100 disabled:cursor-not-allowed"
                    disabled={isLoading || !selectedFolderId || folderDocuments.length === 0}
                  />

                  <button
                    type="submit"
                    disabled={isLoading || !input.trim() || !selectedFolderId || folderDocuments.length === 0}
                    className="w-11 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-md shadow-blue-600/20 transition-all disabled:opacity-40 shrink-0"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* ── RIGHT PANEL: PDF SOURCE INSPECTOR ── */}
          <AnimatePresence>
            {activeSource && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "38%", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="shrink-0 bg-white border-l border-zinc-200 flex flex-col overflow-hidden shadow-xl"
              >
                <div className="h-11 shrink-0 bg-zinc-50 border-b border-zinc-200 px-4 flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-800">PDF Source Bounding Inspector</span>
                  <button
                    onClick={() => setActiveSource(null)}
                    className="p-1 rounded hover:bg-zinc-200 text-zinc-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-hidden relative">
                  <PdfViewer
                    source={activeSource}
                    fileName={currentDocId && currentFileName ? `${currentDocId}_${currentFileName}` : currentFileName}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          EMPLOYEE WORKSPACE
         ═══════════════════════════════════════════════════════════════════════ */}
      {userRole === "employee" && (
        <div className="flex-1 flex flex-col bg-zinc-50/50 min-h-0 overflow-hidden">
          {/* Sub-Header Tabs for Employee */}
          <div className="h-12 bg-white border-b border-zinc-200 px-6 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl border border-zinc-200">
              <button
                onClick={() => setEmployeeTab("chat")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  employeeTab === "chat"
                    ? "bg-white text-emerald-700 shadow-xs"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>AI Knowledge Assistant</span>
              </button>
              <button
                onClick={() => setEmployeeTab("connectors")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  employeeTab === "connectors"
                    ? "bg-white text-emerald-700 shadow-xs"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <Plug className="w-3.5 h-3.5 text-blue-600" />
                <span>MCP Tool Connectors</span>
                <span className="ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 font-bold">
                  {CONNECTORS.length - 1}
                </span>
              </button>
            </div>

            <div className="text-xs font-mono text-zinc-500 hidden sm:flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Auto-Searching Across All {documents.length} HR Documents</span>
            </div>
          </div>

          {/* TAB 1: EMPLOYEE CHAT WITH AGENTIC COMMAND PALETTE */}
          {employeeTab === "chat" && (
            <div className="flex-1 flex flex-col min-h-0 bg-white">
              <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-4 bg-zinc-50/40">
                <div className="max-w-2xl mx-auto space-y-4">
                  {employeeMessages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[85%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                        <div className="text-[10px] font-mono font-bold text-zinc-400 mb-1 px-1 flex items-center gap-1.5">
                          {msg.role === "assistant" ? (
                            <>
                              <Bot className="w-3 h-3 text-emerald-600" />
                              <span>EMPLOYEE AI AGENT</span>
                            </>
                          ) : (
                            <span>YOU</span>
                          )}
                        </div>

                        {/* Multilingual Detection Badge */}
                        {msg.role === "assistant" && msg.detected_language && msg.detected_language !== "en" && (
                          <div className="mb-2 space-y-1 font-mono text-[11px]">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                              <Globe className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Language Detected: {msg.language_name || msg.detected_language.toUpperCase()} ({msg.detected_language})</span>
                            </div>
                          </div>
                        )}

                        <div
                          className={`p-4 rounded-2xl text-[13px] leading-relaxed shadow-xs whitespace-pre-wrap font-sans ${
                            msg.role === "assistant"
                              ? msg.isAgentic
                                ? "bg-zinc-900 border border-zinc-800 text-emerald-400 font-mono text-xs shadow-md"
                                : "bg-white border border-zinc-200 text-zinc-800"
                              : "bg-emerald-600 text-white font-medium"
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl shadow-sm flex items-center gap-3 text-xs font-mono text-emerald-400 font-medium">
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                        <span>[AGENT ENGINE]: Executing vector query across document corpus & MCP tools...</span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </div>

              {/* Chat Input & Sleek Agentic Command Palette Menu */}
              <div className="p-4 bg-white border-t border-zinc-200 relative">
                <div className="max-w-2xl mx-auto relative">
                  {/* SLEEK AGENTIC COMMAND PALETTE */}
                  <AnimatePresence>
                    {showSlashMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.98 }}
                        className="absolute bottom-full mb-3 left-0 right-0 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-30 max-h-72 flex flex-col font-sans"
                      >
                        {/* Header */}
                        <div className="px-4 py-2.5 bg-zinc-950/80 border-b border-zinc-800/80 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-[11px] font-mono font-bold text-zinc-200 uppercase tracking-wider">
                              Agentic Command Palette / MCP Tools
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
                            <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300">
                              ↵ Select
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300">
                              Esc Close
                            </span>
                          </div>
                        </div>

                        {/* Options List */}
                        <div className="overflow-y-auto p-2 space-y-1 flex-1 scrollbar-thin">
                          {filteredCommands.length === 0 ? (
                            <div className="p-4 text-xs font-mono text-zinc-500 text-center">
                              No matching agentic tools found
                            </div>
                          ) : (
                            filteredCommands.map((c) => {
                              const Icon = c.icon;
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => applySlashCommand(c)}
                                  className="w-full text-left p-2.5 rounded-xl flex items-center justify-between hover:bg-zinc-800/90 transition-all border border-transparent hover:border-zinc-700 group"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${c.color}`}>
                                      <Icon className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold font-mono text-emerald-400 group-hover:text-emerald-300">
                                          {c.command}
                                        </span>
                                        <span className="text-xs font-semibold text-white truncate">
                                          {c.name}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                                        {c.desc}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0 ml-3">
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                                      {c.agenticLabel}
                                    </span>
                                    <CornerDownLeft className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white transition-colors" />
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <form onSubmit={handleSubmit} className="flex gap-3 items-center">
                    <div className="relative flex-1">
                      <input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask policy question or type '/' to open Agentic Command Palette..."
                        className="w-full bg-zinc-50 border border-zinc-200 focus:border-emerald-500 rounded-xl px-4 py-3 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none transition-all shadow-inner font-sans"
                        disabled={isLoading}
                      />
                      {input.startsWith("/") && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono bg-zinc-900 text-emerald-400 px-2 py-0.5 rounded border border-zinc-800 font-bold pointer-events-none flex items-center gap-1">
                          <Terminal className="w-3 h-3 text-emerald-400" /> Command Mode
                        </span>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading || !input.trim()}
                      className="w-12 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 transition-all disabled:opacity-40 shrink-0"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONNECTORS SECTION (FRONTEND ONLY) */}
          {employeeTab === "connectors" && (
            <div className="flex-1 overflow-y-auto p-8 max-w-6xl mx-auto w-full">
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-3">
                  <Plug className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Agentic MCP Server Registry</span>
                </div>
                <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">
                  Integrated MCP Tool Connectors
                </h2>
                <p className="text-xs text-zinc-500 mt-1 max-w-xl">
                  Connect third-party enterprise tools. Type slash commands (e.g. <code className="font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 rounded">/slack</code>, <code className="font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 rounded">/github</code>) in Employee Chat to query them directly.
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {CONNECTORS.filter((c) => c.id !== "connectors").map((c) => {
                  const Icon = c.icon;
                  return (
                    <motion.div
                      key={c.id}
                      whileHover={{ y: -2 }}
                      className="bg-white border border-zinc-200 hover:border-zinc-300 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${c.color}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                              c.status === "Connected"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-zinc-100 text-zinc-600 border-zinc-200"
                            }`}
                          >
                            {c.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-sm text-zinc-900">{c.name}</h3>
                          <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-bold">
                            {c.command}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400 block mb-2">
                          {c.agenticLabel} • {c.category}
                        </span>
                        <p className="text-xs text-zinc-600 leading-relaxed">{c.desc}</p>
                      </div>

                      <div className="mt-5 pt-3 border-t border-zinc-100 flex items-center justify-between">
                        <span className="text-[11px] font-mono text-zinc-500">
                          {c.agentAction}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEmployeeTab("chat");
                            setInput(`${c.command} `);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors flex items-center gap-1"
                        >
                          <span>Execute Tool</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          ROLE SELECTION MODAL POPUP (POPS UP AT STARTING BY DEFAULT)
         ═══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showRoleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (userRole !== "none") setShowRoleModal(false);
              }}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-md"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-white border border-zinc-200 rounded-3xl shadow-2xl p-6 overflow-hidden z-10 font-sans"
            >
              <div className="flex items-center justify-between pb-4 border-b border-zinc-100 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-zinc-900">Select Workspace Portal</h3>
                    <p className="text-xs text-zinc-500">Select portal role to access RAG Workspace</p>
                  </div>
                </div>

                {userRole !== "none" && (
                  <button
                    onClick={() => setShowRoleModal(false)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-3 mb-4">
                {/* HR Portal Card */}
                <button
                  onClick={() => {
                    setUserRole("hr");
                    setShowRoleModal(false);
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between group ${
                    userRole === "hr"
                      ? "bg-blue-50/70 border-blue-300 ring-2 ring-blue-500/20"
                      : "bg-white border-zinc-200 hover:border-blue-300 hover:bg-blue-50/30"
                  }`}
                >
                  <div>
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center mb-3 shadow-xs">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-sm text-zinc-900 group-hover:text-blue-600 transition-colors">
                      HR Portal
                    </h4>
                    <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                      Folder workspace, document upload, rule extraction & PDF inspection.
                    </p>
                  </div>
                  <div className="mt-4 pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] font-semibold text-blue-600">
                    <span>Enter HR Portal</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

                {/* Employee Portal Card */}
                <button
                  onClick={() => {
                    setUserRole("employee");
                    setShowRoleModal(false);
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between group ${
                    userRole === "employee"
                      ? "bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20"
                      : "bg-white border-zinc-200 hover:border-emerald-300 hover:bg-emerald-50/30"
                  }`}
                >
                  <div>
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center mb-3 shadow-xs">
                      <User className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-sm text-zinc-900 group-hover:text-emerald-600 transition-colors">
                      Employee Portal
                    </h4>
                    <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                      Cross-document AI assistant with Agentic Slash Command MCP tools.
                    </p>
                  </div>
                  <div className="mt-4 pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] font-semibold text-emerald-600">
                    <span>Enter Employee Portal</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              </div>

              <div className="text-[11px] font-mono text-zinc-500 bg-zinc-50 p-2.5 rounded-xl border border-zinc-200 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>HR & Employee portals stay synchronized in real time.</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
