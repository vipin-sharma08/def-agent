"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, CheckCircle2, RefreshCw, TableProperties, TriangleAlert, Upload } from "lucide-react";
import { useValkyrie } from "@/lib/store";
import { FinancialTable, type TableRow } from "@/components/review/FinancialTable";
import { StepIndicator } from "@/components/ui/StepIndicator";
import { cn } from "@/lib/utils";
import type { ExtractedData } from "@/lib/types";

type ReviewTab = "income" | "balance" | "cashflow";
type MaybeNumber = number | null;

function getValues(data: any): (number | null)[] {
  if (Array.isArray(data)) return data as (number | null)[];
  if (typeof data === "number") return [data];
  if (data === null || data === undefined) return [null];
  return [null];
}

function getAtPath(obj: any, path: string): any {
  return path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function setAtPath(obj: any, path: string, value: any): void {
  const keys = path.split(".");
  let cursor = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (cursor[key] == null || typeof cursor[key] !== "object") cursor[key] = {};
    cursor = cursor[key];
  }
  cursor[keys[keys.length - 1]] = value;
}

function getValuesFromPaths(data: any, paths: string[], yearCount: number): MaybeNumber[] {
  for (const path of paths) {
    const raw = getAtPath(data, path);
    if (raw !== undefined) {
      const values = getValues(raw);
      if (values.length >= yearCount) return values.slice(0, yearCount);
      return [...values, ...Array(Math.max(yearCount - values.length, 0)).fill(null)];
    }
  }
  return Array(Math.max(yearCount, 1)).fill(null);
}

function updateValueAtPath(data: any, path: string, yearIndex: number, value: number, yearCount: number): void {
  const current = getAtPath(data, path);
  const values = getValues(current);
  const len = Math.max(yearCount, yearIndex + 1, values.length);
  const next = [...values];
  while (next.length < len) next.push(null);
  next[yearIndex] = value;
  setAtPath(data, path, next);
}

const IS_MAP: Record<string, string> = {
  revenue_from_operations: "income_statement.revenue_from_operations",
  other_income: "income_statement.other_income",
  total_income: "income_statement.total_income",
  cost_of_materials_consumed: "income_statement.cost_of_materials_consumed",
  purchase_of_stock_in_trade: "income_statement.purchase_of_stock_in_trade",
  changes_in_inventories: "income_statement.changes_in_inventories",
  employee_benefits_expense: "income_statement.employee_benefits_expense",
  depreciation_and_amortisation: "income_statement.depreciation_and_amortisation",
  finance_costs: "income_statement.finance_costs",
  other_expenses: "income_statement.other_expenses",
  total_expenses: "income_statement.total_expenses",
  profit_before_tax: "income_statement.profit_before_tax",
  total_tax_expense: "income_statement.total_tax_expense",
  profit_after_tax: "income_statement.profit_after_tax",
  eps_basic: "income_statement.eps_basic",
  eps_diluted: "income_statement.eps_diluted",
};

