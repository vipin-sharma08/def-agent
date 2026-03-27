"use client";

// src/components/report/CashFlowTab.tsx
// ═══════════════════════════════════════════════════════════════════
// Combined historical + projected cash flow statement.
// Free Cash Flow (FCF = CFO + CapEx) highlighted.
// Closing cash rows show green/red tie-to-BS checkmarks.
// ═══════════════════════════════════════════════════════════════════

import { useMemo } from "react";
import { ReportTable, type ReportRow, type ColumnType } from "@/components/report/ReportTable";
import type { CashFlowStatement, ProjectedCashFlow } from "@/lib/types";

interface Props {
  historical: CashFlowStatement;
  projected: ProjectedCashFlow;
}

function buildRows(cf: CashFlowStatement, proj: ProjectedCashFlow): ReportRow[] {
  const h = (cf.years ?? []).length;

  const merge = <T,>(hist: T[], prj: T[]): T[] => [...hist, ...prj];
  const nullHistArr = Array<null>(h).fill(null);

  // Free Cash Flow = CFO + CapEx (CapEx is negative in cash flow statement)
  const histFcf = cf.cash_from_operating_activities.map((cfo, i) =>
    cfo + (cf.capital_expenditure[i] ?? 0)
  );
  const projFcf = proj.cfo.map((cfo, i) => cfo + (proj.capex[i] ?? 0));

  // Tie-to-BS checkmarks: null for historical (not tracked), proj.ties_to_bs for projected
  const tieChecks: (boolean | null)[] = [
    ...Array<null>(h).fill(null),
    ...proj.ties_to_bs,
  ];

  return [
    // ── Operating ───────────────────────────────────────────────
    { key: "h_cfo_section", label: "OPERATING ACTIVITIES", values: [], isSectionHeader: true },
    {
      key: "pat",
      label: "Profit After Tax (PAT)",
      values: merge(nullHistArr, proj.pat),
      indent: 1,
    },
    {
      key: "da_addback",
      label: "Add: Depreciation & Amortisation",
      values: merge(nullHistArr, proj.depreciation_add_back),
      indent: 1,
    },
    {
      key: "delta_nwc",
      label: "(Increase) / Decrease in Working Capital",
      values: merge(nullHistArr, proj.change_in_working_capital),
      indent: 1,
    },
    {
      key: "other_noncash",
      label: "Other Non-Cash Adjustments",
      values: merge(nullHistArr, proj.other_non_cash),
      indent: 1,
    },
    {
      key: "cfo",
      label: "Net Cash from Operations (CFO)",
      values: merge(cf.cash_from_operating_activities, proj.cfo),
      isSubtotal: true,
    },

    // ── Investing ────────────────────────────────────────────────
    { key: "h_cfi_section", label: "INVESTING ACTIVITIES", values: [], isSectionHeader: true },
    {
      key: "capex",
      label: "Capital Expenditure (CapEx)",
      values: merge(cf.capital_expenditure, proj.capex),
      indent: 1,
    },
    {
      key: "chg_investments",
      label: "Change in Investments",
      values: merge(nullHistArr, proj.change_in_investments),
      indent: 1,
    },
    {
      key: "cfi",
      label: "Net Cash from Investing (CFI)",
      values: merge(cf.cash_from_investing_activities, proj.cfi),
      isSubtotal: true,
    },

    // ── Financing ────────────────────────────────────────────────
    { key: "h_cff_section", label: "FINANCING ACTIVITIES", values: [], isSectionHeader: true },
    {
      key: "chg_debt",
      label: "Net Change in Borrowings",
      values: merge(nullHistArr, proj.change_in_debt),
      indent: 1,
    },
    {
      key: "dividends_paid",
      label: "Dividends Paid",
      values: merge(nullHistArr, proj.dividends_paid),
      indent: 1,
    },
    {
      key: "cff",
      label: "Net Cash from Financing (CFF)",
      values: merge(cf.cash_from_financing_activities, proj.cff),
      isSubtotal: true,
    },

    // ── Summary ─────────────────────────────────────────────────
    { key: "h_summary", label: "CASH POSITION", values: [], isSectionHeader: true },
    {
      key: "fcf",
      label: "Free Cash Flow (FCF = CFO + CapEx)",
      values: merge(histFcf, projFcf),
      isSubtotal: true,
    },
    {
      key: "net_cash",
      label: "Net Change in Cash",
      values: merge(cf.net_change_in_cash, proj.net_cash_flow),
    },
    {
      key: "opening_cash",
      label: "Opening Cash Balance",
      values: merge(cf.opening_cash_balance, proj.opening_cash),
      indent: 1,
    },
    {
      key: "closing_cash",
      label: "Closing Cash Balance",
      values: merge(cf.closing_cash_balance, proj.closing_cash),
      isTotal: true,
      checkmarks: tieChecks,
    },
  ];
}

export const CashFlowTab = ({ historical, projected }: Props) => {
  const years = useMemo(
    () => [...(historical.years ?? []), ...projected.years],
    [historical.years, projected.years]
  );

  const columnTypes = useMemo<ColumnType[]>(
    () => [
      ...(historical.years ?? []).map((): ColumnType => "historical"),
      ...projected.years.map((): ColumnType => "projected"),
    ],
    [historical.years, projected.years]
  );

  const rows = useMemo(
    () => buildRows(historical, projected),
    [historical, projected]
  );

  return <ReportTable years={years} columnTypes={columnTypes} rows={rows} />;
};
