"use client";

// src/app/review/page.tsx
// ═══════════════════════════════════════════════════════════════════
// Step 2 — Review & correct extracted financial statements.
// Displays Income Statement, Balance Sheet, Cash Flow in editable
// tabular format. Allows inline overrides before proceeding.
// ═══════════════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  TableProperties,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  TriangleAlert,
  Upload,
} from "lucide-react";

import { useValkyrie } from "@/lib/store";
import { FinancialTable, type TableRow } from "@/components/review/FinancialTable";
import { cn } from "@/lib/utils";
import type {
  ExtractedData,
  IncomeStatement,
  BalanceSheet,
  CashFlowStatement,
} from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────

type ReviewTab = "income" | "balance" | "cashflow";

// ─── Row builders ─────────────────────────────────────────────────

function buildIncomeRows(is: IncomeStatement): TableRow[] {
  const n = (is.years ?? []).length;

  const ebitda = Array.from({ length: n }, (_, i) => {
    const pbe = is.profit_before_exceptional_items_and_tax[i];
    const fc  = is.finance_costs[i];
    const da  = is.depreciation_and_amortisation[i];
    if (pbe == null || fc == null || da == null) return null;
    return pbe + fc + da;
  });

  const ebitdaMargin = Array.from({ length: n }, (_, i) => {
    const rev = is.revenue_from_operations[i];
    const e   = ebitda[i];
    if (!rev || e == null) return null;
    return (e / rev) * 100;
  });

  return [
    { key: "h_rev", label: "REVENUE", values: [], isSectionHeader: true },
    { key: "revenue_from_operations", label: "Revenue from Operations", values: is.revenue_from_operations, editable: true },
    { key: "other_income", label: "Other Income", values: is.other_income, editable: true },
    { key: "total_income", label: "Total Income", values: is.total_income, isTotal: true },

    { key: "h_exp", label: "EXPENSES", values: [], isSectionHeader: true },
    { key: "cost_of_materials_consumed", label: "Cost of Materials Consumed", values: is.cost_of_materials_consumed, indent: 1, editable: true },
    { key: "purchase_of_stock_in_trade", label: "Purchase of Stock-in-Trade", values: is.purchase_of_stock_in_trade, indent: 1, editable: true },
    { key: "changes_in_inventories", label: "Changes in Inventories", values: is.changes_in_inventories, indent: 1, editable: true },
    { key: "employee_benefits_expense", label: "Employee Benefits Expense", values: is.employee_benefits_expense, indent: 1, editable: true },
    { key: "other_expenses", label: "Other Expenses", values: is.other_expenses, indent: 1, editable: true },
    { key: "depreciation_and_amortisation", label: "Depreciation & Amortisation", values: is.depreciation_and_amortisation, indent: 1, editable: true },
    { key: "finance_costs", label: "Finance Costs", values: is.finance_costs, indent: 1, editable: true },
    { key: "total_expenses", label: "Total Expenses", values: is.total_expenses, isTotal: true },

    { key: "h_derived", label: "DERIVED METRICS", values: [], isSectionHeader: true },
    { key: "_ebitda", label: "EBITDA (Derived)", values: ebitda as number[], isSubtotal: true },
    { key: "_ebitda_margin", label: "EBITDA Margin %", values: ebitdaMargin as number[], isSubtotal: true, format: "percent" },

    { key: "h_profit", label: "PROFITABILITY", values: [], isSectionHeader: true },
    { key: "profit_before_exceptional_items_and_tax", label: "PBT before Exceptional Items", values: is.profit_before_exceptional_items_and_tax, editable: true },
    { key: "exceptional_items", label: "Exceptional Items", values: is.exceptional_items, indent: 1, editable: true },
    { key: "profit_before_tax", label: "Profit Before Tax", values: is.profit_before_tax, isTotal: true },
    { key: "current_tax", label: "Current Tax", values: is.current_tax, indent: 1, editable: true },
    { key: "deferred_tax", label: "Deferred Tax", values: is.deferred_tax, indent: 1, editable: true },
    { key: "total_tax_expense", label: "Total Tax Expense", values: is.total_tax_expense, isSubtotal: true },
    { key: "profit_after_tax", label: "Profit After Tax (PAT)", values: is.profit_after_tax, isTotal: true },
    { key: "other_comprehensive_income", label: "Other Comprehensive Income", values: is.other_comprehensive_income, indent: 1, editable: true },
    { key: "total_comprehensive_income", label: "Total Comprehensive Income", values: is.total_comprehensive_income, isTotal: true },

    { key: "h_eps", label: "EARNINGS PER SHARE", values: [], isSectionHeader: true },
    { key: "eps_basic", label: "EPS — Basic", values: is.eps_basic, format: "eps" },
    { key: "eps_diluted", label: "EPS — Diluted", values: is.eps_diluted, format: "eps" },
  ];
}

