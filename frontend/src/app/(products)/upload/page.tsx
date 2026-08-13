"use client";

import { useState, useCallback } from "react";
import { UploadCloud, File, FileAudio, CheckCircle, AlertCircle, X, Shield, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type UploadStatus = "idle" | "uploading" | "success" | "error";

type FileWithStatus = {
  file: File;
  id: string;
  status: UploadStatus;
  progress: number;
  message?: string;
  isAudio?: boolean;
};

export default function UploadPage() {
  const [files, setFiles] = useState<FileWithStatus[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const addFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    
    const allowedTypes = [
      "application/pdf",
      "audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp3", "audio/ogg",
      "audio/m4a", "audio/x-m4a", "audio/aac", "audio/webm", "audio/flac"
    ];
    
    const fileArray = Array.from(newFiles).filter(f => {
      const ext = f.name.substring(f.name.lastIndexOf(".")).toLowerCase();
      const validExts = [".pdf", ".mp3", ".wav", ".m4a", ".ogg", ".flac", ".aac", ".webm", ".wma"];
      return allowedTypes.includes(f.type) || validExts.includes(ext);
    }).map(f => {
      const ext = f.name.substring(f.name.lastIndexOf(".")).toLowerCase();
      const isAudio = [".mp3", ".wav", ".m4a", ".ogg", ".flac", ".aac", ".webm", ".wma"].includes(ext) || f.type.startsWith("audio/");
      return {
        file: f,
        id: Math.random().toString(36).substring(7),
        status: "idle" as UploadStatus,
        progress: 0,
        isAudio
      };
    });
    
    setFiles(prev => [...prev, ...fileArray]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const uploadFiles = async () => {
    // Process files sequentially or in parallel
    for (let i = 0; i < files.length; i++) {
      if (files[i].status === "success") continue;
      
      setFiles(prev => prev.map(f => f.id === files[i].id ? { ...f, status: "uploading", progress: 30 } : f));
      
      const formData = new FormData();
      formData.append("files", files[i].file);
      
      try {
        const response = await fetch(`${API_URL}/api/v1/upload`, {
          method: "POST",
          body: formData,
        });
        
        if (response.ok) {
          setFiles(prev => prev.map(f => f.id === files[i].id ? { ...f, status: "success", progress: 100 } : f));
        } else {
          setFiles(prev => prev.map(f => f.id === files[i].id ? { ...f, status: "error", message: "Upload failed" } : f));
        }
      } catch (error) {
        setFiles(prev => prev.map(f => f.id === files[i].id ? { ...f, status: "error", message: "Network error" } : f));
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 p-8 overflow-auto">
      <div className="max-w-4xl w-full mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-100 mb-2">Ingest Documents & Audio</h1>
          <p className="text-zinc-400">Upload PDF documents or Audio files (.mp3, .wav, .m4a) for automatic STT transcription, chunking & RAG vector indexing.</p>
        </div>
        
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-100">Upload Policy Files & Audio</CardTitle>
            <CardDescription className="text-zinc-400">Drag and drop your PDF policies or Audio files here.</CardDescription>
          </CardHeader>
          <CardContent>
            <div 
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer
                ${isDragging ? "border-indigo-500 bg-indigo-500/10" : "border-zinc-700 hover:border-zinc-500 bg-zinc-950"}
              `}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById("fileInput")?.click()}
            >
              <input 
                id="fileInput" 
                type="file" 
                multiple 
                accept=".pdf,.mp3,.wav,.m4a,.ogg,.flac,.aac,.webm,.wma,application/pdf,audio/*" 
                className="hidden" 
                onChange={(e) => addFiles(e.target.files)}
              />
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="flex items-center gap-3 p-4 rounded-full bg-zinc-900 border border-zinc-800">
                  <UploadCloud className="h-8 w-8 text-indigo-400" />
                  <Music className="h-8 w-8 text-amber-400" />
                </div>
                <div>
                  <p className="text-lg font-medium text-zinc-200">Click or drag PDF or Audio files here</p>
                  <p className="text-sm text-zinc-500 mt-1">Supports PDF, MP3, WAV, M4A, OGG, WEBM (Max size: 100MB)</p>
                </div>
              </div>
            </div>
            
            {files.length > 0 && (
              <div className="mt-8 space-y-4">
                <h3 className="font-medium text-zinc-200">Processing Queue</h3>
                <div className="space-y-3">
                  {files.map((file) => (
                    <div key={file.id} className="flex items-center gap-4 p-4 rounded-lg bg-zinc-950 border border-zinc-800">
                      {file.isAudio ? (
                        <FileAudio className="h-8 w-8 text-amber-500 shrink-0" />
                      ) : (
                        <File className="h-8 w-8 text-indigo-500 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-zinc-200 truncate">{file.file.name}</p>
                          {file.isAudio && (
                            <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Audio STT
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                          <Progress value={file.progress} className="h-1.5 flex-1 bg-zinc-800" />
                          <span className="text-xs text-zinc-400 w-12 text-right">{file.progress}%</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-end w-24">
                        {file.status === "idle" && (
                          <Button variant="ghost" size="icon" onClick={() => removeFile(file.id)} className="text-zinc-500 hover:text-red-400">
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                        {file.status === "uploading" && <span className="text-xs text-indigo-400 animate-pulse">Uploading...</span>}
                        {file.status === "success" && <CheckCircle className="h-5 w-5 text-emerald-500" />}
                        {file.status === "error" && <AlertCircle className="h-5 w-5 text-red-500" />}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-end pt-4 border-t border-zinc-800">
                  <Button onClick={uploadFiles} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/20">
                    <Shield className="h-4 w-4 mr-2" />
                    Process Documents
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Pipeline stage visualizer can be added here if needed */}
      </div>
    </div>
  );
}
