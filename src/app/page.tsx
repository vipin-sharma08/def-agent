"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  SlidersHorizontal,
  TableProperties,
  Upload,
} from "lucide-react";
import { PdfUploader } from "@/components/upload/PdfUploader";

// ─── How-it-works steps ──────────────────────────────────────────

const FLOW_STEPS = [
  {
    icon: Upload,
    step: "01",
    title: "Upload",
    description:
      "Drop an annual report PDF. Our AI reads every financial statement in the document.",
  },
  {
    icon: TableProperties,
    step: "02",
    title: "Review",
    description:
      "Verify the extracted income statement, balance sheet, and cash flow data.",
  },
  {
    icon: SlidersHorizontal,
    step: "03",
    title: "Assumptions",
    description:
      "Set WACC, terminal growth, revenue CAGR, and working capital drivers.",
  },
  {
    icon: BarChart3,
    step: "04",
    title: "Report",
    description:
      "Generate a full DCF with scenario analysis, sensitivity heatmap, and PDF export.",
  },
] as const;

// ─── Animation presets ───────────────────────────────────────────

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay, ease: [0.25, 0.8, 0.25, 1] as const },
});

// ─── Page ────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="flex min-h-[calc(100vh-56px)] flex-col bg-app">

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-20">

        {/* Dot grid */}
        <div
          className="pointer-events-none absolute inset-0 bg-dot-grid"
          style={{ opacity: 0.5 }}
        />

        {/* Radial glow — centered, very subtle */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: 700,
            height: 700,
            background:
              "radial-gradient(circle, rgba(10,132,255,0.08) 0%, transparent 62%)",
          }}
        />

        {/* Badge */}
        <motion.div {...fadeUp(0)} className="mb-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent-muted px-4 py-1.5">
            <span
              className="h-1.5 w-1.5 rounded-full bg-accent"
              style={{ boxShadow: "0 0 6px var(--valk-accent)" }}
            />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
              AI-Powered · Indian Equities · FCFF Method
            </span>
          </span>
        </motion.div>

        {/* Headline */}
        <motion.div {...fadeUp(0.06)} className="mb-5 text-center">
          <h1
            className="text-primary"
            style={{
              fontSize: "clamp(28px, 5vw, 42px)",
              fontWeight: 600,
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
            }}
          >
            Institutional-grade DCF
            <br />
            <span className="text-accent">for Indian equities</span>
          </h1>
        </motion.div>

        {/* Sub-headline */}
        <motion.p
          {...fadeUp(0.1)}
          className="mb-10 max-w-md text-center text-body text-secondary"
          style={{ lineHeight: 1.65 }}
        >
          Upload an annual report. Valkyrie extracts every financial statement,
          builds an integrated 3-statement model, and runs a rigorous FCFF-based
          DCF — in minutes.
        </motion.p>

        {/* Uploader card */}
        <motion.div
          {...fadeUp(0.14)}
          className="relative w-full max-w-[520px]"
        >
          {/* Subtle halo behind the card */}
          <div
            className="pointer-events-none absolute inset-x-0 -bottom-8 mx-auto h-32 w-3/4"
            style={{
              background:
                "radial-gradient(ellipse, rgba(10,132,255,0.1) 0%, transparent 70%)",
              filter: "blur(20px)",
            }}
          />
          <PdfUploader />
        </motion.div>

        {/* Trust pills */}
        <motion.div
          {...fadeUp(0.2)}
          className="mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-2"
        >
          {[
            "Ind AS / IFRS",
            "NSE & BSE",
            "₹ Cr formatting",
            "Processed securely",
          ].map((label) => (
            <span key={label} className="text-caption text-disabled">
              · {label}
            </span>
          ))}
        </motion.div>
      </section>

      {/* ── How it works ─────────────────────────────────────────── */}
      <section
        className="border-t border-subtle px-4 py-14"
        style={{ background: "var(--valk-bg-surface-alt)" }}
      >
        <div className="mx-auto max-w-5xl">
          {/* Section label */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="mb-10 text-center"
          >
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
              The workflow
            </p>
            <h2 className="text-heading font-semibold text-primary">
              From PDF to valuation in 4 steps
            </h2>
          </motion.div>

          {/* Step cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {FLOW_STEPS.map((step, index) => {
              const Icon = step.icon;

              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.06,
                    ease: [0.25, 0.8, 0.25, 1],
                  }}
                  className="card group relative flex flex-col gap-4 p-5 transition-colors duration-150 hover:bg-hover"
                >
                  {/* Step number row */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                      {step.step}
                    </span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-[var(--valk-radius-sm)] border border-subtle bg-surface-alt transition-colors duration-150 group-hover:border-medium">
                      <Icon
                        className="h-3.5 w-3.5 text-muted"
                        strokeWidth={1.8}
                      />
                    </div>
                  </div>

                  {/* Text */}
                  <div>
                    <h3 className="mb-1.5 text-dense font-semibold text-primary">
                      {step.title}
                    </h3>
                    <p className="text-caption text-secondary" style={{ lineHeight: 1.6 }}>
                      {step.description}
                    </p>
                  </div>

                  {/* Accent bottom strip — appears on hover */}
                  <div
                    className="absolute bottom-0 left-4 right-4 h-px rounded-full opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                    style={{ background: "var(--valk-accent)" }}
                  />
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-subtle px-4 py-5 text-center">
        <p className="text-caption text-disabled">
          For educational purposes only · Not financial advice · All values in ₹ Cr
        </p>
      </footer>
    </div>
  );
}
