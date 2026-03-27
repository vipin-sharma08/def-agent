"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/ui/Sidebar";
import { MobileHeader } from "@/components/ui/MobileHeader";
import { ValkyrieMark } from "@/components/ui/ValkyrieMark";

// ─── Landing top bar ──────────────────────────────────────────────

const LandingHeader = () => (
  <header
    className="fixed top-0 left-0 right-0 z-40 border-b border-subtle"
    style={{
      height: 56,
      background: "var(--valk-glass-bg)",
      backdropFilter: "blur(var(--valk-glass-blur))",
      WebkitBackdropFilter: "blur(var(--valk-glass-blur))",
    }}
  >
    <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-center px-4 xl:px-6">
      <Link href="/" className="flex items-center gap-3">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-[var(--valk-radius-md)] border border-accent bg-accent-muted"
          aria-hidden
        >
          <ValkyrieMark className="h-4 w-4" />
        </span>
        <span className="text-[13px] font-semibold uppercase tracking-[0.15em] text-primary">
          Valkyrie
        </span>
        <span className="ml-0.5 rounded-[var(--valk-radius-sm)] border border-accent/30 bg-accent-muted px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-accent">
          DCF
        </span>
      </Link>
    </div>
  </header>
);

// ─── Shell ───────────────────────────────────────────────────────

export const AppShell = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const isLandingPage = pathname === "/";

  // ── Landing page layout ─────────────────────────────────────────
  if (isLandingPage) {
    return (
      <div className="min-h-screen bg-app">
        <LandingHeader />
        {/* offset fixed header (56px) */}
        <main style={{ paddingTop: 56 }}>{children}</main>
      </div>
    );
  }

  // ── Inner page layout ───────────────────────────────────────────
  // Desktop:  fixed sidebar (w-64 = 256px) + content shifted right
  // Mobile:   fixed MobileHeader (h-14 = 56px) + full-width content
  return (
    <div className="min-h-screen bg-app">
      {/* Mobile top bar — md:hidden inside MobileHeader */}
      <MobileHeader />

      {/* Desktop sidebar — hidden below md inside Sidebar */}
      <Sidebar />

      {/* Content area */}
      <div className="min-h-screen pt-14 md:pt-0 md:pl-64">
        <main className="px-4 py-6 xl:px-6 xl:py-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
};
