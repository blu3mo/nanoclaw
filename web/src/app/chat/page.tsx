"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Nav from "@/components/nav";
import ChatView from "@/components/chat-view";
import type { Message, Group } from "@/lib/types";

function LoadingSpinner() {
  return (
    <div className="flex flex-1 items-center justify-center">
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

export default function ChatPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latestTimestampRef = useRef<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const selectedGroupRef = useRef<string>("");

  // Keep ref in sync for polling callback
  useEffect(() => {
    selectedGroupRef.current = selectedGroup;
  }, [selectedGroup]);

  // Build query string helper
  const gfParam = useCallback(
    (base: string) => {
      if (!selectedGroup) return base;
      const sep = base.includes("?") ? "&" : "?";
      return `${base}${sep}groupFolder=${encodeURIComponent(selectedGroup)}`;
    },
    [selectedGroup]
  );

  // Fetch groups on mount
  useEffect(() => {
    async function fetchGroups() {
      try {
        const res = await fetch("/api/groups");
        if (res.ok) {
          const data: Group[] = await res.json();
          setGroups(data);
          const main = data.find((g) => g.is_main === 1);
          setSelectedGroup(main?.folder || data[0]?.folder || "");
        }
      } catch {
        // Groups endpoint may not be available
      }
    }
    fetchGroups();
  }, []);

  // Track the latest message timestamp
  useEffect(() => {
    if (messages.length > 0) {
      const timestamps = messages.map((m) => m.timestamp);
      const latest = timestamps.sort().pop();
      if (latest) {
        latestTimestampRef.current = latest;
      }
    }
  }, [messages]);

  // Fetch initial messages when group changes
  useEffect(() => {
    if (!selectedGroup && groups.length > 0) return;

    async function fetchMessages() {
      setLoading(true);
      setError(null);
      setMessages([]);
      latestTimestampRef.current = null;

      try {
        const res = await fetch(gfParam("/api/messages?limit=50"));
        if (!res.ok) {
          if (res.status === 401) {
            setError("Unauthorized. Please sign in.");
          } else {
            setError("Failed to load messages.");
          }
          return;
        }
        const data: Message[] = await res.json();
        // API returns DESC order, reverse to chronological
        setMessages(data.reverse());
      } catch (err) {
        console.error("Failed to fetch messages:", err);
        setError("Failed to load messages.");
      } finally {
        setLoading(false);
      }
    }

    fetchMessages();
  }, [selectedGroup, gfParam, groups.length]);

  // Poll for new messages every 3 seconds
  const pollNewMessages = useCallback(async () => {
    if (!latestTimestampRef.current) return;
    const gf = selectedGroupRef.current;
    const baseUrl = `/api/messages?since=${encodeURIComponent(latestTimestampRef.current)}`;
    const url = gf ? `${baseUrl}&groupFolder=${encodeURIComponent(gf)}` : baseUrl;
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const newMessages: Message[] = await res.json();
      if (newMessages.length > 0) {
        // Deduplicate by id, reverse to chronological order
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const fresh = newMessages
            .reverse()
            .filter((m) => !existingIds.has(m.id));
          if (fresh.length === 0) return prev;
          return [...prev, ...fresh];
        });
      }
    } catch {
      // Silently ignore poll errors
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    pollIntervalRef.current = setInterval(pollNewMessages, 3000);
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [loading, pollNewMessages]);

  const handleSend = async (content: string) => {
    // Optimistically add message
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      chat_jid: "owner",
      sender: "owner",
      sender_name: "Owner",
      content,
      timestamp: new Date().toISOString(),
      is_from_me: 1,
      is_bot_message: 0,
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setIsTyping(true);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, groupFolder: selectedGroup || undefined }),
      });

      if (res.ok) {
        const saved: Message = await res.json();
        // Replace optimistic message with the real one
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? saved : m))
        );
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-[#fafaf9]">
      <Nav />
      {groups.length > 1 && (
        <div className="border-b border-stone-100 bg-white px-6 py-2">
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 shadow-sm transition-all duration-200 hover:border-stone-300 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            {groups.map((g) => (
              <option key={g.folder} value={g.folder}>
                {g.name}{g.is_main === 1 ? " (main)" : ""}
              </option>
            ))}
          </select>
        </div>
      )}
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      ) : (
        <ChatView messages={messages} onSend={handleSend} isTyping={isTyping} />
      )}
    </div>
  );
}
