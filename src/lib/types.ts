// src/lib/types.ts
// ═══════════════════════════════════════════════════════════════════
// PROJECT VALKYRIE — Core TypeScript Interfaces
// Mirrors the JSON schemas defined in prompts.ts
// ═══════════════════════════════════════════════════════════════════

// ─── Shared ──────────────────────────────────────────────────────

export type Step = "upload" | "review" | "assumptions" | "report";

export type ReportType = "non_banking" | "banking_nbfc";

export type DepreciationMethod = "SLM" | "WDV";

// ─── Extracted Data ───────────────────────────────────────────────

export interface CompanyMetadata {
  company_name: string;
  cin: string;
  bse_code: string | null;
  nse_symbol: string | null;
  industry: string;
  sub_industry: string;
  financial_year_end: string;
  currency: string;
  auditor: string;
  audit_opinion: string;
  standalone_or_consolidated: string;
  report_type: ReportType;
  shares_outstanding_basic: number;
  shares_outstanding_diluted: number;
  face_value_per_share: number;
}

export interface OtherExpenseItem {
  name: string;
  values: number[];
}

export interface IncomeStatement {
  years: string[] | undefined;
  revenue_from_operations: number[];
  other_income: number[];
  total_income: number[];
  cost_of_materials_consumed: number[];
  purchase_of_stock_in_trade: number[];
  changes_in_inventories: number[];
  employee_benefits_expense: number[];
  depreciation_and_amortisation: number[];
  finance_costs: number[];
  other_expenses: number[];
  other_expenses_breakup: {
    top_items: OtherExpenseItem[];
  };
  total_expenses: number[];
  profit_before_exceptional_items_and_tax: number[];
  exceptional_items: number[];
  profit_before_tax: number[];
  current_tax: number[];
  deferred_tax: number[];
  total_tax_expense: number[];
  profit_after_tax: number[];
  other_comprehensive_income: number[];
  total_comprehensive_income: number[];
  eps_basic: number[];
  eps_diluted: number[];
}

export interface InventoriesBreakup {
  raw_materials: number[];
  work_in_progress: number[];
  finished_goods: number[];
  stores_and_spares: number[];
}

export interface NonCurrentAssets {
  property_plant_equipment_gross: number[];
  accumulated_depreciation: number[];
  property_plant_equipment_net: number[];
  capital_work_in_progress: number[];
  intangible_assets: number[];
  right_of_use_assets: number[];
  non_current_investments: number[];
  deferred_tax_assets_net: number[];
  other_non_current_assets: number[];
  total_non_current_assets: number[];
}

export interface CurrentAssets {
  inventories: number[];
  inventories_breakup: InventoriesBreakup;
  trade_receivables: number[];
  cash_and_cash_equivalents: number[];
  bank_balances_other: number[];
  current_investments: number[];
  other_current_assets: number[];
  total_current_assets: number[];
}

export interface BalanceSheetAssets {
  non_current: NonCurrentAssets;
  current: CurrentAssets;
  total_assets: number[];
}

export interface EquitySection {
  share_capital: number[];
  reserves_and_surplus: number[];
  total_equity: number[];
}

export interface NonCurrentLiabilities {
  long_term_borrowings: number[];
  lease_liabilities_non_current: number[];
  deferred_tax_liabilities_net: number[];
  long_term_provisions: number[];
  other_non_current_liabilities: number[];
  total_non_current_liabilities: number[];
}

export interface CurrentLiabilities {
  short_term_borrowings: number[];
  lease_liabilities_current: number[];
  trade_payables: number[];
  other_current_liabilities: number[];
  short_term_provisions: number[];
  current_maturities_of_long_term_debt: number[];
  total_current_liabilities: number[];
}

export interface EquityAndLiabilities {
  equity: EquitySection;
  non_current_liabilities: NonCurrentLiabilities;
  current_liabilities: CurrentLiabilities;
  total_equity_and_liabilities: number[];
}

