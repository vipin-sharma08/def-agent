"use client";

// src/app/assumptions/page.tsx
// ═══════════════════════════════════════════════════════════════════
// Step 3 — Valuation assumptions form.
// Six sections: Revenue, Margins, Working Capital, CapEx/Dep,
// WACC components (live-calculated), Terminal Value.
// Pre-filled from extracted data; every input has a historical
// reference and rationale tooltip.
// ═══════════════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  SlidersHorizontal,
  TrendingUp,
  BarChart2,
  ArrowRightLeft,
  Layers,
  Scale,
  Sigma,
  Info,
  ArrowRight,
  Zap,
} from "lucide-react";

import { useValkyrie }    from "@/lib/store";
import { WarningBanner }  from "@/components/ui/WarningBanner";
import { Button }         from "@/components/ui/button";
import { Slider }         from "@/components/ui/slider";
import {
  Tooltip as ShadcnTooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn }             from "@/lib/utils";
import {
  DEFAULT_RISK_FREE_RATE,
  DEFAULT_EQUITY_RISK_PREMIUM,
  DEFAULT_TERMINAL_GROWTH,
  DEFAULT_TAX_RATE_NEW,
  SECTOR_BETAS,
} from "@/lib/constants";
import type { ExtractedData, UserAssumptions } from "@/lib/types";

// ─── Form state ───────────────────────────────────────────────────

interface FormState {
  revenueGrowth:     [number, number, number, number, number];
  ebitdaMargin:      [number, number, number, number, number];
  receivableDays:    number;
  inventoryDays:     number;
  payableDays:       number;
  capexToRevenue:    number;
  depreciationRate:  number;
  riskFreeRate:      number;
  beta:              number;
  equityRiskPremium: number;
  costOfDebt:        number;
  equityWeight:      number;
  debtWeight:        number;
  taxRate:           number;
  terminalGrowthRate: number;
  tvMethod:          "gordon" | "exit_multiple";
  exitMultiple:      number;
}

// ─── Default computer ─────────────────────────────────────────────

