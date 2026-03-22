"use client";

// src/app/report/page.tsx
// ═══════════════════════════════════════════════════════════════════
// Step 4 — Bloomberg Terminal-style DCF Valuation Report.
// Triggers model generation on mount if model is not yet in store.
// Six tabs: Income Statement | Balance Sheet | Cash Flow |
// Schedules | DCF Valuation | Sensitivity
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  AlertCircle,
  Loader2,
  RefreshCw,
  ArrowLeft,
  TrendingUp,
  Building2,
  Layers,
  CandlestickChart,
  GitFork,
  Activity,
  Download,
} from "lucide-react";

import { useValkyrie }        from "@/lib/store";
import { Button }             from "@/components/ui/button";
import { WarningBanner }      from "@/components/ui/WarningBanner";
import { TableSkeleton }      from "@/components/ui/LoadingSkeleton";
import { ValuationSummaryCard } from "@/components/report/ValuationSummaryCard";
import { IncomeStatementTab }   from "@/components/report/IncomeStatementTab";
import { BalanceSheetTab }      from "@/components/report/BalanceSheetTab";
import { CashFlowTab }          from "@/components/report/CashFlowTab";
import { SchedulesTab }         from "@/components/report/SchedulesTab";
import { DcfValuationTab }      from "@/components/report/DcfValuationTab";
import { SensitivityTab }       from "@/components/report/SensitivityTab";
import type { FinancialModel }  from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────

type ReportTab =
  | "income"
  | "balance"
  | "cashflow"
  | "schedules"
  | "dcf"
  | "sensitivity";

type GenState = "idle" | "loading" | "error";

// ─── Tab config ────────────────────────────────────────────────────

const TABS: { id: ReportTab; label: string; icon: React.ReactNode }[] = [
  { id: "income",      label: "Income Statement", icon: <TrendingUp size={13} /> },
  { id: "balance",     label: "Balance Sheet",    icon: <Building2 size={13} /> },
  { id: "cashflow",    label: "Cash Flow",         icon: <Activity size={13} /> },
  { id: "schedules",   label: "Schedules",         icon: <Layers size={13} /> },
  { id: "dcf",         label: "DCF Valuation",     icon: <CandlestickChart size={13} /> },
  { id: "sensitivity", label: "Sensitivity",       icon: <GitFork size={13} /> },
];

// ─── Audit badge ───────────────────────────────────────────────────