function buildBalanceSheetRows(bs: BalanceSheet): TableRow[] {
  const nc  = bs.assets.non_current;
  const ca  = bs.assets.current;
  const eq  = bs.equity_and_liabilities.equity;
  const ncl = bs.equity_and_liabilities.non_current_liabilities;
  const cl  = bs.equity_and_liabilities.current_liabilities;

  return [
    { key: "h_assets", label: "ASSETS", values: [], isSectionHeader: true },
    { key: "h_nca", label: "Non-Current Assets", values: [], isSectionHeader: true },
    { key: "property_plant_equipment_gross", label: "Gross Block (PPE)", values: nc.property_plant_equipment_gross, indent: 1, editable: true },
    { key: "accumulated_depreciation", label: "Less: Accumulated Depreciation", values: nc.accumulated_depreciation, indent: 1, editable: true },
    { key: "property_plant_equipment_net", label: "Net Block (PPE)", values: nc.property_plant_equipment_net, indent: 1, isSubtotal: true },
    { key: "capital_work_in_progress", label: "Capital Work in Progress", values: nc.capital_work_in_progress, indent: 1, editable: true },
    { key: "intangible_assets", label: "Intangible Assets", values: nc.intangible_assets, indent: 1, editable: true },
    { key: "right_of_use_assets", label: "Right-of-Use Assets", values: nc.right_of_use_assets, indent: 1, editable: true },
    { key: "non_current_investments", label: "Non-Current Investments", values: nc.non_current_investments, indent: 1, editable: true },
    { key: "deferred_tax_assets_net", label: "Deferred Tax Assets (Net)", values: nc.deferred_tax_assets_net, indent: 1, editable: true },
    { key: "other_non_current_assets", label: "Other Non-Current Assets", values: nc.other_non_current_assets, indent: 1, editable: true },
    { key: "total_non_current_assets", label: "Total Non-Current Assets", values: nc.total_non_current_assets, isTotal: true },

    { key: "h_ca", label: "Current Assets", values: [], isSectionHeader: true },
    { key: "inventories", label: "Inventories", values: ca.inventories, indent: 1, editable: true },
    { key: "trade_receivables", label: "Trade Receivables", values: ca.trade_receivables, indent: 1, editable: true },
    { key: "cash_and_cash_equivalents", label: "Cash & Cash Equivalents", values: ca.cash_and_cash_equivalents, indent: 1, editable: true },
    { key: "bank_balances_other", label: "Bank Balances (Other)", values: ca.bank_balances_other, indent: 1, editable: true },
    { key: "current_investments", label: "Current Investments", values: ca.current_investments, indent: 1, editable: true },
    { key: "other_current_assets", label: "Other Current Assets", values: ca.other_current_assets, indent: 1, editable: true },
    { key: "total_current_assets", label: "Total Current Assets", values: ca.total_current_assets, isTotal: true },
    { key: "total_assets", label: "TOTAL ASSETS", values: bs.assets.total_assets, isTotal: true },

    { key: "h_enl", label: "EQUITY & LIABILITIES", values: [], isSectionHeader: true },
    { key: "h_eq", label: "Equity", values: [], isSectionHeader: true },
    { key: "share_capital", label: "Share Capital", values: eq.share_capital, indent: 1, editable: true },
    { key: "reserves_and_surplus", label: "Reserves & Surplus", values: eq.reserves_and_surplus, indent: 1, editable: true },
    { key: "total_equity", label: "Total Equity", values: eq.total_equity, isTotal: true },

    { key: "h_ncl", label: "Non-Current Liabilities", values: [], isSectionHeader: true },
    { key: "long_term_borrowings", label: "Long-term Borrowings", values: ncl.long_term_borrowings, indent: 1, editable: true },
    { key: "lease_liabilities_non_current", label: "Lease Liabilities (Non-Current)", values: ncl.lease_liabilities_non_current, indent: 1, editable: true },
    { key: "deferred_tax_liabilities_net", label: "Deferred Tax Liabilities", values: ncl.deferred_tax_liabilities_net, indent: 1, editable: true },
    { key: "long_term_provisions", label: "Long-term Provisions", values: ncl.long_term_provisions, indent: 1, editable: true },
    { key: "other_non_current_liabilities", label: "Other Non-Current Liabilities", values: ncl.other_non_current_liabilities, indent: 1, editable: true },
    { key: "total_non_current_liabilities", label: "Total Non-Current Liabilities", values: ncl.total_non_current_liabilities, isTotal: true },

    { key: "h_cl", label: "Current Liabilities", values: [], isSectionHeader: true },
    { key: "short_term_borrowings", label: "Short-term Borrowings", values: cl.short_term_borrowings, indent: 1, editable: true },
    { key: "lease_liabilities_current", label: "Lease Liabilities (Current)", values: cl.lease_liabilities_current, indent: 1, editable: true },
    { key: "trade_payables", label: "Trade Payables", values: cl.trade_payables, indent: 1, editable: true },
    { key: "other_current_liabilities", label: "Other Current Liabilities", values: cl.other_current_liabilities, indent: 1, editable: true },
    { key: "short_term_provisions", label: "Short-term Provisions", values: cl.short_term_provisions, indent: 1, editable: true },
    { key: "current_maturities_of_long_term_debt", label: "Current Maturities of LT Debt", values: cl.current_maturities_of_long_term_debt, indent: 1, editable: true },
    { key: "total_current_liabilities", label: "Total Current Liabilities", values: cl.total_current_liabilities, isTotal: true },
    { key: "total_equity_and_liabilities", label: "TOTAL EQUITY & LIABILITIES", values: bs.equity_and_liabilities.total_equity_and_liabilities, isTotal: true },
  ];
}

