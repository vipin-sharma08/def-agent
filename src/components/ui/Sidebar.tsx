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

// ─── Step definitions ──────────────────────────────────────────────

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

// ─── Logo mark — geometric double-diamond ─────────────────────────

const LogoMark = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 22 22"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    {/* Outer diamond */}
    <rect
      x="11"
      y="1.5"
      width="13"
      height="13"
      rx="1.5"
      transform="rotate(45 11 11)"
      stroke="#14B8A6"
      strokeWidth="1.5"
      fill="none"
    />
    {/* Inner diamond — filled */}
    <rect
      x="11"
      y="6"
      width="7"
      height="7"
      rx="0.5"
      transform="rotate(45 11 11)"
      fill="rgba(20,184,166,0.14)"
      stroke="#14B8A6"
      strokeWidth="1"
    />
  </svg>
);

// ─── Step list items variants ──────────────────────────────────────

const itemVariants = {
  hidden: { opacity: 0, x: -6 },
  show:   {
    opacity: 1,
    x: 0,
    transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
  },
};

// ─── Sidebar ───────────────────────────────────────────────────────

export const Sidebar = () => {
  const pathname = usePathname();
  const activeStep = PATH_TO_STEP[pathname] ?? 1;

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 flex-col z-50 border-r border-border">
      {/* Background layers */}
      <div className="absolute inset-0 bg-base" />
      <div className="absolute inset-0 bg-dot-grid opacity-60 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.015] via-transparent to-black/30 pointer-events-none" />

      {/* ── Wordmark ── */}
      <div className="relative px-6 pt-7 pb-5 border-b border-border">
        <Link href="/" className="group flex items-center gap-3 w-fit">
          <LogoMark />
          <div>
            <span className="block text-[13px] font-bold tracking-[0.15em] text-zinc-50 group-hover:text-teal transition-colors duration-200 uppercase">
              Valkyrie
            </span>
            <span className="block text-[9px] font-mono text-zinc-700 tracking-[0.22em] uppercase mt-0.5">
              DCF Agent
            </span>
          </div>
        </Link>
      </div>

      {/* ── Stepper ── */}
      <nav className="relative flex-1 px-4 py-6 overflow-y-auto">
        <p className="mb-3 px-3 text-[9px] font-mono tracking-[0.25em] text-zinc-800 uppercase select-none">
          Workflow
        </p>

        <motion.ol
          className="space-y-0.5"
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } } }}
        >
          {STEPS.map((step, index) => {
            const status   = getStepStatus(step.number, activeStep);
            const isLast   = index === STEPS.length - 1;
            const canNav   = status !== "upcoming";
            const Icon     = step.icon;

            return (
              <motion.li
                key={step.number}
                className="relative"
                variants={itemVariants}
              >
                {/* Connector line */}
                {!isLast && (
                  <div className="absolute left-[calc(0.75rem+11px)] top-[2.7rem] w-px h-[1.1rem] z-0 overflow-hidden">
                    <motion.div
                      className="w-full h-full"
                      animate={{
                        backgroundColor:
                          status === "complete"
                            ? "rgba(20,184,166,0.35)"
                            : "rgba(255,255,255,0.06)",
                      }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                )}

                <Link
                  href={canNav ? step.href : "#"}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors duration-150 outline-none focus-visible:ring-1 focus-visible:ring-teal",
                    !canNav && "pointer-events-none cursor-default"
                  )}
                  aria-current={status === "active" ? "step" : undefined}
                  tabIndex={canNav ? 0 : -1}
                >
                  {/* Animated active highlight — slides between steps with layoutId */}
                  {status === "active" && (
                    <motion.div
                      layoutId="active-step-bg"
                      className="absolute inset-0 rounded-lg"
                      style={{
                        background: "rgba(20,184,166,0.07)",
                        border: "1px solid rgba(20,184,166,0.22)",
                      }}
                      transition={{
                        type: "spring",
                        bounce: 0.12,
                        duration: 0.45,
                      }}
                    />
                  )}

                  {/* Hover background (completed steps only) */}
                  {status === "complete" && (
                    <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-white/[0.025] border border-white/[0.04]" />
                  )}

                  {/* Step badge */}
                  <div className="relative z-10 flex-shrink-0">
                    <div
                      className={cn(
                        "step-badge",
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
                  </div>

                  {/* Labels */}
                  <div className="relative z-10 flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-[13px] font-semibold leading-tight transition-colors duration-150",
                        status === "active"
                          ? "text-teal"
                          : status === "complete"
                          ? "text-zinc-300 group-hover:text-zinc-100"
                          : "text-zinc-700"
                      )}
                    >
                      {step.label}
                    </p>
                    <p
                      className={cn(
                        "text-[10px] font-mono mt-0.5 leading-tight transition-colors duration-150",
                        status === "active"
                          ? "text-teal/50"
                          : "text-zinc-700"
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
                        ? "text-teal/70"
                        : status === "complete"
                        ? "text-zinc-700 group-hover:text-zinc-500"
                        : "text-zinc-800"
                    )}
                  />
                </Link>
              </motion.li>
            );
          })}
        </motion.ol>
      </nav>

      {/* ── Footer ── */}
      <div className="relative px-6 py-4 border-t border-border">
        <div className="flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal opacity-50" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-teal" />
          </span>
          <span className="text-[9px] font-mono text-zinc-700 tracking-[0.2em] uppercase">
            v0.1.0 · Valkyrie
          </span>
        </div>
      </div>
    </aside>
  );
};
