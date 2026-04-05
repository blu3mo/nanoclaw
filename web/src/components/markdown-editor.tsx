"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownEditorProps {
  initialContent: string;
  onSave: (content: string) => void;
  saving?: boolean;
  placeholder?: string;
}

export default function MarkdownEditor({
  initialContent,
  onSave,
  saving = false,
  placeholder = "Write markdown...",
}: MarkdownEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [mode, setMode] = useState<"write" | "preview">("write");

  const hasChanges = content !== initialContent;

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-stone-100 px-3 py-2">
        <div className="flex gap-0.5 rounded-lg bg-stone-100 p-0.5">
          <button
            onClick={() => setMode("write")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-all duration-200 ${
              mode === "write"
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            Write
          </button>
          <button
            onClick={() => setMode("preview")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-all duration-200 ${
              mode === "preview"
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            Preview
          </button>
        </div>

        <button
          onClick={() => onSave(content)}
          disabled={!hasChanges || saving}
          className="rounded-lg bg-indigo-500 px-4 py-1.5 text-xs font-medium text-white transition-all duration-200 hover:bg-indigo-600 disabled:opacity-40"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {/* Content */}
      {mode === "write" ? (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          className="min-h-[300px] w-full resize-y px-4 py-3 font-mono text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none"
          spellCheck={false}
        />
      ) : (
        <div className="min-h-[300px] px-4 py-3">
          {content ? (
            <div className="prose prose-stone prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-stone-400">Nothing to preview</p>
          )}
        </div>
      )}
    </div>
  );
}
