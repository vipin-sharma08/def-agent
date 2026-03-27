"use client";

// src/components/report/IncomeStatementTab.tsx
// ═══════════════════════════════════════════════════════════════════
// Combined historical + projected P&L with growth and margin rows
// interspersed. Historical data from ExtractedData, projected from
// FinancialModel.income_statement_projected.
// ═══════════════════════════════════════════════════════════════════

import { useMemo } from "react";
import { ReportTable, type ReportRow, type ColumnType } from "@/components/report/ReportTable";
import type { IncomeStatement, ProjectedIncomeStatement } from "@/lib/types";

interface Props {
  historical: IncomeStatement;
  projected: ProjectedIncomeStatement;
}

function buildRows(
  is: IncomeStatement,
  proj: ProjectedIncomeStatement
): ReportRow[] {
  // Helper: merge historical + projected arrays
  const merge = <T,>(hist: T[], prj: T[]): T[] => [...hist, ...prj];

  // ── Historical derived values ──────────────────────────────────

  const histCogs = is.cost_of_materials_consumed.map((v, i) =>
    (v ?? 0) + (is.purchase_of_stock_in_trade[i] ?? 0) + (is.changes_in_inventories[i] ?? 0)
  );

  const histGP = is.revenue_from_operations.map((v, i) =>
    v != null ? v - histCogs[i] : null
  );

  const histGPMargin = is.revenue_from_operations.map((rev, i) =>
    rev && rev > 0 && histGP[i] != null ? ((histGP[i] as number) / rev) * 100 : null
  );

  const histEbitda = is.profit_before_exceptional_items_and_tax.map((v, i) =>
    (v ?? 0) + (is.finance_costs[i] ?? 0) + (is.depreciation_and_amortisation[i] ?? 0)
  );

  const histEbitdaMargin = is.revenue_from_operations.map((rev, i) =>
    rev && rev > 0 ? (histEbitda[i] / rev) * 100 : null
  );

  const histEbit = histEbitda.map((v, i) =>
    v - (is.depreciation_and_amortisation[i] ?? 0)
  );

  const histPatMargin = is.revenue_from_operations.map((rev, i) =>
    rev && rev > 0 ? ((is.profit_after_tax[i] ?? 0) / rev) * 100 : null
  );

  // ── Revenue growth (crosses historical/projected boundary) ──────

  const allRevenue = merge(is.revenue_from_operations, proj.revenue);
  const revGrowth: (number | null)[] = allRevenue.map((v, i) => {
    if (i === 0 || v == null) return null;
    const prev = allRevenue[i - 1];
    if (prev == null || prev === 0) return null;
    return ((v - prev) / Math.abs(prev)) * 100;
  });

  // ── Projected derived values ───────────────────────────────────

  const projGPMargin = proj.gross_profit.map((v, i) =>
    proj.revenue[i] > 0 ? (v / proj.revenue[i]) * 100 : null
  );

  const projPatMargin = proj.pat.map((v, i) =>
    proj.revenue[i] > 0 ? (v / proj.revenue[i]) * 100 : null
  );

  return [
    { key: "h_rev", label: "REVENUE", values: [], isSectionHeader: true },
    {
      key: "revenue",
      label: "Revenue from Operations",
      values: merge(is.revenue_from_operations, proj.revenue),
      isSubtotal: true,
    },
    {
      key: "_rev_growth",
      label: "Revenue Growth %",
      values: revGrowth,
      isMetric: true,
      format: "percent",
    },

    { key: "h_is", label: "INCOME STATEMENT", values: [], isSectionHeader: true },
    {
      key: "cogs",
      label: "COGS (Materials + Purchase + Inv. Δ)",
      values: merge(histCogs, proj.cogs),
      indent: 1,
    },
    {
      key: "gross_profit",
      label: "Gross Profit",
      values: merge(histGP as number[], proj.gross_profit),
      isSubtotal: true,
    },
    {
      key: "_gp_margin",
      label: "Gross Margin %",
      values: merge(histGPMargin as (number | null)[], projGPMargin as (number | null)[]),
      isMetric: true,
      format: "percent",
    },
    {
      key: "employee",
      label: "Employee Benefits Expense",
      values: merge(is.employee_benefits_expense, proj.employee_expense),
      indent: 1,
    },
    {
      key: "other_exp",
      label: "Other Expenses",
      values: merge(is.other_expenses, proj.other_expense),
      indent: 1,
    },
    {
      key: "ebitda",
      label: "EBITDA",
      values: merge(histEbitda, proj.ebitda),
      isSubtotal: true,
    },
    {
      key: "_ebitda_margin",
      label: "EBITDA Margin %",
      values: merge(
        histEbitdaMargin as (number | null)[],
        proj.ebitda_margin_pct as number[]
      ),
      isMetric: true,
      format: "percent",
    },
    {
      key: "da",
      label: "Depreciation & Amortisation",
      values: merge(is.depreciation_and_amortisation, proj.depreciation),
      indent: 1,
    },
    {
      key: "ebit",
      label: "EBIT",
      values: merge(histEbit, proj.ebit),
      isSubtotal: true,
    },
    {
      key: "finance_costs",
      label: "Finance Costs / Interest Expense",
      values: merge(is.finance_costs, proj.interest_expense),
      indent: 1,
    },
    {
      key: "other_income",
      label: "Other Income",
      values: merge(is.other_income, proj.other_income),
      indent: 1,
    },
    {
      key: "pbt",
      label: "Profit Before Tax",
      values: merge(is.profit_before_tax, proj.pbt),
      isSubtotal: true,
    },
    {
      key: "tax",
      label: "Tax Expense",
      values: merge(is.total_tax_expense, proj.tax),
      indent: 1,
    },
    {
      key: "pat",
      label: "Profit After Tax (PAT)",
      values: merge(is.profit_after_tax, proj.pat),
      isTotal: true,
    },
    {
      key: "_pat_margin",
      label: "PAT Margin %",
      values: merge(
        histPatMargin as (number | null)[],
        projPatMargin as (number | null)[]
      ),
      isMetric: true,
      format: "percent",
    },

    { key: "h_eps", label: "EARNINGS PER SHARE", values: [], isSectionHeader: true },
    {
      key: "eps",
      label: "EPS (Basic)",
      values: merge(is.eps_basic, proj.eps),
      format: "eps",
    },
  ];
}

export const IncomeStatementTab = ({ historical, projected }: Props) => {
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
