"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Info, Sigma, SlidersHorizontal, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  DEFAULT_EQUITY_RISK_PREMIUM,
  DEFAULT_RISK_FREE_RATE,
  DEFAULT_TAX_RATE_NEW,
  DEFAULT_TERMINAL_GROWTH,
  SECTOR_BETAS,
} from "@/lib/constants";
import { formatFYLabel, formatPercent } from "@/lib/formatters";
import type { ExtractedData, UserAssumptions } from "@/lib/types";
import { cn } from "@/lib/utils";

type SectionId =
  | "revenue"
  | "profitability"
  | "reinvestment"
  | "capital"
  | "macro";

interface FormState {
  revenueGrowthStage1: number;
  highGrowthYears: number;
  terminalGrowthRate: number;
  ebitdaMargin: number;
  taxRate: number;
  capexToRevenue: number;
  receivableDays: number;
  inventoryDays: number;
  payableDays: number;
  riskFreeRate: number;
  beta: number;
  equityRiskPremium: number;
  costOfDebt: number;
  equityWeight: number;
}

interface AssumptionsFormProps {
  extractedData: ExtractedData;
  isLoading?: boolean;
  onSubmit: (assumptions: UserAssumptions) => void;
}

const SECTION_META: Array<{
  id: SectionId;
  title: string;
  description: string;
}> = [
  {
    id: "revenue",
    title: "Revenue & Growth",
    description: "Revenue CAGR stage 1, high-growth period, terminal growth",
  },
  {
    id: "profitability",
    title: "Profitability",
    description: "EBITDA margin trajectory and tax profile",
  },
  {
    id: "reinvestment",
    title: "Reinvestment",
    description: "Capex intensity and working capital assumptions",
  },
  {
    id: "capital",
    title: "Capital Structure",
    description: "Cost of capital and funding mix",
  },
  {
    id: "macro",
    title: "Macro",
    description: "Risk-free rate and equity risk premium",
  },
];

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function computeDefaults(extractedData: ExtractedData): FormState {
  const income = extractedData.income_statement;
  const support = extractedData.supporting_data;
  const balance = extractedData.balance_sheet;
  const totalYears = income.years?.length ?? 0;

  const latestRevenue = income.revenue_from_operations[totalYears - 1] ?? 0;
  const firstRevenue = income.revenue_from_operations[0] ?? 0;
  const revenueCagr =
    totalYears > 1 && firstRevenue > 0
      ? (((latestRevenue / firstRevenue) ** (1 / (totalYears - 1))) - 1) * 100
      : 12;

  const ebitda =
    (income.profit_before_exceptional_items_and_tax[totalYears - 1] ?? 0) +
    (income.finance_costs[totalYears - 1] ?? 0) +
    (income.depreciation_and_amortisation[totalYears - 1] ?? 0);

  const ebitdaMargin = latestRevenue > 0 ? (ebitda / latestRevenue) * 100 : 18;

  const latestCapex = Math.abs(support.capex_from_cash_flow[totalYears - 1] ?? 0);
  const capexToRevenue = latestRevenue > 0 ? (latestCapex / latestRevenue) * 100 : 5;

  const totalEquity =
    balance.equity_and_liabilities.equity.total_equity[totalYears - 1] ?? 0;
  const totalDebt =
    (balance.equity_and_liabilities.non_current_liabilities.long_term_borrowings[totalYears - 1] ??
      0) +
    (balance.equity_and_liabilities.current_liabilities.short_term_borrowings[totalYears - 1] ??
      0) +
    (balance.equity_and_liabilities.current_liabilities.current_maturities_of_long_term_debt[
      totalYears - 1
    ] ?? 0);
  const capitalBase = Math.max(totalEquity + totalDebt, 1);

  return {
    revenueGrowthStage1: Number(Math.max(Math.min(revenueCagr, 25), 4).toFixed(1)),
    highGrowthYears: 5,
    terminalGrowthRate: DEFAULT_TERMINAL_GROWTH,
    ebitdaMargin: Number(Math.max(Math.min(ebitdaMargin, 45), 8).toFixed(1)),
    taxRate: Number(
      Math.max(Math.min(average(support.effective_tax_rate) || DEFAULT_TAX_RATE_NEW, 35), 15).toFixed(1)
    ),
    capexToRevenue: Number(Math.max(Math.min(capexToRevenue, 20), 1).toFixed(1)),
    receivableDays: Math.round(average(support.receivable_days) || 60),
    inventoryDays: Math.round(average(support.inventory_days) || 45),
    payableDays: Math.round(average(support.payable_days) || 45),
    riskFreeRate: DEFAULT_RISK_FREE_RATE,
    beta: Number(
      (
        SECTOR_BETAS[extractedData.metadata.industry] ??
        SECTOR_BETAS[extractedData.metadata.sub_industry] ??
        1
      ).toFixed(2)
    ),
    equityRiskPremium: DEFAULT_EQUITY_RISK_PREMIUM,
    costOfDebt: Number((support.weighted_avg_interest_rate ?? 9).toFixed(1)),
    equityWeight: Math.round((totalEquity / capitalBase) * 100),
  };
}