export interface BalanceSheet {
  years: string[] | undefined;
  assets: BalanceSheetAssets;
  equity_and_liabilities: EquityAndLiabilities;
}

export interface CashFlowStatement {
  years: string[] | undefined;
  cash_from_operating_activities: number[];
  cash_from_investing_activities: number[];
  capital_expenditure: number[];
  cash_from_financing_activities: number[];
  net_change_in_cash: number[];
  opening_cash_balance: number[];
  closing_cash_balance: number[];
}

export interface DepreciationRate {
  asset_class: string;
  rate_percent: number;
  method: DepreciationMethod;
}

export interface SegmentRevenue {
  segment: string;
  values: number[];
}

export interface ManagementGuidance {
  revenue_growth_commentary: string | null;
  margin_commentary: string | null;
  capex_plans: string | null;
  debt_plans: string | null;
}

export interface SupportingData {
  depreciation_rates: DepreciationRate[];
  capex_from_cash_flow: number[];
  weighted_avg_interest_rate: number | null;
  effective_tax_rate: number[];
  statutory_tax_rate: number;
  dividend_per_share: number[];
  dividend_payout_ratio: number[];
  receivable_days: number[];
  inventory_days: number[];
  payable_days: number[];
  segment_revenue: SegmentRevenue[];
  management_guidance: ManagementGuidance;
  key_risks: string[];
  peer_companies_mentioned: string[];
}

export interface ExtractionValidation {
  balance_sheet_balances: boolean;
  cash_flow_ties_to_bs: boolean;
  discrepancies: string[];
}

export interface ExtractedData {
  metadata: CompanyMetadata;
  income_statement: IncomeStatement;
  balance_sheet: BalanceSheet;
  cash_flow_statement: CashFlowStatement;
  supporting_data: SupportingData;
  validation: ExtractionValidation;
}

// ─── User Assumptions ─────────────────────────────────────────────

export interface AssumptionRationale {
  revenue_growth: string;
  margin: string;
  capex: string;
  wacc: string;
  terminal_growth: string;
}

export interface UserAssumptions {
  revenue_growth_rates: [number, number, number, number, number];
  ebitda_margin: [number, number, number, number, number];
  depreciation_rate: number;
  capex_to_revenue: number;
  receivable_days: number;
  inventory_days: number;
  payable_days: number;
  tax_rate: number;
  interest_rate_on_debt: number;
  risk_free_rate: number;
  beta: number;
  equity_risk_premium: number;
  terminal_growth_rate: number;
  wacc_calculated: number;
  rationale: AssumptionRationale;
}

// ─── Financial Model ──────────────────────────────────────────────

export interface WorkingCapitalSchedule {
  years: string[];
  trade_receivables: number[];
  inventories: number[];
  trade_payables: number[];
  net_working_capital: number[];
  change_in_nwc: number[];
}

export interface DepreciationCapexSchedule {
  years: string[];
  opening_gross_block: number[];
  capex: number[];
  disposals: number[];
  closing_gross_block: number[];
  depreciation: number[];
  closing_net_block: number[];
}

export interface DebtSchedule {
  years: string[];
  opening_debt: number[];
  new_borrowings: number[];
  repayments: number[];
  closing_debt: number[];
  interest_expense: number[];
}

export interface EquitySchedule {
  years: string[];
  opening_equity: number[];
  pat_added: number[];
  dividends_paid: number[];
  oci: number[];
  closing_equity: number[];
}

export interface TaxSchedule {
  years: string[];
  pbt: number[];
  statutory_rate: number;
  effective_rate: number[];
  tax_expense: number[];
}

export interface ModelSchedules {
  working_capital: WorkingCapitalSchedule;
  depreciation_and_capex: DepreciationCapexSchedule;
  debt: DebtSchedule;
  equity: EquitySchedule;
  tax: TaxSchedule;
}

