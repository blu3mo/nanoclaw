"use client";

import { useState, useEffect } from "react";
import Nav from "@/components/nav";
import ShareList from "@/components/share-list";
import CreateShareDialog from "@/components/create-share-dialog";
import type { ShareToken, Group } from "@/lib/types";

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

export default function SharesPage() {
  const [shares, setShares] = useState<ShareToken[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch shares and groups on mount
  useEffect(() => {
    async function fetchData() {
      try {
        const [sharesRes, groupsRes] = await Promise.allSettled([
          fetch("/api/shares"),
          fetch("/api/groups"),
        ]);

        if (sharesRes.status === "fulfilled" && sharesRes.value.ok) {
          const data: ShareToken[] = await sharesRes.value.json();
          setShares(data);
        } else if (
          sharesRes.status === "fulfilled" &&
          (sharesRes.value.status === 401 || sharesRes.value.status === 403)
        ) {
          setError("Unauthorized. Please sign in.");
        } else {
          setError("Failed to load shares.");
        }

        if (groupsRes.status === "fulfilled" && groupsRes.value.ok) {
          const data: Group[] = await groupsRes.value.json();
          setGroups(data);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
        setError("Failed to load shares.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleCreate = async (data: {
    label: string;
    permissions: string[];
    expiresAt: string | null;
    groupFolder: string;
  }) => {
    try {
      const res = await fetch("/api/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: data.label,
          permissions: data.permissions.join(","),
          groupFolder: data.groupFolder,
          expiresAt: data.expiresAt
            ? new Date(data.expiresAt).toISOString()
            : null,
        }),
      });

      if (res.ok) {
        const newShare: ShareToken = await res.json();
        setShares((prev) => [newShare, ...prev]);
      } else {
        console.error("Failed to create share:", await res.text());
      }
    } catch (err) {
      console.error("Failed to create share:", err);
    }
  };

  const handleDeactivate = async (token: string) => {
    try {
      const res = await fetch(`/api/shares?token=${encodeURIComponent(token)}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setShares((prev) =>
          prev.map((s) => (s.token === token ? { ...s, active: 0 } : s))
        );
      } else {
        console.error("Failed to deactivate share:", await res.text());
      }
    } catch (err) {
      console.error("Failed to deactivate share:", err);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#fafaf9]">
      <Nav />

      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-6 py-6">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-stone-900">
                Shares
              </h1>
              <p className="mt-1 text-sm text-stone-500">
                Manage your shared dashboard links.
              </p>
            </div>
            <button
              onClick={() => setDialogOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-indigo-600"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              Create Share Link
            </button>
          </div>

          {/* Share list */}
          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          ) : (
            <ShareList shares={shares} onDeactivate={handleDeactivate} groups={groups} />
          )}
        </div>
      </main>

      {/* Create dialog */}
      <CreateShareDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreate={handleCreate}
        groups={groups}
      />
    </div>
  );
}
