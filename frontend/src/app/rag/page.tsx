"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Send, Upload, Loader2, Crosshair, ArrowLeft, Sparkles, FileText, Database, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

const PdfViewer = dynamic(() => import("../../components/PdfViewer"), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full text-zinc-600 text-sm">Loading viewer...</div>,
});

type Source = { document_id: string; page: number; bbox?: number[]; page_dim?: number[] };
type Message = { id: string; role: "user" | "assistant"; content: string; sources?: Source[] };
type Rule = { id: string; canonical_rule: string; type: string; confidence: number; bbox?: number[]; page_dim?: number[]; page?: number; document_id?: string };

export default function RAGPage() {
  const [messages, setMessages] = useState<Message[]>([{
    id: "welcome", role: "assistant",
    content: "System ready. Upload a document or enter a query to begin."
  }]);
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

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

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
    } catch { /* silent */ } finally { setIsFetchingRules(false); }
  };

  useEffect(() => {
    if (!currentDocId) return;
    fetchRules();
    const iv = setInterval(fetchRules, 5000);
    return () => clearInterval(iv);
  }, [currentDocId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const userMsg = { id: Date.now().toString(), role: "user" as const, content: input };
    setMessages((p) => [...p, userMsg]);
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
      setMessages((p) => [...p, { id: (Date.now() + 1).toString(), role: "assistant", content: data.answer, sources: data.sources }]);
    } catch {
      setMessages((p) => [...p, { id: (Date.now() + 1).toString(), role: "assistant", content: "Connection error. Please try again." }]);
    } finally { setIsLoading(false); }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setExtractedRules([]);
    setCurrentDocId(null);
    setCurrentFileName(file.name);
    setDocStatus("processing");
    setActiveSource(null);
    setMessages([
      { id: "welcome", role: "assistant", content: "System ready." },
      { id: Date.now().toString(), role: "user", content: `Uploading: ${file.name}` },
    ]);
    const fd = new FormData();
    fd.append("files", file);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/v1/upload`, { method: "POST", body: fd });
      if (res.ok) {
        const data = await res.json();
        const docId = data.results?.[0]?.document_id;
        if (docId) setCurrentDocId(docId);
        setMessages((p) => [...p, { id: (Date.now() + 1).toString(), role: "assistant", content: `Uploaded ${file.name}. Extracting rules...` }]);
        setTimeout(fetchRules, 1000);
      } else {
        setMessages((p) => [...p, { id: (Date.now() + 1).toString(), role: "assistant", content: "Upload failed." }]);
      }
    } catch {
      setMessages((p) => [...p, { id: (Date.now() + 1).toString(), role: "assistant", content: "Upload failed. Network error." }]);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex h-screen bg-[#060606] text-white overflow-hidden">
      {/* ── LEFT SIDEBAR: Rules ── */}
      <div className="w-80 shrink-0 border-r border-white/[0.04] flex flex-col bg-[#0a0a0a]">
        {/* Header */}
        <div className="p-4 border-b border-white/[0.04] flex items-center gap-3">
          <Link href="/" className="p-1.5 rounded-lg hover:bg-white/[0.04] transition-colors text-zinc-500 hover:text-zinc-300">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#3B82F6] to-[#6366F1] flex items-center justify-center">
              <Database className="w-3 h-3 text-white" />
            </div>
            <span className="text-[13px] font-semibold tracking-[-0.01em]">RAG Engine</span>
          </div>
          {isFetchingRules && <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-600 ml-auto" />}
        </div>

        {/* Rules list */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
          {currentFileName && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04] mb-3">
              <FileText className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
              <span className="text-[11px] text-zinc-500 truncate">{currentFileName}</span>
            </div>
          )}

          {docStatus === "processing" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 px-3 py-3 rounded-lg bg-[#3B82F6]/[0.04] border border-[#3B82F6]/[0.08]">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#3B82F6]/60" />
              <span className="text-[11px] text-[#3B82F6]/60">Extracting rules...</span>
            </motion.div>
          )}

          {docStatus === "failed" && (
            <div className="px-3 py-3 rounded-lg bg-red-500/[0.05] border border-red-500/[0.1] text-[11px] text-red-400/70">
              Extraction failed
            </div>
          )}

          {extractedRules.length === 0 && docStatus !== "processing" && (
            <div className="px-3 py-8 text-center">
              <Database className="w-5 h-5 text-zinc-800 mx-auto mb-2" />
              <p className="text-[11px] text-zinc-700">No rules extracted yet</p>
              <p className="text-[10px] text-zinc-800 mt-1">Upload a PDF to begin</p>
            </div>
          )}

          <AnimatePresence>
            {extractedRules.map((rule, i) => (
              <motion.div
                key={rule.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="group px-3 py-2.5 rounded-lg bg-white/[0.01] border border-white/[0.04] hover:bg-white/[0.03] hover:border-white/[0.07] transition-all cursor-default"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-white/[0.04] text-zinc-500 uppercase tracking-wider">
                    {rule.type || "info"}
                  </span>
                  <span className="text-[9px] text-zinc-700 font-mono ml-auto">
                    {rule.confidence || 0}%
                  </span>
                  {rule.bbox && rule.page_dim && rule.page && rule.document_id && (
                    <button
                      onClick={() => setActiveSource({ document_id: rule.document_id!, page: rule.page!, bbox: rule.bbox, page_dim: rule.page_dim })}
                      className="p-1 rounded hover:bg-white/[0.06] text-zinc-700 hover:text-zinc-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Crosshair className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">{rule.canonical_rule}</p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* ── CENTER: Chat ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#060606]">
        {/* Chat header */}
        <div className="h-12 shrink-0 border-b border-white/[0.04] flex items-center px-5">
          <Sparkles className="w-3.5 h-3.5 text-zinc-600 mr-2" />
          <span className="text-[13px] text-zinc-400 font-medium">AI Assistant</span>
          {currentFileName && (
            <span className="ml-3 text-[11px] text-zinc-700">· {currentFileName}</span>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-6">
          <div className="max-w-2xl mx-auto space-y-4">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[75%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div className={`px-4 py-3 rounded-2xl text-[13px] leading-relaxed ${
                    msg.role === "assistant"
                      ? "bg-white/[0.03] border border-white/[0.05] text-zinc-300"
                      : "bg-gradient-to-r from-[#3B82F6]/20 to-[#6366F1]/20 border border-[#3B82F6]/10 text-zinc-200"
                  }`}>
                    {msg.content}
                  </div>
                  {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                    <button
                      onClick={() => setActiveSource(msg.sources![0])}
                      className="mt-1.5 flex items-center gap-1.5 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors px-2 py-1 rounded-md hover:bg-white/[0.03]"
                    >
                      <Crosshair className="w-3 h-3" /> View Source
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
            {isLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500" />
                  <span className="text-[12px] text-zinc-500">Processing...</span>
                </div>
              </motion.div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="shrink-0 border-t border-white/[0.04] p-4">
          <div className="max-w-2xl mx-auto">
            <form onSubmit={handleSubmit} className="flex items-center gap-3">
              <input type="file" ref={fileInputRef} onChange={handleUpload} accept="application/pdf" className="hidden" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.06] hover:border-white/[0.1] transition-all disabled:opacity-40 shrink-0"
              >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              </button>
              <div className="flex-1 relative">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about your documents..."
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-[13px] text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-[#3B82F6]/20 focus:bg-white/[0.04] transition-all"
                  disabled={isLoading}
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#6366F1] flex items-center justify-center text-white hover:brightness-110 transition-all disabled:opacity-30 shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ── RIGHT: PDF Viewer ── */}
      <AnimatePresence>
        {activeSource && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "35%", opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as const }}
            className="shrink-0 border-l border-white/[0.04] bg-[#0a0a0a] flex flex-col overflow-hidden"
          >
            <div className="h-12 shrink-0 border-b border-white/[0.04] flex items-center justify-between px-4">
              <span className="text-[13px] text-zinc-400 font-medium">Document Viewer</span>
              <button onClick={() => setActiveSource(null)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-zinc-600 hover:text-zinc-300 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <PdfViewer source={activeSource} fileName={currentDocId && currentFileName ? `${currentDocId}_${currentFileName}` : null} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
