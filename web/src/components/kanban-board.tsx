"use client";

import { useState } from "react";
import type { KanbanSection } from "@/lib/types";
import TaskCard from "./task-card";

interface KanbanBoardProps {
  sections: KanbanSection[];
}

function SectionHeader({
  section,
  count,
  isCollapsed,
  onToggle,
}: {
  section: KanbanSection;
  count: number;
  isCollapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left transition-colors duration-200 hover:bg-stone-100"
    >
      <span className="text-base">{section.emoji}</span>
      <span className="text-sm font-semibold text-stone-700">
        {section.title}
      </span>
      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-500">
        {count}
      </span>
      <svg
        className={`ml-auto h-3.5 w-3.5 text-stone-400 transition-transform duration-200 ${
          isCollapsed ? "-rotate-90" : ""
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
    </button>
  );
}

export default function KanbanBoard({ sections }: KanbanBoardProps) {
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});

  const toggleSection = (title: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div key={section.title}>
          <SectionHeader
            section={section}
            count={section.tasks.length}
            isCollapsed={collapsedSections[section.title] ?? false}
            onToggle={() => toggleSection(section.title)}
          />

          {!(collapsedSections[section.title] ?? false) && (
            <div className="mt-2 space-y-2">
              {section.tasks.length === 0 ? (
                <p className="py-3 text-center text-xs text-stone-400">
                  No tasks
                </p>
              ) : (
                section.tasks.map((task, i) => (
                  <TaskCard key={`${section.title}-${i}`} task={task} />
                ))
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
