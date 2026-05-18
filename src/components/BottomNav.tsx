"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-zinc-800 bg-zinc-950">
      <Link
        href="/program"
        className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
          pathname === "/program"
            ? "text-rose-400"
            : "text-zinc-500 hover:text-zinc-300"
        }`}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h7.5M8.25 12h7.5m-7.5 5.25h5.25M3.75 3.75h16.5v16.5H3.75z" />
        </svg>
        Programm
      </Link>
      <Link
        href="/plan-b"
        className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
          pathname === "/plan-b"
            ? "text-rose-400"
            : "text-zinc-500 hover:text-zinc-300"
        }`}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
        </svg>
        Plan B
      </Link>
    </nav>
  );
}
