"use client";

// src/components/report/SchedulesTab.tsx
// ═══════════════════════════════════════════════════════════════════
// Five schedule sub-tabs: Working Capital | D&A & CapEx | Debt |
// Equity | Tax. All projected-only data from ModelSchedules.
// Includes key ratios beneath each schedule.
// ═══════════════════════════════════════════════════════════════════

import { useState } from "react";
import { ReportTable, type ReportRow, type ColumnType } from "@/components/report/ReportTable";
import type { ModelSchedules, ProjectedIncomeStatement } from "@/lib/types";

type ScheduleTab = "wc" | "depex" | "debt" | "equity" | "tax";

interface Props {
  schedules: ModelSchedules;
  projectedIS: ProjectedIncomeStatement;
}

// ─── Row builders ─────────────────────────────────────────────────

function buildWcRows(
  sc: ModelSchedules["working_capital"],
  projIS: ProjectedIncomeStatement
): ReportRow[] {
  const n = sc.years.length;

  // Receivable Days = (Trade Rec / Revenue) * 365
  const recDays = sc.trade_receivables.map((v, i) =>
    projIS.revenue[i] > 0 ? (v / projIS.revenue[i]) * 365 : null
  );
  // Inventory Days = (Inventories / COGS) * 365
  const invDays = sc.inventories.map((v, i) =>
    projIS.cogs[i] > 0 ? (v / projIS.cogs[i]) * 365 : null
  );
  // Payable Days = (Trade Payables / COGS) * 365
  const payDays = sc.trade_payables.map((v, i) =>
    projIS.cogs[i] > 0 ? (v / projIS.cogs[i]) * 365 : null
  );

  return [
    { key: "h_wc", label: "WORKING CAPITAL BALANCES", values: [], isSectionHeader: true },
    { key: "trade_rec", label: "Trade Receivables",       values: sc.trade_receivables },
    { key: "inventories", label: "Inventories",           values: sc.inventories },
    { key: "trade_pay", label: "Trade Payables",          values: sc.trade_payables },
    { key: "nwc", label: "Net Working Capital",           values: sc.net_working_capital, isSubtotal: true },
    { key: "chg_nwc", label: "Change in NWC (Δ)",         values: sc.change_in_nwc },

    { key: "h_ratios", label: "EFFICIENCY RATIOS", values: [], isSectionHeader: true },
    { key: "rec_days", label: "Receivable Days (DSO)",    values: recDays as number[], isMetric: true, format: "days" },
    { key: "inv_days", label: "Inventory Days (DIO)",     values: invDays as number[], isMetric: true, format: "days" },
    { key: "pay_days", label: "Payable Days (DPO)",       values: payDays as number[], isMetric: true, format: "days" },
  ];
}

function buildDepexRows(
  sc: ModelSchedules["depreciation_and_capex"],
  projIS: ProjectedIncomeStatement
): ReportRow[] {
  const capexRev = sc.capex.map((v, i) =>
    projIS.revenue[i] > 0 ? (Math.abs(v) / projIS.revenue[i]) * 100 : null
  );
  const daRev = sc.depreciation.map((v, i) =>
    projIS.revenue[i] > 0 ? (v / projIS.revenue[i]) * 100 : null
  );

  return [
    { key: "h_depex", label: "FIXED ASSETS SCHEDULE", values: [], isSectionHeader: true },
    { key: "open_gb", label: "Opening Gross Block",       values: sc.opening_gross_block },
    { key: "capex", label: "Add: CapEx",                  values: sc.capex },
    { key: "disposals", label: "Less: Disposals",         values: sc.disposals },
    { key: "close_gb", label: "Closing Gross Block",      values: sc.closing_gross_block, isSubtotal: true },
    { key: "dep", label: "Less: Depreciation",            values: sc.depreciation },
    { key: "close_nb", label: "Closing Net Block",        values: sc.closing_net_block, isTotal: true },

    { key: "h_ratios", label: "RATIOS", values: [], isSectionHeader: true },
    { key: "capex_rev", label: "CapEx / Revenue %",       values: capexRev as number[], isMetric: true, format: "percent" },
    { key: "da_rev", label: "D&A / Revenue %",            values: daRev as number[], isMetric: true, format: "percent" },
  ];
}