function buildCashFlowRows(cf: CashFlowStatement): TableRow[] {
  return [
    { key: "h_cfo", label: "OPERATING ACTIVITIES", values: [], isSectionHeader: true },
    { key: "cash_from_operating_activities", label: "Net Cash from Operations (CFO)", values: cf.cash_from_operating_activities, isSubtotal: true, editable: true },

    { key: "h_cfi", label: "INVESTING ACTIVITIES", values: [], isSectionHeader: true },
    { key: "cash_from_investing_activities", label: "Net Cash from Investing (CFI)", values: cf.cash_from_investing_activities, isSubtotal: true, editable: true },
    { key: "capital_expenditure", label: "Capital Expenditure (CapEx)", values: cf.capital_expenditure, indent: 1, editable: true },

    { key: "h_cff", label: "FINANCING ACTIVITIES", values: [], isSectionHeader: true },
    { key: "cash_from_financing_activities", label: "Net Cash from Financing (CFF)", values: cf.cash_from_financing_activities, isSubtotal: true, editable: true },

    { key: "h_summary", label: "SUMMARY", values: [], isSectionHeader: true },
    { key: "net_change_in_cash", label: "Net Change in Cash", values: cf.net_change_in_cash, isSubtotal: true },
    { key: "opening_cash_balance", label: "Opening Cash Balance", values: cf.opening_cash_balance, editable: true },
    { key: "closing_cash_balance", label: "Closing Cash Balance", values: cf.closing_cash_balance, isTotal: true },
  ];
}

// ─── Edit dispatch maps ────────────────────────────────────────────

const IS_MAP: Record<string, keyof IncomeStatement> = {
  revenue_from_operations:                 "revenue_from_operations",
  other_income:                            "other_income",
  total_income:                            "total_income",
  cost_of_materials_consumed:              "cost_of_materials_consumed",
  purchase_of_stock_in_trade:              "purchase_of_stock_in_trade",
  changes_in_inventories:                  "changes_in_inventories",
  employee_benefits_expense:               "employee_benefits_expense",
  other_expenses:                          "other_expenses",
  depreciation_and_amortisation:           "depreciation_and_amortisation",
  finance_costs:                           "finance_costs",
  total_expenses:                          "total_expenses",
  profit_before_exceptional_items_and_tax: "profit_before_exceptional_items_and_tax",
  exceptional_items:                       "exceptional_items",
  profit_before_tax:                       "profit_before_tax",
  current_tax:                             "current_tax",
  deferred_tax:                            "deferred_tax",
  total_tax_expense:                       "total_tax_expense",
  profit_after_tax:                        "profit_after_tax",
  other_comprehensive_income:              "other_comprehensive_income",
  total_comprehensive_income:              "total_comprehensive_income",
};

