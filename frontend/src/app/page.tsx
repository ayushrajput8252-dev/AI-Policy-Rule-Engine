"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Send, Upload, Loader2, AlertCircle, Crosshair } from "lucide-react";
import dynamic from "next/dynamic";

const PdfViewer = dynamic(() => import("../components/PdfViewer"), {
  ssr: false,
  loading: () => <div className="p-4 font-bold uppercase text-center animate-pulse">Loading PDF Module...</div>
});

type Source = {
  document_id: string;
  page: number;
  bbox?: number[];
  page_dim?: number[];
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
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

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([{
    id: "welcome",
    role: "assistant",
    content: "SYSTEM READY. AWAITING DOCUMENT UPLOAD OR QUERY."
  }]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle");
  const [extractedRules, setExtractedRules] = useState<Rule[]>([]);
  const [isFetchingRules, setIsFetchingRules] = useState(false);
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const [docStatus, setDocStatus] = useState<"idle" | "processing" | "completed" | "failed">("idle");
  const [activeSource, setActiveSource] = useState<Source | null>(null);
  const [filterType, setFilterType] = useState<string>("ALL");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchRules = async () => {
    if (!currentDocId) {
      setExtractedRules([]);
      return;
    }
    setIsFetchingRules(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/api/v1/rules?document_id=${currentDocId}`);
      if (response.ok) {
        const data = await response.json();
        setExtractedRules(data.rules || []);
        if (data.status) {
          setDocStatus(data.status);
        }
      }
    } catch (error) {
      console.error("Fetch failed:", error);
    } finally {
      setIsFetchingRules(false);
    }
  };

  useEffect(() => {
    fetchRules();
    const interval = setInterval(fetchRules, 5000);
    return () => clearInterval(interval);
  }, [currentDocId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { id: Date.now().toString(), role: "user" as const, content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/api/v1/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userMessage.content, top_k: 5, document_id: currentDocId })
      });
      const data = await response.json();
      
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.answer,
        sources: data.sources
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "ERROR: ENGINE DISCONNECTED."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus("idle");
    setExtractedRules([]);
    setCurrentDocId(null);
    setCurrentFileName(file.name);
    setDocStatus("processing");
    setActiveSource(null);
    setMessages([{
      id: "welcome",
      role: "assistant",
      content: "SYSTEM READY."
    }, {
      id: Date.now().toString(),
      role: "user",
      content: `[UPLOAD CMD]: ${file.name}`
    }]);

    const formData = new FormData();
    formData.append("files", file);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/api/v1/upload`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const docId = data.results?.[0]?.document_id;
        
        if (docId) setCurrentDocId(docId);
        setUploadStatus("success");
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `UPLOAD SUCCESS: ${file.name}. PREPARING TO EXTRACT RULES.`
        }]);
        setTimeout(fetchRules, 1000);
      } else {
        setUploadStatus("error");
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `UPLOAD FAILED: SERVER REJECTED.`
        }]);
      }
    } catch (error) {
      setUploadStatus("error");
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "UPLOAD FAILED: NETWORK TIMEOUT."
      }]);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="flex h-screen bg-white text-black font-mono overflow-hidden">
      {/* Sidebar: Extracted Rules */}
      <div className="w-96 border-r-4 border-black bg-white flex flex-col z-20 shrink-0">
        <div className="p-4 border-b-4 border-black flex items-center justify-between bg-black text-white">
          <div className="font-black text-xl tracking-tighter uppercase">
            [ Policy_Engine ]
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-2">
            <h2 className="text-lg font-bold uppercase">Database.RAW</h2>
            {isFetchingRules && <Loader2 className="h-5 w-5 animate-spin" />}
          </div>
          
          {extractedRules.length > 0 && docStatus !== "processing" && (
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
              {["ALL", "RULE", "RECOMMENDATION", "ACTION", "INFO"].map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1 text-xs font-bold uppercase border-2 border-black transition-all whitespace-nowrap ${
                    filterType === type 
                      ? "bg-black text-white shadow-none translate-x-0.5 translate-y-0.5" 
                      : "bg-white text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          )}
          
          <div className="space-y-4">
            {docStatus === "processing" && (
              <div className="p-4 border-2 border-black border-dashed font-bold uppercase text-center bg-yellow-300 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>EXTRACTING RULES...</span>
              </div>
            )}
            
            {docStatus === "failed" && (
              <div className="p-4 border-2 border-black font-bold uppercase text-center bg-red-400 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                EXTRACTION FAILED
              </div>
            )}

            {extractedRules.length === 0 && docStatus !== "processing" ? (
              <div className="p-4 border-2 border-black border-dashed font-bold uppercase text-center">
                AWAITING DATA
              </div>
            ) : (
              (filterType === "ALL" ? extractedRules : extractedRules.filter(r => (r.type?.toUpperCase() || "INFO") === filterType)).map((rule) => (
                <div key={rule.id} className="p-3 border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all cursor-default">
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b-2 border-black">
                    <span className="font-black bg-black text-white px-2 py-1 text-xs uppercase">
                      {rule.type || "INFO"}
                    </span>
                    <span className="text-xs font-bold uppercase border-2 border-black px-1">
                      ACC:{rule.confidence || 0}%
                    </span>
                    {rule.bbox && rule.page_dim && rule.page && rule.document_id && (
                      <button 
                        onClick={() => setActiveSource({
                          document_id: rule.document_id!,
                          page: rule.page!,
                          bbox: rule.bbox,
                          page_dim: rule.page_dim
                        })}
                        className="ml-auto p-1 bg-white border-2 border-black flex items-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
                        title="View Source in Document"
                      >
                        <Crosshair className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm font-medium">
                    {rule.canonical_rule}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col bg-gray-100 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px] min-w-0 ${activeSource ? 'border-r-4 border-black' : ''}`}>
        {/* Top Nav */}
        <header className="w-full p-4 flex justify-between items-center border-b-4 border-black bg-white shrink-0">
          <h1 className="font-bold uppercase tracking-tighter text-xl">AI Assistant</h1>
        </header>
        
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide flex flex-col gap-6">
          <div className="max-w-4xl mx-auto w-full flex flex-col gap-6 pt-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`flex flex-col gap-1 max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div className="text-xs font-black uppercase bg-black text-white px-2 py-1">
                    {msg.role === "assistant" ? "SYS" : "USR"}
                  </div>
                  <div className={`p-4 border-4 border-black text-sm font-medium ${
                    msg.role === "assistant" 
                      ? "bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]" 
                      : "bg-[#00ff00] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                  }`}>
                    {msg.content}
                  </div>
                  
                  {/* Source tracing icon */}
                  {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <button 
                        onClick={() => setActiveSource(msg.sources![0])}
                        className="p-2 bg-white border-2 border-black flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all uppercase text-xs font-bold"
                        title="View Source in Document"
                      >
                        <Crosshair className="h-4 w-4" /> View Source
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex flex-col gap-1 items-start">
                  <div className="text-xs font-black uppercase bg-black text-white px-2 py-1">SYS</div>
                  <div className="p-4 border-4 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="font-bold uppercase">COMPUTING...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Input Area */}
        <div className="w-full p-6 bg-white border-t-4 border-black shrink-0">
          <div className="max-w-4xl mx-auto flex flex-col gap-2">
            <form onSubmit={handleSubmit} className="flex gap-4">
              
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
                className="w-16 h-16 border-4 border-black bg-[#ff00ff] hover:bg-[#cc00cc] text-black flex items-center justify-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-50 shrink-0"
                title="Upload Document"
              >
                {isUploading ? <Loader2 className="h-8 w-8 animate-spin" /> : <Upload className="h-8 w-8" />}
              </button>

              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="ENTER QUERY..." 
                className="flex-1 min-w-0 border-4 border-black bg-white p-4 font-bold text-lg focus:outline-none focus:bg-gray-100 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"
                disabled={isLoading}
              />
              
              <button 
                type="submit" 
                disabled={isLoading || !input.trim()} 
                className="w-24 h-16 border-4 border-black bg-blue-500 text-white hover:bg-blue-600 flex items-center justify-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-50 disabled:bg-gray-400 shrink-0"
              >
                <Send className="h-8 w-8" />
              </button>
            </form>
            
          </div>
        </div>
      </div>

      {/* Right Sidebar: PDF Viewer */}
      {activeSource && (
        <div className="w-1/3 flex flex-col bg-white shrink-0 shadow-2xl relative z-30 border-l-4 border-black">
          <div className="p-4 border-b-4 border-black bg-black text-white font-black uppercase flex justify-between items-center">
            <span className="tracking-tighter">Document Viewer</span>
            <button 
              onClick={() => setActiveSource(null)}
              className="text-white hover:text-gray-300 font-bold border-2 border-white px-2 hover:bg-white hover:text-black transition-colors"
            >
              X
            </button>
          </div>
          <div className="flex-1 overflow-hidden relative">
            <PdfViewer source={activeSource} fileName={currentDocId && currentFileName ? `${currentDocId}_${currentFileName}` : null} />
          </div>
        </div>
      )}
    </div>
  );
}
