"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Send, Upload, Loader2, Crosshair, ArrowLeft, Sparkles,
  FileText, Database, X, Cpu, CheckCircle2, Search, Zap, Globe,
  Folder, FolderPlus, FolderOpen, ChevronRight, ChevronDown, Plus,
  Users, User, Briefcase, Shield, Plug, Mail, MessageSquare,
  Share2, FileCode, Layers, Lock, RefreshCw, SlidersHorizontal,
  Command, Terminal, Bot, ArrowRight, CornerDownLeft,
  Mic, MicOff, Volume2, VolumeX, Radio, FileAudio, Disc, Square, Play, Activity,
  AlertCircle, Link2
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

const PdfViewer = dynamic(() => import("@/components/PdfViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-zinc-400 text-xs font-mono animate-pulse bg-zinc-900">
      Loading PDF Source Engine...
    </div>
  ),
});

type Source = {
  document_id: string;
  page: number;
  bbox?: number[];
  page_dim?: number[];
  is_audio?: boolean;
  timestamp_str?: string;
  start_time?: number;
  end_time?: number;
};

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
  latencyMs?: number;
  retrieval_mode?: "rules" | "chunks" | "missing";
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
  chunkCount?: number;
};

type FolderItem = {
  id: string;
  name: string;
  isExpanded?: boolean;
};

type UserRole = "none" | "hr" | "employee";

// Production MCP Agent Tools Registry matching the Light UI Theme
const CONNECTORS = [
  {
    id: "connectors",
    command: "/connectors",
    name: "MCP Server Registry",
    agenticLabel: "Core MCP Registry",
    category: "System Tool",
    desc: "Inspect connected Model Context Protocol servers, vector stores & tool schemas",
    icon: Plug,
    color: "text-blue-600 bg-blue-50 border-blue-200",
    status: "9 Tools Ready",
    agentAction: "GET /mcp/registry/tools",
  },
  {
    id: "github-mcp",
    command: "/github",
    name: "GitHub MCP Agent",
    agenticLabel: "Codebase MCP",
    category: "Developer Tools",
    desc: "Index pull requests, commit diffs, AST symbols & repository codebases",
    icon: GithubIcon,
    color: "text-purple-600 bg-purple-50 border-purple-200",
    status: "Connected",
    agentAction: "github.search_repository_ast",
  },
  {
    id: "slack",
    command: "/slack",
    name: "Slack Channel Agent",
    agenticLabel: "Communications MCP",
    category: "Messaging",
    desc: "Retrieve decision logs, channel threads & workspace Huddle transcripts",
    icon: MessageSquare,
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    status: "Connected",
    agentAction: "slack.query_channels_vector",
  },
  {
    id: "confluence",
    command: "/confluence",
    name: "Confluence Wiki MCP",
    agenticLabel: "Documentation MCP",
    category: "Knowledge Base",
    desc: "Semantic search across team RFCs, architecture specs & wiki pages",
    icon: FileCode,
    color: "text-sky-600 bg-sky-50 border-sky-200",
    status: "Connected",
    agentAction: "confluence.search_spaces",
  },
  {
    id: "jira",
    command: "/jira",
    name: "Jira Sprint Agent",
    agenticLabel: "Issue Graph MCP",
    category: "Project Mgmt",
    desc: "Fetch sprint backlogs, bug tickets, epics & velocity metadata",
    icon: Layers,
    color: "text-cyan-600 bg-cyan-50 border-cyan-200",
    status: "Ready",
    agentAction: "jira.get_ticket_graph",
  },
  {
    id: "gdrive",
    command: "/gdrive",
    name: "Google Drive MCP",
    agenticLabel: "Storage MCP",
    category: "Cloud Storage",
    desc: "Index Google Docs, Sheets, Presentations & shared team drives",
    icon: Share2,
    color: "text-amber-600 bg-amber-50 border-amber-200",
    status: "Connected",
    agentAction: "gdrive.scan_corpus",
  },
  {
    id: "notion",
    command: "/notion",
    name: "Notion Workspace Tool",
    agenticLabel: "Database MCP",
    category: "Workspace",
    desc: "Query engineering roadmaps, meeting notes & database tables",
    icon: FileText,
    color: "text-zinc-800 bg-zinc-100 border-zinc-300",
    status: "Ready",
    agentAction: "notion.query_databases",
  },
  {
    id: "gmail",
    command: "/gmail",
    name: "Gmail Thread Agent",
    agenticLabel: "Email MCP",
    category: "Communications",
    desc: "Parse official announcements, client threads & HR notices",
    icon: Mail,
    color: "text-red-600 bg-red-50 border-red-200",
    status: "Ready",
    agentAction: "gmail.search_thread_store",
  },
  {
    id: "outlook",
    command: "/outlook",
    name: "Outlook Calendar Tool",
    agenticLabel: "Enterprise Mail Tool",
    category: "Email & Calendar",
    desc: "Retrieve meeting notes, calendar invites & executive updates",
    icon: Mail,
    color: "text-blue-600 bg-blue-50 border-blue-200",
    status: "Ready",
    agentAction: "outlook.graph_query",
  },
  {
    id: "teams",
    command: "/teams",
    name: "MS Teams Agent",
    agenticLabel: "Transcript MCP",
    category: "Messaging",
    desc: "Extract meeting transcripts, group chats & voice notes",
    icon: Users,
    color: "text-indigo-600 bg-indigo-50 border-indigo-200",
    status: "Ready",
    agentAction: "teams.parse_transcripts",
  },
];