function projectRevenueGrowth(stage1: number, years: number, terminalGrowth: number) {
  return Array.from({ length: 5 }, (_, index) => {
    if (index + 1 >= years) return terminalGrowth;
    const taper = index / 4;
    return Number((stage1 + (terminalGrowth - stage1) * taper).toFixed(1));
  }) as [number, number, number, number, number];
}

function projectMargin(margin: number) {
  return [
    Number(margin.toFixed(1)),
    Number(margin.toFixed(1)),
    Number((margin + 0.3).toFixed(1)),
    Number((margin + 0.5).toFixed(1)),
    Number((margin + 0.7).toFixed(1)),
  ] as [number, number, number, number, number];
}

function buildAssumptions(form: FormState): UserAssumptions {
  const debtWeight = 100 - form.equityWeight;
  const costOfEquity = form.riskFreeRate + form.beta * form.equityRiskPremium;
  const afterTaxCostOfDebt = form.costOfDebt * (1 - form.taxRate / 100);
  const wacc =
    costOfEquity * (form.equityWeight / 100) +
    afterTaxCostOfDebt * (debtWeight / 100);

  return {
    revenue_growth_rates: projectRevenueGrowth(
      form.revenueGrowthStage1,
      form.highGrowthYears,
      form.terminalGrowthRate
    ),
    ebitda_margin: projectMargin(form.ebitdaMargin),
    depreciation_rate: 8,
    capex_to_revenue: form.capexToRevenue,
    receivable_days: form.receivableDays,
    inventory_days: form.inventoryDays,
    payable_days: form.payableDays,
    tax_rate: form.taxRate,
    interest_rate_on_debt: form.costOfDebt,
    risk_free_rate: form.riskFreeRate,
    beta: form.beta,
    equity_risk_premium: form.equityRiskPremium,
    terminal_growth_rate: form.terminalGrowthRate,
    wacc_calculated: Number(wacc.toFixed(2)),
    rationale: {
      revenue_growth: "Stage 1 growth tapers toward terminal growth over five forecast years.",
      margin: "EBITDA margin uses current run-rate with restrained operating leverage.",
      capex: "Capex and working capital reflect recent operating intensity.",
      wacc: "WACC combines India risk-free rate, sector beta, ERP, and after-tax debt cost.",
      terminal_growth: "Terminal growth is capped below WACC and aligned to Indian nominal growth restraint.",
    },
  };
}

function FieldRow({
  label,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
  helper,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  suffix: string;
  helper?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-body text-primary">{label}</p>
          {helper ? <p className="text-caption text-muted">{helper}</p> : null}
        </div>
        <div className="relative w-[112px]">
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(event) => onChange(Number(event.target.value))}
            className="w-full rounded-[var(--valk-radius-md)] border border-subtle bg-surface-alt px-3 py-2 text-right text-dense tabular-nums text-primary outline-none transition-colors focus:border-strong"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-caption text-muted">
            {suffix}
          </span>
        </div>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([next]) => onChange(next ?? value)}
        className="w-full"
      />
    </div>
  );
}

