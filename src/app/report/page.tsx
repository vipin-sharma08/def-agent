"use client";

// src/app/report/page.tsx
// ═══════════════════════════════════════════════════════════════════
// Step 4 — Bloomberg Terminal-style DCF Valuation Report.
// Triggers model generation on mount if model is not yet in store.
// Six tabs: Income Statement | Balance Sheet | Cash Flow |
// Schedules | DCF Valuation | Sensitivity
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  FileSpreadsheet,
} from "lucide-react";

import { useValkyrie }        from "@/lib/store";
import { Button }             from "@/components/ui/button";
import { WarningBanner }      from "@/components/ui/WarningBanner";
import { TableSkeleton }      from "@/components/ui/LoadingSkeleton";
import { ValuationSummaryCard } from "@/components/report/ValuationSummaryCard";
import { StepIndicator } from "@/components/ui/StepIndicator";
import { IncomeStatementTab }   from "@/components/report/IncomeStatementTab";
import { BalanceSheetTab }      from "@/components/report/BalanceSheetTab";
import { CashFlowTab }          from "@/components/report/CashFlowTab";
import { SchedulesTab }         from "@/components/report/SchedulesTab";
import { DcfValuationTab }      from "@/components/report/DcfValuationTab";
import { SensitivityTab }       from "@/components/report/SensitivityTab";
import { normalizeFinancialModelYears } from "@/lib/normalizeModelYears";
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

