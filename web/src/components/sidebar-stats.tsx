"use client";

import { useState } from "react";
import type { ScheduledTask } from "@/lib/types";

interface SidebarStatsProps {
  scheduledTasks: ScheduledTask[];
  lastCheckin: string | null;
  energyLevel: string | null;
  recentFiles: string[];
}

function describeCron(value: string): string {
  const parts = value.split(" ");
  if (parts.length !== 5) return value;
  const [min, hour, , , dow] = parts;

  const dowNames: Record<string, string> = {
    "0": "Sun", "1": "Mon", "2": "Tue", "3": "Wed",
    "4": "Thu", "5": "Fri", "6": "Sat", "7": "Sun",
  };

  let timeStr = "";
  if (hour !== "*" && min !== "*") {
    const h = parseInt(hour);
    const m = parseInt(min);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    timeStr = `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
  }

  if (dow === "*") {
    return timeStr ? `Daily at ${timeStr}` : "Daily";
  }

  const days = dow.split(",").map((d) => dowNames[d] || d).join(", ");
  return timeStr ? `${days} at ${timeStr}` : days;
}

function describeInterval(ms: string): string {
  const val = parseInt(ms);
  if (isNaN(val)) return ms;
  if (val < 60000) return `Every ${Math.round(val / 1000)}s`;
  if (val < 3600000) return `Every ${Math.round(val / 60000)} min`;
  if (val < 86400000) return `Every ${Math.round(val / 3600000)} hr`;
  return `Every ${Math.round(val / 86400000)} day`;
}

function describeSchedule(task: ScheduledTask): string {
  if (task.schedule_type === "cron") return describeCron(task.schedule_value);
  if (task.schedule_type === "interval") return describeInterval(task.schedule_value);
  if (task.schedule_type === "once") {
    try {
      return new Date(task.schedule_value).toLocaleString("en-US", {
        month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
      });
    } catch { return task.schedule_value; }
  }
  return `${task.schedule_type}: ${task.schedule_value}`;
}

function formatNextRun(next_run: string): string {
  const d = new Date(next_run);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();

  if (diffMs < 0) return "overdue";
  if (diffMs < 60000) return "in <1 min";
  if (diffMs < 3600000) return `in ${Math.round(diffMs / 60000)} min`;
  if (diffMs < 86400000) {
    const hrs = Math.floor(diffMs / 3600000);
    return `in ${hrs} hr`;
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function SidebarStats({
  scheduledTasks,
  lastCheckin,
  energyLevel,
  recentFiles,
}: SidebarStatsProps) {
  const activeTasks = scheduledTasks.filter((t) => t.status === "active");
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      {/* Quick Stats */}
      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400">
          Quick Stats
        </h3>
        <div className="mt-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-stone-600">Scheduled Tasks</span>
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-600">
              {activeTasks.length}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-stone-600">Last Check-in</span>
            <span className="text-xs font-medium text-stone-500">
              {lastCheckin ?? "Never"}
            </span>
          </div>

          {energyLevel && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-stone-600">Energy</span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  energyLevel === "high"
                    ? "bg-emerald-50 text-emerald-600"
                    : energyLevel === "medium"
                    ? "bg-amber-50 text-amber-600"
                    : "bg-stone-100 text-stone-500"
                }`}
              >
                {energyLevel.charAt(0).toUpperCase() + energyLevel.slice(1)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Tasks */}
      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400">
          Upcoming Tasks
        </h3>
        <div className="mt-3 space-y-1">
          {activeTasks.length === 0 ? (
            <p className="text-xs text-stone-400">No scheduled tasks</p>
          ) : (
            activeTasks.slice(0, 8).map((task) => {
              const isExpanded = expandedTask === task.id;
              return (
                <button
                  key={task.id}
                  onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                  className="w-full rounded-lg p-2 text-left transition-colors duration-200 hover:bg-stone-50"
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-400" />
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-medium text-stone-700 ${isExpanded ? "" : "truncate"}`}>
                        {task.prompt}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="text-[10px] text-stone-400">
                          {describeSchedule(task)}
                        </span>
                        {task.next_run && (
                          <span className="text-[10px] text-indigo-400">
                            {formatNextRun(task.next_run)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Recent Files */}
      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400">
          Recent Daily Files
        </h3>
        <div className="mt-3 space-y-1">
          {recentFiles.length === 0 ? (
            <p className="text-xs text-stone-400">No recent files</p>
          ) : (
            recentFiles.map((file) => (
              <div
                key={file}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors duration-200 hover:bg-stone-50"
              >
                <svg
                  className="h-3.5 w-3.5 flex-shrink-0 text-stone-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                  />
                </svg>
                <span className="truncate text-xs text-stone-600">{file}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
