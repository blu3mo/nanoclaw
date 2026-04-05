"use client";

import { useState } from "react";

interface CreateShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: {
    label: string;
    permissions: string[];
    expiresAt: string | null;
  }) => void;
}

const PERMISSION_OPTIONS = [
  {
    id: "view",
    label: "View",
    description: "Can see the kanban board",
  },
  {
    id: "chat",
    label: "Chat",
    description: "Can send and receive messages",
  },
  {
    id: "edit",
    label: "Edit",
    description: "Can modify tasks and content",
  },
];

export default function CreateShareDialog({
  isOpen,
  onClose,
  onCreate,
}: CreateShareDialogProps) {
  const [label, setLabel] = useState("");
  const [permissions, setPermissions] = useState<string[]>(["view"]);
  const [hasExpiry, setHasExpiry] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");

  const togglePermission = (perm: string) => {
    setPermissions((prev) =>
      prev.includes(perm)
        ? prev.filter((p) => p !== perm)
        : [...prev, perm]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || permissions.length === 0) return;
    onCreate({
      label: label.trim(),
      permissions,
      expiresAt: hasExpiry && expiresAt ? expiresAt : null,
    });
    setLabel("");
    setPermissions(["view"]);
    setHasExpiry(false);
    setExpiresAt("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-stone-900/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-900">
            Create Share Link
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 transition-colors duration-200 hover:bg-stone-100 hover:text-stone-600"
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
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Label */}
          <div>
            <label className="block text-xs font-semibold text-stone-600">
              Label
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Team standup board"
              className="mt-1.5 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all duration-200"
              required
            />
          </div>

          {/* Permissions */}
          <div>
            <label className="block text-xs font-semibold text-stone-600">
              Permissions
            </label>
            <div className="mt-2 space-y-2">
              {PERMISSION_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all duration-200 ${
                    permissions.includes(opt.id)
                      ? "border-indigo-200 bg-indigo-50"
                      : "border-stone-200 hover:border-stone-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={permissions.includes(opt.id)}
                    onChange={() => togglePermission(opt.id)}
                    className="h-4 w-4 rounded border-stone-300 text-indigo-500 focus:ring-indigo-200"
                  />
                  <div>
                    <span className="text-sm font-medium text-stone-800">
                      {opt.label}
                    </span>
                    <p className="text-[10px] text-stone-500">
                      {opt.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Expiry */}
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={hasExpiry}
                onChange={(e) => setHasExpiry(e.target.checked)}
                className="h-4 w-4 rounded border-stone-300 text-indigo-500 focus:ring-indigo-200"
              />
              <span className="text-xs font-semibold text-stone-600">
                Set expiration date
              </span>
            </label>
            {hasExpiry && (
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="mt-2 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-800 focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all duration-200"
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-stone-600 transition-colors duration-200 hover:bg-stone-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!label.trim() || permissions.length === 0}
              className="rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-indigo-600 disabled:opacity-40"
            >
              Create Link
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
