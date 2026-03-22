"use client";

// MobileHeader — shown on mobile only (md:hidden)
// Provides a top bar with hamburger + Sheet slide-in nav

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Upload, TableProperties, SlidersHorizontal, BarChart3, Check } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const STEPS = [
  { number: 1, label: "Upload",      description: "Annual Report PDF",    href: "/",           icon: Upload },
  { number: 2, label: "Review",      description: "Extracted financials", href: "/review",      icon: TableProperties },
  { number: 3, label: "Assumptions", description: "Valuation inputs",     href: "/assumptions", icon: SlidersHorizontal },
  { number: 4, label: "Report",      description: "DCF valuation",        href: "/report",      icon: BarChart3 },
] as const;

const PATH_TO_STEP: Record<string, number> = {
  "/": 1, "/review": 2, "/assumptions": 3, "/report": 4,
};

const LogoMark = () => (
  <svg width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden>
    <rect x="11" y="1.5" width="13" height="13" rx="1.5" transform="rotate(45 11 11)" stroke="#14B8A6" strokeWidth="1.5" fill="none" />
    <rect x="11" y="6" width="7" height="7" rx="0.5" transform="rotate(45 11 11)" fill="rgba(20,184,166,0.14)" stroke="#14B8A6" strokeWidth="1" />
  </svg>
);

export const MobileHeader = () => {
  const pathname = usePathname();
  const activeStep = PATH_TO_STEP[pathname] ?? 1;
  const [open, setOpen] = useState(false);

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-4 bg-base border-b border-border">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 mr-auto">
        <LogoMark />
        <div>
          <span className="block text-[12px] font-bold tracking-[0.15em] text-zinc-50 uppercase">Valkyrie</span>
          <span className="block text-[8px] font-mono text-zinc-700 tracking-[0.22em] uppercase">DCF Agent</span>
        </div>
      </Link>

      {/* Step indicator */}
      <span className="text-[10px] font-mono text-zinc-600 mr-3">
        Step {activeStep} / 4
      </span>

      {/* Hamburger */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            aria-label="Open navigation menu"
            className="p-2 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-surface transition-colors"
          >
            <Menu size={18} />
          </button>
        </SheetTrigger>

        <SheetContent side="left" className="w-72 p-0 bg-base border-border">
          {/* Header */}
          <div className="px-6 pt-7 pb-5 border-b border-border">
            <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-3">
              <LogoMark />
              <div>
                <span className="block text-[13px] font-bold tracking-[0.15em] text-zinc-50 uppercase">Valkyrie</span>
                <span className="block text-[9px] font-mono text-zinc-700 tracking-[0.22em] uppercase mt-0.5">DCF Agent</span>
              </div>
            </Link>
          </div>

          {/* Steps */}
          <nav className="px-4 py-6">
            <p className="mb-3 px-3 text-[9px] font-mono tracking-[0.25em] text-zinc-800 uppercase">Workflow</p>
            <ol className="space-y-0.5">
              {STEPS.map((step) => {
                const status = step.number === activeStep ? "active" : step.number < activeStep ? "complete" : "upcoming";
                const canNav = status !== "upcoming";
                const Icon = step.icon;

                return (
                  <li key={step.number}>
                    <Link
                      href={canNav ? step.href : "#"}
                      onClick={() => canNav && setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                        !canNav && "pointer-events-none",
                        status === "active" && "bg-teal-surface border border-teal-border"
                      )}
                    >
                      {/* Badge */}
                      <div className={cn(
                        "step-badge flex-shrink-0",
                        status === "active"   ? "step-badge--active"
                        : status === "complete" ? "step-badge--complete"
                        : "step-badge--upcoming"
                      )}>
                        {status === "complete" ? <Check size={9} strokeWidth={3} /> : <span>{step.number}</span>}
                      </div>

                      {/* Labels */}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-[13px] font-semibold leading-tight",
                          status === "active" ? "text-teal" : status === "complete" ? "text-zinc-300" : "text-zinc-700"
                        )}>
                          {step.label}
                        </p>
                        <p className={cn(
                          "text-[10px] font-mono mt-0.5",
                          status === "active" ? "text-teal/50" : "text-zinc-700"
                        )}>
                          {step.description}
                        </p>
                      </div>

                      <Icon size={12} className={cn(
                        "flex-shrink-0",
                        status === "active" ? "text-teal/70" : "text-zinc-800"
                      )} />
                    </Link>
                  </li>
                );
              })}
            </ol>
          </nav>

          {/* Footer */}
          <div className="absolute bottom-0 left-0 right-0 px-6 py-4 border-t border-border">
            <div className="flex items-center gap-2">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal opacity-50" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-teal" />
              </span>
              <span className="text-[9px] font-mono text-zinc-700 tracking-[0.2em] uppercase">v0.1.0 · Valkyrie</span>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
};
