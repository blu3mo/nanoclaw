"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ShareLayout from "@/components/share-layout";
import ChatView from "@/components/chat-view";
import NamePrompt from "@/components/name-prompt";
import type { Message } from "@/lib/types";

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <svg
        className="h-6 w-6 animate-spin text-indigo-500"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer share:${token}` };
}

export default function SharePage() {
  const params = useParams();
  const token = params.token as string;

  const [activeTab, setActiveTab] = useState<"board" | "chat">("board");
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [kanbanContent, setKanbanContent] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasChat, setHasChat] = useState(false);
  const [hasView, setHasView] = useState(false);
  const latestTimestampRef = useRef<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("blueclaw_display_name");
    if (saved) setDisplayName(saved);
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      const timestamps = messages.map((m) => m.timestamp);
      const latest = timestamps.sort().pop();
      if (latest) latestTimestampRef.current = latest;
    }
  }, [messages]);

  useEffect(() => {
    async function fetchShareData() {
      try {
        const kanbanRes = await fetch("/api/files?path=kanban.md", {
          headers: authHeaders(token),
        });

        if (!kanbanRes.ok) {
          setError(
            kanbanRes.status === 401
              ? "This share link is invalid or has expired."
              : "Failed to load shared data."
          );
          setLoading(false);
          return;
        }

        setHasView(true);
        const kanbanData = await kanbanRes.json();
        setKanbanContent(kanbanData.content || "");

        const messagesRes = await fetch("/api/messages?limit=50", {
          headers: authHeaders(token),
        });

        if (messagesRes.ok) {
          setHasChat(true);
          const msgData: Message[] = await messagesRes.json();
          setMessages(msgData.reverse());
        }
      } catch (err) {
        console.error("Share page fetch error:", err);
        setError("Failed to load shared data.");
      } finally {
        setLoading(false);
      }
    }

    if (token) fetchShareData();
  }, [token]);

  const pollNewMessages = useCallback(async () => {
    if (!latestTimestampRef.current || !hasChat) return;
    try {
      const res = await fetch(
        `/api/messages?since=${encodeURIComponent(latestTimestampRef.current)}`,
        { headers: authHeaders(token) }
      );
      if (!res.ok) return;
      const newMessages: Message[] = await res.json();
      if (newMessages.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const fresh = newMessages.reverse().filter((m) => !existingIds.has(m.id));
          return fresh.length === 0 ? prev : [...prev, ...fresh];
        });
      }
    } catch {
      /* ignore poll errors */
    }
  }, [token, hasChat]);

  useEffect(() => {
    if (loading || !hasChat || activeTab !== "chat") return;
    pollIntervalRef.current = setInterval(pollNewMessages, 3000);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [loading, hasChat, activeTab, pollNewMessages]);

  const handleTabSwitch = (tab: "board" | "chat") => {
    if (tab === "chat" && !displayName) {
      setShowNamePrompt(true);
      return;
    }
    setActiveTab(tab);
  };

  const handleNameSubmit = (name: string) => {
    localStorage.setItem("blueclaw_display_name", name);
    setDisplayName(name);
    setShowNamePrompt(false);
    setActiveTab("chat");
  };

  const handleSend = async (content: string) => {
    if (!displayName) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      chat_jid: "shared",
      sender: "external",
      sender_name: displayName,
      content,
      timestamp: new Date().toISOString(),
      is_from_me: 0,
      is_bot_message: 0,
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body: JSON.stringify({ content, senderName: displayName, isFromMe: false }),
      });
      if (res.ok) {
        const saved: Message = await res.json();
        setMessages((prev) => prev.map((m) => (m.id === tempId ? saved : m)));
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  if (loading) return <ShareLayout sharedBy=""><LoadingSpinner /></ShareLayout>;

  if (error) {
    return (
      <ShareLayout sharedBy="">
        <div className="mx-auto max-w-5xl px-6 py-6">
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      </ShareLayout>
    );
  }

  return (
    <ShareLayout sharedBy="SA">
      <div className="mx-auto max-w-5xl px-6 py-6">
        {hasChat && (
          <div className="mb-6 flex w-fit gap-1 rounded-lg bg-stone-100 p-1">
            <button
              onClick={() => handleTabSwitch("board")}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-all duration-200 ${
                activeTab === "board" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"
              }`}
            >
              Board
            </button>
            <button
              onClick={() => handleTabSwitch("chat")}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-all duration-200 ${
                activeTab === "chat" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"
              }`}
            >
              Chat
            </button>
          </div>
        )}

        {activeTab === "board" && hasView && (
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-stone-700">Shared Board</h2>
              <p className="mt-0.5 text-[10px] text-stone-400">Read-only view</p>
            </div>
            {kanbanContent ? (
              <div className="prose prose-stone prose-sm max-w-none prose-headings:font-semibold prose-h2:border-b prose-h2:border-stone-100 prose-h2:pb-2 prose-h2:text-base prose-h3:text-sm prose-p:text-stone-600 prose-strong:text-stone-800">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{kanbanContent}</ReactMarkdown>
              </div>
            ) : (
              <p className="py-10 text-center text-sm text-stone-400">No board data available.</p>
            )}
          </div>
        )}

        {activeTab === "chat" && displayName && (
          <div className="flex h-[calc(100vh-180px)] flex-col overflow-hidden rounded-xl border border-stone-200 bg-white">
            <div className="border-b border-stone-100 px-4 py-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-stone-700">Chat</h2>
                <span className="text-[10px] text-stone-400">
                  Chatting as <span className="font-medium text-stone-600">{displayName}</span>
                </span>
              </div>
            </div>
            <ChatView messages={messages} onSend={handleSend} />
          </div>
        )}
      </div>
      <NamePrompt isOpen={showNamePrompt} onSubmit={handleNameSubmit} />
    </ShareLayout>
  );
}
