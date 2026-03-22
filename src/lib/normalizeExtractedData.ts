// src/lib/normalizeExtractedData.ts
// ═══════════════════════════════════════════════════════════════════
// PROJECT VALKYRIE — N8N Response Normalizer
//
// The N8N extraction webhook returns a nested structure. This normalizer:
//   1. Unwraps the outer array:  [{ success, extractedData }]
//   2. Wraps every scalar number into a [value] array
//   3. Passes years[] directly from each statement section
//   4. Reconstructs the nested BalanceSheet the app types require
//   5. Runs balance-sheet and cash-flow validation checks
// ═══════════════════════════════════════════════════════════════════

import type {
  ExtractedData,
  CompanyMetadata,
  IncomeStatement,
  BalanceSheet,
  BalanceSheetAssets,
  NonCurrentAssets,
  CurrentAssets,
  EquityAndLiabilities,
  EquitySection,
  NonCurrentLiabilities,
  CurrentLiabilities,
  CashFlowStatement,
  SupportingData,
  ExtractionValidation,
} from "./types";

// ─── Raw N8N nested shape ─────────────────────────────────────────────────────

type Num = number | null | undefined;

interface FlatIncomeStatement {
  years?: string[];
  revenue?: Num;
  revenue_from_operations?: Num;
  other_income?: Num;
  total_income?: Num;
  operating_expenses?: {
    employee_benefit_expenses?: Num;
    cost_of_technical_subcontractors?: Num;
    depreciation_and_amortization?: Num;
    finance_cost?: Num;
    other_expenses?: Num;
    total_operating_expenses?: Num;
  };
  tax_expense?: {
    current_tax?: Num;
    deferred_tax?: Num;
  };
  pretax_income?: Num;
  income_tax_expense?: Num;
  net_income?: Num;
  other_comprehensive_income?: Num;
  total_comprehensive_income?: Num;
  eps_basic?: Num;
  eps_diluted?: Num;
}

interface FlatBalanceSheet {
  years?: string[];
  assets?: {
    current_assets?: {
      cash_and_equivalents?: Num;
      trade_receivables?: Num;
      investments_current?: Num;
      other_current_assets?: Num;
      total_current_assets?: Num;
    };
    non_current_assets?: {
      property_plant_equipment?: Num;
      right_of_use_assets?: Num;
      capital_work_in_progress?: Num;
      intangible_assets?: Num;
      investments_non_current?: Num;
      deferred_tax_assets?: Num;
      other_non_current_assets?: Num;
      total_non_current_assets?: Num;
    };
    total_assets?: Num;
  };
  liabilities?: {
    current_liabilities?: {
      trade_payables?: Num;
      lease_liabilities_current?: Num;
      other_current_liabilities?: Num;
      provisions_current?: Num;
      total_current_liabilities?: Num;
    };
    non_current_liabilities?: {
      lease_liabilities_non_current?: Num;
      deferred_tax_liabilities?: Num;
      other_non_current_liabilities?: Num;
      total_non_current_liabilities?: Num;
    };
  };
  equity?: {
    share_capital?: Num;
    retained_earnings?: Num;
    other_equity?: Num;
    total_equity?: Num;
  };
  total_liabilities_and_equity?: Num;
}

interface FlatCashFlow {
  years?: string[];
  operating_activities?: {
    net_cash_from_operations?: Num;
  };
  investing_activities?: {
    capex?: Num;
    net_cash_from_investing?: Num;
  };
  financing_activities?: {
    net_cash_from_financing?: Num;
  };
  net_change_in_cash?: Num;
  beginning_cash?: Num;
  ending_cash?: Num;
}

interface FlatExtractedData {
  company_name?: string;
  period_end_date?: string;
  currency?: string;
  income_statement?: FlatIncomeStatement;
  balance_sheet?: FlatBalanceSheet;
  cash_flow_statement?: FlatCashFlow;
}