function computeDefaults(data: ExtractedData | null): FormState {
  if (!data) {
    return {
      revenueGrowth:    [12, 10.5, 9, 8.5, 8],
      ebitdaMargin:     [15, 15, 15.5, 15.5, 16],
      receivableDays:   60,
      inventoryDays:    45,
      payableDays:      45,
      capexToRevenue:   5,
      depreciationRate: 8,
      riskFreeRate:     DEFAULT_RISK_FREE_RATE,
      beta:             1.0,
      equityRiskPremium: DEFAULT_EQUITY_RISK_PREMIUM,
      costOfDebt:       9,
      equityWeight:     80,
      debtWeight:       20,
      taxRate:          DEFAULT_TAX_RATE_NEW,
      terminalGrowthRate: DEFAULT_TERMINAL_GROWTH,
      tvMethod:         "gordon",
      exitMultiple:     8,
    };
  }

  const is = data.income_statement;
  const bs = data.balance_sheet;
  const sd = data.supporting_data;
  const n  = (is.years ?? []).length;

  const latestRev = is.revenue_from_operations[n - 1] ?? 0;
  const oldestRev = is.revenue_from_operations[0]     ?? 0;
  const rawCagr   =
    n > 1 && oldestRev > 0
      ? ((latestRev / oldestRev) ** (1 / (n - 1)) - 1) * 100
      : 10;
  const cagr = Math.min(Math.max(rawCagr, 0), 50);

  const target = 8;
  const step   = (cagr - target) / 4;
  const r1dp   = (v: number) => Math.round(v * 10) / 10;
  const revenueGrowth: [number, number, number, number, number] = [
    r1dp(cagr),
    r1dp(cagr - step),
    r1dp(cagr - 2 * step),
    r1dp(cagr - 3 * step),
    r1dp(target),
  ];

  const pbe = is.profit_before_exceptional_items_and_tax[n - 1] ?? 0;
  const fc  = is.finance_costs[n - 1]                           ?? 0;
  const da  = is.depreciation_and_amortisation[n - 1]           ?? 0;
  const rawMargin  = latestRev > 0 ? ((pbe + fc + da) / latestRev) * 100 : 15;
  const baseMargin = Math.min(Math.max(rawMargin, 5), 60);
  const ebitdaMargin: [number, number, number, number, number] = [
    r1dp(baseMargin),
    r1dp(baseMargin),
    r1dp(baseMargin + 0.5),
    r1dp(baseMargin + 0.5),
    r1dp(baseMargin + 1),
  ];

  const avg = (arr: number[]) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const receivableDays = Math.max(Math.round(avg(sd.receivable_days)), 0);
  const inventoryDays  = Math.max(Math.round(avg(sd.inventory_days)),  0);
  const payableDays    = Math.max(Math.round(avg(sd.payable_days)),    0);

  const latestCapex    = Math.abs(sd.capex_from_cash_flow[n - 1] ?? 0);
  const capexToRevenue = latestRev > 0 ? r1dp((latestCapex / latestRev) * 100) : 5;

  const grossBlock      = bs.assets.non_current.property_plant_equipment_gross[n - 1] ?? 0;
  const depreciationRate = grossBlock > 0 ? r1dp((da / grossBlock) * 100) : 8;

  const beta = SECTOR_BETAS[data.metadata.industry] ?? SECTOR_BETAS[data.metadata.sub_industry] ?? 1.0;

  const costOfDebt = sd.weighted_avg_interest_rate ?? 9;

  const eq     = bs.equity_and_liabilities.equity.total_equity[n - 1] ?? 0;
  const ltDebt = bs.equity_and_liabilities.non_current_liabilities.long_term_borrowings[n - 1] ?? 0;
  const stDebt = bs.equity_and_liabilities.current_liabilities.short_term_borrowings[n - 1] ?? 0;
  const cmLtd  = bs.equity_and_liabilities.current_liabilities.current_maturities_of_long_term_debt[n - 1] ?? 0;
  const debt   = ltDebt + stDebt + cmLtd;
  const tv     = Math.max(eq + debt, 1);
  const equityWeight = Math.round((eq / tv) * 100);
  const debtWeight   = 100 - equityWeight;

  const validTax = sd.effective_tax_rate.filter((t) => t > 5 && t < 55);
  const taxRate  = validTax.length ? r1dp(avg(validTax)) : DEFAULT_TAX_RATE_NEW;

  return {
    revenueGrowth,
    ebitdaMargin,
    receivableDays:    receivableDays || 60,
    inventoryDays:     inventoryDays  || 45,
    payableDays:       payableDays    || 45,
    capexToRevenue:    capexToRevenue || 5,
    depreciationRate:  depreciationRate || 8,
    riskFreeRate:      DEFAULT_RISK_FREE_RATE,
    beta:              r1dp(beta),
    equityRiskPremium: DEFAULT_EQUITY_RISK_PREMIUM,
    costOfDebt:        r1dp(costOfDebt),
    equityWeight:      Math.max(equityWeight, 0),
    debtWeight:        Math.max(debtWeight,   0),
    taxRate,
    terminalGrowthRate: DEFAULT_TERMINAL_GROWTH,
    tvMethod:          "gordon",
    exitMultiple:      8,
  };
}

// ─── Validation ───────────────────────────────────────────────────

interface ValidationError { field: string; message: string; }

function validateAssumptions(form: FormState, wacc: number): ValidationError[] {
  const errors: ValidationError[] = [];
  form.revenueGrowth.forEach((g, i) => {
    if (g < -20 || g > 50)
      errors.push({ field: `revenueGrowth[${i}]`, message: `Revenue growth F+${i + 1} (${g}%) must be between −20% and +50%.` });
  });
  form.ebitdaMargin.forEach((m, i) => {
    if (m < 0 || m > 60)
      errors.push({ field: `ebitdaMargin[${i}]`, message: `EBITDA margin F+${i + 1} (${m}%) must be between 0% and 60%.` });
  });
  if (wacc < 6 || wacc > 20)
    errors.push({ field: "wacc", message: `Calculated WACC (${wacc.toFixed(2)}%) must be between 6% and 20%. Adjust Ke, Kd, or capital structure weights.` });
  if (form.terminalGrowthRate < 2 || form.terminalGrowthRate > 7)
    errors.push({ field: "terminalGrowthRate", message: `Terminal growth rate (${form.terminalGrowthRate}%) must be between 2% and 7% to produce a realistic perpetuity.` });
  return errors;
}

// ─── Animation variants ───────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] } },
};

// ─── Small UI helpers ─────────────────────────────────────────────

const InfoBtn = ({ tip }: { tip: string }) => (
  <ShadcnTooltip>
    <TooltipTrigger asChild>
      <span className="inline-flex items-center cursor-help ml-1">
        <Info size={12} className="text-zinc-700 hover:text-zinc-500 transition-colors" aria-label="More information" />
      </span>
    </TooltipTrigger>
    <TooltipContent
      side="top"
      className="w-72 p-3 text-xs text-zinc-300 bg-elevated border border-border-strong rounded-xl shadow-2xl leading-relaxed"
    >
      {tip}
    </TooltipContent>
  </ShadcnTooltip>
);

