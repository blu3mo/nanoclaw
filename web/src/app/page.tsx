"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Nav from "@/components/nav";
import SidebarStats from "@/components/sidebar-stats";
import MarkdownEditor from "@/components/markdown-editor";
import type { ScheduledTask } from "@/lib/types";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

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

export default function DashboardPage() {
  const [kanbanContent, setKanbanContent] = useState<string>("");
  const [userContent, setUserContent] = useState<string>("");
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([]);
  const [recentFiles, setRecentFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errandsContent, setErrandsContent] = useState<string>("");
  const [editingKanban, setEditingKanban] = useState(false);
  const [editingUser, setEditingUser] = useState(false);
  const [editingErrands, setEditingErrands] = useState(false);
  const [activeTab, setActiveTab] = useState<"kanban" | "errands" | "user" | "daily">("kanban");
  const [dailyFiles, setDailyFiles] = useState<{ name: string; content: string }[]>([]);
  const [selectedDaily, setSelectedDaily] = useState<string | null>(null);
  const [savingKanban, setSavingKanban] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [savingErrands, setSavingErrands] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [kanbanRes, errandsRes, userRes, tasksRes, filesRes] = await Promise.allSettled([
          fetch("/api/files?path=kanban.md"),
          fetch("/api/files?path=errands.md"),
          fetch("/api/files?path=USER.md"),
          fetch("/api/tasks"),
          fetch("/api/files/list?dir=daily"),
        ]);

        if (kanbanRes.status === "fulfilled" && kanbanRes.value.ok) {
          const data = await kanbanRes.value.json();
          setKanbanContent(data.content || "");
        }

        if (errandsRes.status === "fulfilled" && errandsRes.value.ok) {
          const data = await errandsRes.value.json();
          setErrandsContent(data.content || "");
        }

        if (userRes.status === "fulfilled" && userRes.value.ok) {
          const data = await userRes.value.json();
          setUserContent(data.content || "");
        }

        if (tasksRes.status === "fulfilled" && tasksRes.value.ok) {
          const data = await tasksRes.value.json();
          setScheduledTasks(data);
        }

        if (filesRes.status === "fulfilled" && filesRes.value.ok) {
          const data = await filesRes.value.json();
          setRecentFiles(Array.isArray(data) ? data.slice(0, 10) : []);
        }

        const allFailed =
          (kanbanRes.status === "rejected" || !kanbanRes.value.ok) &&
          (tasksRes.status === "rejected" || !tasksRes.value.ok);

        if (allFailed) {
          setError("Failed to load dashboard data. Are you signed in?");
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        setError("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const saveKanban = async (content: string) => {
    setSavingKanban(true);
    try {
      await fetch("/api/files", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: "kanban.md", content }),
      });
      setKanbanContent(content);
      setEditingKanban(false);
    } catch (err) {
      console.error("Save kanban error:", err);
    } finally {
      setSavingKanban(false);
    }
  };

  const saveErrands = async (content: string) => {
    setSavingErrands(true);
    try {
      await fetch("/api/files", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: "errands.md", content }),
      });
      setErrandsContent(content);
      setEditingErrands(false);
    } catch (err) {
      console.error("Save errands error:", err);
    } finally {
      setSavingErrands(false);
    }
  };

  const saveUser = async (content: string) => {
    setSavingUser(true);
    try {
      await fetch("/api/files", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: "USER.md", content }),
      });
      setUserContent(content);
      setEditingUser(false);
    } catch (err) {
      console.error("Save user error:", err);
    } finally {
      setSavingUser(false);
    }
  };

  const loadDailyFile = async (filename: string) => {
    setSelectedDaily(filename);
    const existing = dailyFiles.find((f) => f.name === filename);
    if (existing) return;

    try {
      const res = await fetch(`/api/files?path=daily/${filename}`);
      if (res.ok) {
        const data = await res.json();
        setDailyFiles((prev) => [...prev, { name: filename, content: data.content || "" }]);
      }
    } catch (err) {
      console.error("Load daily file error:", err);
    }
  };

  const tabs = [
    { id: "kanban" as const, label: "Kanban", emoji: "📋" },
    { id: "errands" as const, label: "Errands", emoji: "⚡" },
    { id: "user" as const, label: "Profile", emoji: "👤" },
    { id: "daily" as const, label: "Daily", emoji: "📅" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#fafaf9]">
      <Nav />

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-stone-500">{formatDate(new Date())}</p>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          ) : (
            <div className="flex gap-6">
              {/* Left: Main content */}
              <div className="min-w-0 flex-1">
                <div className="rounded-xl border border-stone-200 bg-white">
                  {/* Tabs */}
                  <div className="flex items-center border-b border-stone-100 px-5">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`relative flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium transition-colors duration-200 ${
                          activeTab === tab.id
                            ? "text-stone-900"
                            : "text-stone-400 hover:text-stone-600"
                        }`}
                      >
                        <span>{tab.emoji}</span>
                        {tab.label}
                        {activeTab === tab.id && (
                          <span className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-indigo-500" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Tab content */}
                  <div className="p-5">
                    {activeTab === "kanban" && (
                      <div>
                        <div className="mb-4 flex items-center justify-between">
                          <span className="text-[10px] font-medium uppercase tracking-wider text-stone-400">
                            kanban.md
                          </span>
                          <button
                            onClick={() => setEditingKanban(!editingKanban)}
                            className="rounded-lg px-3 py-1.5 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-50"
                          >
                            {editingKanban ? "Cancel" : "Edit"}
                          </button>
                        </div>
                        {editingKanban ? (
                          <MarkdownEditor
                            initialContent={kanbanContent}
                            onSave={saveKanban}
                            saving={savingKanban}
                          />
                        ) : kanbanContent ? (
                          <div className="prose prose-stone prose-sm max-w-none prose-headings:font-semibold prose-h2:border-b prose-h2:border-stone-100 prose-h2:pb-2 prose-h2:text-base prose-h3:text-sm prose-p:text-stone-600 prose-strong:text-stone-800 prose-li:text-stone-600 prose-li:marker:text-stone-400">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {kanbanContent}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className="py-10 text-center text-sm text-stone-400">
                            No kanban.md found yet.
                          </p>
                        )}
                      </div>
                    )}

                    {activeTab === "errands" && (
                      <div>
                        <div className="mb-4 flex items-center justify-between">
                          <span className="text-[10px] font-medium uppercase tracking-wider text-stone-400">
                            errands.md
                          </span>
                          <button
                            onClick={() => setEditingErrands(!editingErrands)}
                            className="rounded-lg px-3 py-1.5 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-50"
                          >
                            {editingErrands ? "Cancel" : "Edit"}
                          </button>
                        </div>
                        {editingErrands ? (
                          <MarkdownEditor
                            initialContent={errandsContent}
                            onSave={saveErrands}
                            saving={savingErrands}
                          />
                        ) : errandsContent ? (
                          <div className="prose prose-stone prose-sm max-w-none prose-headings:font-semibold prose-h2:border-b prose-h2:border-stone-100 prose-h2:pb-2 prose-h2:text-base prose-h3:text-sm prose-p:text-stone-600 prose-strong:text-stone-800 prose-li:text-stone-600 prose-li:marker:text-stone-400">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {errandsContent}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className="py-10 text-center text-sm text-stone-400">
                            No errands yet. Tell Blueclaw to add some!
                          </p>
                        )}
                      </div>
                    )}

                    {activeTab === "user" && (
                      <div>
                        <div className="mb-4 flex items-center justify-between">
                          <span className="text-[10px] font-medium uppercase tracking-wider text-stone-400">
                            USER.md
                          </span>
                          <button
                            onClick={() => setEditingUser(!editingUser)}
                            className="rounded-lg px-3 py-1.5 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-50"
                          >
                            {editingUser ? "Cancel" : "Edit"}
                          </button>
                        </div>
                        {editingUser ? (
                          <MarkdownEditor
                            initialContent={userContent}
                            onSave={saveUser}
                            saving={savingUser}
                          />
                        ) : userContent ? (
                          <div className="prose prose-stone prose-sm max-w-none prose-headings:font-semibold prose-h2:border-b prose-h2:border-stone-100 prose-h2:pb-2 prose-h2:text-base prose-h3:text-sm prose-p:text-stone-600 prose-strong:text-stone-800">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {userContent}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className="py-10 text-center text-sm text-stone-400">
                            No USER.md found yet.
                          </p>
                        )}
                      </div>
                    )}

                    {activeTab === "daily" && (
                      <div>
                        <span className="mb-4 block text-[10px] font-medium uppercase tracking-wider text-stone-400">
                          Daily Records
                        </span>
                        {recentFiles.length > 0 ? (
                          <div className="flex gap-4">
                            {/* File list */}
                            <div className="w-48 flex-shrink-0 space-y-1">
                              {recentFiles.map((file) => (
                                <button
                                  key={file}
                                  onClick={() => loadDailyFile(file)}
                                  className={`w-full rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors ${
                                    selectedDaily === file
                                      ? "bg-indigo-50 text-indigo-700"
                                      : "text-stone-500 hover:bg-stone-50 hover:text-stone-700"
                                  }`}
                                >
                                  📄 {file}
                                </button>
                              ))}
                            </div>
                            {/* File content */}
                            <div className="min-w-0 flex-1">
                              {selectedDaily ? (
                                <div className="prose prose-stone prose-sm max-w-none">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {dailyFiles.find((f) => f.name === selectedDaily)?.content ||
                                      "Loading..."}
                                  </ReactMarkdown>
                                </div>
                              ) : (
                                <p className="py-10 text-center text-sm text-stone-400">
                                  Select a file to view
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="py-10 text-center text-sm text-stone-400">
                            No daily records yet.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Sidebar */}
              <div className="hidden w-72 flex-shrink-0 lg:block">
                <SidebarStats
                  scheduledTasks={scheduledTasks}
                  lastCheckin={null}
                  energyLevel={null}
                  recentFiles={recentFiles}
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