const BS_MAP: Record<string, string> = {
  property_plant_equipment: "balance_sheet.property_plant_equipment",
  accumulated_depreciation: "balance_sheet.accumulated_depreciation",
  net_block: "balance_sheet.net_block",
  capital_work_in_progress: "balance_sheet.capital_work_in_progress",
  intangible_assets: "balance_sheet.intangible_assets",
  right_of_use_assets: "balance_sheet.right_of_use_assets",
  non_current_investments: "balance_sheet.non_current_investments",
  deferred_tax_assets_net: "balance_sheet.deferred_tax_assets_net",
  other_non_current_assets: "balance_sheet.other_non_current_assets",
  total_non_current_assets: "balance_sheet.total_non_current_assets",
  inventories: "balance_sheet.inventories",
  trade_receivables: "balance_sheet.trade_receivables",
  cash_and_cash_equivalents: "balance_sheet.cash_and_cash_equivalents",
  bank_balances_other: "balance_sheet.bank_balances_other",
  current_investments: "balance_sheet.current_investments",
  other_current_assets: "balance_sheet.other_current_assets",
  total_current_assets: "balance_sheet.total_current_assets",
  total_assets: "balance_sheet.total_assets",
  share_capital: "balance_sheet.share_capital",
  reserves_and_surplus: "balance_sheet.reserves_and_surplus",
  total_equity: "balance_sheet.total_equity",
  long_term_borrowings: "balance_sheet.long_term_borrowings",
  lease_liabilities_non_current: "balance_sheet.lease_liabilities_non_current",
  deferred_tax_liabilities_net: "balance_sheet.deferred_tax_liabilities_net",
  long_term_provisions: "balance_sheet.long_term_provisions",
  other_non_current_liabilities: "balance_sheet.other_non_current_liabilities",
  total_non_current_liabilities: "balance_sheet.total_non_current_liabilities",
  short_term_borrowings: "balance_sheet.short_term_borrowings",
  lease_liabilities_current: "balance_sheet.lease_liabilities_current",
  trade_payables: "balance_sheet.trade_payables",
  other_current_liabilities: "balance_sheet.other_current_liabilities",
  short_term_provisions: "balance_sheet.short_term_provisions",
  current_maturities_of_lt_debt: "balance_sheet.current_maturities_of_lt_debt",
  total_current_liabilities: "balance_sheet.total_current_liabilities",
  total_equity_and_liabilities: "balance_sheet.total_equity_and_liabilities",
};

const CF_MAP: Record<string, string> = {
  cash_from_operating_activities: "cash_flow_statement.cash_from_operating_activities",
  cash_from_investing_activities: "cash_flow_statement.cash_from_investing_activities",
  capital_expenditure: "cash_flow_statement.capital_expenditure",
  cash_from_financing_activities: "cash_flow_statement.cash_from_financing_activities",
  net_change_in_cash: "cash_flow_statement.net_change_in_cash",
  opening_cash_balance: "cash_flow_statement.opening_cash_balance",
  closing_cash_balance: "cash_flow_statement.closing_cash_balance",
};

const TABS: { id: ReviewTab; label: string }[] = [
  { id: "income", label: "Income Statement" },
  { id: "balance", label: "Balance Sheet" },
  { id: "cashflow", label: "Cash Flow" },
];

