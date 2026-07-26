"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Send, Upload, Loader2, Crosshair, ArrowLeft, Sparkles,
  FileText, Database, X, Cpu, CheckCircle2, Search, Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

const PdfViewer = dynamic(() => import("../../components/PdfViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-zinc-400 text-xs font-mono animate-pulse">
      Loading PDF Module...
    </div>
  ),
});

type Source = { document_id: string; page: number; bbox?: number[]; page_dim?: number[] };
type Message = { id: string; role: "user" | "assistant"; content: string; sources?: Source[] };
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

export default function RAGPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "System Ready. Enterprise RAG Engine online. Upload a document (PDF) or enter a query.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [extractedRules, setExtractedRules] = useState<Rule[]>([]);
  const [isFetchingRules, setIsFetchingRules] = useState(false);
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const [docStatus, setDocStatus] = useState<"idle" | "processing" | "completed" | "failed">("idle");
  const [activeSource, setActiveSource] = useState<Source | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchRules = async () => {
    if (!currentDocId) return;
    setIsFetchingRules(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/v1/rules?document_id=${currentDocId}`);
      if (res.ok) {
        const data = await res.json();
        setExtractedRules(data.rules || []);
        if (data.status) setDocStatus(data.status);
      }
    } catch {
      /* silent retry */
    } finally {
      setIsFetchingRules(false);
    }
  };

  useEffect(() => {
    if (!currentDocId) return;
    fetchRules();
    const interval = setInterval(fetchRules, 5000);
    return () => clearInterval(interval);
  }, [currentDocId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = { id: Date.now().toString(), role: "user" as const, content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/v1/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userMsg.content, top_k: 5, document_id: currentDocId }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.answer,
          sources: data.sources,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "ERROR: ENGINE DISCONNECTED.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setExtractedRules([]);
    setCurrentDocId(null);
    setCurrentFileName(file.name);
    setDocStatus("processing");
    setActiveSource(null);

    setMessages([
      { id: "welcome", role: "assistant", content: "System Ready." },
      { id: Date.now().toString(), role: "user", content: `Uploading document: ${file.name}` },
    ]);

    const formData = new FormData();
    formData.append("files", file);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/v1/upload`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const docId = data.results?.[0]?.document_id;
        if (docId) setCurrentDocId(docId);

        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: `Upload Success: ${file.name}. Vector Indexing initialized.`,
          },
        ]);
        setTimeout(fetchRules, 1000);
      } else {
        setMessages((prev) => [
          ...prev,
          { id: (Date.now() + 1).toString(), role: "assistant", content: "Upload Failed: Server rejected file." },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "assistant", content: "Upload Error: Network Timeout." },
      ]);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-50 text-zinc-900 font-sans overflow-hidden">
      {/* ── TOP HEADER ── */}
      <header className="h-14 shrink-0 bg-white border-b border-zinc-200 px-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 transition-colors bg-zinc-100 px-3 py-1.5 rounded-lg border border-zinc-200"
          >
            <ArrowLeft className="w-4 h-4 text-zinc-500" />
            <span>Back to Home</span>
          </Link>

          <div className="h-4 w-px bg-zinc-200" />

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
              <Database className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-zinc-900 tracking-tight">AgenticFlow AI — RAG Engine</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {currentFileName && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-50 border border-blue-200 text-xs font-mono text-blue-700">
              <FileText className="w-3.5 h-3.5" />
              <span className="max-w-[180px] truncate">{currentFileName}</span>
            </div>
          )}

          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-mono text-emerald-700 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Vector Engine Connected</span>
          </div>
        </div>
      </header>

      {/* ── MAIN WORKSPACE ── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* ── LEFT PANEL: EXTRACTED RULES INDEX ── */}
        <div className="w-88 shrink-0 bg-white border-r border-zinc-200 flex flex-col min-h-0">
          <div className="p-3.5 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                Database.RAW / Extracted Rules
              </span>
            </div>
            {isFetchingRules && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />}
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin p-3.5 space-y-3">
            {docStatus === "processing" && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-mono text-amber-800 flex items-center gap-2.5 shadow-sm">
                <Loader2 className="w-4 h-4 animate-spin shrink-0 text-amber-600" />
                <span className="font-semibold">Extracting vector rules...</span>
              </div>
            )}

            {extractedRules.length === 0 && docStatus !== "processing" && (
              <div className="p-8 text-center border-2 border-dashed border-zinc-200 rounded-xl bg-zinc-50/50">
                <Search className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-zinc-700">AWAITING DATA</p>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Upload a PDF document to extract structured rules.
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
                  className="group bg-white border border-zinc-200 hover:border-blue-300 rounded-xl p-3.5 shadow-sm hover:shadow transition-all"
                >
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-zinc-100">
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
                        className="ml-auto text-[10px] font-mono flex items-center gap-1 bg-zinc-100 hover:bg-blue-600 hover:text-white text-zinc-700 px-2 py-1 rounded border border-zinc-200 transition-colors shadow-sm"
                        title="View Bounding Box Source Target in PDF"
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
        </div>

        {/* ── CENTER PANEL: CHAT WORKSPACE ── */}
        <div className="flex-1 flex flex-col bg-white min-w-0">
          <div className="h-11 shrink-0 bg-zinc-50 border-b border-zinc-200 px-6 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-800">
              <Cpu className="w-4 h-4 text-blue-600" />
              <span>AI Assistant Workspace</span>
            </div>
            <span className="text-xs font-mono text-zinc-500">Hybrid Top-K Retrieval</span>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-4 bg-zinc-50/50">
            <div className="max-w-2xl mx-auto space-y-4">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                    <div className="text-[10px] font-mono font-bold text-zinc-400 mb-1 px-1">
                      {msg.role === "assistant" ? "SYS RAG" : "USER"}
                    </div>

                    <div
                      className={`p-4 rounded-2xl text-[13px] leading-relaxed shadow-sm ${
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
                          className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 px-3 py-1 rounded-lg transition-colors shadow-sm"
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
                  <div className="bg-white border border-zinc-200 p-4 rounded-2xl shadow-sm flex items-center gap-3 text-xs font-mono text-zinc-700 font-semibold">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span>Computing Hybrid Vector Embeddings...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>

          <div className="p-4 bg-white border-t border-zinc-200">
            <div className="max-w-2xl mx-auto">
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
                  disabled={isUploading}
                  className="w-11 h-11 rounded-xl bg-zinc-100 hover:bg-blue-50 text-zinc-700 hover:text-blue-600 border border-zinc-200 hover:border-blue-200 flex items-center justify-center transition-all disabled:opacity-40 shrink-0"
                  title="Upload PDF Document"
                >
                  {isUploading ? <Loader2 className="w-5 h-5 animate-spin text-blue-600" /> : <Upload className="w-5 h-5" />}
                </button>

                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Enter query..."
                  className="flex-1 bg-zinc-50 border border-zinc-200 focus:border-blue-500 rounded-xl px-4 py-2.5 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none transition-all shadow-inner"
                  disabled={isLoading}
                />

                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
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
                <span className="text-xs font-bold text-zinc-800">PDF Document Source Inspector</span>
                <button
                  onClick={() => setActiveSource(null)}
                  className="p-1 rounded-md hover:bg-zinc-200 text-zinc-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-hidden relative">
                <PdfViewer
                  source={activeSource}
                  fileName={currentDocId && currentFileName ? `${currentDocId}_${currentFileName}` : null}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
