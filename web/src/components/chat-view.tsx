"use client";

import { useRef, useEffect } from "react";
import type { Message } from "@/lib/types";
import ChatMessage from "./chat-message";
import ChatInput from "./chat-input";

interface ChatViewProps {
  messages: Message[];
  onSend: (message: string) => void;
  isTyping?: boolean;
}

export default function ChatView({
  messages,
  onSend,
  isTyping = false,
}: ChatViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mx-auto max-w-3xl space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 text-sm font-bold text-white">
                  B
                </div>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-stone-900">
                Start a conversation
              </h3>
              <p className="mt-1 text-sm text-stone-500">
                Send a message to get started with Blueclaw.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="max-w-[75%]">
                <div className="mb-1 flex items-center gap-1.5">
                  <div className="flex h-4 w-4 items-center justify-center rounded-md bg-indigo-500 text-[8px] font-bold text-white">
                    B
                  </div>
                  <p className="text-[10px] font-medium text-stone-400">
                    Blueclaw
                  </p>
                </div>
                <div className="rounded-2xl rounded-bl-md border border-stone-200 bg-white px-4 py-3">
                  <div className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-stone-400 [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-stone-400 [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-stone-400 [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input area */}
      <ChatInput onSend={onSend} />
    </div>
  );
}