function buildIncomeRows(data: any, n: number): TableRow[] {
  const pbe = getValuesFromPaths(data, ["income_statement.profit_before_exceptional_items_and_tax"], n);
  const fin = getValuesFromPaths(data, ["income_statement.finance_costs"], n);
  const dep = getValuesFromPaths(data, ["income_statement.depreciation_and_amortisation"], n);
  const rev = getValuesFromPaths(data, ["income_statement.revenue_from_operations"], n);

  const ebitda = Array.from({ length: n }, (_, i) => (pbe[i] == null || fin[i] == null || dep[i] == null ? null : pbe[i]! + fin[i]! + dep[i]!));
  const margin = Array.from({ length: n }, (_, i) => (!rev[i] || ebitda[i] == null ? null : (ebitda[i]! / rev[i]!) * 100));

  return [
    { key: "h_rev", label: "REVENUE", values: [], isSectionHeader: true },
    { key: "revenue_from_operations", label: "Revenue from Operations", values: rev, editable: true },
    { key: "other_income", label: "Other Income", values: getValuesFromPaths(data, ["income_statement.other_income"], n), editable: true },
    { key: "total_income", label: "Total Income", values: getValuesFromPaths(data, ["income_statement.total_income"], n), isTotal: true, editable: true },
    { key: "h_exp", label: "EXPENSES", values: [], isSectionHeader: true },
    { key: "cost_of_materials_consumed", label: "Cost of Materials Consumed", values: getValuesFromPaths(data, ["income_statement.cost_of_materials_consumed"], n), indent: 1, editable: true },
    { key: "purchase_of_stock_in_trade", label: "Purchase of Stock-in-Trade", values: getValuesFromPaths(data, ["income_statement.purchase_of_stock_in_trade"], n), indent: 1, editable: true },
    { key: "changes_in_inventories", label: "Changes in Inventories", values: getValuesFromPaths(data, ["income_statement.changes_in_inventories"], n), indent: 1, editable: true },
    { key: "employee_benefits_expense", label: "Employee Benefits Expense", values: getValuesFromPaths(data, ["income_statement.employee_benefits_expense"], n), indent: 1, editable: true },
    { key: "depreciation_and_amortisation", label: "Depreciation & Amortisation", values: dep, indent: 1, editable: true },
    { key: "finance_costs", label: "Finance Costs", values: fin, indent: 1, editable: true },
    { key: "other_expenses", label: "Other Expenses", values: getValuesFromPaths(data, ["income_statement.other_expenses"], n), indent: 1, editable: true },
    { key: "total_expenses", label: "Total Expenses", values: getValuesFromPaths(data, ["income_statement.total_expenses"], n), isTotal: true, editable: true },
    { key: "h_derived", label: "DERIVED METRICS", values: [], isSectionHeader: true },
    { key: "_ebitda", label: "EBITDA (Derived)", values: ebitda, isSubtotal: true },
    { key: "_ebitda_margin", label: "EBITDA Margin %", values: margin, isSubtotal: true, format: "percent" },
    { key: "h_profit", label: "PROFITABILITY", values: [], isSectionHeader: true },
    { key: "profit_before_tax", label: "Profit Before Tax", values: getValuesFromPaths(data, ["income_statement.profit_before_exceptional_items_and_tax", "income_statement.profit_before_tax"], n), isTotal: true, editable: true },
    { key: "total_tax_expense", label: "Total Tax Expense", values: getValuesFromPaths(data, ["income_statement.total_tax_expense"], n), isSubtotal: true, editable: true },
    { key: "profit_after_tax", label: "Profit After Tax", values: getValuesFromPaths(data, ["income_statement.profit_after_tax"], n), isTotal: true, editable: true },
    { key: "h_eps", label: "EARNINGS PER SHARE", values: [], isSectionHeader: true },
    { key: "eps_basic", label: "EPS (Basic)", values: getValuesFromPaths(data, ["income_statement.eps_basic"], n), format: "eps", editable: true },
    { key: "eps_diluted", label: "EPS (Diluted)", values: getValuesFromPaths(data, ["income_statement.eps_diluted"], n), format: "eps", editable: true },
  ];
}

