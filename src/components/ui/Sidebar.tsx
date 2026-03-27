"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Upload,
  TableProperties,
  SlidersHorizontal,
  BarChart3,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Step definitions ─────────────────────────────────────────────

const STEPS = [
  {
    number: 1,
    label: "Upload",
    description: "Annual Report PDF",
    href: "/",
    icon: Upload,
  },
  {
    number: 2,
    label: "Review",
    description: "Extracted financials",
    href: "/review",
    icon: TableProperties,
  },
  {
    number: 3,
    label: "Assumptions",
    description: "Valuation inputs",
    href: "/assumptions",
    icon: SlidersHorizontal,
  },
  {
    number: 4,
    label: "Report",
    description: "DCF valuation",
    href: "/report",
    icon: BarChart3,
  },
] as const;

const PATH_TO_STEP: Record<string, number> = {
  "/": 1,
  "/review": 2,
  "/assumptions": 3,
  "/report": 4,
};

type StepStatus = "active" | "complete" | "upcoming";

const getStepStatus = (stepNumber: number, activeStep: number): StepStatus => {
  if (stepNumber === activeStep) return "active";
  if (stepNumber < activeStep) return "complete";
  return "upcoming";
};

// ─── Logo mark ────────────────────────────────────────────────────

const LogoMark = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 22 22"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    <rect
      x="11"
      y="1.5"
      width="13"
      height="13"
      rx="1.5"
      transform="rotate(45 11 11)"
      stroke="var(--valk-accent)"
      strokeWidth="1.5"
      fill="none"
    />
    <rect
      x="11"
      y="6"
      width="7"
      height="7"
      rx="0.5"
      transform="rotate(45 11 11)"
      fill="var(--valk-accent-muted)"
      stroke="var(--valk-accent)"
      strokeWidth="1"
    />
  </svg>
);

// ─── Animation variants ───────────────────────────────────────────

const itemVariants = {
  hidden: { opacity: 0, x: -6 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
  },
};

// ─── Sidebar ──────────────────────────────────────────────────────

export const Sidebar = () => {
  const pathname = usePathname();
  const activeStep = PATH_TO_STEP[pathname] ?? 1;

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-subtle bg-surface md:flex"
    >
      {/* Background layers */}
      <div className="absolute inset-0 bg-dot-grid opacity-40 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] via-transparent to-black/20 pointer-events-none" />

      {/* ── Wordmark ───────────────────────────────────────────── */}
      <div className="relative border-b border-subtle px-6 pb-5 pt-7">
        <Link href="/" className="group flex w-fit items-center gap-3">
          <LogoMark />
          <div>
            <span className="block text-[13px] font-semibold uppercase tracking-[0.15em] text-primary transition-colors duration-150 group-hover:text-accent">
              Valkyrie
            </span>
            <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-[0.22em] text-muted">
              DCF Agent
            </span>
          </div>
        </Link>
      </div>

      {/* ── Step nav ───────────────────────────────────────────── */}
      <nav className="relative flex-1 overflow-y-auto px-4 py-6">
        <p className="mb-3 px-3 font-mono text-[9px] uppercase tracking-[0.25em] text-muted select-none">
          Workflow
        </p>

        <motion.ol
          className="space-y-0.5"
          initial="hidden"
          animate="show"
          variants={{
            show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
          }}
        >
          {STEPS.map((step, index) => {
            const status = getStepStatus(step.number, activeStep);
            const isLast = index === STEPS.length - 1;
            const canNav = status !== "upcoming";
            const Icon = step.icon;

            return (
              <motion.li
                key={step.number}
                className="relative"
                variants={itemVariants}
              >
                {/* Connector line between steps */}
                {!isLast && (
                  <div className="absolute left-[calc(0.75rem+11px)] top-[2.7rem] z-0 h-[1.1rem] w-px overflow-hidden">
                    <motion.div
                      className="h-full w-full"
                      animate={{
                        backgroundColor:
                          status === "complete"
                            ? "rgba(8,153,129,0.3)"
                            : "var(--valk-border-subtle)",
                      }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                )}

                <Link
                  href={canNav ? step.href : "#"}
                  className={cn(
                    "group relative flex min-h-10 items-center gap-3 rounded-[var(--valk-radius-md)] px-3 py-2.5 outline-none transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-accent",
                    !canNav && "pointer-events-none cursor-default"
                  )}
                  aria-current={status === "active" ? "step" : undefined}
                  tabIndex={canNav ? 0 : -1}
                >
                  {/* Active highlight — slides with layoutId */}
                  {status === "active" && (
                    <motion.div
                      layoutId="active-step-bg"
                      className="absolute inset-0 rounded-[var(--valk-radius-md)]"
                      style={{
                        background: "var(--valk-accent-muted)",
                        border: "1px solid rgba(10,132,255,0.22)",
                      }}
                      transition={{ type: "spring", bounce: 0.12, duration: 0.45 }}
                    />
                  )}

                  {/* Completed step hover */}
                  {status === "complete" && (
                    <div className="absolute inset-0 rounded-[var(--valk-radius-md)] border border-subtle bg-white/[0.02] opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
                  )}

                  {/* Step badge */}
                  <div
                    className={cn(
                      "step-badge relative z-10",
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
                  <div className="relative z-10 min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-[13px] font-semibold leading-tight transition-colors duration-150",
                        status === "active"
                          ? "text-accent"
                          : status === "complete"
                          ? "text-secondary group-hover:text-primary"
                          : "text-disabled"
                      )}
                    >
                      {step.label}
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 font-mono text-[10px] leading-tight transition-colors duration-150",
                        status === "active" ? "text-accent/50" : "text-muted"
                      )}
                    >
                      {step.description}
                    </p>
                  </div>

                  {/* Icon */}
                  <Icon
                    size={12}
                    className={cn(
                      "relative z-10 flex-shrink-0 transition-colors duration-150",
                      status === "active"
                        ? "text-accent/60"
                        : status === "complete"
                        ? "text-muted group-hover:text-secondary"
                        : "text-disabled"
                    )}
                  />
                </Link>
              </motion.li>
            );
          })}
        </motion.ol>
      </nav>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div className="relative border-t border-subtle px-6 py-4">
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
    </aside>
  );
};
