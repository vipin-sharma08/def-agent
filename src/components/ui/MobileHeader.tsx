"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  Upload,
  TableProperties,
  SlidersHorizontal,
  BarChart3,
  Check,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// ─── Config ──────────────────────────────────────────────────────

const STEPS = [
  { number: 1, label: "Upload",      description: "Annual Report PDF",    href: "/",           icon: Upload },
  { number: 2, label: "Review",      description: "Extracted financials", href: "/review",      icon: TableProperties },
  { number: 3, label: "Assumptions", description: "Valuation inputs",     href: "/assumptions", icon: SlidersHorizontal },
  { number: 4, label: "Report",      description: "DCF valuation",        href: "/report",      icon: BarChart3 },
] as const;

const PATH_TO_STEP: Record<string, number> = {
  "/": 1, "/review": 2, "/assumptions": 3, "/report": 4,
};

// ─── Logo ─────────────────────────────────────────────────────────

const LogoMark = () => (
  <svg width="18" height="18" viewBox="0 0 22 22" fill="none" aria-hidden>
    <rect x="11" y="1.5" width="13" height="13" rx="1.5" transform="rotate(45 11 11)" stroke="var(--valk-accent)" strokeWidth="1.5" fill="none" />
    <rect x="11" y="6" width="7" height="7" rx="0.5" transform="rotate(45 11 11)" fill="var(--valk-accent-muted)" stroke="var(--valk-accent)" strokeWidth="1" />
  </svg>
);

// ─── Mobile header ────────────────────────────────────────────────

export const MobileHeader = () => {
  const pathname = usePathname();
  const activeStep = PATH_TO_STEP[pathname] ?? 1;
  const [open, setOpen] = useState(false);

  return (
    <header
      className="fixed left-0 right-0 top-0 z-50 flex h-14 items-center border-b border-subtle px-4 md:hidden"
      style={{
        background: "var(--valk-glass-bg)",
        backdropFilter: "blur(var(--valk-glass-blur))",
        WebkitBackdropFilter: "blur(var(--valk-glass-blur))",
      }}
    >
      {/* Logo */}
      <Link href="/" className="mr-auto flex items-center gap-2.5">
        <LogoMark />
        <div>
          <span className="block text-[12px] font-semibold uppercase tracking-[0.15em] text-primary">
            Valkyrie
          </span>
          <span className="block font-mono text-[8px] uppercase tracking-[0.22em] text-muted">
            DCF Agent
          </span>
        </div>
      </Link>

      {/* Step count */}
      <span className="mr-3 font-mono text-[10px] text-muted">
        Step {activeStep} / 4
      </span>

      {/* Hamburger */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            aria-label="Open navigation menu"
            className="rounded-[var(--valk-radius-sm)] p-2 text-muted transition-colors duration-150 hover:bg-surface-alt hover:text-primary"
          >
            <Menu size={18} />
          </button>
        </SheetTrigger>

        <SheetContent
          side="left"
          className="w-72 border-subtle p-0"
          style={{ background: "var(--valk-bg-surface)" }}
        >
          {/* Sheet header */}
          <div className="border-b border-subtle px-6 pb-5 pt-7">
            <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-3">
              <LogoMark />
              <div>
                <span className="block text-[13px] font-semibold uppercase tracking-[0.15em] text-primary">
                  Valkyrie
                </span>
                <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-[0.22em] text-muted">
                  DCF Agent
                </span>
              </div>
            </Link>
          </div>

          {/* Nav */}
          <nav className="px-4 py-6">
            <p className="mb-3 px-3 font-mono text-[9px] uppercase tracking-[0.25em] text-muted select-none">
              Workflow
            </p>
            <ol className="space-y-0.5">
              {STEPS.map((step) => {
                const status =
                  step.number === activeStep
                    ? "active"
                    : step.number < activeStep
                    ? "complete"
                    : "upcoming";
                const canNav = status !== "upcoming";
                const Icon = step.icon;

                return (
                  <li key={step.number}>
                    <Link
                      href={canNav ? step.href : "#"}
                      onClick={() => canNav && setOpen(false)}
                      className={cn(
                        "relative flex min-h-10 items-center gap-3 rounded-[var(--valk-radius-md)] px-3 py-2.5 transition-colors duration-150",
                        !canNav && "pointer-events-none",
                        status === "active" &&
                          "border border-accent/22 bg-accent-muted"
                      )}
                    >
                      {/* Badge */}
                      <div
                        className={cn(
                          "step-badge flex-shrink-0",
                          status === "active"
                            ? "step-badge--active"
                            : status === "complete"
                            ? "step-badge--complete"
                            : "step-badge--upcoming"
                        )}
                      >
                        {status === "complete" ? (
                          <Check size={9} strokeWidth={3} />
                        ) : (
                          <span>{step.number}</span>
                        )}
                      </div>

                      {/* Labels */}
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "text-[13px] font-semibold leading-tight",
                            status === "active"
                              ? "text-accent"
                              : status === "complete"
                              ? "text-secondary"
                              : "text-disabled"
                          )}
                        >
                          {step.label}
                        </p>
                        <p
                          className={cn(
                            "mt-0.5 font-mono text-[10px] leading-tight",
                            status === "active" ? "text-accent/50" : "text-muted"
                          )}
                        >
                          {step.description}
                        </p>
                      </div>

                      <Icon
                        size={12}
                        className={cn(
                          "flex-shrink-0",
                          status === "active" ? "text-accent/60" : "text-disabled"
                        )}
                      />
                    </Link>
                  </li>
                );
              })}
            </ol>
          </nav>

          {/* Footer */}
          <div className="absolute bottom-0 left-0 right-0 border-t border-subtle px-6 py-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-50" style={{ backgroundColor: "var(--valk-profit)" }} />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--valk-profit)" }} />
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted">
                v0.1.0 · Valkyrie
              </span>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
};