function buildBalanceRows(data: any, n: number): TableRow[] {
  const r = (key: string, label: string, paths: string[], options?: Partial<TableRow>) => ({
    key, label, values: getValuesFromPaths(data, paths, n), editable: true, ...options,
  } satisfies TableRow);

  return [
    { key: "h_assets", label: "ASSETS", values: [], isSectionHeader: true },
    { key: "h_nca", label: "Non-Current Assets", values: [], isSectionHeader: true },
    r("property_plant_equipment", "Gross Block (PPE)", ["balance_sheet.property_plant_equipment", "balance_sheet.assets.non_current.property_plant_equipment_gross"], { indent: 1 }),
    r("accumulated_depreciation", "Less: Accumulated Depreciation", ["balance_sheet.accumulated_depreciation", "balance_sheet.assets.non_current.accumulated_depreciation"], { indent: 1 }),
    r("net_block", "Net Block (PPE)", ["balance_sheet.net_block", "balance_sheet.assets.non_current.property_plant_equipment_net"], { indent: 1, isSubtotal: true }),
    r("capital_work_in_progress", "Capital Work in Progress", ["balance_sheet.capital_work_in_progress", "balance_sheet.assets.non_current.capital_work_in_progress"], { indent: 1 }),
    r("intangible_assets", "Intangible Assets", ["balance_sheet.intangible_assets", "balance_sheet.assets.non_current.intangible_assets"], { indent: 1 }),
    r("right_of_use_assets", "Right-of-Use Assets", ["balance_sheet.right_of_use_assets", "balance_sheet.assets.non_current.right_of_use_assets"], { indent: 1 }),
    r("non_current_investments", "Non-Current Investments", ["balance_sheet.non_current_investments", "balance_sheet.assets.non_current.non_current_investments"], { indent: 1 }),
    r("deferred_tax_assets_net", "Deferred Tax Assets (Net)", ["balance_sheet.deferred_tax_assets_net", "balance_sheet.assets.non_current.deferred_tax_assets_net"], { indent: 1 }),
    r("other_non_current_assets", "Other Non-Current Assets", ["balance_sheet.other_non_current_assets", "balance_sheet.assets.non_current.other_non_current_assets"], { indent: 1 }),
    r("total_non_current_assets", "Total Non-Current Assets", ["balance_sheet.total_non_current_assets", "balance_sheet.assets.non_current.total_non_current_assets"], { isTotal: true }),
    { key: "h_ca", label: "Current Assets", values: [], isSectionHeader: true },
    r("inventories", "Inventories", ["balance_sheet.inventories", "balance_sheet.assets.current.inventories"], { indent: 1 }),
    r("trade_receivables", "Trade Receivables", ["balance_sheet.trade_receivables", "balance_sheet.assets.current.trade_receivables"], { indent: 1 }),
    r("cash_and_cash_equivalents", "Cash & Cash Equivalents", ["balance_sheet.cash_and_cash_equivalents", "balance_sheet.assets.current.cash_and_cash_equivalents"], { indent: 1 }),
    r("bank_balances_other", "Bank Balances (Other)", ["balance_sheet.bank_balances_other", "balance_sheet.assets.current.bank_balances_other"], { indent: 1 }),
    r("current_investments", "Current Investments", ["balance_sheet.current_investments", "balance_sheet.assets.current.current_investments"], { indent: 1 }),
    r("other_current_assets", "Other Current Assets", ["balance_sheet.other_current_assets", "balance_sheet.assets.current.other_current_assets"], { indent: 1 }),
    r("total_current_assets", "Total Current Assets", ["balance_sheet.total_current_assets", "balance_sheet.assets.current.total_current_assets"], { isTotal: true }),
    r("total_assets", "TOTAL ASSETS", ["balance_sheet.total_assets", "balance_sheet.assets.total_assets"], { isTotal: true }),
    { key: "h_enl", label: "EQUITY & LIABILITIES", values: [], isSectionHeader: true },
    { key: "h_eq", label: "Equity", values: [], isSectionHeader: true },
    r("share_capital", "Share Capital", ["balance_sheet.share_capital", "balance_sheet.equity_and_liabilities.equity.share_capital"], { indent: 1 }),
    r("reserves_and_surplus", "Reserves & Surplus", ["balance_sheet.reserves_and_surplus", "balance_sheet.equity_and_liabilities.equity.reserves_and_surplus"], { indent: 1 }),
    r("total_equity", "Total Equity", ["balance_sheet.total_equity", "balance_sheet.equity_and_liabilities.equity.total_equity"], { isTotal: true }),
    { key: "h_ncl", label: "Non-Current Liabilities", values: [], isSectionHeader: true },
    r("long_term_borrowings", "Long-term Borrowings", ["balance_sheet.long_term_borrowings", "balance_sheet.equity_and_liabilities.non_current_liabilities.long_term_borrowings"], { indent: 1 }),
    r("lease_liabilities_non_current", "Lease Liabilities (Non-Current)", ["balance_sheet.lease_liabilities_non_current", "balance_sheet.equity_and_liabilities.non_current_liabilities.lease_liabilities_non_current"], { indent: 1 }),
    r("deferred_tax_liabilities_net", "Deferred Tax Liabilities", ["balance_sheet.deferred_tax_liabilities_net", "balance_sheet.equity_and_liabilities.non_current_liabilities.deferred_tax_liabilities_net"], { indent: 1 }),
    r("long_term_provisions", "Long-term Provisions", ["balance_sheet.long_term_provisions", "balance_sheet.equity_and_liabilities.non_current_liabilities.long_term_provisions"], { indent: 1 }),
    r("other_non_current_liabilities", "Other Non-Current Liabilities", ["balance_sheet.other_non_current_liabilities", "balance_sheet.equity_and_liabilities.non_current_liabilities.other_non_current_liabilities"], { indent: 1 }),
    r("total_non_current_liabilities", "Total Non-Current Liabilities", ["balance_sheet.total_non_current_liabilities", "balance_sheet.equity_and_liabilities.non_current_liabilities.total_non_current_liabilities"], { isTotal: true }),
    { key: "h_cl", label: "Current Liabilities", values: [], isSectionHeader: true },
    r("short_term_borrowings", "Short-term Borrowings", ["balance_sheet.short_term_borrowings", "balance_sheet.equity_and_liabilities.current_liabilities.short_term_borrowings"], { indent: 1 }),
    r("lease_liabilities_current", "Lease Liabilities (Current)", ["balance_sheet.lease_liabilities_current", "balance_sheet.equity_and_liabilities.current_liabilities.lease_liabilities_current"], { indent: 1 }),
    r("trade_payables", "Trade Payables", ["balance_sheet.trade_payables", "balance_sheet.equity_and_liabilities.current_liabilities.trade_payables"], { indent: 1 }),
    r("other_current_liabilities", "Other Current Liabilities", ["balance_sheet.other_current_liabilities", "balance_sheet.equity_and_liabilities.current_liabilities.other_current_liabilities"], { indent: 1 }),
    r("short_term_provisions", "Short-term Provisions", ["balance_sheet.short_term_provisions", "balance_sheet.equity_and_liabilities.current_liabilities.short_term_provisions"], { indent: 1 }),
    r("current_maturities_of_lt_debt", "Current Maturities of LT Debt", ["balance_sheet.current_maturities_of_lt_debt", "balance_sheet.equity_and_liabilities.current_liabilities.current_maturities_of_long_term_debt"], { indent: 1 }),
    r("total_current_liabilities", "Total Current Liabilities", ["balance_sheet.total_current_liabilities", "balance_sheet.equity_and_liabilities.current_liabilities.total_current_liabilities"], { isTotal: true }),
    r("total_equity_and_liabilities", "TOTAL EQUITY & LIABILITIES", ["balance_sheet.total_equity_and_liabilities", "balance_sheet.equity_and_liabilities.total_equity_and_liabilities"], { isTotal: true }),
  ];
}