const SectionCard = ({
  letter,
  title,
  icon,
  children,
}: {
  letter: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) => (
  <motion.div variants={fadeUp} className="card p-6 space-y-5">
    <div className="flex items-center gap-3 border-b border-border pb-4">
      <div className="step-badge step-badge--active font-mono font-bold text-sm">
        {letter}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-teal/70">{icon}</span>
        <h2 className="text-base font-semibold text-zinc-100">{title}</h2>
      </div>
    </div>
    {children}
  </motion.div>
);

interface HistoRef { label: string; value: string; highlight?: boolean; }

const HistoricalRow = ({ items }: { items: HistoRef[] }) => (
  <div className="flex flex-wrap gap-2">
    {items.map((item) => (
      <div
        key={item.label}
        className="bg-elevated border border-border rounded-lg px-3 py-2 text-center min-w-[72px]"
      >
        <p className="text-[9px] font-mono text-zinc-700 uppercase tracking-[0.18em]">
          {item.label}
        </p>
        <p className={cn("font-mono text-sm mt-0.5 font-medium", item.highlight ? "text-teal" : "text-zinc-300")}>
          {item.value}
        </p>
      </div>
    ))}
  </div>
);

const YearInput = ({
  year,
  value,
  min,
  max,
  step = 0.5,
  onChange,
  suffix = "%",
}: {
  year: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  suffix?: string;
}) => (
  <div className="flex flex-col items-center gap-1.5">
    <span className="text-[9px] font-mono text-zinc-700 tracking-[0.18em] uppercase">
      {year}
    </span>
    <div className="relative w-full">
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full bg-base border border-border rounded-lg px-2 py-1.5 text-center font-mono text-zinc-100 text-sm focus:border-teal focus:outline-none transition-colors"
      />
      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-zinc-700 pointer-events-none">
        {suffix}
      </span>
    </div>
    <Slider
      min={min}
      max={max}
      step={step}
      value={[value]}
      onValueChange={([v]) => onChange(v ?? 0)}
      className="w-full"
      aria-label={`${year} value`}
    />
  </div>
);

const AssumptionRow = ({
  label,
  value,
  onChange,
  min,
  max,
  step = 0.1,
  suffix = "%",
  historical,
  tip,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  historical?: string;
  tip?: string;
}) => (
  <div className="flex items-center gap-4 py-2.5 border-b border-border/40 last:border-0">
    <div className="flex-1 min-w-0">
      <span className="text-[13px] text-zinc-400 flex items-center gap-0.5">
        {label}
        {tip && <InfoBtn tip={tip} />}
      </span>
      {historical && (
        <span className="text-[10px] font-mono text-zinc-700 block mt-0.5">
          Historical: {historical}
        </span>
      )}
    </div>
    <div className="flex items-center gap-3 shrink-0">
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v ?? 0)}
        className="w-28"
        aria-label={`${label} slider`}
      />
      <div className="relative w-24">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-full bg-base border border-border rounded-lg px-2 py-1.5 text-right font-mono text-zinc-100 text-sm focus:border-teal focus:outline-none transition-colors"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-zinc-700 pointer-events-none">
          {suffix}
        </span>
      </div>
    </div>
  </div>
);

