"use client";

import type { Message } from "@/lib/types";

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isOwner = message.is_from_me === 1;
  const isBot = message.is_bot_message === 1;

  const timestamp = new Date(message.timestamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  if (isOwner) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%]">
          <p className="mb-1 text-right text-[10px] font-medium text-stone-400">
            You
          </p>
          <div className="rounded-2xl rounded-br-md bg-indigo-500 px-4 py-2.5">
            <p className="text-sm leading-relaxed text-white whitespace-pre-wrap">
              {message.content}
            </p>
          </div>
          <p className="mt-1 text-right text-[10px] text-stone-400">
            {timestamp}
          </p>
        </div>
      </div>
    );
  }

  if (isBot) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[75%]">
          <div className="mb-1 flex items-center gap-1.5">
            <div className="flex h-4 w-4 items-center justify-center rounded-md bg-indigo-500 text-[8px] font-bold text-white">
              B
            </div>
            <p className="text-[10px] font-medium text-stone-400">Blueclaw</p>
          </div>
          <div className="rounded-2xl rounded-bl-md border border-stone-200 bg-white px-4 py-2.5">
            <p className="text-sm leading-relaxed text-stone-800 whitespace-pre-wrap">
              {message.content}
            </p>
          </div>
          <p className="mt-1 text-[10px] text-stone-400">{timestamp}</p>
        </div>
      </div>
    );
  }

  // External user message
  return (
    <div className="flex justify-start">
      <div className="max-w-[75%]">
        <div className="mb-1 flex items-center gap-1.5">
          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-stone-300 text-[8px] font-bold text-white">
            {message.sender_name.charAt(0).toUpperCase()}
          </div>
          <p className="text-[10px] font-medium text-stone-500">
            {message.sender_name}
          </p>
        </div>
        <div className="rounded-2xl rounded-bl-md bg-stone-100 px-4 py-2.5">
          <p className="text-sm leading-relaxed text-stone-800 whitespace-pre-wrap">
            {message.content}
          </p>
        </div>
        <p className="mt-1 text-[10px] text-stone-400">{timestamp}</p>
      </div>
    </div>
  );
}
