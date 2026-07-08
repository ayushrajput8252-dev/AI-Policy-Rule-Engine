"use client";

import { useEffect, useState, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Loader2 } from "lucide-react";

// Set worker path
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type Source = {
  document_id: string;
  page: number;
  bbox?: number[];
  page_dim?: number[];
};

export default function PdfViewer({ source, fileName }: { source: Source, fileName: string | null }) {
  const [numPages, setNumPages] = useState<number>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(400);

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
          setContainerWidth(entry.contentRect.width - 32); // 16px padding on sides
        }
      });
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }
  }, []);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages);
  }

  // Calculate scaled highlight box
  const getHighlightStyle = () => {
    if (!source.bbox || !source.page_dim) return undefined;
    
    // Original dimensions
    const [origW, origH] = source.page_dim;
    // Bbox: [x, y, width, height]
    const [bx, by, bw, bh] = source.bbox;

    // The react-pdf page width will be determined by containerWidth
    // Wait, the Page component renders with `width={containerWidth}`
    // So the scale is containerWidth / origW
    
    // However, react-pdf preserves aspect ratio. Let's calculate based on rendered width.
    const scale = containerWidth / origW;

    return {
      position: "absolute" as const,
      left: `${bx * scale}px`,
      top: `${by * scale}px`,
      width: `${bw * scale}px`,
      height: `${bh * scale}px`,
      backgroundColor: "rgba(255, 255, 0, 0.4)",
      border: "2px solid #ff0000",
      zIndex: 10
    };
  };

  if (!source.document_id) return null;
  // If we don't have the original filename, we just use the document_id, assuming backend hosts it.
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const pdfUrl = fileName ? `${apiUrl}/uploads/${fileName}` : null;

  if (!pdfUrl) {
    return <div className="p-4 font-bold text-center">NO PDF UPLOADED IN THIS SESSION</div>;
  }

  return (
    <div className="flex flex-col h-full w-full bg-gray-200 relative">
      <div className="p-2 border-b-2 border-black bg-white flex justify-between items-center shrink-0">
        <div className="font-bold text-sm">PAGES: {numPages || "?"}</div>
      </div>
      
      <div className="flex-1 overflow-auto p-4 flex justify-center" ref={containerRef}>
        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={<div className="flex items-center gap-2 font-bold"><Loader2 className="animate-spin h-5 w-5" /> LOADING PDF...</div>}
          error={<div className="text-red-500 font-bold border-2 border-red-500 p-4 bg-white">ERROR LOADING PDF</div>}
        >
          <div className="flex flex-col gap-4 items-center">
            {Array.from(new Array(numPages || 0), (el, index) => index + 1).map((page) => (
              <div key={page} id={`pdf-page-${page}`} className="relative shadow-lg border-2 border-black bg-white">
                <Page 
                  pageNumber={page} 
                  width={containerWidth} 
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                />
                {page === source.page && source.bbox && (
                  <div style={getHighlightStyle()} className="pointer-events-none" />
                )}
              </div>
            ))}
          </div>
        </Document>
      </div>
    </div>
  );
}