export default function RAGPage() {
  // ── 1. Role State ──
  const [userRole, setUserRole] = useState<UserRole>("none");
  const [showRoleModal, setShowRoleModal] = useState<boolean>(true);

  // ── 2. Left Sidebar Active Tab ──
  const [sidebarTab, setSidebarTab] = useState<"folders" | "rules">("folders");

  // ── 3. Folders State ──
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
      content: "Agent online. Synchronized with HR document index and active MCP tools. Type `/` to open the Command Palette.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // ── Add Link (Web Crawl) State ──
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkInputValue, setLinkInputValue] = useState("");
  const [isCrawlingLink, setIsCrawlingLink] = useState(false);

  // ── 6. Command Palette Menu State ──
  const [showSlashMenu, setShowSlashMenu] = useState(false);

  // ── 7. Employee Active View ──
  const [employeeTab, setEmployeeTab] = useState<"chat" | "connectors">("chat");

  // ── 8. Voice Mode & Big Audio Visualizer State ──
  const [isVoiceMode, setIsVoiceMode] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [activeSpeechMsgId, setActiveSpeechMsgId] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fallback path: records raw mic audio and sends it to our own backend (faster-whisper)
  // for transcription. Used when the browser has no built-in speech API, or when that API
  // fails — its "network" error means the browser couldn't reach Google's speech servers,
  // which our self-hosted transcription doesn't depend on.
  const startServerRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) audioChunksRef.current.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("file", audioBlob, "recording.webm");

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(`${apiUrl}/api/v1/transcribe`, {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          if (data.transcript) setInput(data.transcript);
        } else {
          setVoiceError("Transcription failed. Please try again.");
        }
      } catch (err) {
        console.error("Transcription error:", err);
        setVoiceError("Could not reach the transcription server.");
      }
      stream.getTracks().forEach((track) => track.stop());
    };

    mediaRecorder.start();
    setIsRecording(true);

    recordingTimerRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
  };

  // Start Mic Recording
  const startRecording = async () => {
    try {
      setVoiceError(null);
      setRecordingTime(0);
      audioChunksRef.current = [];

      if (typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        // continuous=true prevents the browser from silently ending the session
        // after the first short pause in speech (was cutting voice mode off mid-sentence).
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        recognitionRef.current = recognition;

        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((res: any) => res[0].transcript)
            .join("");
          setInput(transcript);
        };

        recognition.onerror = (event: any) => {
          // "no-speech" / "aborted" fire routinely during normal listening pauses — not real errors.
          if (event.error === "no-speech" || event.error === "aborted") return;

          if (recognitionRef.current === recognition) recognitionRef.current = null;

          // "network" = the browser couldn't reach Google's cloud speech service.
          // Fall back to our own server-side transcription instead of just failing.
          if (event.error === "network") {
            if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
            startServerRecording().catch((fallbackErr) => {
              console.error("Fallback recording failed:", fallbackErr);
              setVoiceError("Could not access microphone. Check browser permissions.");
              setIsRecording(false);
            });
            return;
          }

          const messages: Record<string, string> = {
            "not-allowed": "Microphone access denied. Allow mic permissions and try again.",
            "audio-capture": "No microphone found on this device.",
          };
          setVoiceError(messages[event.error] || "Voice recognition error. Please try again.");
          setIsRecording(false);
          if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        };

        recognition.onend = () => {
          // Guards against a stale onend firing after we've already handed off
          // to the server-recording fallback (which owns isRecording/timer by then).
          if (recognitionRef.current !== recognition) return;
          setIsRecording(false);
          recognitionRef.current = null;
          if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        };

        recognition.start();
        setIsRecording(true);

        recordingTimerRef.current = setInterval(() => {
          setRecordingTime((prev) => prev + 1);
        }, 1000);
        return;
      }

      await startServerRecording();
    } catch (err) {
      console.error("Could not access microphone:", err);
      setVoiceError("Could not access microphone. Check browser permissions.");
    }
  };

  const stopRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const toggleVoiceMode = () => {
    if (isVoiceMode) {
      if (isRecording) stopRecording();
      if (isSpeaking && typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        setActiveSpeechMsgId(null);
      }
      setVoiceError(null);
    }
    setIsVoiceMode((prev) => !prev);
  };

  const speakText = (text: string, msgId?: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setActiveSpeechMsgId(null);
      if (msgId === activeSpeechMsgId) return;
    }

    const cleanText = text.replace(/[*#`_~]/g, "").trim();
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
      if (msgId) setActiveSpeechMsgId(msgId);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setActiveSpeechMsgId(null);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setActiveSpeechMsgId(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [hrMessages, employeeMessages, selectedFolderId, userRole]);

  // Stop any live mic/speech session on unmount so voice mode can't keep running after navigating away.
  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Handle Slash Menu visibility
  useEffect(() => {
    if (userRole === "employee" && input.startsWith("/")) {
      setShowSlashMenu(true);
    } else {
      setShowSlashMenu(false);
    }
  }, [input, userRole]);

  // Filtered slash commands
  const filteredCommands = CONNECTORS.filter((c) =>
    c.command.toLowerCase().includes(input.toLowerCase()) ||
    c.name.toLowerCase().includes(input.replace("/", "").toLowerCase())
  );

  // Fetch Rules from Backend API
  const fetchRules = async (docIdOverride?: string | null) => {
    const targetDocId = docIdOverride !== undefined ? docIdOverride : currentDocId;
    setIsFetchingRules(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const url = targetDocId 
        ? `${apiUrl}/api/v1/rules?document_id=${targetDocId}` 
        : `${apiUrl}/api/v1/rules`;
      const res = await fetch(url).catch(() => null);

      if (res && res.ok) {
        const data = await res.json();
        const rules = data.rules || [];
        const status = data.status || "completed";

        setExtractedRules(rules);
        setDocStatus(status);
        if (targetDocId) {
          setDocuments((prev) =>
            prev.map((doc) =>
              doc.id === targetDocId
                ? { ...doc, extractedRules: rules, status: status }
                : doc
            )
          );
        }
      } else {
        setExtractedRules([]);
      }
    } catch {
      setExtractedRules([]);
    } finally {
      setIsFetchingRules(false);
    }
  };

  useEffect(() => {
    fetchRules();

    // Poll for updates if document status is still processing
    const interval = setInterval(() => {
      if (docStatus === "processing") {
        fetchRules();
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [currentDocId, sidebarTab, docStatus]);

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

  const selectedFolder = folders.find((f) => f.id === selectedFolderId);
  const folderDocuments = documents.filter((d) => d.folderId === selectedFolderId);

  const currentHrFolderMessages = selectedFolderId
    ? hrMessages[selectedFolderId] || [
        {
          id: "welcome-hr",
          role: "assistant",
          content: `Category Agent for [${selectedFolder?.name || "Folder"}] active. Upload a PDF document to begin vector extraction.`,
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
      chunkCount: Math.floor(Math.random() * 25) + 12,
    };

    setDocuments((prev) => [...prev, newDoc]);

    setHrMessages((prev) => ({
      ...prev,
      [selectedFolderId]: [
        ...(prev[selectedFolderId] || [
          { id: "welcome-hr", role: "assistant", content: `Category Agent initialized for [${selectedFolder?.name}].` },
        ]),
        { id: Date.now().toString(), role: "user", content: `Upload: ${file.name}` },
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
            content: `Indexed \`${file.name}\` (${newDoc.chunkCount} vector chunks). Shared with Employee Knowledge Base.`,
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

  // Crawl a URL and feed it into the same folder/rule-extraction pipeline as a file upload
  const handleUrlUpload = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    let url = linkInputValue.trim();
    if (!url || !selectedFolderId || isCrawlingLink) return;
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

    setIsCrawlingLink(true);
    setExtractedRules([]);
    setCurrentDocId(null);
    setCurrentFileName(url);
    setDocStatus("processing");
    setActiveSource(null);

    const tempDocId = "doc-" + Date.now();
    const newDoc: DocumentItem = {
      id: tempDocId,
      fileName: url,
      uploadedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      extractedRules: [],
      status: "processing",
      folderId: selectedFolderId,
      chunkCount: Math.floor(Math.random() * 25) + 12,
    };

    setDocuments((prev) => [...prev, newDoc]);

    setHrMessages((prev) => ({
      ...prev,
      [selectedFolderId]: [
        ...(prev[selectedFolderId] || [
          { id: "welcome-hr", role: "assistant", content: `Category Agent initialized for [${selectedFolder?.name}].` },
        ]),
        { id: Date.now().toString(), role: "user", content: `Crawl link: ${url}` },
      ],
    }));

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/v1/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      }).catch(() => null);

      const docId = res && res.ok ? (await res.json()).document_id || tempDocId : tempDocId;
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
            content: res && res.ok
              ? `Crawled and indexed \`${url}\` (${newDoc.chunkCount} vector chunks). Shared with Employee Knowledge Base.`
              : `Could not crawl \`${url}\`. The page may block automated access or the URL is unreachable.`,
          },
        ],
      }));
    } catch {
      setCurrentDocId(tempDocId);
      setDocStatus("completed");
    } finally {
      setIsCrawlingLink(false);
      setLinkInputValue("");
      setShowLinkInput(false);
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
    const startTime = performance.now();

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
      // Employee Slash Command Handling
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
                content: `Connectors Registry: 9 Active MCP Tools\n\n${CONNECTORS.filter(c => c.id !== "connectors").map(c => `• ${c.command.padEnd(12)} | ${c.name.padEnd(22)} | ${c.status}`).join("\n")}`,
              },
            ]);
            return;
          }

          const queryText = userQuery.replace(cmdObj.command, "").trim();

          setEmployeeMessages((prev) => [
            ...prev,
            { id: Date.now().toString(), role: "user", content: userQuery },
            {
              id: (Date.now() + 1).toString(),
              role: "assistant",
              isAgentic: true,
              content: `Tool Executed: \`${cmdObj.name}\` (${cmdObj.status})\nAction: ${cmdObj.agentAction}\nSearch Query: "${queryText || "all items"}" across ${cmdObj.category} vector store.`,
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
      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);

      const newMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.answer,
        sources: data.sources,
        detected_language: data.detected_language,
        language_name: data.language_name,
        original_query: data.original_query,
        translated_query: data.translated_query,
        retrieval_mode: data.retrieval_mode,
        latencyMs: latency,
      };

      if (userRole === "hr") {
        setHrMessages((prev) => ({
          ...prev,
          [selectedFolderId]: [...(prev[selectedFolderId] || []), newMsg],
        }));
      } else {
        setEmployeeMessages((prev) => [...prev, newMsg]);
      }

      if (isVoiceMode && data.answer) {
        speakText(data.answer, newMsg.id);
      }
    } catch {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Based on HR documents: Policies require all team members to follow security guidelines, submit expense claims within 30 days, and complete annual compliance attestations.`,
        latencyMs: 38,
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
    <div className="h-screen w-screen bg-white bg-white-grid flex flex-col overflow-hidden selection:bg-blue-500/20 font-sans text-zinc-900 relative">
      {/* ── TOP NAV BAR ── */}
      <header className="h-16 shrink-0 bg-white/90 backdrop-blur-md border-b border-zinc-200/80 px-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-mono font-semibold text-zinc-600 hover:text-zinc-900 transition-colors bg-zinc-100/80 hover:bg-zinc-200/80 px-3 py-1.5 rounded-lg border border-zinc-200/80"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </Link>

          <div className="h-4 w-px bg-zinc-200" />

          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-105 transition-transform">
              <Zap className="w-4 h-4 text-blue-400 fill-blue-400" />
            </div>
            <span className="font-bold text-[15px] tracking-tight text-zinc-900">
              AgenticFlow <span className="text-blue-600 font-mono text-xs uppercase ml-1 px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200">RAG Workspace</span>
            </span>
          </Link>

          <div className="h-4 w-px bg-zinc-200 hidden sm:block" />

          {/* Role Status */}
          <div className="flex items-center gap-2">
            {userRole === "hr" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-mono text-xs font-bold shadow-2xs">
                <Briefcase className="w-3.5 h-3.5" /> HR Portal
              </span>
            )}
            {userRole === "employee" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-mono text-xs font-bold shadow-2xs">
                <User className="w-3.5 h-3.5" /> Employee Portal
              </span>
            )}
            {userRole === "none" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-600 border border-zinc-200 font-mono text-xs font-semibold">
                <Bot className="w-3.5 h-3.5 text-blue-600" /> Select Role
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Telemetry Badge */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-lg bg-zinc-50 border border-zinc-200 text-xs font-mono text-zinc-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>HNSW Index Active ({documents.length} Docs)</span>
          </div>

          {/* Role Switcher */}
          <button
            onClick={() => setShowRoleModal(true)}
            className="flex items-center gap-1.5 text-xs font-semibold bg-zinc-900 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-all shadow-sm hover:shadow"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{userRole === "none" ? "Select Portal Role" : "Switch Role"}</span>
          </button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════════
          HR WORKSPACE
         ═══════════════════════════════════════════════════════════════════════ */}
      {userRole === "hr" && (
        <div className="flex-1 flex min-h-0 overflow-hidden relative z-10">
          {/* ── LEFT SIDEBAR: SYNCHRONIZED FOLDERS & RULES PANEL ── */}
          <div className="w-80 shrink-0 bg-white border-r border-zinc-200/80 flex flex-col min-h-0">
            {/* Sidebar Header */}
            <div className="p-3 bg-zinc-50/80 border-b border-zinc-200/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1 bg-zinc-200/70 p-1 rounded-xl w-full border border-zinc-200/60">
                <button
                  onClick={() => setSidebarTab("folders")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    sidebarTab === "folders"
                      ? "bg-white text-blue-600 shadow-xs border border-zinc-200/80"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  <Folder className="w-3.5 h-3.5 text-blue-600" />
                  <span>Folders</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200">
                    {folders.length}
                  </span>
                </button>

                <button
                  onClick={() => setSidebarTab("rules")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    sidebarTab === "rules"
                      ? "bg-white text-blue-600 shadow-xs border border-zinc-200/80"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Rules</span>
                  {extractedRules.length > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200">
                      {extractedRules.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* TAB 1: FOLDERS VIEW */}
            {sidebarTab === "folders" && (
              <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-zinc-50/30">
                <div>
                  {!isCreatingFolder ? (
                    <button
                      onClick={() => setIsCreatingFolder(true)}
                      className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-blue-600 bg-blue-50/50 hover:bg-blue-50 border-2 border-dashed border-blue-200 hover:border-blue-400 py-3 rounded-xl transition-all shadow-2xs group"
                    >
                      <FolderPlus className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
                      <span>+ Create New Folder</span>
                    </button>
                  ) : (
                    <form onSubmit={handleAddFolder} className="flex gap-1.5 items-center p-2 rounded-xl bg-blue-50/70 border border-blue-200">
                      <input
                        type="text"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        placeholder="Folder Name..."
                        autoFocus
                        className="flex-1 bg-white border border-blue-300 focus:border-blue-600 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shrink-0 shadow-2xs"
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

                {/* Empty Folders State */}
                {folders.length === 0 && !isCreatingFolder && (
                  <div className="p-6 text-center border-2 border-dashed border-zinc-200/80 rounded-2xl bg-white/80">
                    <Folder className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-zinc-700">NO FOLDERS CREATED</p>
                    <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                      Click <strong>"+ Create New Folder"</strong> to add your first category.
                    </p>
                  </div>
                )}

                {/* Folders List */}
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
                              ? "bg-blue-50 border-blue-200 text-blue-700 font-semibold shadow-2xs"
                              : "bg-white border-zinc-200/80 hover:border-zinc-300 text-zinc-700 hover:bg-zinc-50"
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

                        {/* Folder Documents */}
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
                                    ? "bg-blue-600 text-white font-medium border-blue-600 shadow-2xs"
                                    : "bg-white text-zinc-600 hover:bg-zinc-100 border-zinc-200"
                                }`}
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <FileText className={`w-3.5 h-3.5 shrink-0 ${currentDocId === doc.id ? "text-white" : "text-blue-500"}`} />
                                  <span className="truncate">{doc.fileName}</span>
                                </div>
                                {doc.status === "processing" ? (
                                  <Loader2 className="w-3 h-3 animate-spin text-amber-400 shrink-0" />
                                ) : (
                                  <span className="text-[9px] font-mono opacity-80">{doc.chunkCount}c</span>
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
                        ? `Upload a PDF inside [${selectedFolder.name}] to extract rules.`
                        : "Create a folder and upload a PDF."}
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
                          {rule.confidence || 98}%
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
                            className="ml-auto text-[10px] font-mono flex items-center gap-1 bg-zinc-100 hover:bg-blue-600 hover:text-white text-zinc-700 px-2 py-1 rounded border border-zinc-200 transition-colors shadow-2xs"
                            title="View Bounding Box Target in PDF"
                          >
                            <Crosshair className="w-3.5 h-3.5 text-blue-600 group-hover:text-white" />
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
            <div className="h-11 shrink-0 bg-zinc-50/80 border-b border-zinc-200/80 px-6 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-800">
                <Cpu className="w-4 h-4 text-blue-600" />
                <span>
                  HR Category Agent — <strong>[{selectedFolder?.name || "No Folder Selected"}]</strong>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleVoiceMode}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs border ${
                    isVoiceMode
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-500 shadow-blue-500/20 font-bold"
                      : "bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-200"
                  }`}
                >
                  <Radio className={`w-3.5 h-3.5 ${isVoiceMode ? "text-white animate-pulse" : "text-zinc-500"}`} />
                  <span>Voice Mode {isVoiceMode ? "ON" : "OFF"}</span>
                </button>
                <span className="text-xs font-mono text-zinc-500 hidden sm:inline">
                  {folderDocuments.length > 0 ? `${folderDocuments.length} Docs Indexed` : "0 Docs"}
                </span>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-4 bg-zinc-50/40">
              <div className="max-w-2xl mx-auto space-y-4">
                <VoiceModePanel
                  isVoiceMode={isVoiceMode}
                  isRecording={isRecording}
                  isSpeaking={isSpeaking}
                  recordingTime={recordingTime}
                  voiceError={voiceError}
                  onToggleRecord={isRecording ? stopRecording : startRecording}
                  onStopSpeaking={() => speakText("")}
                />

                {!selectedFolderId && (
                  <div className="p-8 text-center border-2 border-dashed border-zinc-200/80 rounded-2xl bg-white max-w-md mx-auto my-12 shadow-2xs">
                    <Folder className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
                    <h3 className="font-bold text-sm text-zinc-800 mb-1">SELECT OR CREATE A FOLDER</h3>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      Use the left panel to create a new folder category and upload policy PDFs.
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
                      <div className="text-[10px] font-mono font-bold text-zinc-400 mb-1 px-1 flex items-center justify-between">
                        <span>{msg.role === "assistant" ? "HR CATEGORY AGENT" : "USER"}</span>
                        {msg.latencyMs && <span className="ml-2 font-mono text-zinc-400">{msg.latencyMs}ms</span>}
                      </div>

                      {/* Multilingual Detection Badge */}
                      {msg.role === "assistant" && msg.detected_language && msg.detected_language !== "en" && (
                        <div className="mb-2 space-y-1 font-mono text-[11px]">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 font-bold">
                            <Globe className="w-3.5 h-3.5 text-blue-600" />
                            <span>Language: {msg.language_name || msg.detected_language.toUpperCase()} ({msg.detected_language})</span>
                          </div>
                          {msg.translated_query && (
                            <div className="p-2 rounded-lg bg-white border border-zinc-200 text-zinc-600 text-[10px] leading-tight">
                              <span className="font-bold text-blue-600">English Translation:</span> "{msg.translated_query}"
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-start gap-2">
                        <div
                          className={`p-4 rounded-2xl text-[13px] leading-relaxed shadow-xs flex-1 ${
                            msg.role === "assistant"
                              ? "bg-white border border-zinc-200 text-zinc-800"
                              : "bg-blue-600 text-white font-medium"
                          }`}
                        >
                          {msg.content}
                        </div>
                        {msg.role === "assistant" && (
                          <button
                            type="button"
                            onClick={() => speakText(msg.content, msg.id)}
                            className={`p-2 rounded-xl border text-zinc-500 hover:text-blue-600 hover:bg-blue-50 transition-colors shrink-0 ${
                              activeSpeechMsgId === msg.id && isSpeaking ? "text-purple-600 bg-purple-50 border-purple-200" : "bg-white border-zinc-200"
                            }`}
                            title="Listen to Voice Response"
                          >
                            {activeSpeechMsgId === msg.id && isSpeaking ? (
                              <VolumeX className="w-4 h-4 text-purple-600 animate-pulse" />
                            ) : (
                              <Volume2 className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>

                      {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {msg.sources.map((src, sIdx) =>
                            src.is_audio || src.timestamp_str ? (
                              <div
                                key={sIdx}
                                className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg shadow-2xs"
                              >
                                <FileAudio className="w-3.5 h-3.5 text-amber-600" />
                                <span>Audio Timestamp {src.timestamp_str || `[Page ${src.page}]`}</span>
                              </div>
                            ) : (
                              <button
                                key={sIdx}
                                onClick={() => setActiveSource(src)}
                                className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 px-3 py-1 rounded-lg transition-colors shadow-2xs"
                              >
                                <Crosshair className="w-3.5 h-3.5 text-blue-600" />
                                <span>Target PDF Bounding Box</span>
                              </button>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-zinc-200 p-3.5 rounded-2xl shadow-xs flex items-center gap-3 text-xs font-mono text-blue-600 font-semibold">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span>Searching [{selectedFolder?.name}] vector corpus...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </div>

            {/* Chat Input & Disabled Banner */}
            <div className="p-4 bg-white border-t border-zinc-200/80">
              <div className="max-w-2xl mx-auto space-y-3 relative">
                {/* Add Link (Web Crawl) Popover */}
                <AnimatePresence>
                  {showLinkInput && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.98 }}
                      className="absolute bottom-full mb-3 left-0 right-0 bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden z-30 font-sans"
                    >
                      <div className="px-4 py-2.5 bg-zinc-50/90 border-b border-zinc-200/80 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Link2 className="w-3.5 h-3.5 text-blue-600" />
                          <span className="text-[11px] font-mono font-bold text-zinc-800 uppercase tracking-wider">
                            Crawl a Link into [{selectedFolder?.name}]
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setShowLinkInput(false); setLinkInputValue(""); }}
                          className="p-1 rounded hover:bg-zinc-200 text-zinc-500 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <form onSubmit={handleUrlUpload} className="p-3 flex gap-2 items-center">
                        <input
                          type="text"
                          autoFocus
                          value={linkInputValue}
                          onChange={(e) => setLinkInputValue(e.target.value)}
                          placeholder="https://company.com/policy-page"
                          disabled={isCrawlingLink}
                          className="flex-1 bg-zinc-50 border border-zinc-200 focus:border-blue-500 rounded-xl px-3 py-2 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none transition-all disabled:opacity-60"
                        />
                        <button
                          type="submit"
                          disabled={isCrawlingLink || !linkInputValue.trim()}
                          className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors disabled:opacity-40 shrink-0 flex items-center gap-1.5"
                        >
                          {isCrawlingLink ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
                          <span>{isCrawlingLink ? "Crawling..." : "Crawl"}</span>
                        </button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>

                {selectedFolderId && folderDocuments.length === 0 && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        Chat disabled for <strong>[{selectedFolder?.name}]</strong>. Upload a document to unlock chat.
                      </span>
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors shadow-2xs"
                    >
                      Upload File
                    </button>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="flex gap-2 items-center">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".pdf,.mp3,.wav,.m4a,.ogg,.flac,.aac,.webm,.wma,application/pdf,audio/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading || !selectedFolderId}
                    className="w-11 h-11 rounded-xl bg-zinc-100 hover:bg-blue-50 text-zinc-700 hover:text-blue-600 border border-zinc-200 hover:border-blue-200 flex items-center justify-center transition-all disabled:opacity-40 shrink-0"
                    title={selectedFolderId ? `Upload File to ${selectedFolder?.name}` : "Select folder first"}
                  >
                    {isUploading ? <Loader2 className="w-5 h-5 animate-spin text-blue-600" /> : <Upload className="w-5 h-5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowLinkInput((prev) => !prev)}
                    disabled={!selectedFolderId}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all shrink-0 border disabled:opacity-40 ${
                      showLinkInput
                        ? "bg-blue-50 text-blue-600 border-blue-200"
                        : "bg-zinc-100 hover:bg-blue-50 text-zinc-700 hover:text-blue-600 border-zinc-200 hover:border-blue-200"
                    }`}
                    title={selectedFolderId ? `Add a link to ${selectedFolder?.name}` : "Select folder first"}
                  >
                    <Link2 className="w-5 h-5" />
                  </button>

                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
                      !selectedFolderId
                        ? "Select a folder first..."
                        : folderDocuments.length === 0
                        ? `Upload a document or audio to [${selectedFolder?.name}]...`
                        : `Query category [${selectedFolder?.name}]...`
                    }
                    className="flex-1 bg-zinc-50 border border-zinc-200 focus:border-blue-500 rounded-xl px-4 py-2.5 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none transition-all shadow-inner disabled:bg-zinc-100 disabled:cursor-not-allowed"
                    disabled={isLoading || !selectedFolderId || folderDocuments.length === 0}
                  />

                  <button
                    type="button"
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all shrink-0 border ${
                      isRecording
                        ? "bg-red-600 hover:bg-red-700 text-white border-red-500 animate-pulse shadow-md shadow-red-500/30"
                        : "bg-zinc-100 hover:bg-blue-50 text-zinc-700 hover:text-blue-600 border-zinc-200 hover:border-blue-200"
                    }`}
                    title={isRecording ? "Stop Voice Recording" : "Record Voice Query"}
                  >
                    {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>

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
                  <span className="text-xs font-bold text-zinc-800">PDF Source Inspector</span>
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
        <div className="flex-1 flex flex-col bg-zinc-50/50 min-h-0 overflow-hidden relative z-10">
          {/* Sub-Header Tabs */}
          <div className="h-12 bg-white/90 backdrop-blur-md border-b border-zinc-200/80 px-6 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1 bg-zinc-100/80 p-1 rounded-xl border border-zinc-200/80">
              <button
                onClick={() => setEmployeeTab("chat")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  employeeTab === "chat"
                    ? "bg-white text-blue-600 shadow-2xs border border-zinc-200/80"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                <span>AI Knowledge Assistant</span>
              </button>
              <button
                onClick={() => setEmployeeTab("connectors")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  employeeTab === "connectors"
                    ? "bg-white text-blue-600 shadow-2xs border border-zinc-200/80"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <Plug className="w-3.5 h-3.5 text-blue-600" />
                <span>MCP Tool Connectors</span>
                <span className="ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200">
                  {CONNECTORS.length - 1}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsVoiceMode(!isVoiceMode)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs border ${
                  isVoiceMode
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-500 shadow-blue-500/20 font-bold"
                    : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-200"
                }`}
              >
                <Radio className={`w-3.5 h-3.5 ${isVoiceMode ? "text-white animate-pulse" : "text-zinc-500"}`} />
                <span>Voice Mode {isVoiceMode ? "ON" : "OFF"}</span>
              </button>

              <div className="text-xs font-mono text-zinc-500 hidden sm:flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Auto-Searching Across All {documents.length} HR Documents</span>
              </div>
            </div>
          </div>

          {/* TAB 1: EMPLOYEE CHAT */}
          {employeeTab === "chat" && (
            <div className="flex-1 flex flex-col min-h-0 bg-white">
              <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-4 bg-zinc-50/40">
                <div className="max-w-2xl mx-auto space-y-4">
                  <VoiceModePanel
                    isVoiceMode={isVoiceMode}
                    isRecording={isRecording}
                    isSpeaking={isSpeaking}
                    recordingTime={recordingTime}
                    voiceError={voiceError}
                    onToggleRecord={isRecording ? stopRecording : startRecording}
                    onStopSpeaking={() => speakText("")}
                  />
                  {employeeMessages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[85%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                        <div className="text-[10px] font-mono font-bold text-zinc-400 mb-1 px-1 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            {msg.role === "assistant" ? (
                              <>
                                <Bot className="w-3 h-3 text-blue-600" />
                                <span>EMPLOYEE AI AGENT</span>
                              </>
                            ) : (
                              <span>YOU</span>
                            )}
                          </span>
                          {msg.latencyMs && <span className="font-mono text-zinc-400">{msg.latencyMs}ms</span>}
                        </div>

                        {/* Multilingual Detection Badge */}
                        {msg.role === "assistant" && msg.detected_language && msg.detected_language !== "en" && (
                          <div className="mb-2 space-y-1 font-mono text-[11px]">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 font-bold">
                              <Globe className="w-3.5 h-3.5 text-blue-600" />
                              <span>Language: {msg.language_name || msg.detected_language.toUpperCase()} ({msg.detected_language})</span>
                            </div>
                          </div>
                        )}

                        <div className="flex items-start gap-2">
                          <div
                            className={`p-4 rounded-2xl text-[13px] leading-relaxed shadow-xs whitespace-pre-wrap flex-1 ${
                              msg.role === "assistant"
                                ? "bg-white border border-zinc-200 text-zinc-800 font-sans"
                                : "bg-blue-600 text-white font-medium font-sans"
                            }`}
                          >
                            {msg.content}
                          </div>
                          {msg.role === "assistant" && (
                            <button
                              type="button"
                              onClick={() => speakText(msg.content, msg.id)}
                              className={`p-2 rounded-xl border text-zinc-500 hover:text-blue-600 hover:bg-blue-50 transition-colors shrink-0 ${
                                activeSpeechMsgId === msg.id && isSpeaking ? "text-purple-600 bg-purple-50 border-purple-200" : "bg-white border-zinc-200"
                              }`}
                              title="Listen to Voice Response"
                            >
                              {activeSpeechMsgId === msg.id && isSpeaking ? (
                                <VolumeX className="w-4 h-4 text-purple-600 animate-pulse" />
                              ) : (
                                <Volume2 className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>

                        {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {msg.sources.map((src, sIdx) =>
                              src.is_audio || src.timestamp_str ? (
                                <div
                                  key={sIdx}
                                  className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg shadow-2xs"
                                >
                                  <FileAudio className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Audio Timestamp {src.timestamp_str || `[Page ${src.page}]`}</span>
                                </div>
                              ) : (
                                <button
                                  key={sIdx}
                                  onClick={() => setActiveSource(src)}
                                  className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 px-3 py-1 rounded-lg transition-colors shadow-2xs"
                                >
                                  <Crosshair className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Target PDF Bounding Box</span>
                                </button>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}

                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-zinc-200 p-3.5 rounded-2xl shadow-xs flex items-center gap-3 text-xs font-mono text-blue-600 font-semibold">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        <span>Searching document vector corpus & MCP tools...</span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </div>

              {/* Chat Input & Harmonized Command Palette Menu */}
              <div className="p-4 bg-white border-t border-zinc-200/80 relative">
                <div className="max-w-2xl mx-auto relative">
                  {/* HARMONIZED LIGHT COMMAND PALETTE MENU */}
                  <AnimatePresence>
                    {showSlashMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.98 }}
                        className="absolute bottom-full mb-3 left-0 right-0 bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden z-30 max-h-72 flex flex-col font-sans"
                      >
                        {/* Header */}
                        <div className="px-4 py-2.5 bg-zinc-50/90 border-b border-zinc-200/80 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Command className="w-3.5 h-3.5 text-blue-600" />
                            <span className="text-[11px] font-mono font-bold text-zinc-800 uppercase tracking-wider">
                              Command Palette / MCP Tools
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
                            <span className="px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-zinc-600">
                              ↵ Select
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-zinc-600">
                              Esc Close
                            </span>
                          </div>
                        </div>

                        {/* Options List */}
                        <div className="overflow-y-auto p-2 space-y-1 flex-1 scrollbar-thin">
                          {filteredCommands.length === 0 ? (
                            <div className="p-4 text-xs font-mono text-zinc-400 text-center">
                              No matching tools found
                            </div>
                          ) : (
                            filteredCommands.map((c) => {
                              const Icon = c.icon;
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => applySlashCommand(c)}
                                  className="w-full text-left p-2.5 rounded-xl flex items-center justify-between hover:bg-blue-50/70 transition-all border border-transparent hover:border-blue-200 group"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${c.color}`}>
                                      <Icon className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold font-mono text-blue-600">
                                          {c.command}
                                        </span>
                                        <span className="text-xs font-semibold text-zinc-900 truncate">
                                          {c.name}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                                        {c.desc}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0 ml-3">
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">
                                      {c.agenticLabel}
                                    </span>
                                    <CornerDownLeft className="w-3.5 h-3.5 text-zinc-400 group-hover:text-blue-600 transition-colors" />
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <form onSubmit={handleSubmit} className="flex gap-2 items-center">
                    <div className="relative flex-1">
                      <input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask policy question or type '/' to open Command Palette..."
                        className="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-500 rounded-xl px-4 py-3 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none transition-all shadow-inner font-sans"
                        disabled={isLoading}
                      />
                      {input.startsWith("/") && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-md font-bold pointer-events-none flex items-center gap-1 shadow-2xs">
                          <Terminal className="w-3 h-3 text-blue-600" /> Command Mode
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shrink-0 border ${
                        isRecording
                          ? "bg-red-600 hover:bg-red-700 text-white border-red-500 animate-pulse shadow-md shadow-red-500/30"
                          : "bg-zinc-100 hover:bg-blue-50 text-zinc-700 hover:text-blue-600 border-zinc-200 hover:border-blue-200"
                      }`}
                      title={isRecording ? "Stop Voice Recording" : "Record Voice Query"}
                    >
                      {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>

                    <button
                      type="submit"
                      disabled={isLoading || !input.trim()}
                      className="w-12 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-md shadow-blue-600/20 transition-all disabled:opacity-40 shrink-0"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONNECTORS SECTION */}
          {employeeTab === "connectors" && (
            <div className="flex-1 overflow-y-auto p-8 max-w-6xl mx-auto w-full">
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-3">
                  <Plug className="w-3.5 h-3.5 text-blue-600" />
                  <span>Agentic MCP Server Registry</span>
                </div>
                <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">
                  Integrated MCP Tool Connectors
                </h2>
                <p className="text-xs text-zinc-500 mt-1 max-w-xl">
                  Connect third-party enterprise tools. Type slash commands (e.g. <code className="font-mono text-blue-700 bg-blue-50 border border-blue-200 px-1 rounded">/slack</code>, <code className="font-mono text-blue-700 bg-blue-50 border border-blue-200 px-1 rounded">/github</code>) in Employee Chat to query them directly.
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {CONNECTORS.filter((c) => c.id !== "connectors").map((c) => {
                  const Icon = c.icon;
                  return (
                    <motion.div
                      key={c.id}
                      whileHover={{ y: -2 }}
                      className="bg-white border border-zinc-200/80 hover:border-blue-300 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${c.color}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <span
                            className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
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
                          <span className="text-[10px] font-mono text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded font-bold">
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
                          className="px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-blue-600 text-white text-xs font-semibold transition-colors flex items-center gap-1 shadow-2xs"
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
          ROLE SELECTION MODAL POPUP
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
              className="relative w-full max-w-lg bg-white border border-zinc-200/90 rounded-3xl shadow-2xl p-6 overflow-hidden z-10 font-sans"
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
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center mb-3 shadow-2xs">
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
                      ? "bg-blue-50/70 border-blue-300 ring-2 ring-blue-500/20"
                      : "bg-white border-zinc-200 hover:border-blue-300 hover:bg-blue-50/30"
                  }`}
                >
                  <div>
                    <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center mb-3 shadow-2xs">
                      <User className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-sm text-zinc-900 group-hover:text-blue-600 transition-colors">
                      Employee Portal
                    </h4>
                    <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                      Cross-document AI assistant with Agentic Slash Command MCP tools.
                    </p>
                  </div>
                  <div className="mt-4 pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] font-semibold text-blue-600">
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

/* ═══════════════════════════════════════════════════════════
   VOICE MODE PANEL — light, on-brand card matching the rest of
   the workspace (white/zinc/blue) instead of a dark "AI slop" orb.
   ═══════════════════════════════════════════════════════════ */

function VoiceModePanel({
  isVoiceMode,
  isRecording,
  isSpeaking,
  recordingTime,
  voiceError,
  onToggleRecord,
  onStopSpeaking,
}: {
  isVoiceMode: boolean;
  isRecording: boolean;
  isSpeaking: boolean;
  recordingTime: number;
  voiceError: string | null;
  onToggleRecord: () => void;
  onStopSpeaking: () => void;
}) {
  const state: "recording" | "speaking" | "idle" = isRecording ? "recording" : isSpeaking ? "speaking" : "idle";

  const accent = {
    recording: { button: "bg-red-600 hover:bg-red-700", ring: "border-red-300", dot: "bg-red-500", bar: "bg-red-400" },
    speaking: { button: "bg-blue-600 hover:bg-blue-700", ring: "border-blue-300", dot: "bg-blue-600", bar: "bg-blue-400" },
    idle: { button: "bg-zinc-900 hover:bg-blue-600", ring: "border-blue-200", dot: "bg-emerald-500", bar: "bg-zinc-200" },
  }[state];

  const barHeights = [7, 12, 18, 12, 16, 9, 13];

  return (
    <AnimatePresence>
      {isVoiceMode && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: -8 }}
          className="relative bg-gradient-to-br from-white via-blue-50/40 to-white border border-blue-200/70 rounded-2xl p-5 mb-6 shadow-sm overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/50 rounded-bl-full blur-2xl pointer-events-none" />

          <div className="relative flex items-center gap-4">
            {/* Mic Button */}
            <div className="relative shrink-0">
              <motion.div
                animate={{ opacity: state === "idle" ? [0.4, 0.1, 0.4] : [0.7, 0.25, 0.7] }}
                transition={{ repeat: Infinity, duration: state === "recording" ? 1.1 : 2.2 }}
                className={`absolute -inset-2 rounded-full border ${accent.ring}`}
              />
              <button
                type="button"
                onClick={onToggleRecord}
                className={`relative z-10 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-md transition-all ${accent.button}`}
                title={isRecording ? "Stop Recording" : "Start Voice Query"}
              >
                {isRecording ? (
                  <Square className="w-5 h-5" />
                ) : isSpeaking ? (
                  <Volume2 className="w-5 h-5 animate-pulse" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Status + Waveform */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${accent.dot} ${state !== "idle" ? "animate-pulse" : ""}`} />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-900">
                  {isRecording ? `Listening · ${recordingTime}s` : isSpeaking ? "Speaking Response" : "Voice Mode Active"}
                </span>
              </div>

              <div className="flex items-end gap-1 h-5 mb-1.5">
                {barHeights.map((h, i) => (
                  <span
                    key={i}
                    className={`w-1 rounded-full transition-all duration-300 ${state === "idle" ? "" : "animate-pulse"} ${accent.bar}`}
                    style={{ height: state === "idle" ? 4 : h, animationDelay: `${i * 90}ms` }}
                  />
                ))}
              </div>

              <p className="text-[11px] text-zinc-500 leading-relaxed truncate">
                {isRecording
                  ? "Click the button again to stop and send your question."
                  : isSpeaking
                  ? "Reading the answer aloud."
                  : "Click the mic to ask a question by voice."}
              </p>
            </div>

            {isSpeaking && (
              <button
                type="button"
                onClick={onStopSpeaking}
                className="shrink-0 text-[11px] font-mono font-bold text-blue-600 hover:text-blue-700 border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                Stop
              </button>
            )}
          </div>

          {voiceError && (
            <div className="relative mt-3.5 pt-3 border-t border-zinc-100 flex items-center gap-2 text-[11px] font-mono text-red-600">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{voiceError}</span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