function buildCashFlowRows(data: any, n: number): TableRow[] {
  return [
    { key: "h_cfo", label: "OPERATING ACTIVITIES", values: [], isSectionHeader: true },
    { key: "cash_from_operating_activities", label: "Net Cash from Operations (CFO)", values: getValuesFromPaths(data, ["cash_flow_statement.cash_from_operating_activities"], n), isSubtotal: true, editable: true },
    { key: "h_cfi", label: "INVESTING ACTIVITIES", values: [], isSectionHeader: true },
    { key: "cash_from_investing_activities", label: "Net Cash from Investing (CFI)", values: getValuesFromPaths(data, ["cash_flow_statement.cash_from_investing_activities"], n), isSubtotal: true, editable: true },
    { key: "capital_expenditure", label: "Capital Expenditure (CapEx)", values: getValuesFromPaths(data, ["cash_flow_statement.capital_expenditure"], n), indent: 1, editable: true },
    { key: "h_cff", label: "FINANCING ACTIVITIES", values: [], isSectionHeader: true },
    { key: "cash_from_financing_activities", label: "Net Cash from Financing (CFF)", values: getValuesFromPaths(data, ["cash_flow_statement.cash_from_financing_activities"], n), isSubtotal: true, editable: true },
    { key: "h_summary", label: "CASH POSITION", values: [], isSectionHeader: true },
    { key: "net_change_in_cash", label: "Net Change in Cash", values: getValuesFromPaths(data, ["cash_flow_statement.net_change_in_cash"], n), isSubtotal: true, editable: true },
    { key: "opening_cash_balance", label: "Opening Cash Balance", values: getValuesFromPaths(data, ["cash_flow_statement.opening_cash_balance"], n), editable: true },
    { key: "closing_cash_balance", label: "Closing Cash Balance", values: getValuesFromPaths(data, ["cash_flow_statement.closing_cash_balance"], n), isTotal: true, editable: true },
  ];
}

