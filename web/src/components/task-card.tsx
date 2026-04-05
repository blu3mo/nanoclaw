"use client";

import { useState } from "react";
import type { KanbanTask } from "@/lib/types";

interface TaskCardProps {
  task: KanbanTask;
}

export default function TaskCard({ task }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="group cursor-pointer rounded-xl border border-stone-200 bg-white p-4 transition-all duration-200 hover:border-stone-300 hover:shadow-sm"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-stone-900 leading-snug">
          {task.title}
        </h4>
        <svg
          className={`mt-0.5 h-4 w-4 flex-shrink-0 text-stone-400 transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m19.5 8.25-7.5 7.5-7.5-7.5"
          />
        </svg>
      </div>

      {task.nextAction && !expanded && (
        <p className="mt-1.5 text-xs text-stone-500 line-clamp-1">
          <span className="font-medium text-stone-600">Next:</span>{" "}
          {task.nextAction}
        </p>
      )}

      {task.flags && task.flags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {task.flags.map((flag) => (
            <span
              key={flag}
              className="inline-flex rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700"
            >
              {flag}
            </span>
          ))}
        </div>
      )}

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-stone-100 pt-3">
          {task.goalState && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                Goal State
              </p>
              <p className="mt-0.5 text-xs text-stone-600 leading-relaxed">
                {task.goalState}
              </p>
            </div>
          )}

          {task.currentState && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                Current State
              </p>
              <p className="mt-0.5 text-xs text-stone-600 leading-relaxed">
                {task.currentState}
              </p>
            </div>
          )}

          {task.nextAction && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                Next Action
              </p>
              <p className="mt-0.5 text-xs text-stone-600 leading-relaxed">
                {task.nextAction}
              </p>
            </div>
          )}

          {task.firstTenSeconds && (
            <div className="rounded-lg bg-indigo-50 p-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-500">
                First 10 Seconds
              </p>
              <p className="mt-0.5 text-xs font-medium text-indigo-700 leading-relaxed">
                {task.firstTenSeconds}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