export const AssumptionsForm = ({
  extractedData,
  isLoading,
  onSubmit,
}: AssumptionsFormProps) => {
  const [form, setForm] = useState<FormState>(() => computeDefaults(extractedData));
  const [openSections, setOpenSections] = useState<Record<SectionId, boolean>>({
    revenue: true,
    profitability: false,
    reinvestment: false,
    capital: false,
    macro: false,
  });

  const debtWeight = 100 - form.equityWeight;
  const costOfEquity = form.riskFreeRate + form.beta * form.equityRiskPremium;
  const afterTaxCostOfDebt = form.costOfDebt * (1 - form.taxRate / 100);
  const wacc =
    costOfEquity * (form.equityWeight / 100) +
    afterTaxCostOfDebt * (debtWeight / 100);

  const projectedYears = useMemo(() => {
    const lastYear =
      extractedData.income_statement.years?.[extractedData.income_statement.years.length - 1] ??
      "FY25";
    const parsed = Number.parseInt(lastYear.replace(/[^\d]/g, ""), 10);
    const base = Number.isFinite(parsed) ? parsed : 25;
    return [1, 2, 3, 4, 5].map((offset) => formatFYLabel(base + offset, true));
  }, [extractedData]);

  const assumptions = useMemo(() => buildAssumptions(form), [form]);

  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const toggleSection = (sectionId: SectionId) => {
    setOpenSections((current) => ({ ...current, [sectionId]: !current[sectionId] }));
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
        className="card p-5"
      >
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-subtle pb-4">
          <div className="space-y-2">
            <h2 className="text-heading text-primary">Assumptions</h2>
            <p className="text-dense text-secondary">
              Slider and numeric controls are linked. Fiscal years follow Indian FY notation
              (Apr–Mar).
            </p>
          </div>
          <div className="flex min-w-[156px] flex-col items-center justify-center rounded-[var(--valk-radius-md)] border border-subtle bg-tertiary px-4 py-3 text-center">
            <p className="whitespace-nowrap text-caption uppercase tracking-label-wide text-muted">
              Derived WACC
            </p>
            <p className="text-heading tabular-nums text-accent">{formatPercent(wacc, 2)}</p>
          </div>
        </div>

        <div className="space-y-3">
          {SECTION_META.map((section) => {
            const isOpen = openSections[section.id];
            return (
              <div
                key={section.id}
                className="overflow-hidden rounded-[var(--valk-radius-lg)] border border-subtle bg-surface"
              >
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors duration-150",
                    !isOpen && "hover:bg-hover"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "w-0.5 self-stretch rounded-full",
                        isOpen ? "bg-accent" : "bg-transparent"
                      )}
                    />
                    <div>
                      <p className="text-body font-semibold text-primary">{section.title}</p>
                      <p className="text-dense text-muted">{section.description}</p>
                    </div>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-muted transition-transform duration-150 ease-out",
                      isOpen && "rotate-180"
                    )}
                    strokeWidth={1.8}
                  />
                </button>

                {isOpen ? (
                  <div className="space-y-4 rounded-b-[var(--valk-radius-md)] border-t border-subtle bg-surface-alt p-4">
                    {section.id === "revenue" ? (
                      <>
                        <FieldRow
                          label="Revenue CAGR (Stage 1)"
                          value={form.revenueGrowthStage1}
                          onChange={(value) => setField("revenueGrowthStage1", value)}
                          min={0}
                          max={30}
                          step={0.5}
                          suffix="%"
                          helper={`Forecast path tapers across ${projectedYears.join(" · ")}`}
                        />
                        <FieldRow
                          label="High-growth Period"
                          value={form.highGrowthYears}
                          onChange={(value) =>
                            setField("highGrowthYears", Math.max(3, Math.min(10, Math.round(value))))
                          }
                          min={3}
                          max={10}
                          step={1}
                          suffix="yrs"
                        />
                        <FieldRow
                          label="Terminal Growth Rate"
                          value={form.terminalGrowthRate}
                          onChange={(value) => setField("terminalGrowthRate", value)}
                          min={2}
                          max={7}
                          step={0.25}
                          suffix="%"
                        />
                      </>
                    ) : null}

                    {section.id === "profitability" ? (
                      <>
                        <FieldRow
                          label="EBITDA Margin"
                          value={form.ebitdaMargin}
                          onChange={(value) => setField("ebitdaMargin", value)}
                          min={5}
                          max={50}
                          step={0.5}
                          suffix="%"
                        />
                        <FieldRow
                          label="Tax Rate"
                          value={form.taxRate}
                          onChange={(value) => setField("taxRate", value)}
                          min={15}
                          max={35}
                          step={0.5}
                          suffix="%"
                        />
                      </>
                    ) : null}

                    {section.id === "reinvestment" ? (
                      <>
                        <FieldRow
                          label="Capex / Revenue"
                          value={form.capexToRevenue}
                          onChange={(value) => setField("capexToRevenue", value)}
                          min={1}
                          max={20}
                          step={0.5}
                          suffix="%"
                        />
                        <FieldRow
                          label="Receivable Days"
                          value={form.receivableDays}
                          onChange={(value) => setField("receivableDays", Math.round(value))}
                          min={0}
                          max={180}
                          step={1}
                          suffix="d"
                        />
                        <FieldRow
                          label="Inventory Days"
                          value={form.inventoryDays}
                          onChange={(value) => setField("inventoryDays", Math.round(value))}
                          min={0}
                          max={180}
                          step={1}
                          suffix="d"
                        />
                        <FieldRow
                          label="Payable Days"
                          value={form.payableDays}
                          onChange={(value) => setField("payableDays", Math.round(value))}
                          min={0}
                          max={180}
                          step={1}
                          suffix="d"
                        />
                      </>
                    ) : null}

                    {section.id === "capital" ? (
                      <>
                        <FieldRow
                          label="Cost of Debt"
                          value={form.costOfDebt}
                          onChange={(value) => setField("costOfDebt", value)}
                          min={4}
                          max={16}
                          step={0.25}
                          suffix="%"
                        />
                        <FieldRow
                          label="Equity Weight"
                          value={form.equityWeight}
                          onChange={(value) =>
                            setField("equityWeight", Math.max(20, Math.min(100, Math.round(value))))
                          }
                          min={20}
                          max={100}
                          step={1}
                          suffix="%"
                          helper={`Debt Weight auto-balances to ${debtWeight}%`}
                        />
                      </>
                    ) : null}

                    {section.id === "macro" ? (
                      <>
                        <FieldRow
                          label="Risk-free Rate"
                          value={form.riskFreeRate}
                          onChange={(value) => setField("riskFreeRate", value)}
                          min={4}
                          max={10}
                          step={0.1}
                          suffix="%"
                        />
                        <FieldRow
                          label="Beta"
                          value={form.beta}
                          onChange={(value) => setField("beta", value)}
                          min={0.4}
                          max={2.5}
                          step={0.05}
                          suffix=""
                        />
                        <FieldRow
                          label="Equity Risk Premium"
                          value={form.equityRiskPremium}
                          onChange={(value) => setField("equityRiskPremium", value)}
                          min={4}
                          max={12}
                          step={0.1}
                          suffix="%"
                        />
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </motion.div>

      <motion.aside
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
        className="space-y-4"
      >
        <div className="card p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--valk-radius-md)] border border-subtle bg-surface-alt text-[var(--valk-accent)]">
              <SlidersHorizontal className="h-4 w-4" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-title text-primary">Model Snapshot</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-dense text-secondary">Revenue CAGR</span>
              <span className="text-dense tabular-nums text-primary">
                {formatPercent(form.revenueGrowthStage1, 1)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-dense text-secondary">EBITDA Margin</span>
              <span className="text-dense tabular-nums text-primary">
                {formatPercent(form.ebitdaMargin, 1)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-dense text-secondary">WACC</span>
              <span className="text-dense tabular-nums text-primary">
                {formatPercent(assumptions.wacc_calculated, 2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-dense text-secondary">Terminal Growth</span>
              <span className="text-dense tabular-nums text-primary">
                {formatPercent(form.terminalGrowthRate, 1)}
              </span>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--valk-radius-md)] border border-subtle bg-surface-alt text-[var(--valk-cyan)]">
              <TrendingUp className="h-4 w-4" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-title text-primary">Forecast Path</p>
            </div>
          </div>
          <div className="space-y-3">
            {assumptions.revenue_growth_rates.map((growth, index) => (
              <div key={projectedYears[index]} className="flex items-center justify-between">
                <span className="text-dense text-secondary">{projectedYears[index]}</span>
                <span className="text-dense tabular-nums text-primary">
                  {formatPercent(growth, 1)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--valk-radius-md)] border border-subtle bg-surface-alt text-[var(--valk-orange)]">
              <Sigma className="h-4 w-4" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-title text-primary">Indian FY Context</p>
            </div>
          </div>
          <div className="rounded-[var(--valk-radius-md)] border border-subtle bg-surface-alt p-3">
            <p className="text-dense text-secondary">
              FY = Indian Fiscal Year (Apr–Mar). Use `₹ Cr` for table units and `₹` per share for
              intrinsic values.
            </p>
          </div>
          <div className="mt-4 rounded-[var(--valk-radius-md)] border border-subtle bg-surface-alt p-3">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 text-muted" strokeWidth={1.8} />
              <p className="text-dense text-secondary">
                Terminal growth must remain below WACC for the Gordon Growth model to stay valid.
              </p>
            </div>
          </div>
        </div>

        <Button
          type="button"
          disabled={Boolean(isLoading) || assumptions.terminal_growth_rate >= assumptions.wacc_calculated}
          onClick={() => onSubmit(assumptions)}
          className="w-full"
        >
          Generate DCF Model
        </Button>
      </motion.aside>
    </div>
  );
};