export default function ReviewPage() {
  const router = useRouter();
  const { extractedData, setExtractedData, setStep } = useValkyrie();

  const [localData, setLocalData] = useState<any>(() => (extractedData ? JSON.parse(JSON.stringify(extractedData)) : null));
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState<ReviewTab>("income");

  const years = useMemo<string[]>(() => {
    const y = getAtPath(localData, "income_statement.years");
    return Array.isArray(y) && y.length > 0 ? y : ["FY??"];
  }, [localData]);

  const yearCount = years.length;

  const incomeRows = useMemo(() => (localData ? buildIncomeRows(localData, yearCount) : []), [localData, yearCount]);
  const balanceRows = useMemo(() => (localData ? buildBalanceRows(localData, yearCount) : []), [localData, yearCount]);
  const cfRows = useMemo(() => (localData ? buildCashFlowRows(localData, yearCount) : []), [localData, yearCount]);

  const onEdit = useCallback((map: Record<string, string>, rowKey: string, yi: number, value: number) => {
    const path = map[rowKey];
    if (!path) return;
    setLocalData((prev: any) => {
      if (!prev) return prev;
      const next = JSON.parse(JSON.stringify(prev));
      updateValueAtPath(next, path, yi, value, yearCount);
      return next;
    });
    setIsDirty(true);
  }, [yearCount]);

  const handleIncomeEdit = useCallback((rowKey: string, yi: number, value: number) => onEdit(IS_MAP, rowKey, yi, value), [onEdit]);
  const handleBalanceEdit = useCallback((rowKey: string, yi: number, value: number) => onEdit(BS_MAP, rowKey, yi, value), [onEdit]);
  const handleCfEdit = useCallback((rowKey: string, yi: number, value: number) => onEdit(CF_MAP, rowKey, yi, value), [onEdit]);

  if (!localData) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 xl:px-0">
        <div className="mb-10">
          <StepIndicator icon={TableProperties} step={2} />
          <h1 className="mt-4 text-display text-primary">Review Extracted Financials</h1>
          <p className="mt-2 max-w-xl text-body text-secondary">
            Verify the income statement, balance sheet, and cash flow data.
          </p>
        </div>
        <div className="card flex flex-col items-center justify-center gap-4 p-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-[var(--valk-radius-lg)] border border-subtle bg-surface-alt text-muted">
            <AlertCircle className="h-6 w-6" strokeWidth={1.8} />
          </div>
          <div className="space-y-2">
            <h2 className="text-title text-primary">No extracted data found</h2>
            <p className="text-body text-secondary">
              Upload a report first, then return here to verify the extracted statements.
            </p>
          </div>
          <button onClick={() => router.push("/")} className="valk-button-primary">
            <Upload className="h-4 w-4" strokeWidth={1.8} />
            Go to Upload
          </button>
        </div>
      </div>
    );
  }

  const validation = (getAtPath(localData, "validation") ?? {
    balance_sheet_balances: true,
    cash_flow_ties_to_bs: true,
    discrepancies: [],
  }) as { balance_sheet_balances: boolean; cash_flow_ties_to_bs: boolean; discrepancies: string[] };

  const hasDiscrepancies =
    !validation.balance_sheet_balances ||
    !validation.cash_flow_ties_to_bs ||
    (validation.discrepancies?.length ?? 0) > 0;

  const companyName =
    getAtPath(localData, "metadata.company_name") ??
    getAtPath(localData, "company_name") ??
    "Unknown Company";

  const standaloneOrConsolidated = getAtPath(localData, "metadata.standalone_or_consolidated") ?? "Standalone";
  const industry = getAtPath(localData, "metadata.industry") ?? "Unknown Industry";
  const financialYearEnd = getAtPath(localData, "metadata.financial_year_end") ?? years[0];

  const activeRows = activeTab === "income" ? incomeRows : activeTab === "balance" ? balanceRows : cfRows;
  const activeEditHandler = activeTab === "income" ? handleIncomeEdit : activeTab === "balance" ? handleBalanceEdit : handleCfEdit;

  return (
    <div className="mx-auto max-w-[1160px] px-4 py-8 xl:px-0">
      <div className="mb-7">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <StepIndicator icon={TableProperties} step={2} />
          {isDirty ? (
            <span className="rounded-full border border-[var(--valk-warning)] bg-warning px-2 py-1 text-caption text-warning">
              Unsaved changes
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-display text-primary">Review Extracted Financials</h1>
            <p className="max-w-xl text-body text-secondary">
              Verify the numbers below. Click any value to override it inline.
            </p>
          </div>
          <div className="flex min-h-24 min-w-56 shrink-0 flex-col items-center justify-center rounded-[var(--valk-radius-lg)] border border-subtle bg-surface-alt p-5 text-center">
            <p className="text-caption uppercase tracking-label-wide text-muted">{standaloneOrConsolidated}</p>
            <p className="mt-1 text-heading font-semibold text-primary">{companyName}</p>
            <p className="mt-1 text-dense text-secondary">{industry} · {financialYearEnd}</p>
          </div>
        </div>
      </div>

      {hasDiscrepancies && (
        <div className="mb-5 flex items-start gap-3 rounded-[var(--valk-radius-md)] border border-[var(--valk-warning)] bg-warning px-4 py-3">
          <TriangleAlert size={14} className="mt-0.5 shrink-0 text-warning" />
          <div>
            <p className="mb-1 text-dense font-semibold text-warning">Extraction discrepancies detected</p>
            <ul className="space-y-0.5">
              {!validation.balance_sheet_balances && <li className="text-caption text-warning">Balance sheet does not balance (Assets != Equity + Liabilities)</li>}
              {!validation.cash_flow_ties_to_bs && <li className="text-caption text-warning">Closing cash in cash flow does not tie to balance sheet.</li>}
              {validation.discrepancies?.map((d, i) => <li key={i} className="text-caption text-warning">{d}</li>)}
            </ul>
          </div>
        </div>
      )}

      <div className="mb-0 flex gap-1 border-b border-subtle">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "relative -mb-px px-5 py-3 text-dense font-medium transition-colors duration-150",
              activeTab === tab.id
                ? "border-b border-accent text-accent"
                : "text-muted hover:text-primary"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-b-[var(--valk-radius-lg)] border border-subtle border-t-0">
        <FinancialTable years={years} rows={activeRows} onEdit={activeEditHandler} />
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <button onClick={() => { setExtractedData(null); setStep("upload"); router.push("/"); }} className="valk-button-secondary">
          <RefreshCw className="h-4 w-4" strokeWidth={1.8} />
          Re-extract from PDF
        </button>
        <div className="flex flex-wrap items-center gap-4">
          {!hasDiscrepancies && (
            <span className="inline-flex items-center gap-2 text-caption text-accent">
              <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.8} />
              Balance sheet balances
            </span>
          )}
          <button
            onClick={() => { setExtractedData(localData as ExtractedData); setStep("assumptions"); router.push("/assumptions"); }}
            className="valk-button-primary"
          >
            Looks Good - Set Assumptions
            <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </div>
  );
}