const DerivedRow = ({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) => (
  <div className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
    <span className="text-[13px] text-zinc-500">{label}</span>
    <span className={cn("font-mono text-sm font-semibold", highlight ? "text-teal" : "text-zinc-300")}>
      {value}
    </span>
  </div>
);

// ─── Page ─────────────────────────────────────────────────────────

export default function AssumptionsPage() {
  const router = useRouter();
  const { extractedData, setUserAssumptions, setStep, isLoading } = useValkyrie();

  const [form, setForm] = useState<FormState>(() => computeDefaults(extractedData));

  const patch = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const patchYear = useCallback(
    (key: "revenueGrowth" | "ebitdaMargin", i: number, v: number) => {
      setForm((prev) => {
        const arr = [...prev[key]] as [number, number, number, number, number];
        arr[i] = v;
        return { ...prev, [key]: arr };
      });
    },
    []
  );

  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  // ── Derived context from extracted data ──

  const is = extractedData?.income_statement;
  const bs = extractedData?.balance_sheet;
  const sd = extractedData?.supporting_data;
  const n  = (is?.years ?? []).length ?? 0;

  const historicalRevenues = useMemo(() => is?.revenue_from_operations.slice(-3) ?? [], [is]);
  const historicalYears    = useMemo(() => (is?.years ?? []).slice(-3) ?? [], [is]);

  const historicalEbitda = useMemo(() => {
    if (!is) return [];
    return (is.years ?? []).map((_, i) => {
      const pbe = is.profit_before_exceptional_items_and_tax[i] ?? 0;
      const fc  = is.finance_costs[i]                           ?? 0;
      const da  = is.depreciation_and_amortisation[i]           ?? 0;
      return pbe + fc + da;
    });
  }, [is]);

  const historicalMargins = useMemo(() => {
    if (!is) return [];
    return is.revenue_from_operations.map((rev, i) =>
      rev > 0 ? (historicalEbitda[i] / rev) * 100 : 0
    );
  }, [is, historicalEbitda]);

  const cagrLabel = useMemo(() => {
    if (!is || n < 2) return "N/A";
    const first = is.revenue_from_operations[0];
    const last  = is.revenue_from_operations[n - 1];
    if (!first || !last) return "N/A";
    const c = ((last / first) ** (1 / (n - 1)) - 1) * 100;
    return `${c >= 0 ? "+" : ""}${c.toFixed(1)}%`;
  }, [is, n]);

  const historicalCapex = useMemo(() => {
    if (!sd || !is) return [];
    return sd.capex_from_cash_flow.map((c, i) => {
      const rev = is.revenue_from_operations[i];
      return rev > 0 ? (Math.abs(c) / rev) * 100 : 0;
    });
  }, [sd, is]);

  const projectedYears = useMemo<[string, string, string, string, string]>(() => {
    const latest = (is?.years ?? [])[n - 1] ?? "FY25";
    const match  = latest.match(/(\d{2,4})$/);
    const base   = match ? parseInt(match[1], 10) : 25;
    const yr     = (offset: number) => `FY${((base + offset) % 100).toString().padStart(2, "0")}`;
    return [yr(1), yr(2), yr(3), yr(4), yr(5)];
  }, [is, n]);

  // ── Live WACC ──

  const ke   = form.riskFreeRate + form.beta * form.equityRiskPremium;
  const kdAt = form.costOfDebt * (1 - form.taxRate / 100);
  const wacc = ke * (form.equityWeight / 100) + kdAt * (form.debtWeight / 100);

  const setEquityWeight = (v: number) => {
    const clamped = Math.min(Math.max(v, 0), 100);
    setForm((prev) => ({ ...prev, equityWeight: clamped, debtWeight: 100 - clamped }));
  };

  // ── Submit ──

  const handleGenerate = () => {
    const errors = validateAssumptions(form, wacc);
    if (errors.length > 0) { setValidationErrors(errors); return; }
    setValidationErrors([]);
    const assumptions: UserAssumptions = {
      revenue_growth_rates:  form.revenueGrowth,
      ebitda_margin:         form.ebitdaMargin,
      depreciation_rate:     form.depreciationRate,
      capex_to_revenue:      form.capexToRevenue,
      receivable_days:       form.receivableDays,
      inventory_days:        form.inventoryDays,
      payable_days:          form.payableDays,
      tax_rate:              form.taxRate,
      interest_rate_on_debt: form.costOfDebt,
      risk_free_rate:        form.riskFreeRate,
      beta:                  form.beta,
      equity_risk_premium:   form.equityRiskPremium,
      terminal_growth_rate:  form.terminalGrowthRate,
      wacc_calculated:       wacc,
      rationale: {
        revenue_growth: `Based on ${cagrLabel} 3-year CAGR with gradual mean reversion to ${form.revenueGrowth[4]}% by Year 5.`,
        margin: `Starting at ${form.ebitdaMargin[0]}% with modest expansion toward ${form.ebitdaMargin[4]}% by Year 5.`,
        capex: `CapEx maintained at ${form.capexToRevenue}% of revenue based on historical intensity.`,
        wacc: `WACC of ${wacc.toFixed(2)}% using CAPM: Ke=${ke.toFixed(2)}%, Kd(net)=${kdAt.toFixed(2)}%, E/V=${form.equityWeight}%.`,
        terminal_growth: `Terminal growth of ${form.terminalGrowthRate}% — conservative proxy for India nominal GDP growth.`,
      },
    };
    setUserAssumptions(assumptions);
    setStep("report");
    router.push("/report");
  };

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <div className="px-8 py-10 max-w-4xl mx-auto pb-28">

      {/* ── Page header ── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-teal-surface border border-teal-border">
            <SlidersHorizontal size={16} className="text-teal" />
          </div>
          <span className="text-[9px] font-mono text-zinc-700 tracking-[0.25em] uppercase">
            Step 3 of 4
          </span>
        </div>
        <h1 className="text-[28px] font-bold text-zinc-50 leading-tight mb-1.5">
          Valuation Assumptions
        </h1>
        <p className="text-zinc-500 text-sm max-w-xl">
          Review and adjust the pre-filled drivers. Hover the{" "}
          <Info size={11} className="inline text-zinc-600 mb-0.5" /> icon for context on each
          input. All monetary values in ₹ Crores.
        </p>
      </div>

      {/* ── Section cards ── */}
      <motion.div
        className="space-y-4"
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } }}
      >

        {/* ══ A — Revenue ══ */}
        <SectionCard letter="A" title="Revenue Assumptions" icon={<TrendingUp size={16} />}>
          {is && (
            <div>
              <p className="text-[9px] font-mono text-zinc-700 uppercase tracking-[0.2em] mb-2">
                Historical Revenue
              </p>
              <HistoricalRow
                items={[
                  ...historicalYears.map((yr, i) => ({
                    label: yr,
                    value: `₹${(historicalRevenues[i] ?? 0).toFixed(0)} Cr`,
                  })),
                  { label: `${n}-Yr CAGR`, value: cagrLabel, highlight: true },
                  ...(sd?.management_guidance?.revenue_growth_commentary
                    ? [{ label: "Mgmt Guide", value: "See note" }]
                    : []),
                ]}
              />
              {sd?.management_guidance?.revenue_growth_commentary && (
                <p className="mt-3 text-[11px] text-zinc-600 italic border-l-2 border-teal/20 pl-3 leading-relaxed">
                  {sd.management_guidance.revenue_growth_commentary}
                </p>
              )}
            </div>
          )}

          <div>
            <p className="text-[9px] font-mono text-zinc-700 uppercase tracking-[0.2em] mb-3">
              Projected Revenue Growth Rate (%)&nbsp;
              <InfoBtn tip={`Based on ${cagrLabel} 3-year CAGR. Growth rates gradually mean-revert toward the long-run sustainable rate. Adjust each year individually or as a block.`} />
            </p>
            <div className="grid grid-cols-5 gap-3">
              {([0, 1, 2, 3, 4] as const).map((i) => (
                <YearInput
                  key={i}
                  year={projectedYears[i]}
                  value={form.revenueGrowth[i]}
                  min={-20}
                  max={60}
                  onChange={(v) => patchYear("revenueGrowth", i, v)}
                />
              ))}
            </div>
          </div>
        </SectionCard>

        {/* ══ B — Margins ══ */}
        <SectionCard letter="B" title="Margin Assumptions" icon={<BarChart2 size={16} />}>
          {is && (
            <div>
              <p className="text-[9px] font-mono text-zinc-700 uppercase tracking-[0.2em] mb-2">
                Historical EBITDA Margins
              </p>
              <HistoricalRow
                items={historicalYears.slice(-3).map((yr, i) => {
                  const idx = ((is?.years ?? []).length ?? 0) - 3 + i;
                  return { label: yr, value: `${historicalMargins[idx]?.toFixed(1) ?? "—"}%` };
                })}
              />
            </div>
          )}

          <div>
            <p className="text-[9px] font-mono text-zinc-700 uppercase tracking-[0.2em] mb-3">
              Projected EBITDA Margin (%)&nbsp;
              <InfoBtn tip="EBITDA = Earnings Before Interest, Tax, Depreciation & Amortisation. Pre-filled with last year's margin with modest expansion assumption. Adjust for known cost tailwinds/headwinds." />
            </p>
            <div className="grid grid-cols-5 gap-3">
              {([0, 1, 2, 3, 4] as const).map((i) => (
                <YearInput
                  key={i}
                  year={projectedYears[i]}
                  value={form.ebitdaMargin[i]}
                  min={0}
                  max={70}
                  onChange={(v) => patchYear("ebitdaMargin", i, v)}
                />
              ))}
            </div>
          </div>
        </SectionCard>

        {/* ══ C — Working Capital ══ */}
        <SectionCard letter="C" title="Working Capital" icon={<ArrowRightLeft size={16} />}>
          {sd && (
            <div>
              <p className="text-[9px] font-mono text-zinc-700 uppercase tracking-[0.2em] mb-2">
                Historical Days (last 3 years)
              </p>
              <HistoricalRow
                items={[
                  ...historicalYears.map((yr, i) => {
                    const idx = ((is?.years ?? []).length ?? 0) - 3 + i;
                    return { label: `${yr} Rec`, value: `${sd.receivable_days[idx]?.toFixed(0) ?? "—"}d` };
                  }),
                  { label: "Avg Rec", value: `${form.receivableDays}d`, highlight: true },
                  { label: "Avg Inv", value: `${form.inventoryDays}d`,  highlight: true },
                  { label: "Avg Pay", value: `${form.payableDays}d`,    highlight: true },
                ]}
              />
            </div>
          )}

          <div className="space-y-0">
            <AssumptionRow
              label="Receivable Days"
              value={form.receivableDays}
              onChange={(v) => patch("receivableDays", Math.max(0, Math.round(v)))}
              min={0} max={180} step={1} suffix="d"
              historical={sd ? `avg ${(sd.receivable_days.reduce((a, b) => a + b, 0) / sd.receivable_days.length).toFixed(0)}d` : undefined}
              tip="Days Sales Outstanding (DSO) = (Trade Receivables / Revenue) × 365. Pre-filled with the 3-year average. A higher number implies more capital locked in receivables."
            />
            <AssumptionRow
              label="Inventory Days"
              value={form.inventoryDays}
              onChange={(v) => patch("inventoryDays", Math.max(0, Math.round(v)))}
              min={0} max={365} step={1} suffix="d"
              historical={sd ? `avg ${(sd.inventory_days.reduce((a, b) => a + b, 0) / Math.max(sd.inventory_days.length, 1)).toFixed(0)}d` : undefined}
              tip="Days Inventory Outstanding (DIO) = (Inventories / COGS) × 365. Pre-filled with 3-year average."
            />
            <AssumptionRow
              label="Payable Days"
              value={form.payableDays}
              onChange={(v) => patch("payableDays", Math.max(0, Math.round(v)))}
              min={0} max={180} step={1} suffix="d"
              historical={sd ? `avg ${(sd.payable_days.reduce((a, b) => a + b, 0) / Math.max(sd.payable_days.length, 1)).toFixed(0)}d` : undefined}
              tip="Days Payable Outstanding (DPO) = (Trade Payables / COGS) × 365. Higher DPO is a source of free working capital."
            />
          </div>
        </SectionCard>

        {/* ══ D — CapEx & Depreciation ══ */}
        <SectionCard letter="D" title="CapEx & Depreciation" icon={<Layers size={16} />}>
          {sd && is && (
            <div>
              <p className="text-[9px] font-mono text-zinc-700 uppercase tracking-[0.2em] mb-2">
                Historical CapEx Intensity
              </p>
              <HistoricalRow
                items={historicalYears.map((yr, i) => {
                  const idx = ((is?.years ?? []).length ?? 0) - 3 + i;
                  return { label: yr, value: `${historicalCapex[idx]?.toFixed(1) ?? "—"}%` };
                })}
              />
            </div>
          )}

          <div className="space-y-0">
            <AssumptionRow
              label="CapEx as % of Revenue"
              value={form.capexToRevenue}
              onChange={(v) => patch("capexToRevenue", v)}
              min={0} max={40} step={0.5} suffix="%"
              historical={sd && is && sd.capex_from_cash_flow.length ? `${historicalCapex.slice(-1)[0]?.toFixed(1)}% last year` : undefined}
              tip="Capital expenditure as a percentage of revenue. Drives the DepEx schedule and CapEx line in FCF calculation. Higher intensity = more capital-intensive business."
            />
            <AssumptionRow
              label="Depreciation Rate (% of Gross Block)"
              value={form.depreciationRate}
              onChange={(v) => patch("depreciationRate", v)}
              min={1} max={50} step={0.5} suffix="%"
              historical={is && bs ? `D&A ₹${(is.depreciation_and_amortisation[n - 1] ?? 0).toFixed(0)} Cr` : undefined}
              tip="Applied to the opening gross block each year to compute depreciation. Derived from the company's Schedule of Fixed Assets. Under SLM it is constant; under WDV it declines."
            />
          </div>

          {sd?.depreciation_rates && sd.depreciation_rates.length > 0 && (
            <div className="bg-elevated border border-border rounded-xl p-3">
              <p className="text-[9px] font-mono text-zinc-700 uppercase tracking-[0.2em] mb-2">
                Reported Depreciation Rates
              </p>
              <div className="flex flex-wrap gap-2">
                {sd.depreciation_rates.slice(0, 6).map((r) => (
                  <span
                    key={r.asset_class}
                    className="text-[11px] font-mono text-zinc-500 bg-base border border-border rounded-md px-2 py-0.5"
                  >
                    {r.asset_class}: {r.rate_percent}% ({r.method})
                  </span>
                ))}
              </div>
            </div>
          )}
        </SectionCard>

        {/* ══ E — Capital Structure & WACC ══ */}
        <SectionCard letter="E" title="Capital Structure & WACC" icon={<Scale size={16} />}>
          {/* Live WACC display */}
          <div className="bg-teal-surface border border-teal-border rounded-xl p-5 text-center">
            <p className="text-[9px] font-mono text-teal/60 tracking-[0.22em] uppercase mb-1">
              Calculated WACC
            </p>
            <p className="font-mono text-4xl font-bold text-teal tabular-nums">
              {wacc.toFixed(2)}%
            </p>
            <div className="flex items-center justify-center gap-6 mt-2 text-[10px] font-mono text-zinc-600">
              <span>
                Ke = {ke.toFixed(2)}%{" "}
                <span className="text-zinc-800">
                  ({form.riskFreeRate}% + {form.beta}×{form.equityRiskPremium}%)
                </span>
              </span>
              <span>Kd(net) = {kdAt.toFixed(2)}%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-0">
            <div>
              <p className="text-[9px] font-mono text-zinc-700 uppercase tracking-[0.2em] mb-2 mt-2">
                Cost of Equity (CAPM)
              </p>
              <AssumptionRow
                label="Risk-Free Rate (Rf)"
                value={form.riskFreeRate}
                onChange={(v) => patch("riskFreeRate", v)}
                min={3} max={12} step={0.1} suffix="%"
                historical="India 10Y G-Sec"
                tip="India 10-Year Government Security yield. Default: 7.1% as of FY2025-26. Source: RBI / NSE."
              />
              <AssumptionRow
                label="Beta (β)"
                value={form.beta}
                onChange={(v) => patch("beta", v)}
                min={0.2} max={3} step={0.05} suffix=""
                historical={extractedData ? `Sector default: ${SECTOR_BETAS[extractedData.metadata.industry] ?? 1.0}` : undefined}
                tip="Measures systematic risk relative to the market. Pre-filled from sector-median betas (Damodaran India dataset). Adjust for company-specific leverage."
              />
              <AssumptionRow
                label="Equity Risk Premium (ERP)"
                value={form.equityRiskPremium}
                onChange={(v) => patch("equityRiskPremium", v)}
                min={3} max={15} step={0.1} suffix="%"
                historical="Damodaran India ERP"
                tip="Implied Equity Risk Premium for India including Country Risk Premium. Source: Damodaran Online — 8.2% as of Jan 2026. Updated annually at pages.stern.nyu.edu."
              />
              <DerivedRow label="Cost of Equity (Ke)" value={`${ke.toFixed(2)}%`} highlight />
            </div>

            <div>
              <p className="text-[9px] font-mono text-zinc-700 uppercase tracking-[0.2em] mb-2 mt-2">
                Cost of Debt & Weights
              </p>
              <AssumptionRow
                label="Cost of Debt (pre-tax)"
                value={form.costOfDebt}
                onChange={(v) => patch("costOfDebt", v)}
                min={3} max={20} step={0.25} suffix="%"
                historical={sd?.weighted_avg_interest_rate ? `${sd.weighted_avg_interest_rate.toFixed(1)}% reported` : undefined}
                tip="Weighted average interest rate on total debt. Extracted from the finance costs note in the Annual Report. After-tax Kd = Kd × (1 − tax rate)."
              />
              <AssumptionRow
                label="Effective Tax Rate"
                value={form.taxRate}
                onChange={(v) => patch("taxRate", v)}
                min={10} max={45} step={0.1} suffix="%"
                historical="Statutory: 25.2% (new regime)"
                tip="Used to compute after-tax cost of debt. India new regime: 25.168% (22% + 10% surcharge + 4% cess). Old regime: 34.944%."
              />
              <DerivedRow label="After-tax Cost of Debt (Kd)" value={`${kdAt.toFixed(2)}%`} />
              <AssumptionRow
                label="Equity Weight (E/V)"
                value={form.equityWeight}
                onChange={setEquityWeight}
                min={10} max={100} step={1} suffix="%"
                historical={bs ? `Latest BS: ${form.equityWeight}% equity` : undefined}
                tip="Equity as a proportion of total capital (Equity + Debt). Derived from the latest Balance Sheet. WACC uses target/market weights — adjust if capital structure is expected to change."
              />
              <DerivedRow label="Debt Weight (D/V)" value={`${form.debtWeight}%`} />
            </div>
          </div>
        </SectionCard>

        {/* ══ F — Terminal Value ══ */}
        <SectionCard letter="F" title="Terminal Value" icon={<Sigma size={16} />}>
          <div>
            <p className="text-[9px] font-mono text-zinc-700 uppercase tracking-[0.2em] mb-3">
              Valuation Method
            </p>
            <div className="flex gap-2">
              {(["gordon", "exit_multiple"] as const).map((m) => (
                <Button
                  key={m}
                  variant="outline"
                  size="sm"
                  onClick={() => patch("tvMethod", m)}
                  aria-pressed={form.tvMethod === m}
                  className={cn(
                    "font-mono rounded-xl transition-colors",
                    form.tvMethod === m
                      ? "bg-teal-surface border-teal-border text-teal hover:bg-teal/10 hover:text-teal"
                      : "bg-transparent border-border text-zinc-600 hover:border-border-strong hover:text-zinc-400"
                  )}
                >
                  {m === "gordon" ? "Gordon Growth Model" : "Exit Multiple (EV/EBITDA)"}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-0">
            <AssumptionRow
              label="Terminal Growth Rate"
              value={form.terminalGrowthRate}
              onChange={(v) => patch("terminalGrowthRate", v)}
              min={1} max={8} step={0.25} suffix="%"
              historical="India nominal GDP ~9.5%"
              tip="Perpetuity growth rate applied after Year 5 in the Gordon Growth Model. Conservative default of 4.5% — roughly half of India's nominal GDP growth — accounts for mean reversion and competition."
            />

            {form.tvMethod === "exit_multiple" && (
              <AssumptionRow
                label="Exit EV/EBITDA Multiple"
                value={form.exitMultiple}
                onChange={(v) => patch("exitMultiple", v)}
                min={2} max={30} step={0.5} suffix="x"
                historical="Industry peer range"
                tip="Terminal enterprise value as a multiple of Year 5 EBITDA. Cross-check against current sector trading multiples and adjust for maturity premium/discount."
              />
            )}
          </div>

          {/* g >= WACC warning */}
          {form.terminalGrowthRate >= wacc && (
            <div className="flex items-start gap-2 p-3 bg-neg-surface border border-neg-border rounded-xl text-xs text-negative/80">
              <span className="mt-0.5 shrink-0">⚠</span>
              <span className="font-mono">
                Terminal growth rate ({form.terminalGrowthRate}%) ≥ WACC ({wacc.toFixed(2)}%). Gordon Growth formula requires g &lt; WACC — reduce terminal growth or increase WACC.
              </span>
            </div>
          )}

          {/* TV formula preview */}
          {form.tvMethod === "gordon" && form.terminalGrowthRate < wacc && (
            <div className="bg-elevated border border-border rounded-xl p-3">
              <p className="text-[9px] font-mono text-zinc-700 uppercase tracking-[0.2em] mb-1.5">
                Terminal Value Formula (Gordon Growth)
              </p>
              <p className="font-mono text-sm text-zinc-400">
                TV = FCFF₅ × (1 + g) / (WACC − g) = FCFF₅ × (1 + {form.terminalGrowthRate}%) / ({wacc.toFixed(2)}% − {form.terminalGrowthRate}%)
              </p>
              <p className="text-[10px] font-mono text-zinc-700 mt-1">
                TV/EV ratio warning will appear in report if &gt;75%
              </p>
            </div>
          )}
        </SectionCard>

      </motion.div>

      {/* ── Sticky footer ── */}
      <div className="fixed bottom-0 left-0 md:left-64 right-0 bg-base/95 backdrop-blur-md border-t border-border z-40">
        {validationErrors.length > 0 && (
          <div className="px-8 pt-3">
            <WarningBanner
              variant="error"
              title="Please fix the following before generating"
              message={validationErrors.map((e) => e.message).join(" · ")}
              dismissible
              onDismiss={() => setValidationErrors([])}
            />
          </div>
        )}
        <div className="px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-7 text-sm">
            {[
              { label: "WACC",      value: `${wacc.toFixed(2)}%`, highlight: true },
              { label: "Terminal g", value: `${form.terminalGrowthRate}%` },
              { label: "Rev F+1",    value: `${form.revenueGrowth[0]}%` },
              { label: "Margin F+1", value: `${form.ebitdaMargin[0]}%` },
            ].map(({ label, value, highlight }) => (
              <div key={label} className="text-center">
                <p className="text-[9px] font-mono text-zinc-700 uppercase tracking-[0.2em]">{label}</p>
                <p className={cn("font-mono font-bold tabular-nums", highlight ? "text-teal" : "text-zinc-300")}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isLoading || form.terminalGrowthRate >= wacc || validationErrors.length > 0}
            className="gap-2 px-7 py-3 bg-teal hover:bg-teal/90 text-[#0A0A0A] text-sm font-semibold rounded-xl glow-teal"
            aria-label="Generate DCF Model"
          >
            <Zap size={14} />
            Generate DCF Model
            <ArrowRight size={14} />
          </Button>
        </div>
      </div>

    </div>
  );
}
