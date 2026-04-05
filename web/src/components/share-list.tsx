"use client";

import { useState } from "react";
import type { ShareToken } from "@/lib/types";

interface ShareListProps {
  shares: ShareToken[];
  onDeactivate: (token: string) => void;
}

export default function ShareList({ shares, onDeactivate }: ShareListProps) {
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const copyUrl = (token: string) => {
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const parsePermissions = (perms: string): string[] => {
    try {
      return JSON.parse(perms);
    } catch {
      return perms.split(",").map((p) => p.trim());
    }
  };

  const isExpired = (share: ShareToken) => {
    if (!share.expires_at) return false;
    return new Date(share.expires_at) < new Date();
  };

  if (shares.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-stone-300 bg-white py-12 text-center">
        <svg
          className="mx-auto h-8 w-8 text-stone-300"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"
          />
        </svg>
        <p className="mt-3 text-sm font-medium text-stone-500">
          No share links yet
        </p>
        <p className="mt-1 text-xs text-stone-400">
          Create one to share your dashboard with others.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {shares.map((share) => {
        const expired = isExpired(share);
        const inactive = share.active === 0;
        const status = inactive
          ? "deactivated"
          : expired
          ? "expired"
          : "active";

        return (
          <div
            key={share.token}
            className={`rounded-xl border bg-white p-4 transition-all duration-200 ${
              status === "active"
                ? "border-stone-200"
                : "border-stone-100 opacity-60"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="truncate text-sm font-semibold text-stone-900">
                    {share.label}
                  </h4>
                  <span
                    className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      status === "active"
                        ? "bg-emerald-50 text-emerald-600"
                        : status === "expired"
                        ? "bg-amber-50 text-amber-600"
                        : "bg-stone-100 text-stone-500"
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {parsePermissions(share.permissions).map((perm) => (
                    <span
                      key={perm}
                      className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-600"
                    >
                      {perm}
                    </span>
                  ))}
                </div>

                <div className="mt-2 flex items-center gap-3 text-[10px] text-stone-400">
                  <span>Created {formatDate(share.created_at)}</span>
                  {share.expires_at && (
                    <span>
                      {expired ? "Expired" : "Expires"}{" "}
                      {formatDate(share.expires_at)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-shrink-0 items-center gap-2">
                <button
                  onClick={() => copyUrl(share.token)}
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-stone-200 px-3 text-xs font-medium text-stone-600 transition-all duration-200 hover:border-stone-300 hover:bg-stone-50"
                >
                  {copiedToken === share.token ? (
                    <>
                      <svg
                        className="h-3.5 w-3.5 text-emerald-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m4.5 12.75 6 6 9-13.5"
                        />
                      </svg>
                      Copied
                    </>
                  ) : (
                    <>
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75"
                        />
                      </svg>
                      Copy URL
                    </>
                  )}
                </button>

                {status === "active" && (
                  <button
                    onClick={() => onDeactivate(share.token)}
                    className="flex h-8 items-center rounded-lg border border-red-200 px-3 text-xs font-medium text-red-500 transition-all duration-200 hover:bg-red-50"
                  >
                    Deactivate
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