const AuditBadge = ({ ok, label }: { ok: boolean; label: string }) => (
  <span
    className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full ${
      ok
        ? "bg-teal-surface border border-teal-border text-teal"
        : "bg-neg-surface border border-neg-border text-negative"
    }`}
  >
    <span>{ok ? "✓" : "✗"}</span>
    {label}
  </span>
);

// ─── Loading screen ────────────────────────────────────────────────

const LoadingScreen = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center min-h-[50vh] gap-5">
    <div className="relative">
      <div className="w-16 h-16 rounded-full border-2 border-border flex items-center justify-center">
        <BarChart3 size={24} className="text-zinc-600" />
      </div>
      <Loader2
        size={20}
        className="absolute -top-1 -right-1 text-teal animate-spin"
      />
    </div>
    <div className="text-center">
      <p className="text-sm font-semibold text-zinc-100 mb-1">{message}</p>
      <p className="text-xs text-zinc-500 max-w-sm">
        Building integrated 3-statement model, running FCFF projections,
        computing WACC, and generating sensitivity analysis…
      </p>
    </div>
    <div className="flex gap-2 mt-2">
      {["Extracting", "Modelling", "Discounting", "Sensitivity"].map(
        (step, i) => (
          <span
            key={step}
            className="text-[10px] font-mono text-zinc-500 px-2 py-1 border border-border rounded animate-pulse"
            style={{ animationDelay: `${i * 0.2}s` }}
          >
            {step}
          </span>
        )
      )}
    </div>
  </div>
);

// ─── Page ─────────────────────────────────────────────────────────

export default function ReportPage() {
  const router = useRouter();
  const {
    extractedData,
    userAssumptions,
    financialModel,
    setFinancialModel,
    setLoading,
    setError,
    error,
  } = useValkyrie();

  const [activeTab,    setActiveTab]    = useState<ReportTab>("income");
  const [genState,     setGenState]     = useState<GenState>("idle");
  const [genError,     setGenError]     = useState<string | null>(null);
  const [isExporting,  setIsExporting]  = useState(false);
  const exportingRef = useRef(false);

  // ── Auto-generate on mount if model not ready ──
  const generateModel = useCallback(async () => {
    if (!extractedData || !userAssumptions) return;
    setGenState("loading");
    setGenError(null);

    try {
      const res = await fetch("/api/model", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          extracted_data: extractedData,
          assumptions:    userAssumptions,
        }),
      });

      const json = (await res.json()) as FinancialModel & { error?: string };

      if (!res.ok || json.error) {
        throw new Error(json.error ?? `Server error ${res.status}`);
      }

      setFinancialModel(json);
      setGenState("idle");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setGenError(msg);
      setGenState("error");
    }
  }, [extractedData, userAssumptions, setFinancialModel]);

  useEffect(() => {
    if (!financialModel && extractedData && userAssumptions) {
      generateModel();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExport = useCallback(async () => {
    if (!extractedData || !financialModel || exportingRef.current) return;
    exportingRef.current = true;
    setIsExporting(true);
    try {
      const { exportValuationPdf } = await import("@/lib/exportPdf");
      await exportValuationPdf(extractedData, financialModel);
    } finally {
      exportingRef.current = false;
      setIsExporting(false);
    }
  }, [extractedData, financialModel]);

  // ── No prerequisites ──
  if (!extractedData || !userAssumptions) {
    return (
      <div className="px-8 py-12 max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-md bg-elevated border border-border">
              <BarChart3 size={18} className="text-teal" />
            </div>
            <span className="text-xs font-mono text-zinc-500 tracking-widest uppercase">
              Step 4 of 4
            </span>
          </div>
          <h1 className="font-sans text-3xl font-bold text-zinc-100 mb-2">
            DCF Valuation Report
          </h1>
        </div>

        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <div className="p-4 rounded-full bg-elevated border border-border mb-5">
            <AlertCircle size={28} className="text-zinc-500" />
          </div>
          <h2 className="text-base font-semibold text-zinc-400 mb-2">
            Complete earlier steps first
          </h2>
          <p className="text-sm text-zinc-600 max-w-sm leading-relaxed mb-6">
            You need to upload a PDF, review the extracted data, and configure
            assumptions before generating the valuation report.
          </p>
          <Button
            variant="outline"
            onClick={() => router.push("/")}
            className="gap-2 bg-elevated border-border text-zinc-400 hover:text-zinc-100"
            aria-label="Go back to upload step"
          >
            <ArrowLeft size={15} />
            Start from Upload
          </Button>
        </div>
      </div>
    );
  }

  // ── Loading state ──
  if (genState === "loading" || (!financialModel && genState !== "error")) {
    return (
      <div className="px-8 py-12 max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-md bg-elevated border border-border">
              <BarChart3 size={18} className="text-teal" />
            </div>
            <span className="text-xs font-mono text-zinc-500 tracking-widest uppercase">
              Step 4 of 4
            </span>
          </div>
          <h1 className="font-sans text-3xl font-bold text-zinc-100 mb-1">
            Generating DCF Model
          </h1>
          <p className="text-zinc-400 text-sm">
            {extractedData.metadata.company_name} ·{" "}
            {extractedData.metadata.industry}
          </p>
        </div>
        <div className="card p-8">
          <LoadingScreen message="Building your financial model…" />
        </div>
        <div className="card mt-4 overflow-hidden">
          <TableSkeleton rows={12} cols={8} />
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (genState === "error" || (!financialModel && genError)) {
    return (
      <div className="px-8 py-12 max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="font-sans text-3xl font-bold text-zinc-100 mb-1">
            Model Generation Failed
          </h1>
        </div>
        <div className="card p-10 flex flex-col items-center text-center">
          <div className="p-4 rounded-full bg-neg-surface border border-neg-border mb-5">
            <AlertCircle size={28} className="text-negative" />
          </div>
          <h2 className="text-base font-semibold text-negative/80 mb-2">
            Could not generate model
          </h2>
          <p className="text-sm text-zinc-600 max-w-md leading-relaxed mb-6">
            {genError ?? "Unknown error occurred during model generation."}
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => router.push("/assumptions")}
              className="gap-2 text-zinc-400 border-border hover:text-zinc-100"
              aria-label="Back to assumptions"
            >
              <ArrowLeft size={15} />
              Back to Assumptions
            </Button>
            <Button
              onClick={generateModel}
              className="gap-2 bg-teal hover:bg-teal/90 text-[#0A0A0A] glow-teal"
              aria-label="Retry model generation"
            >
              <RefreshCw size={14} />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Full report ──
  const model = financialModel!;
  const meta  = extractedData.metadata;
  const audit = model.model_audit;

  return (
    <div className="pb-12">
      {/* ── Page header ── */}
      <div className="px-8 pt-8 pb-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-md bg-elevated border border-border">
            <BarChart3 size={18} className="text-teal" />
          </div>
          <span className="text-xs font-mono text-zinc-500 tracking-widest uppercase">
            Step 4 of 4 · DCF Report
          </span>
          <div className="flex items-center gap-2 ml-2">
            <AuditBadge ok={audit.balance_sheet_balances_all_years} label="BS Balances" />
            <AuditBadge ok={audit.cash_flow_ties_all_years}         label="CF Ties" />
            <AuditBadge ok={audit.no_circular_references}           label="No Circulars" />
          </div>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-sans text-2xl font-bold text-zinc-100">
              DCF Valuation Report
            </h1>
            {audit.warnings.length > 0 && (
              <div className="flex flex-col gap-1.5 mt-2">
                {audit.warnings.map((w, i) => (
                  <WarningBanner key={i} variant="warning" message={w} />
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/assumptions")}
              className="gap-1.5 text-xs font-mono text-zinc-500 border-border hover:text-zinc-300 hover:border-zinc-600"
              aria-label="Edit assumptions"
            >
              <ArrowLeft size={12} />
              Edit Assumptions
            </Button>
            <Button
              size="sm"
              onClick={handleExport}
              disabled={isExporting}
              className="gap-1.5 text-xs font-mono bg-teal-surface border border-teal-border text-teal hover:bg-teal/10 hover:border-teal/40"
              aria-label={isExporting ? "Generating PDF" : "Download valuation report as PDF"}
            >
              {isExporting
                ? <Loader2 size={12} className="animate-spin" />
                : <Download size={12} />}
              {isExporting ? "Generating…" : "Download Report"}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Valuation summary hero ── */}
      <div className="px-8 pb-5">
        <ValuationSummaryCard
          dcf={model.dcf_valuation}
          meta={meta}
          assumptions={model.assumptions}
        />
        {model.dcf_valuation.equity_value < 0 && (
          <div className="mt-3">
            <WarningBanner
              variant="error"
              title="Negative Equity Value"
              message="The model suggests the equity has no value under these assumptions. Consider revising WACC or growth rates."
              action={{ label: "Edit Assumptions", onClick: () => router.push("/assumptions") }}
            />
          </div>
        )}
      </div>

      {/* ── Tab navigation ── */}
      <div className="px-8">
        <div role="tablist" aria-label="Report sections" className="flex gap-0.5 border-b border-border overflow-x-auto scrollbar-thin">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`tabpanel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`relative inline-flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-mono font-medium tracking-wide whitespace-nowrap transition-colors -mb-px focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-teal ${
                activeTab === tab.id
                  ? "text-teal"
                  : "text-zinc-600 hover:text-zinc-400"
              }`}
            >
              {tab.icon}
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="tab-underline-report"
                  className="absolute bottom-0 left-0 right-0 h-px bg-teal"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="px-8 mt-0">
        <div className="card rounded-tl-none overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              {activeTab === "income" && (
                <IncomeStatementTab
                  historical={extractedData.income_statement}
                  projected={model.income_statement_projected}
                />
              )}

              {activeTab === "balance" && (
                <BalanceSheetTab
                  historical={extractedData.balance_sheet}
                  projected={model.balance_sheet_projected}
                />
              )}

              {activeTab === "cashflow" && (
                <CashFlowTab
                  historical={extractedData.cash_flow_statement}
                  projected={model.cash_flow_projected}
                />
              )}

              {activeTab === "schedules" && (
                <SchedulesTab
                  schedules={model.schedules}
                  projectedIS={model.income_statement_projected}
                />
              )}

              {activeTab === "dcf" && (
                <DcfValuationTab dcf={model.dcf_valuation} />
              )}

              {activeTab === "sensitivity" && (
                <SensitivityTab
                  sensitivity={model.sensitivity_analysis}
                  dcf={model.dcf_valuation}
                  scenarios={model.scenarios}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Scenarios footer ── */}
      <div className="px-8 mt-5">
        <div className="grid grid-cols-3 gap-4">
          {(
            [
              {
                label: "Bear Case",
                data: model.scenarios.bear_case,
                color: "rose",
                desc: model.scenarios.bear_case.assumptions_changed,
              },
              {
                label: "Base Case",
                data: model.scenarios.base_case,
                color: "teal",
                desc: "Current assumptions",
              },
              {
                label: "Bull Case",
                data: model.scenarios.bull_case,
                color: "neutral",
                desc: model.scenarios.bull_case.assumptions_changed,
              },
            ] as const
          ).map((s) => {
            const cmp = model.dcf_valuation.current_market_price;
            const upside =
              cmp && cmp > 0
                ? ((s.data.per_share_value - cmp) / cmp) * 100
                : null;
            return (
              <div
                key={s.label}
                className={`card-elevated rounded-lg p-4 border ${
                  s.color === "teal"
                    ? "border-teal-border"
                    : s.color === "rose"
                    ? "border-neg-border"
                    : "border-border"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider">
                    {s.label}
                  </span>
                  {upside != null && (
                    <span
                      className={`text-[10px] font-mono font-semibold ${
                        upside >= 0 ? "text-teal" : "text-negative"
                      }`}
                    >
                      {upside >= 0 ? "+" : ""}{upside.toFixed(1)}%
                    </span>
                  )}
                </div>
                <p
                  className={`font-number text-xl font-bold ${
                    s.color === "teal"
                      ? "text-teal"
                      : s.color === "rose"
                      ? "text-negative"
                      : "text-zinc-300"
                  }`}
                >
                  {(() => {
                    const v = s.data.per_share_value;
                    const neg = v < 0;
                    const abs = Math.abs(v);
                    const [i2, d] = abs.toFixed(2).split(".");
                    const len = i2.length;
                    let out = "";
                    if (len <= 3) { out = i2; }
                    else {
                      out = i2.slice(len - 3);
                      let rem = i2.slice(0, len - 3);
                      while (rem.length > 2) { out = rem.slice(rem.length - 2) + "," + out; rem = rem.slice(0, rem.length - 2); }
                      if (rem) out = rem + "," + out;
                    }
                    return `${neg ? "−" : ""}₹${out}.${d}`;
                  })()}
                </p>
                <p className="text-[11px] text-zinc-600 mt-1 leading-snug">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