function buildDebtRows(
  sc: ModelSchedules["debt"],
  projIS: ProjectedIncomeStatement
): ReportRow[] {
  // Interest Coverage = EBIT / Interest Expense
  const coverage = projIS.ebit.map((v, i) =>
    sc.interest_expense[i] > 0 ? v / sc.interest_expense[i] : null
  );

  return [
    { key: "h_debt", label: "DEBT SCHEDULE", values: [], isSectionHeader: true },
    { key: "open_debt", label: "Opening Debt",              values: sc.opening_debt },
    { key: "new_borr", label: "Add: New Borrowings",        values: sc.new_borrowings },
    { key: "repay", label: "Less: Repayments",              values: sc.repayments },
    { key: "close_debt", label: "Closing Debt",             values: sc.closing_debt, isTotal: true },
    { key: "interest", label: "Interest Expense",           values: sc.interest_expense, isSubtotal: true },

    { key: "h_ratios", label: "RATIOS", values: [], isSectionHeader: true },
    { key: "coverage", label: "Interest Coverage (EBIT/Int)", values: coverage as number[], isMetric: true, format: "times" },
  ];
}

function buildEquityRows(sc: ModelSchedules["equity"]): ReportRow[] {
  return [
    { key: "h_equity", label: "EQUITY SCHEDULE", values: [], isSectionHeader: true },
    { key: "open_eq", label: "Opening Equity",              values: sc.opening_equity },
    { key: "pat_added", label: "Add: Profit After Tax",     values: sc.pat_added },
    { key: "dividends", label: "Less: Dividends Paid",      values: sc.dividends_paid },
    { key: "oci", label: "Other Comprehensive Income",      values: sc.oci },
    { key: "close_eq", label: "Closing Equity",             values: sc.closing_equity, isTotal: true },
  ];
}

function buildTaxRows(sc: ModelSchedules["tax"]): ReportRow[] {
  const spread = sc.effective_rate.map((v) => v - sc.statutory_rate);
  return [
    { key: "h_tax", label: "TAX SCHEDULE", values: [], isSectionHeader: true },
    { key: "pbt", label: "Profit Before Tax (PBT)",         values: sc.pbt },
    {
      key: "stat_rate",
      label: "Statutory Tax Rate %",
      values: sc.years.map(() => sc.statutory_rate),
      isMetric: true,
      format: "percent",
    },
    {
      key: "eff_rate",
      label: "Effective Tax Rate %",
      values: sc.effective_rate,
      isMetric: true,
      format: "percent",
    },
    {
      key: "spread",
      label: "Spread vs Statutory %",
      values: spread,
      isMetric: true,
      format: "percent",
    },
    { key: "tax_exp", label: "Tax Expense",                  values: sc.tax_expense, isTotal: true },
  ];
}

// ─── Component ─────────────────────────────────────────────────────

const SUB_TABS: { id: ScheduleTab; label: string }[] = [
  { id: "wc",     label: "Working Capital" },
  { id: "depex",  label: "D&A & CapEx" },
  { id: "debt",   label: "Debt" },
  { id: "equity", label: "Equity" },
  { id: "tax",    label: "Tax" },
];

export const SchedulesTab = ({ schedules, projectedIS }: Props) => {
  const [active, setActive] = useState<ScheduleTab>("wc");

  // Projected-only — all columns are "projected"
  const activeSchedule = active === "wc"
    ? schedules.working_capital
    : active === "depex"
    ? schedules.depreciation_and_capex
    : active === "debt"
    ? schedules.debt
    : active === "equity"
    ? schedules.equity
    : schedules.tax;

  const years = activeSchedule.years;
  const columnTypes: ColumnType[] = years.map(() => "projected");

  const rows: ReportRow[] =
    active === "wc"
      ? buildWcRows(schedules.working_capital, projectedIS)
      : active === "depex"
      ? buildDepexRows(schedules.depreciation_and_capex, projectedIS)
      : active === "debt"
      ? buildDebtRows(schedules.debt, projectedIS)
      : active === "equity"
      ? buildEquityRows(schedules.equity)
      : buildTaxRows(schedules.tax);

  return (
    <div>
      {/* Sub-tab bar */}
      <div className="flex gap-1 px-4 pt-4 border-b border-border">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`px-4 py-2 text-xs font-mono tracking-wide rounded-t-md transition-colors border border-b-0 ${
              active === t.id
                ? "bg-elevated border-border text-teal"
                : "bg-transparent border-transparent text-zinc-600 hover:text-zinc-400"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="pt-0">
        <ReportTable years={years} columnTypes={columnTypes} rows={rows} />
      </div>
    </div>
  );
};
