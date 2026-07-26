"use client";

import { useEffect, useState, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Loader2, FileText, Crosshair, AlertTriangle } from "lucide-react";

type Source = {
  document_id: string;
  page: number;
  bbox?: number[];
  page_dim?: number[];
};

export default function PdfViewer({ source, fileName }: { source: Source; fileName: string | null }) {
  const [numPages, setNumPages] = useState<number>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(400);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && pdfjs?.GlobalWorkerOptions) {
      try {
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version || "3.11.174"}/build/pdf.worker.min.js`;
      } catch (e) {
        console.warn("PDF worker init deferred", e);
      }
    }
  }, []);

  useEffect(() => {
    if (source.page && numPages && containerRef.current) {
      const pageElement = document.getElementById(`pdf-page-${source.page}`);
      if (pageElement) {
        pageElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [source, numPages]);

  useEffect(() => {
    if (containerRef.current) {
      const observer = new ResizeObserver((entries) => {
        for (let entry of entries) {
          if (entry.contentRect.width > 0) {
            setContainerWidth(Math.max(280, entry.contentRect.width - 32));
          }
        }
      });
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }
  }, []);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages);
    setHasError(false);
  }

  const getHighlightStyle = () => {
    if (!source.bbox || !source.page_dim) return undefined;
    const [origW] = source.page_dim;
    const [bx, by, bw, bh] = source.bbox;
    const scale = containerWidth / (origW || 600);

    return {
      position: "absolute" as const,
      left: `${bx * scale}px`,
      top: `${by * scale}px`,
      width: `${bw * scale}px`,
      height: `${bh * scale}px`,
      backgroundColor: "rgba(37, 99, 235, 0.25)",
      border: "2px solid #2563EB",
      boxShadow: "0 0 12px rgba(37,99,235,0.4)",
      borderRadius: "4px",
      zIndex: 20,
    };
  };

  if (!source.document_id) {
    return (
      <div className="p-8 text-center font-mono text-xs text-zinc-500 flex flex-col items-center justify-center h-full">
        <Crosshair className="w-6 h-6 text-zinc-400 mb-2" />
        <span>SELECT SOURCE TO INSPECT BOUNDING BOX</span>
      </div>
    );
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const pdfUrl = fileName ? `${apiUrl}/uploads/${fileName}` : null;

  if (!pdfUrl) {
    return (
      <div className="p-6 text-center font-mono text-xs text-amber-700 bg-amber-50 m-4 rounded-xl border border-amber-200">
        <AlertTriangle className="w-5 h-5 mx-auto mb-2 text-amber-600" />
        <span>NO PDF URL HOSTED IN ACTIVE SESSION</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-zinc-100 relative font-mono text-xs overflow-hidden">
      <div className="p-3 border-b border-zinc-200 bg-white flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2 font-bold text-zinc-800">
          <FileText className="w-4 h-4 text-blue-600" />
          <span>PAGES: {numPages || "PDF Document"}</span>
        </div>
        {source.page && (
          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
            TARGET PAGE: {source.page}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-auto flex justify-center scrollbar-thin" ref={containerRef}>
        {!hasError ? (
          <div className="p-4 w-full flex justify-center">
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={() => setHasError(true)}
              loading={
                <div className="flex items-center gap-2 font-bold text-blue-600 my-10">
                  <Loader2 className="animate-spin h-5 w-5" />
                  <span>RENDERING DOCUMENT VECTORS...</span>
                </div>
              }
              error={
                <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center p-2">
                  <iframe
                    src={`${pdfUrl}#page=${source.page || 1}`}
                    className="w-full h-[500px] border-0 rounded-xl bg-white shadow-sm"
                    title="PDF Viewer Fallback"
                  />
                </div>
              }
            >
              <div className="flex flex-col gap-4 items-center">
                {Array.from(new Array(numPages || 0), (_, index) => index + 1).map((page) => (
                  <div key={page} id={`pdf-page-${page}`} className="relative shadow-md border border-zinc-300 bg-white rounded-lg overflow-hidden">
                    <Page
                      pageNumber={page}
                      width={containerWidth}
                      renderTextLayer={true}
                      renderAnnotationLayer={false}
                    />
                    {page === source.page && source.bbox && (
                      <div style={getHighlightStyle()} className="pointer-events-none" />
                    )}
                  </div>
                ))}
              </div>
            </Document>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-between p-2">
            <iframe
              src={`${pdfUrl}#page=${source.page || 1}`}
              className="w-full h-full border-0 rounded-xl bg-white shadow-sm"
              title="PDF Viewer Fallback"
            />
          </div>
        )}
      </div>
    </div>
  );
}
