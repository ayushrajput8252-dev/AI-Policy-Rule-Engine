"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Shared markdown rendering for chat surfaces (AI Assistant widget, /rag
 *  workspace) — the LLM's raw answer text is real markdown (bold, lists,
 *  code, links, tables), so it needs a real renderer rather than being
 *  dropped into a plain <p>, which shows literal "**"/"#"/etc. syntax. */
export default function ChatMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="whitespace-pre-wrap mb-2 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-0.5 marker:text-zinc-400">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-0.5 marker:text-zinc-400">{children}</ol>,
        li: ({ children }) => <li>{children}</li>,
        a: ({ children, href }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 text-blue-600 hover:text-blue-700">
            {children}
          </a>
        ),
        code: ({ children, className }) => {
          const isBlock = /language-/.test(className || "");
          return isBlock ? (
            <code className={`block bg-zinc-900 text-zinc-100 rounded-lg p-2.5 my-2 overflow-x-auto text-[12px] font-mono ${className || ""}`}>
              {children}
            </code>
          ) : (
            <code className="px-1 py-0.5 rounded bg-zinc-100 text-zinc-800 text-[12px] font-mono">{children}</code>
          );
        },
        pre: ({ children }) => <pre className="my-2 overflow-x-auto">{children}</pre>,
        table: ({ children }) => (
          <div className="overflow-x-auto my-2">
            <table className="border-collapse text-[12px] w-full">{children}</table>
          </div>
        ),
        th: ({ children }) => <th className="border border-zinc-300 px-2 py-1 bg-zinc-50 text-left font-semibold">{children}</th>,
        td: ({ children }) => <td className="border border-zinc-200 px-2 py-1">{children}</td>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