const CF_MAP: Record<string, keyof CashFlowStatement> = {
  cash_from_operating_activities:  "cash_from_operating_activities",
  cash_from_investing_activities:  "cash_from_investing_activities",
  capital_expenditure:             "capital_expenditure",
  cash_from_financing_activities:  "cash_from_financing_activities",
  opening_cash_balance:            "opening_cash_balance",
  closing_cash_balance:            "closing_cash_balance",
};

// ─── Tab config ────────────────────────────────────────────────────

const TABS: { id: ReviewTab; label: string }[] = [
  { id: "income",   label: "Income Statement" },
  { id: "balance",  label: "Balance Sheet" },
  { id: "cashflow", label: "Cash Flow" },
];

// ─── Page component ───────────────────────────────────────────────

export default function ReviewPage() {
  const router = useRouter();
  const { extractedData, setExtractedData, setStep } = useValkyrie();

  const [localData, setLocalData] = useState<ExtractedData | null>(() =>
    extractedData ? (JSON.parse(JSON.stringify(extractedData)) as ExtractedData) : null
  );
  const [isDirty,   setIsDirty]   = useState(false);
  const [activeTab, setActiveTab] = useState<ReviewTab>("income");

  // ── Row memos ──
  const incomeRows  = useMemo(() => localData ? buildIncomeRows(localData.income_statement)      : [], [localData]);
  const balanceRows = useMemo(() => localData ? buildBalanceSheetRows(localData.balance_sheet)   : [], [localData]);
  const cfRows      = useMemo(() => localData ? buildCashFlowRows(localData.cash_flow_statement) : [], [localData]);

  // ── Edit handlers ──

  const handleIncomeEdit = useCallback(
    (rowKey: string, yi: number, value: number) => {
      const field = IS_MAP[rowKey];
      if (!field) return;
      setLocalData((prev) => {
        if (!prev) return prev;
        const next = JSON.parse(JSON.stringify(prev)) as ExtractedData;
        (next.income_statement[field] as number[])[yi] = value;
        return next;
      });
      setIsDirty(true);
    },
    []
  );

  const handleBalanceEdit = useCallback(
    (rowKey: string, yi: number, value: number) => {
      setLocalData((prev) => {
        if (!prev) return prev;
        const next = JSON.parse(JSON.stringify(prev)) as ExtractedData;
        const bs  = next.balance_sheet;
        const nc  = bs.assets.non_current;
        const ca  = bs.assets.current;
        const eq  = bs.equity_and_liabilities.equity;
        const ncl = bs.equity_and_liabilities.non_current_liabilities;
        const cl  = bs.equity_and_liabilities.current_liabilities;

        const setAt = (arr: number[] | undefined, i: number, v: number) => {
          if (arr) arr[i] = v;
        };

        switch (rowKey) {
          case "property_plant_equipment_gross":       setAt(nc.property_plant_equipment_gross, yi, value); break;
          case "accumulated_depreciation":             setAt(nc.accumulated_depreciation, yi, value); break;
          case "property_plant_equipment_net":         setAt(nc.property_plant_equipment_net, yi, value); break;
          case "capital_work_in_progress":             setAt(nc.capital_work_in_progress, yi, value); break;
          case "intangible_assets":                    setAt(nc.intangible_assets, yi, value); break;
          case "right_of_use_assets":                  setAt(nc.right_of_use_assets, yi, value); break;
          case "non_current_investments":              setAt(nc.non_current_investments, yi, value); break;
          case "deferred_tax_assets_net":              setAt(nc.deferred_tax_assets_net, yi, value); break;
          case "other_non_current_assets":             setAt(nc.other_non_current_assets, yi, value); break;
          case "total_non_current_assets":             setAt(nc.total_non_current_assets, yi, value); break;
          case "inventories":                          setAt(ca.inventories, yi, value); break;
          case "trade_receivables":                    setAt(ca.trade_receivables, yi, value); break;
          case "cash_and_cash_equivalents":            setAt(ca.cash_and_cash_equivalents, yi, value); break;
          case "bank_balances_other":                  setAt(ca.bank_balances_other, yi, value); break;
          case "current_investments":                  setAt(ca.current_investments, yi, value); break;
          case "other_current_assets":                 setAt(ca.other_current_assets, yi, value); break;
          case "total_current_assets":                 setAt(ca.total_current_assets, yi, value); break;
          case "total_assets":                         setAt(bs.assets.total_assets, yi, value); break;
          case "share_capital":                        setAt(eq.share_capital, yi, value); break;
          case "reserves_and_surplus":                 setAt(eq.reserves_and_surplus, yi, value); break;
          case "total_equity":                         setAt(eq.total_equity, yi, value); break;
          case "long_term_borrowings":                 setAt(ncl.long_term_borrowings, yi, value); break;
          case "lease_liabilities_non_current":        setAt(ncl.lease_liabilities_non_current, yi, value); break;
          case "deferred_tax_liabilities_net":         setAt(ncl.deferred_tax_liabilities_net, yi, value); break;
          case "long_term_provisions":                 setAt(ncl.long_term_provisions, yi, value); break;
          case "other_non_current_liabilities":        setAt(ncl.other_non_current_liabilities, yi, value); break;
          case "total_non_current_liabilities":        setAt(ncl.total_non_current_liabilities, yi, value); break;
          case "short_term_borrowings":                setAt(cl.short_term_borrowings, yi, value); break;
          case "lease_liabilities_current":            setAt(cl.lease_liabilities_current, yi, value); break;
          case "trade_payables":                       setAt(cl.trade_payables, yi, value); break;
          case "other_current_liabilities":            setAt(cl.other_current_liabilities, yi, value); break;
          case "short_term_provisions":                setAt(cl.short_term_provisions, yi, value); break;
          case "current_maturities_of_long_term_debt": setAt(cl.current_maturities_of_long_term_debt, yi, value); break;
          case "total_current_liabilities":            setAt(cl.total_current_liabilities, yi, value); break;
          case "total_equity_and_liabilities":         setAt(bs.equity_and_liabilities.total_equity_and_liabilities, yi, value); break;
        }
        return next;
      });
      setIsDirty(true);
    },
    []
  );

  const handleCfEdit = useCallback(
    (rowKey: string, yi: number, value: number) => {
      const field = CF_MAP[rowKey];
      if (!field) return;
      setLocalData((prev) => {
        if (!prev) return prev;
        const next = JSON.parse(JSON.stringify(prev)) as ExtractedData;
        (next.cash_flow_statement[field] as number[])[yi] = value;
        return next;
      });
      setIsDirty(true);
    },
    []
  );

  // ── Actions ──

  const handleConfirm = () => {
    if (localData) {
      setExtractedData(localData);
      setStep("assumptions");
    }
    router.push("/assumptions");
  };

  const handleReExtract = () => {
    setExtractedData(null);
    setStep("upload");
    router.push("/");
  };

  // ── No data state ──

  if (!localData) {
    return (
      <div className="px-8 py-12 max-w-5xl mx-auto">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-teal-surface border border-teal-border">
              <TableProperties size={16} className="text-teal" />
            </div>
            <span className="text-[9px] font-mono text-zinc-700 tracking-[0.25em] uppercase">
              Step 2 of 4
            </span>
          </div>
          <h1 className="text-3xl font-bold text-zinc-50 mb-2">
            Review Extracted Financials
          </h1>
          <p className="text-zinc-500 text-sm max-w-xl">
            Verify the income statement, balance sheet, and cash flow data.
            Correct any discrepancies before proceeding.
          </p>
        </div>

        <div className="card p-14 flex flex-col items-center justify-center text-center">
          <div className="p-4 rounded-full bg-surface border border-border mb-5">
            <AlertCircle size={24} className="text-zinc-600" />
          </div>
          <h2 className="text-sm font-semibold text-zinc-400 mb-2">
            No extracted data found
          </h2>
          <p className="text-xs text-zinc-600 max-w-sm leading-relaxed mb-6 font-mono">
            Upload and process an Annual Report PDF first to extract financial
            data for review.
          </p>
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal hover:bg-teal-bright text-[#0A0A0A] text-sm font-semibold rounded-xl transition-colors glow-teal"
          >
            <Upload size={14} />
            Go to Upload
          </button>
        </div>
      </div>
    );
  }

  const meta       = localData.metadata;
  const validation = localData.validation;
  const hasDiscrepancies =
    !validation.balance_sheet_balances ||
    !validation.cash_flow_ties_to_bs   ||
    validation.discrepancies.length > 0;

  const years =
    activeTab === "income"
      ? localData.income_statement.years ?? []
      : activeTab === "balance"
      ? localData.balance_sheet.years    ?? []
      : localData.cash_flow_statement.years ?? [];

  const activeRows =
    activeTab === "income"
      ? incomeRows
      : activeTab === "balance"
      ? balanceRows
      : cfRows;

  const activeEditHandler =
    activeTab === "income"
      ? handleIncomeEdit
      : activeTab === "balance"
      ? handleBalanceEdit
      : handleCfEdit;

  return (
    <div className="px-8 py-10 max-w-6xl mx-auto">

      {/* ── Page header ── */}
      <div className="mb-7">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-teal-surface border border-teal-border">
            <TableProperties size={16} className="text-teal" />
          </div>
          <span className="text-[9px] font-mono text-zinc-700 tracking-[0.25em] uppercase">
            Step 2 of 4
          </span>
          <AnimatePresence>
            {isDirty && (
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="px-2 py-0.5 text-[10px] font-mono bg-amber-500/10 border border-amber-500/25 text-amber-400 rounded-full"
              >
                Unsaved changes
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-[28px] font-bold text-zinc-50 leading-tight mb-1.5">
              Review Extracted Financials
            </h1>
            <p className="text-zinc-500 text-sm max-w-xl leading-relaxed">
              Verify the numbers below. Click any value to override it inline.
              Amber cells indicate missing or unextracted data.
            </p>
          </div>

          {/* Company chip */}
          <div className="shrink-0 bg-elevated border border-border rounded-xl px-4 py-3 text-right min-w-[180px]">
            <p className="text-[9px] font-mono text-zinc-700 uppercase tracking-[0.2em]">
              {meta.standalone_or_consolidated}
            </p>
            <p className="text-sm font-semibold text-zinc-100 mt-0.5">
              {meta.company_name}
            </p>
            <p className="text-[10px] font-mono text-zinc-600 mt-0.5">
              {meta.industry} · {meta.financial_year_end}
            </p>
          </div>
        </div>
      </div>

      {/* ── Validation banner ── */}
      <AnimatePresence>
        {hasDiscrepancies && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="mb-5 flex items-start gap-3 px-4 py-3 rounded-xl border border-amber-500/25 bg-amber-950/20"
          >
            <TriangleAlert size={14} className="text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-amber-300 mb-1">
                Extraction discrepancies detected
              </p>
              <ul className="space-y-0.5">
                {!validation.balance_sheet_balances && (
                  <li className="text-[11px] font-mono text-amber-400/80">
                    Balance sheet does not balance (Assets ≠ Equity + Liabilities)
                  </li>
                )}
                {!validation.cash_flow_ties_to_bs && (
                  <li className="text-[11px] font-mono text-amber-400/80">
                    Closing cash in Cash Flow does not tie to Balance Sheet
                  </li>
                )}
                {validation.discrepancies.map((d, i) => (
                  <li key={i} className="text-[11px] font-mono text-amber-400/80">
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tab bar ── */}
      <div className="flex gap-0.5 mb-0 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "relative px-5 py-2.5 text-[13px] font-medium font-mono tracking-wide transition-colors -mb-px",
              activeTab === tab.id
                ? "text-teal"
                : "text-zinc-600 hover:text-zinc-400"
            )}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="tab-underline"
                className="absolute bottom-0 left-0 right-0 h-px bg-teal"
                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* ── Table card ── */}
      <div className="border border-border border-t-0 rounded-b-xl overflow-hidden">
        <FinancialTable
          years={years}
          rows={activeRows}
          onEdit={activeEditHandler}
        />
      </div>

      {/* ── Edit hint ── */}
      <p className="mt-2 text-[10px] text-zinc-700 font-mono">
        Click any value to override · Enter to confirm · Esc to cancel · Amber = missing data
      </p>

      {/* ── Action bar ── */}
      <div className="mt-8 flex items-center justify-between gap-4">
        <button
          onClick={handleReExtract}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-zinc-500 border border-border rounded-xl hover:bg-elevated hover:text-zinc-300 transition-colors"
        >
          <RefreshCw size={13} />
          Re-extract from PDF
        </button>

        <div className="flex items-center gap-4">
          {!hasDiscrepancies && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-teal/70">
              <CheckCircle2 size={12} />
              Balance sheet balances
            </span>
          )}
          <button
            onClick={handleConfirm}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-teal hover:bg-teal-bright text-[#0A0A0A] text-sm font-semibold rounded-xl transition-colors glow-teal"
          >
            Looks Good — Set Assumptions
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

    </div>
  );
}
