"use client";

interface ShareLayoutProps {
  sharedBy: string;
  children: React.ReactNode;
}

export default function ShareLayout({ sharedBy, children }: ShareLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[#fafaf9]">
      {/* Simplified top bar */}
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 text-sm font-bold text-white">
              B
            </div>
            <span className="text-lg font-semibold tracking-tight text-stone-900">
              Blueclaw
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-stone-500">
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
                d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z"
              />
            </svg>
            <span>
              Shared by <span className="font-medium text-stone-700">{sharedBy}</span>
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
