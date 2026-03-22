// src/lib/normalizeExtractedData.ts
// ═══════════════════════════════════════════════════════════════════
// PROJECT VALKYRIE — N8N Response Normalizer
//
// The N8N extraction webhook returns a nested structure. This normalizer:
//   1. Unwraps the outer array:  [{ success, extractedData }]
//   2. Wraps every scalar number into a [value] array
//   3. Handles BOTH the expected "flat" format AND the actual Claude
//      extraction format (which uses different field names)
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Num = number | null | undefined;

/**
 * Safely dig into a nested object using a dot-separated path.
 * Returns undefined if any segment is missing.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dig(obj: any, ...keys: string[]): Num {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cur: any = obj;
  for (const k of keys) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = cur[k];
  }
  if (cur === null || cur === undefined) return undefined;
  const n = Number(cur);
  return isFinite(n) ? n : undefined;
}

/**
 * Returns the first defined numeric value from multiple candidates.
 */
function first(...vals: Num[]): Num {
  for (const v of vals) {
    if (v !== null && v !== undefined && isFinite(Number(v))) return Number(v);
  }
  return undefined;
}

/**
 * Wraps a scalar value into a single-element array.
 * ExtractedData uses number[] throughout; null is intentional for fields
 * absent in the report — UI components render null as "—".
 */
function wrap(v: Num): number[] {
  if (v === null || v === undefined) return [null as unknown as number];
  const n = typeof v === "string" ? parseFloat(v as unknown as string) : Number(v);
  return [isFinite(n) ? n : (null as unknown as number)];
}

/**
 * Derives a short FY label from an ISO date string or report_period.
 * "2024-03-31" → "FY24", "FY2024" → "FY24"
 */
