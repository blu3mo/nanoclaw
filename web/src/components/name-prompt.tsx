"use client";

import { useState } from "react";

interface NamePromptProps {
  isOpen: boolean;
  onSubmit: (name: string) => void;
}

export default function NamePrompt({ isOpen, onSubmit }: NamePromptProps) {
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-stone-900/20 backdrop-blur-sm" />

      {/* Dialog */}
      <div className="relative w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-8 shadow-lg text-center">
        <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-indigo-100">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 text-sm font-bold text-white">
            B
          </div>
        </div>

        <h2 className="mt-4 text-lg font-semibold text-stone-900">
          Welcome to the chat
        </h2>
        <p className="mt-1.5 text-sm text-stone-500">
          Enter your display name to start chatting.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            autoFocus
            className="w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-800 text-center placeholder:text-stone-400 focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all duration-200"
            required
          />

          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full rounded-lg bg-indigo-500 px-4 py-3 text-sm font-medium text-white transition-all duration-200 hover:bg-indigo-600 disabled:opacity-40"
          >
            Join Chat
          </button>
        </form>
      </div>
    </div>
  );
}
