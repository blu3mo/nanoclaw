"use client";

import type { ScheduledTask } from "@/lib/types";

interface SidebarStatsProps {
  scheduledTasks: ScheduledTask[];
  lastCheckin: string | null;
  energyLevel: string | null;
  recentFiles: string[];
}

export default function SidebarStats({
  scheduledTasks,
  lastCheckin,
  energyLevel,
  recentFiles,
}: SidebarStatsProps) {
  const activeTasks = scheduledTasks.filter((t) => t.status === "active");

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
        <div className="mt-3 space-y-2">
          {activeTasks.length === 0 ? (
            <p className="text-xs text-stone-400">No scheduled tasks</p>
          ) : (
            activeTasks.slice(0, 5).map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-2 rounded-lg p-2 transition-colors duration-200 hover:bg-stone-50"
              >
                <div className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-stone-700">
                    {task.prompt}
                  </p>
                  <p className="mt-0.5 text-[10px] text-stone-400">
                    {task.schedule_type}: {task.schedule_value}
                    {task.next_run && (
                      <span className="ml-1">
                        - Next:{" "}
                        {new Date(task.next_run).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))
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