function toFyLabel(
  periodEnd: string | undefined,
  reportPeriod: string | undefined
): string {
  // Try report_period first (e.g., "FY2024")
  if (reportPeriod) {
    const match = reportPeriod.match(/\d{4}/);
    if (match) return `FY${match[0].slice(-2)}`;
  }
  // Fall back to period_end / period_end_date
  if (periodEnd) {
    const year = new Date(periodEnd).getFullYear();
    if (!isNaN(year)) return `FY${String(year).slice(-2)}`;
  }
  return "FY??";
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function normalizeExtractedData(raw: unknown): ExtractedData {
  // ── 1. Unwrap N8N array envelope ──────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ed: any;
  if (Array.isArray(raw)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const item = (raw as any[])[0] ?? {};
    ed = item.extractedData ?? item.extracted_data ?? item;
  } else if (raw !== null && typeof raw === "object") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = raw as any;
    ed = r.extractedData ?? r.extracted_data ?? r;
  } else {
    ed = {};
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const is: any = ed.income_statement ?? {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bs: any = ed.balance_sheet ?? {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cf: any = ed.cash_flow_statement ?? {};

  const fyLabel = toFyLabel(
    ed.period_end ?? ed.period_end_date,
    ed.report_period
  );

  const isYears =
    is.years && is.years.length > 0 ? is.years : [fyLabel];
  const bsYears =
    bs.years && bs.years.length > 0 ? bs.years : [fyLabel];
  const cfYears =
    cf.years && cf.years.length > 0 ? cf.years : [fyLabel];

  // ── 2. Income Statement ───────────────────────────────────────
  // Handle both flat (actual N8N) and nested (operating_expenses) formats

  const revenue = first(
    dig(is, "revenue_from_operations"),
    dig(is, "revenue")
  );
  const otherIncome = first(dig(is, "other_income"));
  const totalIncome = first(dig(is, "total_income"));

  // Expense items — try flat first, then nested under operating_expenses
  const employeeExp = first(
    dig(is, "employee_benefit_expenses"),
    dig(is, "employee_benefits_expense"),
    dig(is, "operating_expenses", "employee_benefit_expenses")
  );
  const costOfMaterials = first(
    dig(is, "cost_of_materials_consumed"),
    dig(is, "cost_of_technical_sub_contractors"),
    dig(is, "cost_of_technical_subcontractors"),
    dig(is, "operating_expenses", "cost_of_technical_subcontractors")
  );
  const purchaseOfStock = first(
    dig(is, "purchase_of_stock_in_trade")
  );
  const changesInInventories = first(
    dig(is, "changes_in_inventories")
  );
  const da = first(
    dig(is, "depreciation_and_amortization"),
    dig(is, "depreciation_and_amortisation"),
    dig(is, "operating_expenses", "depreciation_and_amortization")
  );
  const financeCost = first(
    dig(is, "finance_cost"),
    dig(is, "finance_costs"),
    dig(is, "operating_expenses", "finance_cost")
  );
  const otherExp = first(
    dig(is, "other_expenses"),
    dig(is, "operating_expenses", "other_expenses")
  );
  const totalExpenses = first(
    dig(is, "total_expenses"),
    dig(is, "operating_expenses", "total_operating_expenses")
  );

  // Profit / tax
  const pbt = first(
    dig(is, "profit_before_tax"),
    dig(is, "pretax_income"),
    dig(is, "profit_before_exceptional_items_and_tax")
  );
  const currentTax = first(
    dig(is, "current_tax"),
    dig(is, "tax_expense", "current_tax")
  );
  const deferredTax = first(
    dig(is, "deferred_tax"),
    dig(is, "tax_expense", "deferred_tax")
  );
  const totalTax = first(
    dig(is, "total_tax"),
    dig(is, "income_tax_expense"),
    dig(is, "tax_expense", "total_tax")
  );
  const pat = first(
    dig(is, "profit_after_tax"),
    dig(is, "net_income"),
    dig(is, "pat")
  );
  const oci = first(
    dig(is, "other_comprehensive_income_net_of_tax"),
    dig(is, "other_comprehensive_income")
  );
  const tci = first(
    dig(is, "total_comprehensive_income")
  );
  const epsBasic = first(
    dig(is, "earnings_per_share_basic"),
    dig(is, "eps_basic")
  );
  const epsDiluted = first(
    dig(is, "earnings_per_share_diluted"),
    dig(is, "eps_diluted")
  );

  const incomeStatement: IncomeStatement = {
    years: isYears,
    revenue_from_operations: wrap(revenue),
    other_income: wrap(otherIncome),
    total_income: wrap(totalIncome),
    cost_of_materials_consumed: wrap(costOfMaterials),
    purchase_of_stock_in_trade: wrap(purchaseOfStock),
    changes_in_inventories: wrap(changesInInventories),
    employee_benefits_expense: wrap(employeeExp),
    depreciation_and_amortisation: wrap(da),
    finance_costs: wrap(financeCost),
    other_expenses: wrap(otherExp),
    other_expenses_breakup: { top_items: [] },
    total_expenses: wrap(totalExpenses),
    profit_before_exceptional_items_and_tax: wrap(pbt),
    exceptional_items: wrap(null),
    profit_before_tax: wrap(pbt),
    current_tax: wrap(currentTax),
    deferred_tax: wrap(deferredTax),
    total_tax_expense: wrap(totalTax),
    profit_after_tax: wrap(pat),
    other_comprehensive_income: wrap(oci),
    total_comprehensive_income: wrap(tci),
    eps_basic: wrap(epsBasic),
    eps_diluted: wrap(epsDiluted),
  };

  // ── 3. Balance Sheet ──────────────────────────────────────────
  // The N8N response nests as:
  //   balance_sheet.assets.non_current_assets.{...}
  //   balance_sheet.assets.current_assets.{...}
  //   balance_sheet.liabilities.equity.{...}
  //   balance_sheet.liabilities.non_current_liabilities.{...}
  //   balance_sheet.liabilities.current_liabilities.{...}
  //   balance_sheet.total_equity_and_liabilities

  const bsAssetsSrc = bs.assets ?? {};
  const bsNcaSrc = bsAssetsSrc.non_current_assets ?? {};
  const bsCaSrc = bsAssetsSrc.current_assets ?? {};

  // Equity can be under bs.liabilities.equity OR bs.equity
  const bsEqSrc = bs.liabilities?.equity ?? bs.equity ?? {};

  // Liabilities
  const bsLiabSrc = bs.liabilities ?? {};
  const bsNclSrc = bsLiabSrc.non_current_liabilities ?? {};
  const bsClSrc = bsLiabSrc.current_liabilities ?? {};

  const ppe = first(
    dig(bsNcaSrc, "property_plant_and_equipment"),
    dig(bsNcaSrc, "property_plant_equipment")
  );

  const nonCurrentAssets: NonCurrentAssets = {
    property_plant_equipment_gross: wrap(ppe),
    accumulated_depreciation: wrap(null),
    property_plant_equipment_net: wrap(ppe),
    capital_work_in_progress: wrap(
      first(dig(bsNcaSrc, "capital_work_in_progress"))
    ),
    intangible_assets: wrap(
      first(
        dig(bsNcaSrc, "other_intangible_assets"),
        dig(bsNcaSrc, "intangible_assets"),
        dig(bsNcaSrc, "goodwill") // Include goodwill if no separate intangibles
      )
    ),
    right_of_use_assets: wrap(
      first(dig(bsNcaSrc, "right_of_use_assets"))
    ),
    non_current_investments: wrap(
      first(
        dig(bsNcaSrc, "investments"),
        dig(bsNcaSrc, "investments_non_current")
      )
    ),
    deferred_tax_assets_net: wrap(
      first(
        dig(bsNcaSrc, "deferred_tax_assets"),
        dig(bsNcaSrc, "deferred_tax_assets_net")
      )
    ),
    other_non_current_assets: wrap(
      first(
        dig(bsNcaSrc, "other_non_current_assets"),
        // Sum remaining NCA fields if present
        (() => {
          const loans = dig(bsNcaSrc, "loans");
          const ofa = dig(bsNcaSrc, "other_financial_assets");
          const ita = dig(bsNcaSrc, "income_tax_assets_net");
          const ona = dig(bsNcaSrc, "other_non_current_assets");
          const parts = [loans, ofa, ita, ona].filter(
            (v) => v !== null && v !== undefined
          ) as number[];
          return parts.length > 0 ? parts.reduce((a, b) => a + b, 0) : undefined;
        })()
      )
    ),
    total_non_current_assets: wrap(
      first(
        dig(bsNcaSrc, "total_non_current_assets"),
        dig(bsAssetsSrc, "total_non_current_assets")
      )
    ),
  };

  const currentAssets: CurrentAssets = {
    inventories: wrap(
      first(dig(bsCaSrc, "inventories"))
    ),
    inventories_breakup: {
      raw_materials: wrap(null),
      work_in_progress: wrap(null),
      finished_goods: wrap(null),
      stores_and_spares: wrap(null),
    },
    trade_receivables: wrap(
      first(dig(bsCaSrc, "trade_receivables"))
    ),
    cash_and_cash_equivalents: wrap(
      first(
        dig(bsCaSrc, "cash_and_cash_equivalents"),
        dig(bsCaSrc, "cash_and_equivalents")
      )
    ),
    bank_balances_other: wrap(null),
    current_investments: wrap(
      first(
        dig(bsCaSrc, "investments"),
        dig(bsCaSrc, "investments_current")
      )
    ),
    other_current_assets: wrap(
      first(
        dig(bsCaSrc, "other_current_assets"),
        // Sum remaining CA fields if present
        (() => {
          const loans = dig(bsCaSrc, "loans");
          const ofa = dig(bsCaSrc, "other_financial_assets");
          const ita = dig(bsCaSrc, "income_tax_assets_net");
          const oca = dig(bsCaSrc, "other_current_assets");
          const parts = [loans, ofa, ita, oca].filter(
            (v) => v !== null && v !== undefined
          ) as number[];
          return parts.length > 0 ? parts.reduce((a, b) => a + b, 0) : undefined;
        })()
      )
    ),
    total_current_assets: wrap(
      first(
        dig(bsCaSrc, "total_current_assets"),
        dig(bsAssetsSrc, "total_current_assets")
      )
    ),
  };

  const totalAssetVal = first(
    dig(bsAssetsSrc, "total_assets"),
    dig(bs, "total_assets")
  );

  const bsAssetsOut: BalanceSheetAssets = {
    non_current: nonCurrentAssets,
    current: currentAssets,
    total_assets: wrap(totalAssetVal),
  };

  // Equity
  const shareCapital = first(
    dig(bsEqSrc, "equity_share_capital"),
    dig(bsEqSrc, "share_capital")
  );
  const reservesAndSurplus = first(
    dig(bsEqSrc, "other_equity"),
    dig(bsEqSrc, "reserves_and_surplus"),
    (() => {
      const re = dig(bsEqSrc, "retained_earnings");
      const oe = dig(bsEqSrc, "other_equity");
      if (re !== undefined && oe !== undefined) return (re ?? 0) + (oe ?? 0);
      return re ?? oe;
    })()
  );
  const totalEquity = first(
    dig(bsEqSrc, "total_equity")
  );

  const equity: EquitySection = {
    share_capital: wrap(shareCapital),
    reserves_and_surplus: wrap(reservesAndSurplus),
    total_equity: wrap(totalEquity),
  };

  // Non-current liabilities
  const nonCurrentLiabilities: NonCurrentLiabilities = {
    long_term_borrowings: wrap(
      first(
        dig(bsNclSrc, "long_term_borrowings"),
        dig(bsNclSrc, "borrowings")
      )
    ),
    lease_liabilities_non_current: wrap(
      first(
        dig(bsNclSrc, "lease_liabilities"),
        dig(bsNclSrc, "lease_liabilities_non_current")
      )
    ),
    deferred_tax_liabilities_net: wrap(
      first(
        dig(bsNclSrc, "deferred_tax_liabilities"),
        dig(bsNclSrc, "deferred_tax_liabilities_net")
      )
    ),
    long_term_provisions: wrap(
      first(dig(bsNclSrc, "long_term_provisions"))
    ),
    other_non_current_liabilities: wrap(
      first(
        dig(bsNclSrc, "other_non_current_liabilities"),
        (() => {
          const ofl = dig(bsNclSrc, "other_financial_liabilities");
          const onl = dig(bsNclSrc, "other_non_current_liabilities");
          const parts = [ofl, onl].filter(
            (v) => v !== null && v !== undefined
          ) as number[];
          return parts.length > 0 ? parts.reduce((a, b) => a + b, 0) : undefined;
        })()
      )
    ),
    total_non_current_liabilities: wrap(
      first(
        dig(bsNclSrc, "total_non_current_liabilities"),
        dig(bsLiabSrc, "total_non_current_liabilities")
      )
    ),
  };

  // Current liabilities
  const tradePay = first(
    (() => {
      const msme = dig(bsClSrc, "trade_payables_msme");
      const others = dig(bsClSrc, "trade_payables_others");
      if (msme !== undefined || others !== undefined)
        return (msme ?? 0) + (others ?? 0);
      return undefined;
    })(),
    dig(bsClSrc, "trade_payables")
  );

  const currentLiabilities: CurrentLiabilities = {
    short_term_borrowings: wrap(
      first(
        dig(bsClSrc, "short_term_borrowings"),
        dig(bsClSrc, "borrowings")
      )
    ),
    lease_liabilities_current: wrap(
      first(
        dig(bsClSrc, "lease_liabilities"),
        dig(bsClSrc, "lease_liabilities_current")
      )
    ),
    trade_payables: wrap(tradePay),
    other_current_liabilities: wrap(
      first(
        dig(bsClSrc, "other_current_liabilities"),
        (() => {
          const ofl = dig(bsClSrc, "other_financial_liabilities");
          const ocl = dig(bsClSrc, "other_current_liabilities");
          const parts = [ofl, ocl].filter(
            (v) => v !== null && v !== undefined
          ) as number[];
          return parts.length > 0 ? parts.reduce((a, b) => a + b, 0) : undefined;
        })()
      )
    ),
    short_term_provisions: wrap(
      first(
        dig(bsClSrc, "provisions"),
        dig(bsClSrc, "short_term_provisions")
      )
    ),
    current_maturities_of_long_term_debt: wrap(
      first(
        dig(bsClSrc, "current_maturities_of_long_term_debt"),
        dig(bsClSrc, "current_maturities_of_lt_debt")
      )
    ),
    total_current_liabilities: wrap(
      first(
        dig(bsClSrc, "total_current_liabilities"),
        dig(bsLiabSrc, "total_current_liabilities")
      )
    ),
  };

  const totalELVal = first(
    dig(bs, "total_equity_and_liabilities"),
    dig(bs, "total_liabilities_and_equity")
  );

  const equityAndLiabilities: EquityAndLiabilities = {
    equity,
    non_current_liabilities: nonCurrentLiabilities,
    current_liabilities: currentLiabilities,
    total_equity_and_liabilities: wrap(totalELVal),
  };

  const balanceSheet: BalanceSheet = {
    years: bsYears,
    assets: bsAssetsOut,
    equity_and_liabilities: equityAndLiabilities,
  };

  // ── 4. Cash Flow Statement ────────────────────────────────────
  const cfOps = cf.operating_activities ?? {};
  const cfInv = cf.investing_activities ?? {};
  const cfFin = cf.financing_activities ?? {};

  const cfo = first(
    dig(cfOps, "net_cash_from_operating_activities"),
    dig(cfOps, "net_cash_from_operations"),
    dig(cf, "net_cash_from_operating_activities")
  );
  const cfi = first(
    dig(cfInv, "net_cash_used_in_investing_activities"),
    dig(cfInv, "net_cash_from_investing_activities"),
    dig(cfInv, "net_cash_from_investing"),
    dig(cf, "net_cash_used_in_investing_activities")
  );
  const capex = first(
    dig(cfInv, "expenditure_on_property_plant_and_equipment"),
    dig(cfInv, "capital_expenditure"),
    dig(cfInv, "capex")
  );
  const cff = first(
    dig(cfFin, "net_cash_used_in_financing_activities"),
    dig(cfFin, "net_cash_from_financing_activities"),
    dig(cfFin, "net_cash_from_financing"),
    dig(cf, "net_cash_used_in_financing_activities")
  );
  const netCashChange = first(
    dig(cf, "net_change_in_cash")
  );
  const openingCash = first(
    dig(cf, "cash_at_beginning"),
    dig(cf, "beginning_cash"),
    dig(cf, "opening_cash_balance")
  );
  const closingCash = first(
    dig(cf, "cash_at_end"),
    dig(cf, "ending_cash"),
    dig(cf, "closing_cash_balance")
  );

  const cashFlowStatement: CashFlowStatement = {
    years: cfYears,
    cash_from_operating_activities: wrap(cfo),
    cash_from_investing_activities: wrap(cfi),
    capital_expenditure: wrap(capex),
    cash_from_financing_activities: wrap(cff),
    net_change_in_cash: wrap(netCashChange),
    opening_cash_balance: wrap(openingCash),
    closing_cash_balance: wrap(closingCash),
  };

  // ── 5. Metadata ───────────────────────────────────────────────
  const metadata: CompanyMetadata = {
    company_name: ed.company_name ?? "Unknown Company",
    cin: ed.cin ?? "",
    bse_code: ed.bse_code ?? null,
    nse_symbol: ed.nse_symbol ?? null,
    industry: ed.industry ?? "Technology",
    sub_industry: ed.sub_industry ?? "",
    financial_year_end: fyLabel,
    currency: ed.currency ?? "INR Crores",
    auditor: ed.auditor?.name ?? ed.auditor ?? "",
    audit_opinion: ed.audit_opinion ?? "",
    standalone_or_consolidated: ed.standalone_or_consolidated ?? "Standalone",
    report_type: ed.report_type ?? "non_banking",
    shares_outstanding_basic: ed.shares_outstanding_basic ?? 0,
    shares_outstanding_diluted: ed.shares_outstanding_diluted ?? 0,
    face_value_per_share: ed.face_value_per_share ?? 0,
  };

  // ── 6. Supporting Data — defaults ─────────────────────────────
  const keyMetrics = ed.key_metrics ?? {};

  const supportingData: SupportingData = {
    depreciation_rates: [],
    capex_from_cash_flow: wrap(capex),
    weighted_avg_interest_rate: null,
    effective_tax_rate: wrap(null),
    statutory_tax_rate: 25.168,
    dividend_per_share: wrap(first(dig(keyMetrics, "dividend_per_share"))),
    dividend_payout_ratio: wrap(null),
    receivable_days: wrap(null),
    inventory_days: wrap(null),
    payable_days: wrap(null),
    segment_revenue: [],
    management_guidance: {
      revenue_growth_commentary: null,
      margin_commentary: null,
      capex_plans: null,
      debt_plans: null,
    },
    key_risks: [],
    peer_companies_mentioned: [],
  };

  // ── 7. Validation ─────────────────────────────────────────────
  const discrepancies: string[] = [];

  const bsBalances =
    totalAssetVal == null || totalELVal == null
      ? true
      : Math.abs(totalAssetVal - totalELVal) < 1;

  if (!bsBalances && totalAssetVal != null && totalELVal != null) {
    discrepancies.push(
      `Balance sheet mismatch: Total Assets (${totalAssetVal}) ≠ Total Equity & Liabilities (${totalELVal})`
    );
  }

  // Cash tie: closing cash from CF should match BS cash
  const bsCashVal = first(
    dig(bsCaSrc, "cash_and_cash_equivalents"),
    dig(bsCaSrc, "cash_and_equivalents")
  );
  const cfTiesToBs =
    closingCash == null || bsCashVal == null
      ? true
      : Math.abs(closingCash - bsCashVal) < 1;

  if (!cfTiesToBs && closingCash != null && bsCashVal != null) {
    discrepancies.push(
      `Cash flow mismatch: CF closing cash (${closingCash}) ≠ BS cash (${bsCashVal})`
    );
  }

  const validation: ExtractionValidation = {
    balance_sheet_balances: bsBalances,
    cash_flow_ties_to_bs: cfTiesToBs,
    discrepancies,
  };

  return {
    metadata,
    income_statement: incomeStatement,
    balance_sheet: balanceSheet,
    cash_flow_statement: cashFlowStatement,
    supporting_data: supportingData,
    validation,
  };
}
