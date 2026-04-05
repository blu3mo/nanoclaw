"use client";

import { useState, useEffect } from "react";
import Nav from "@/components/nav";
import ShareList from "@/components/share-list";
import CreateShareDialog from "@/components/create-share-dialog";
import type { ShareToken } from "@/lib/types";

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch shares on mount
  useEffect(() => {
    async function fetchShares() {
      try {
        const res = await fetch("/api/shares");
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            setError("Unauthorized. Please sign in.");
          } else {
            setError("Failed to load shares.");
          }
          return;
        }
        const data: ShareToken[] = await res.json();
        setShares(data);
      } catch (err) {
        console.error("Failed to fetch shares:", err);
        setError("Failed to load shares.");
      } finally {
        setLoading(false);
      }
    }

    fetchShares();
  }, []);

  const handleCreate = async (data: {
    label: string;
    permissions: string[];
    expiresAt: string | null;
  }) => {
    try {
      const res = await fetch("/api/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: data.label,
          permissions: data.permissions.join(","),
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
            <ShareList shares={shares} onDeactivate={handleDeactivate} />
          )}
        </div>
      </main>

      {/* Create dialog */}
      <CreateShareDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}
