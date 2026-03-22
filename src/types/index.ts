export interface FinancialData {
  companyName: string;
  reportYear: number;
  currency: string;

  // Income Statement
  revenue: number[];
  ebit: number[];
  depreciation: number[];
  amortization: number[];
  interestExpense: number[];
  taxRate: number;

  // Balance Sheet
  totalAssets: number[];
  totalDebt: number[];
  cashAndEquivalents: number[];
  workingCapital: number[];

  // Cash Flow
  operatingCashFlow: number[];
  capex: number[];
  freeCashFlow: number[];

  // Shares
  sharesOutstanding: number;
}

export interface DCFAssumptions {
  projectionYears: number;
  revenueGrowthRate: number; // %
  ebitMargin: number; // %
  taxRate: number; // %
  capexAsPercentRevenue: number; // %
  workingCapitalChangeAsPercentRevenue: number; // %
  wacc: number; // %
  terminalGrowthRate: number; // %
  netDebt: number;
  sharesOutstanding: number;
}

export interface DCFProjection {
  year: number;
  revenue: number;
  ebit: number;
  nopat: number;
  depreciation: number;
  capex: number;
  workingCapitalChange: number;
  freeCashFlow: number;
  discountFactor: number;
  presentValue: number;
}

export interface DCFResult {
  projections: DCFProjection[];
  terminalValue: number;
  presentValueTerminalValue: number;
  sumPVFreeCashFlows: number;
  enterpriseValue: number;
  equityValue: number;
  intrinsicValuePerShare: number;
  sensitivityAnalysis: SensitivityMatrix;
}

export interface SensitivityMatrix {
  waccRange: number[];
  tgRateRange: number[];
  matrix: number[][];
}

export type AppStep = "upload" | "extract" | "assumptions" | "report";