function unwrapModelResponse(raw: unknown): FinancialModel {
  if (Array.isArray(raw)) {
    const first = raw[0] as Record<string, unknown> | undefined;
    return ((first?.modelData ?? first?.model_data ?? first) ?? {}) as FinancialModel;
  }

  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    return ((obj.modelData ?? obj.model_data ?? obj) ?? {}) as FinancialModel;
  }

  return {} as FinancialModel;
}

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
        ? "bg-profit border border-profit text-profit"
        : "bg-loss border border-loss text-loss"
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
      <div className="w-16 h-16 rounded-full border-2 border-subtle flex items-center justify-center">
        <BarChart3 size={24} className="text-muted" />
      </div>
      <Loader2
        size={20}
        className="absolute -top-1 -right-1 text-accent animate-spin"
      />
    </div>
    <div className="text-center">
      <p className="text-dense font-semibold text-primary mb-1">{message}</p>
      <p className="text-caption text-muted max-w-sm">
        Building integrated 3-statement model, running FCFF projections,
        computing WACC, and generating sensitivity analysis…
      </p>
    </div>
    <div className="flex gap-2 mt-2">
      {["Extracting", "Modelling", "Discounting", "Sensitivity"].map(
        (step, i) => (
          <span
            key={step}
            className="text-[10px] font-mono text-muted px-2 py-1 border border-subtle rounded animate-pulse"
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
  } = useValkyrie();

  const [activeTab,    setActiveTab]    = useState<ReportTab>("income");
  const [genState,     setGenState]     = useState<GenState>("idle");
  const [genError,     setGenError]     = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<"pdf" | "excel" | null>(null);
  const exportingRef = useRef(false);
  const isExporting = exportFormat === "pdf";

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

      const raw = (await res.json()) as unknown;
      const maybeErr = raw as { error?: string };
      if (!res.ok || maybeErr.error) {
        throw new Error(maybeErr.error ?? `Server error ${res.status}`);
      }

      const model = unwrapModelResponse(raw);
      setFinancialModel(normalizeFinancialModelYears(model, extractedData));
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

  const normalizedModel = useMemo(() => {
    if (!financialModel || !extractedData) {
      return null;
    }

    return normalizeFinancialModelYears(financialModel, extractedData);
  }, [financialModel, extractedData]);

  const handleExport = useCallback(async () => {
    if (!extractedData || !normalizedModel || exportingRef.current) return;
    exportingRef.current = true;
    setExportFormat("pdf");
    try {
      const { exportValuationPdf } = await import("@/lib/exportPdf");
      await exportValuationPdf(extractedData, normalizedModel);
    } finally {
      exportingRef.current = false;
      setExportFormat(null);
    }
  }, [extractedData, normalizedModel]);

  const handleExcelExport = useCallback(async () => {
    if (!extractedData || !normalizedModel || exportingRef.current) return;
    exportingRef.current = true;
    setExportFormat("excel");
    try {
      const { exportValuationExcel } = await import("@/lib/exportExcel");
      await exportValuationExcel(extractedData, normalizedModel);
    } finally {
      exportingRef.current = false;
      setExportFormat(null);
    }
  }, [extractedData, normalizedModel]);

  // ── No prerequisites ──
  if (!extractedData || !userAssumptions) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 xl:px-0">
        <div className="mb-8">
          <StepIndicator icon={BarChart3} step={4} />
          <h1 className="mt-4 text-display text-primary">DCF Valuation Report</h1>
        </div>

        <div className="card flex flex-col items-center justify-center p-10 text-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[var(--valk-radius-lg)] border border-subtle bg-surface-alt">
            <AlertCircle size={28} className="text-muted" />
          </div>
          <h2 className="mb-2 text-title text-primary">
            Complete earlier steps first
          </h2>
          <p className="mb-6 max-w-sm text-body text-secondary">
            You need to upload a PDF, review the extracted data, and configure
            assumptions before generating the valuation report.
          </p>
          <Button
            variant="outline"
            onClick={() => router.push("/")}
            className="gap-2"
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
  if (genState === "loading" || (!normalizedModel && genState !== "error")) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 xl:px-0">
        <div className="mb-8">
          <div className="mb-3">
            <StepIndicator icon={BarChart3} step={4} />
          </div>
          <h1 className="text-display text-primary">Generating DCF Model</h1>
          <p className="mt-2 text-body text-secondary">
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
  if (genState === "error" || (!normalizedModel && genError)) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 xl:px-0">
        <div className="mb-8">
          <h1 className="text-display text-primary">Model Generation Failed</h1>
        </div>
        <div className="card p-10 flex flex-col items-center text-center">
          <div className="p-4 rounded-full bg-neg-surface border border-neg-border mb-5">
            <AlertCircle size={28} className="text-negative" />
          </div>
          <h2 className="mb-2 text-title text-negative">Could not generate model</h2>
          <p className="mb-6 max-w-md text-body text-secondary">
            {genError ?? "Unknown error occurred during model generation."}
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => router.push("/assumptions")}
              className="gap-2"
              aria-label="Back to assumptions"
            >
              <ArrowLeft size={15} />
              Back to Assumptions
            </Button>
            <Button
              onClick={generateModel}
              className="gap-2"
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
  const model = normalizedModel!;
  const meta  = extractedData.metadata;
  const audit = model.model_audit ?? {
    balance_sheet_balances_all_years: false,
    cash_flow_ties_all_years: false,
    no_circular_references: false,
    warnings: ["Model audit data is missing from API response."],
  };

  return (
    <div className="pb-12">
      {/* ── Page header ── */}
      <div className="px-4 pb-4 pt-8 xl:px-0">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <StepIndicator icon={BarChart3} step={4} />
          <div className="ml-0 flex items-center gap-2 xl:ml-2">
            <AuditBadge ok={audit.balance_sheet_balances_all_years} label="BS Balances" />
            <AuditBadge ok={audit.cash_flow_ties_all_years}         label="CF Ties" />
            <AuditBadge ok={audit.no_circular_references}           label="No Circulars" />
          </div>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-display text-primary">DCF Valuation Report</h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/assumptions")}
              className="gap-1.5"
              aria-label="Edit assumptions"
            >
              <ArrowLeft size={12} />
              Edit Assumptions
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExcelExport}
              disabled={exportFormat !== null}
              className="gap-1.5"
              aria-label={
                exportFormat === "excel"
                  ? "Generating Excel workbook"
                  : "Download valuation report as Excel workbook"
              }
            >
              {exportFormat === "excel" ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <FileSpreadsheet size={12} />
              )}
              {exportFormat === "excel" ? "Generating..." : "Download Excel"}
            </Button>
            <Button
              size="sm"
              onClick={handleExport}
              disabled={exportFormat !== null}
              className="gap-1.5 border border-accent bg-accent-muted text-accent hover:bg-accent-muted"
              aria-label={
                exportFormat === "pdf"
                  ? "Generating PDF"
                  : "Download valuation report as PDF"
              }
            >
              {exportFormat === "pdf"
                ? <Loader2 size={12} className="animate-spin" />
                : <Download size={12} />}
              {isExporting ? "Generating…" : "Download Report"}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Valuation summary hero ── */}
      <div className="px-4 pb-5 xl:px-0">
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
      <div className="px-4 xl:px-0">
        <div role="tablist" aria-label="Report sections" className="flex gap-1 border-b border-subtle overflow-x-auto scrollbar-thin">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`tabpanel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`relative -mb-px inline-flex items-center gap-1.5 whitespace-nowrap px-4 py-3 text-dense font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent ${
                activeTab === tab.id
                  ? "border-b border-accent text-accent"
                  : "text-muted hover:text-primary"
              }`}
            >
              {tab.icon}
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="tab-underline-report"
                  className="absolute bottom-0 left-0 right-0 h-px bg-accent"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="mt-0 px-4 xl:px-0">
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
      <div className="mt-5 px-4 xl:px-0">
        <div className="grid gap-4 md:grid-cols-3">
          {(
            [
              {
                label: "Bear Case",
                data: model.scenarios.bear_case,
                color: "loss",
                desc: model.scenarios.bear_case.assumptions_changed,
              },
              {
                label: "Base Case",
                data: model.scenarios.base_case,
                color: "accent",
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
                  s.color === "accent"
                    ? "border-accent"
                    : s.color === "loss"
                    ? "border-loss"
                    : "border-subtle"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-caption uppercase tracking-label text-muted">
                    {s.label}
                  </span>
                  {upside != null && (
                    <span
                      className={`text-caption font-medium ${
                        upside >= 0 ? "text-profit" : "text-loss"
                      }`}
                    >
                      {upside >= 0 ? "+" : ""}{upside.toFixed(1)}%
                    </span>
                  )}
                </div>
                <p
                  className={`tabular-nums text-heading ${
                    s.color === "accent"
                      ? "text-accent"
                      : s.color === "loss"
                      ? "text-loss"
                      : "text-primary"
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
                <p className="mt-1 text-caption text-secondary">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {audit.warnings.length > 0 && (
        <footer className="mt-6 px-4 xl:px-0">
          <div className="border-t border-subtle pt-5">
            <div className="mb-4">
              <p className="text-caption uppercase tracking-label-wide text-muted">
                Model Diagnostics
              </p>
            </div>
            <div className="flex flex-col gap-3">
              {audit.warnings.map((warning, index) => (
                <WarningBanner key={index} variant="warning" message={warning} />
              ))}
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
