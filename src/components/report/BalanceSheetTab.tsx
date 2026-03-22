"use client";

// src/components/report/BalanceSheetTab.tsx
// ═══════════════════════════════════════════════════════════════════
// Combined historical + projected balance sheet. Uses balance_check[]
// to show green/red checkmark on total rows each projected year.
// Net Debt computed at the bottom for both periods.
// ═══════════════════════════════════════════════════════════════════

import { useMemo } from "react";
import { ReportTable, type ReportRow, type ColumnType } from "@/components/report/ReportTable";
import type { BalanceSheet, ProjectedBalanceSheet } from "@/lib/types";

interface Props {
  historical: BalanceSheet;
  projected: ProjectedBalanceSheet;
}

function buildRows(bs: BalanceSheet, proj: ProjectedBalanceSheet): ReportRow[] {
  const h = (bs.years ?? []).length;
  const p = proj.years.length;

  const merge = <T,>(hist: T[], prj: T[]): T[] => [...hist, ...prj];

  const nc = bs.assets.non_current;
  const ca = bs.assets.current;
  const eq = bs.equity_and_liabilities.equity;
  const ncl = bs.equity_and_liabilities.non_current_liabilities;
  const cl = bs.equity_and_liabilities.current_liabilities;

  // Null arrays for fields not in projected schema (shown as — in projected cols)
  const nullArr = Array<null>(p).fill(null);

  // Balance check: historical always passes (extracted data assumed balanced),
  // projected uses balance_check field
  const balanceChecks: (boolean | null)[] = [
    ...Array<null>(h).fill(null),
    ...proj.balance_check,
  ];

  // Net Debt = LT Debt + ST Debt + CM LTD - Cash
  const histNetDebt = bs.assets.current.cash_and_cash_equivalents.map((cash, i) => {
    const ltd = ncl.long_term_borrowings[i] ?? 0;
    const std = cl.short_term_borrowings[i] ?? 0;
    const cm  = cl.current_maturities_of_long_term_debt[i] ?? 0;
    return ltd + std + cm - (cash ?? 0);
  });

  const projNetDebt = proj.cash_and_equivalents.map((cash, i) => {
    const ltd = proj.long_term_debt[i] ?? 0;
    const std = proj.short_term_debt[i] ?? 0;
    return ltd + std - (cash ?? 0);
  });

  return [
    // ── ASSETS ──────────────────────────────────────────────────────
    { key: "h_assets", label: "ASSETS", values: [], isSectionHeader: true },

    { key: "h_nca", label: "Non-Current Assets", values: [], isSectionHeader: true },
    {
      key: "ppe_gross",
      label: "Gross Block (PPE)",
      values: merge(nc.property_plant_equipment_gross, nullArr),
      indent: 1,
    },
    {
      key: "acc_dep",
      label: "Less: Accumulated Depreciation",
      values: merge(nc.accumulated_depreciation, nullArr),
      indent: 1,
    },
    {
      key: "net_fa",
      label: "Net Fixed Assets",
      values: merge(nc.property_plant_equipment_net, proj.net_fixed_assets),
      indent: 1,
      isSubtotal: true,
    },
    {
      key: "cwip",
      label: "Capital Work in Progress",
      values: merge(nc.capital_work_in_progress, proj.cwip),
      indent: 1,
    },
    {
      key: "investments",
      label: "Investments (Non-Current)",
      values: merge(nc.non_current_investments, proj.investments),
      indent: 1,
    },
    {
      key: "intangibles",
      label: "Intangible & ROU Assets",
      values: merge(
        nc.intangible_assets.map((v, i) => (v ?? 0) + (nc.right_of_use_assets[i] ?? 0)),
        nullArr
      ),
      indent: 1,
    },
    {
      key: "other_nca",
      label: "Other Non-Current Assets",
      values: merge(nc.other_non_current_assets, proj.other_non_current_assets),
      indent: 1,
    },

    { key: "h_ca", label: "Current Assets", values: [], isSectionHeader: true },
    {
      key: "inventories",
      label: "Inventories",
      values: merge(ca.inventories, proj.inventories),
      indent: 1,
    },
    {
      key: "trade_rec",
      label: "Trade Receivables",
      values: merge(ca.trade_receivables, proj.trade_receivables),
      indent: 1,
    },
    {
      key: "cash",
      label: "Cash & Cash Equivalents",
      values: merge(ca.cash_and_cash_equivalents, proj.cash_and_equivalents),
      indent: 1,
    },
    {
      key: "bank_other",
      label: "Bank Balances (Other)",
      values: merge(ca.bank_balances_other, nullArr),
      indent: 1,
    },
    {
      key: "curr_inv",
      label: "Current Investments",
      values: merge(ca.current_investments, nullArr),
      indent: 1,
    },
    {
      key: "other_ca",
      label: "Other Current Assets",
      values: merge(ca.other_current_assets, proj.other_current_assets),
      indent: 1,
    },

    {
      key: "total_assets",
      label: "TOTAL ASSETS",
      values: merge(bs.assets.total_assets, proj.total_assets),
      isTotal: true,
      checkmarks: balanceChecks,
    },

    // ── EQUITY & LIABILITIES ─────────────────────────────────────
    { key: "h_enl", label: "EQUITY & LIABILITIES", values: [], isSectionHeader: true },

    { key: "h_eq", label: "Equity", values: [], isSectionHeader: true },
    {
      key: "share_capital",
      label: "Share Capital",
      values: merge(eq.share_capital, proj.share_capital),
      indent: 1,
    },
    {
      key: "reserves",
      label: "Reserves & Surplus",
      values: merge(eq.reserves_and_surplus, proj.reserves),
      indent: 1,
    },
    {
      key: "total_equity",
      label: "Total Equity",
      values: merge(eq.total_equity, proj.total_equity),
      isTotal: true,
    },

    { key: "h_ncl", label: "Non-Current Liabilities", values: [], isSectionHeader: true },
    {
      key: "lt_debt",
      label: "Long-term Borrowings",
      values: merge(ncl.long_term_borrowings, proj.long_term_debt),
      indent: 1,
    },
    {
      key: "lease_nc",
      label: "Lease Liabilities (NC)",
      values: merge(ncl.lease_liabilities_non_current, nullArr),
      indent: 1,
    },
    {
      key: "other_ncl",
      label: "Other Non-Current Liabilities",
      values: merge(ncl.other_non_current_liabilities, nullArr),
      indent: 1,
    },

    { key: "h_cl", label: "Current Liabilities", values: [], isSectionHeader: true },
    {
      key: "st_debt",
      label: "Short-term Borrowings",
      values: merge(cl.short_term_borrowings, proj.short_term_debt),
      indent: 1,
    },
    {
      key: "trade_pay",
      label: "Trade Payables",
      values: merge(cl.trade_payables, proj.trade_payables),
      indent: 1,
    },
    {
      key: "other_cl",
      label: "Other Current Liabilities",
      values: merge(cl.other_current_liabilities, proj.other_current_liabilities),
      indent: 1,
    },

    {
      key: "total_enl",
      label: "TOTAL EQUITY & LIABILITIES",
      values: merge(
        bs.equity_and_liabilities.total_equity_and_liabilities,
        proj.total_equity_and_liabilities
      ),
      isTotal: true,
      checkmarks: balanceChecks,
    },

    // ── Net Debt ─────────────────────────────────────────────────
    { key: "h_nd", label: "KEY METRICS", values: [], isSectionHeader: true },
    {
      key: "net_debt",
      label: "Net Debt (Borrowings − Cash)",
      values: merge(histNetDebt, projNetDebt),
      isSubtotal: true,
    },
  ];
}

export const BalanceSheetTab = ({ historical, projected }: Props) => {
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