interface N8nResponseItem {
  success?: boolean;
  extractedData?: FlatExtractedData;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Wraps a scalar value into a single-element array.
 * ExtractedData uses number[] throughout; null is intentional for fields
 * absent in the report — UI components render null as "—".
 */
function wrap(v: Num): number[] {
  if (v === null || v === undefined) return [null as unknown as number];
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return [isFinite(n) ? n : null as unknown as number];
}

/**
 * Derives a short FY label from an ISO date string.
 * "2024-03-31" → "FY24"
 */
function toFyLabel(isoDate: string | undefined): string {
  if (!isoDate) return "FY??";
  const year = new Date(isoDate).getFullYear();
  return `FY${String(year).slice(-2)}`;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function normalizeExtractedData(raw: unknown): ExtractedData {
  // ── 1. Unwrap array ─────────────────────────────────────────────
  let ed: FlatExtractedData;
  if (Array.isArray(raw)) {
    const item = (raw as N8nResponseItem[])[0] ?? {};
    ed = item.extractedData ?? {};
  } else if (raw !== null && typeof raw === "object" && "extractedData" in raw) {
    ed = (raw as N8nResponseItem).extractedData ?? {};
  } else {
    ed = (raw as FlatExtractedData) ?? {};
  }

  const is: FlatIncomeStatement = ed.income_statement ?? {};
  const bs: FlatBalanceSheet    = ed.balance_sheet ?? {};
  const cf: FlatCashFlow        = ed.cash_flow_statement ?? {};

  const isYears = (is.years && is.years.length > 0) ? is.years : [toFyLabel(ed.period_end_date)];
  const bsYears = (bs.years && bs.years.length > 0) ? bs.years : [toFyLabel(ed.period_end_date)];
  const cfYears = (cf.years && cf.years.length > 0) ? cf.years : [toFyLabel(ed.period_end_date)];

  // ── 2. Income Statement — wrap every scalar ──────────────────────
  const incomeStatement: IncomeStatement = {
    years:                                   isYears,
    revenue_from_operations:                 wrap(is.revenue_from_operations ?? is.revenue),
    other_income:                            wrap(is.other_income),
    total_income:                            wrap(is.total_income),
    cost_of_materials_consumed:              wrap(is.operating_expenses?.cost_of_technical_subcontractors),
    purchase_of_stock_in_trade:              wrap(null),
    changes_in_inventories:                  wrap(null),
    employee_benefits_expense:               wrap(is.operating_expenses?.employee_benefit_expenses),
    depreciation_and_amortisation:           wrap(is.operating_expenses?.depreciation_and_amortization),
    finance_costs:                           wrap(is.operating_expenses?.finance_cost),
    other_expenses:                          wrap(is.operating_expenses?.other_expenses),
    other_expenses_breakup:                  { top_items: [] },
    total_expenses:                          wrap(is.operating_expenses?.total_operating_expenses),
    profit_before_exceptional_items_and_tax: wrap(is.pretax_income),
    exceptional_items:                       wrap(null),
    profit_before_tax:                       wrap(is.pretax_income),
    current_tax:                             wrap(is.tax_expense?.current_tax ?? null),
    deferred_tax:                            wrap(is.tax_expense?.deferred_tax ?? null),
    total_tax_expense:                       wrap(is.income_tax_expense),
    profit_after_tax:                        wrap(is.net_income),
    other_comprehensive_income:              wrap(is.other_comprehensive_income),
    total_comprehensive_income:              wrap(is.total_comprehensive_income),
    eps_basic:                               wrap(is.eps_basic),
    eps_diluted:                             wrap(is.eps_diluted),
  };

  // ── 3. Balance Sheet — reconstruct nested structure ──────────────
  const nonCurrentAssets: NonCurrentAssets = {
    property_plant_equipment_gross: wrap(bs.assets?.non_current_assets?.property_plant_equipment),
    accumulated_depreciation:       wrap(null),
    property_plant_equipment_net:   wrap(bs.assets?.non_current_assets?.property_plant_equipment),
    capital_work_in_progress:       wrap(bs.assets?.non_current_assets?.capital_work_in_progress),
    intangible_assets:              wrap(bs.assets?.non_current_assets?.intangible_assets),
    right_of_use_assets:            wrap(bs.assets?.non_current_assets?.right_of_use_assets),
    non_current_investments:        wrap(bs.assets?.non_current_assets?.investments_non_current),
    deferred_tax_assets_net:        wrap(bs.assets?.non_current_assets?.deferred_tax_assets),
    other_non_current_assets:       wrap(bs.assets?.non_current_assets?.other_non_current_assets),
    total_non_current_assets:       wrap(bs.assets?.non_current_assets?.total_non_current_assets),
  };

  const currentAssets: CurrentAssets = {
    inventories:               wrap(null),
    inventories_breakup: {
      raw_materials:     wrap(null),
      work_in_progress:  wrap(null),
      finished_goods:    wrap(null),
      stores_and_spares: wrap(null),
    },
    trade_receivables:         wrap(bs.assets?.current_assets?.trade_receivables),
    cash_and_cash_equivalents: wrap(bs.assets?.current_assets?.cash_and_equivalents),
    bank_balances_other:       wrap(null),
    current_investments:       wrap(bs.assets?.current_assets?.investments_current),
    other_current_assets:      wrap(bs.assets?.current_assets?.other_current_assets),
    total_current_assets:      wrap(bs.assets?.current_assets?.total_current_assets),
  };

  const bsAssets: BalanceSheetAssets = {
    non_current:  nonCurrentAssets,
    current:      currentAssets,
    total_assets: wrap(bs.assets?.total_assets),
  };

  const equity: EquitySection = {
    share_capital:        wrap(bs.equity?.share_capital),
    reserves_and_surplus: wrap(
      ((bs.equity?.retained_earnings ?? 0) as number) +
      ((bs.equity?.other_equity ?? 0) as number) || null
    ),
    total_equity:         wrap(bs.equity?.total_equity),
  };

  const nonCurrentLiabilities: NonCurrentLiabilities = {
    long_term_borrowings:          wrap(null),
    lease_liabilities_non_current: wrap(bs.liabilities?.non_current_liabilities?.lease_liabilities_non_current),
    deferred_tax_liabilities_net:  wrap(bs.liabilities?.non_current_liabilities?.deferred_tax_liabilities),
    long_term_provisions:          wrap(null),
    other_non_current_liabilities: wrap(bs.liabilities?.non_current_liabilities?.other_non_current_liabilities),
    total_non_current_liabilities: wrap(bs.liabilities?.non_current_liabilities?.total_non_current_liabilities),
  };

  const currentLiabilities: CurrentLiabilities = {
    short_term_borrowings:               wrap(null),
    lease_liabilities_current:           wrap(bs.liabilities?.current_liabilities?.lease_liabilities_current),
    trade_payables:                      wrap(bs.liabilities?.current_liabilities?.trade_payables),
    other_current_liabilities:           wrap(bs.liabilities?.current_liabilities?.other_current_liabilities),
    short_term_provisions:               wrap(bs.liabilities?.current_liabilities?.provisions_current),
    current_maturities_of_long_term_debt: wrap(null),
    total_current_liabilities:           wrap(bs.liabilities?.current_liabilities?.total_current_liabilities),
  };

  const equityAndLiabilities: EquityAndLiabilities = {
    equity,
    non_current_liabilities:      nonCurrentLiabilities,
    current_liabilities:          currentLiabilities,
    total_equity_and_liabilities: wrap(bs.total_liabilities_and_equity),
  };

  const balanceSheet: BalanceSheet = {
    years:                 bsYears,
    assets:                bsAssets,
    equity_and_liabilities: equityAndLiabilities,
  };

  // ── 4. Cash Flow Statement ──────────────────────────────────────
  const cashFlowStatement: CashFlowStatement = {
    years:                          cfYears,
    cash_from_operating_activities: wrap(cf.operating_activities?.net_cash_from_operations),
    cash_from_investing_activities: wrap(cf.investing_activities?.net_cash_from_investing),
    capital_expenditure:            wrap(cf.investing_activities?.capex),
    cash_from_financing_activities: wrap(cf.financing_activities?.net_cash_from_financing),
    net_change_in_cash:             wrap(cf.net_change_in_cash),
    opening_cash_balance:           wrap(cf.beginning_cash),
    closing_cash_balance:           wrap(cf.ending_cash),
  };

  // ── 5. Metadata ─────────────────────────────────────────────────
  const fyLabel = toFyLabel(ed.period_end_date);
  const metadata: CompanyMetadata = {
    company_name:               ed.company_name ?? "Unknown Company",
    cin:                        "",
    bse_code:                   null,
    nse_symbol:                 null,
    industry:                   "Technology",
    sub_industry:               "",
    financial_year_end:         fyLabel,
    currency:                   ed.currency ?? "INR Crores",
    auditor:                    "",
    audit_opinion:              "",
    standalone_or_consolidated: "Standalone",
    report_type:                "non_banking",
    shares_outstanding_basic:   0,
    shares_outstanding_diluted: 0,
    face_value_per_share:       0,
  };

  // ── 6. Supporting Data — defaults ────────────────────────────────
  const supportingData: SupportingData = {
    depreciation_rates:         [],
    capex_from_cash_flow:       wrap(cf.investing_activities?.capex),
    weighted_avg_interest_rate: null,
    effective_tax_rate:         wrap(null),
    statutory_tax_rate:         25.168,
    dividend_per_share:         wrap(null),
    dividend_payout_ratio:      wrap(null),
    receivable_days:            wrap(null),
    inventory_days:             wrap(null),
    payable_days:               wrap(null),
    segment_revenue:            [],
    management_guidance: {
      revenue_growth_commentary: null,
      margin_commentary:         null,
      capex_plans:               null,
      debt_plans:                null,
    },
    key_risks:                  [],
    peer_companies_mentioned:   [],
  };

  // ── 7. Validation ────────────────────────────────────────────────
  const discrepancies: string[] = [];

  const totalAssets = bs.assets?.total_assets ?? null;
  const totalEL     = bs.total_liabilities_and_equity ?? null;
  const bsBalances  = totalAssets === null || totalEL === null
    ? true
    : Math.abs(totalAssets - totalEL) < 1;

  if (!bsBalances && totalAssets !== null && totalEL !== null) {
    discrepancies.push(
      `Balance sheet mismatch: Total Assets (${totalAssets}) ≠ Total Equity & Liabilities (${totalEL})`
    );
  }

  const cfCash    = cf.ending_cash ?? null;
  const bsCash    = bs.assets?.current_assets?.cash_and_equivalents ?? null;
  const cfTiesToBs = cfCash === null || bsCash === null
    ? true
    : Math.abs(cfCash - bsCash) < 1;

  if (!cfTiesToBs && cfCash !== null && bsCash !== null) {
    discrepancies.push(
      `Cash flow mismatch: CF closing cash (${cfCash}) ≠ BS cash (${bsCash})`
    );
  }

  const validation: ExtractionValidation = {
    balance_sheet_balances: bsBalances,
    cash_flow_ties_to_bs:   cfTiesToBs,
    discrepancies,
  };

  return {
    metadata,
    income_statement:    incomeStatement,
    balance_sheet:       balanceSheet,
    cash_flow_statement: cashFlowStatement,
    supporting_data:     supportingData,
    validation,
  };
}