export interface ProjectedIncomeStatement {
  years: string[];
  revenue: number[];
  cogs: number[];
  gross_profit: number[];
  employee_expense: number[];
  other_expense: number[];
  ebitda: number[];
  ebitda_margin_pct: number[];
  depreciation: number[];
  ebit: number[];
  interest_expense: number[];
  other_income: number[];
  pbt: number[];
  tax: number[];
  pat: number[];
  eps: number[];
}

export interface ProjectedBalanceSheet {
  years: string[];
  net_fixed_assets: number[];
  cwip: number[];
  investments: number[];
  other_non_current_assets: number[];
  inventories: number[];
  trade_receivables: number[];
  cash_and_equivalents: number[];
  other_current_assets: number[];
  total_assets: number[];
  share_capital: number[];
  reserves: number[];
  total_equity: number[];
  long_term_debt: number[];
  short_term_debt: number[];
  trade_payables: number[];
  other_current_liabilities: number[];
  total_liabilities: number[];
  total_equity_and_liabilities: number[];
  balance_check: boolean[];
}

export interface ProjectedCashFlow {
  years: string[];
  pat: number[];
  depreciation_add_back: number[];
  change_in_working_capital: number[];
  other_non_cash: number[];
  cfo: number[];
  capex: number[];
  change_in_investments: number[];
  cfi: number[];
  change_in_debt: number[];
  dividends_paid: number[];
  cff: number[];
  net_cash_flow: number[];
  opening_cash: number[];
  closing_cash: number[];
  ties_to_bs: boolean[];
}

export interface FcffSchedule {
  years: string[];
  ebit: number[];
  tax_on_ebit: number[];
  nopat: number[];
  depreciation: number[];
  capex: number[];
  change_in_nwc: number[];
  fcff: number[];
}

export interface WaccComponents {
  risk_free_rate: number;
  beta: number;
  equity_risk_premium: number;
  ke_formula: string;
}

export interface WaccDetail {
  cost_of_equity: number;
  cost_of_debt_pre_tax: number;
  cost_of_debt_post_tax: number;
  equity_weight: number;
  debt_weight: number;
  wacc: number;
  components: WaccComponents;
}

export interface TerminalValue {
  terminal_fcff: number;
  terminal_growth_rate: number;
  terminal_value_undiscounted: number;
  terminal_value_discounted: number;
  tv_as_pct_of_ev: number;
  tv_warning: string | null;
}

export interface DcfValuation {
  fcff: FcffSchedule;
  wacc: WaccDetail;
  terminal_value: TerminalValue;
  discount_factors: number[];
  pv_of_fcffs: number[];
  sum_pv_fcffs: number;
  enterprise_value: number;
  less_net_debt: number;
  plus_cash: number;
  plus_non_operating_assets: number;
  equity_value: number;
  diluted_shares: number;
  per_share_value: number;
  current_market_price: number | null;
  upside_downside_pct: number | null;
}

export interface SensitivityAnalysis {
  wacc_range: number[];
  growth_range: number[];
  grid: number[][];
}

export interface ScenarioResult {
  assumptions_changed: string;
  per_share_value: number;
}

export interface Scenarios {
  bull_case: ScenarioResult;
  base_case: { per_share_value: number };
  bear_case: ScenarioResult;
}

export interface ModelAudit {
  balance_sheet_balances_all_years: boolean;
  cash_flow_ties_all_years: boolean;
  no_circular_references: boolean;
  warnings: string[];
}

export interface FinancialModel {
  assumptions: UserAssumptions;
  schedules: ModelSchedules;
  income_statement_projected: ProjectedIncomeStatement;
  balance_sheet_projected: ProjectedBalanceSheet;
  cash_flow_projected: ProjectedCashFlow;
  dcf_valuation: DcfValuation;
  sensitivity_analysis: SensitivityAnalysis;
  scenarios: Scenarios;
  model_audit: ModelAudit;
}
