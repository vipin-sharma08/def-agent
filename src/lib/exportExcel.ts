import * as XLSX from "xlsx";
import { formatFYLabel } from "@/lib/formatters";
import type { ExtractedData, FinancialModel } from "@/lib/types";

type CellValue = string | number | null;
type SheetRow = CellValue[];

function withSection(label: string): SheetRow[] {
  return [[label], []];
}

function addSheet(workbook: XLSX.WorkBook, name: string, rows: SheetRow[]) {
  const sheet = XLSX.utils.aoa_to_sheet(rows);

  const columnWidths = rows.reduce<number[]>((widths, row) => {
    row.forEach((value, index) => {
      const nextWidth = String(value ?? "").length + 2;
      widths[index] = Math.max(widths[index] ?? 10, nextWidth);
    });

    return widths;
  }, []);

  sheet["!cols"] = columnWidths.map((width) => ({ wch: Math.min(width, 28) }));
  XLSX.utils.book_append_sheet(workbook, sheet, name.slice(0, 31));
}

function mergeValues<T>(historical: T[], projected: T[]): T[] {
  return [...historical, ...projected];
}

function padHistorical(length: number): null[] {
  return Array.from({ length }, () => null);
}

function buildYearLabels(historicalYears: string[] | undefined, projectedYears: string[]) {
  const historicalLabels = (historicalYears ?? []).map((year) => formatFYLabel(year));
  const projectedLabels = projectedYears.map((year) => formatFYLabel(year, true));

  return {
    historicalLabels,
    projectedLabels,
    allLabels: [...historicalLabels, ...projectedLabels],
  };
}

function buildSummarySheet(data: ExtractedData, model: FinancialModel): SheetRow[] {
  const meta = data.metadata;
  const dcf = model.dcf_valuation;

  return [
    ["Valkyrie DCF Export"],
    [],
    ["Company", meta.company_name],
    ["Industry", meta.industry],
    ["Reporting", meta.standalone_or_consolidated],
    ["FY End", meta.financial_year_end],
    ["NSE", meta.nse_symbol ?? ""],
    ["BSE", meta.bse_code ?? ""],
    [],
    ["Intrinsic Value Per Share", dcf.per_share_value],
    ["Enterprise Value", dcf.enterprise_value],
    ["Equity Value", dcf.equity_value],
    ["Net Debt", dcf.less_net_debt],
    ["WACC", dcf.wacc.wacc],
    ["Terminal Growth", dcf.terminal_value.terminal_growth_rate],
    ["Terminal Value % of EV", dcf.terminal_value.tv_as_pct_of_ev],
    ["Current Market Price", dcf.current_market_price],
    ["Upside / Downside %", dcf.upside_downside_pct],
    [],
    ["Model Warnings"],
    ...model.model_audit.warnings.map((warning) => ["Warning", warning]),
  ];
}

function buildIncomeStatementSheet(data: ExtractedData, model: FinancialModel): SheetRow[] {
  const historical = data.income_statement;
  const projected = model.income_statement_projected;
  const { allLabels } = buildYearLabels(historical.years, projected.years);

  const histCogs = historical.cost_of_materials_consumed.map((value, index) => {
    return (
      (value ?? 0) +
      (historical.purchase_of_stock_in_trade[index] ?? 0) +
      (historical.changes_in_inventories[index] ?? 0)
    );
  });

  const histGrossProfit = historical.revenue_from_operations.map((value, index) => {
    return value != null ? value - histCogs[index] : null;
  });

  const histGrossMargin = historical.revenue_from_operations.map((revenue, index) => {
    const grossProfit = histGrossProfit[index];
    return revenue && revenue > 0 && grossProfit != null ? (grossProfit / revenue) * 100 : null;
  });

  const histEbitda = historical.profit_before_exceptional_items_and_tax.map((value, index) => {
    return (
      (value ?? 0) +
      (historical.finance_costs[index] ?? 0) +
      (historical.depreciation_and_amortisation[index] ?? 0)
    );
  });

  const histEbitdaMargin = historical.revenue_from_operations.map((revenue, index) => {
    return revenue && revenue > 0 ? (histEbitda[index] / revenue) * 100 : null;
  });

  const histEbit = histEbitda.map((value, index) => {
    return value - (historical.depreciation_and_amortisation[index] ?? 0);
  });

  const histPatMargin = historical.revenue_from_operations.map((revenue, index) => {
    return revenue && revenue > 0
      ? ((historical.profit_after_tax[index] ?? 0) / revenue) * 100
      : null;
  });

  const allRevenue = mergeValues(historical.revenue_from_operations, projected.revenue);
  const revenueGrowth = allRevenue.map((value, index) => {
    if (index === 0 || value == null) {
      return null;
    }

    const previous = allRevenue[index - 1];
    if (previous == null || previous === 0) {
      return null;
    }

    return ((value - previous) / Math.abs(previous)) * 100;
  });

  const projectedGrossMargin = projected.gross_profit.map((value, index) => {
    return projected.revenue[index] > 0 ? (value / projected.revenue[index]) * 100 : null;
  });

  const projectedPatMargin = projected.pat.map((value, index) => {
    return projected.revenue[index] > 0 ? (value / projected.revenue[index]) * 100 : null;
  });

  return [
    ["Line Item", ...allLabels],
    ...withSection("Revenue"),
    ["Revenue from Operations", ...mergeValues(historical.revenue_from_operations, projected.revenue)],
    ["Revenue Growth %", ...revenueGrowth],
    ...withSection("Income Statement"),
    ["COGS", ...mergeValues(histCogs, projected.cogs)],
    ["Gross Profit", ...mergeValues(histGrossProfit, projected.gross_profit)],
    ["Gross Margin %", ...mergeValues(histGrossMargin, projectedGrossMargin)],
    ["Employee Benefits Expense", ...mergeValues(historical.employee_benefits_expense, projected.employee_expense)],
    ["Other Expenses", ...mergeValues(historical.other_expenses, projected.other_expense)],
    ["EBITDA", ...mergeValues(histEbitda, projected.ebitda)],
    ["EBITDA Margin %", ...mergeValues(histEbitdaMargin, projected.ebitda_margin_pct)],
    ["Depreciation & Amortisation", ...mergeValues(historical.depreciation_and_amortisation, projected.depreciation)],
    ["EBIT", ...mergeValues(histEbit, projected.ebit)],
    ["Finance Costs / Interest Expense", ...mergeValues(historical.finance_costs, projected.interest_expense)],
    ["Other Income", ...mergeValues(historical.other_income, projected.other_income)],
    ["Profit Before Tax", ...mergeValues(historical.profit_before_tax, projected.pbt)],
    ["Tax Expense", ...mergeValues(historical.total_tax_expense, projected.tax)],
    ["Profit After Tax", ...mergeValues(historical.profit_after_tax, projected.pat)],
    ["PAT Margin %", ...mergeValues(histPatMargin, projectedPatMargin)],
    ["EPS (Basic)", ...mergeValues(historical.eps_basic, projected.eps)],
  ];
}

function buildBalanceSheetSheet(data: ExtractedData, model: FinancialModel): SheetRow[] {
  const historical = data.balance_sheet;
  const projected = model.balance_sheet_projected;
  const { allLabels } = buildYearLabels(historical.years, projected.years);
  const assets = historical.assets;
  const equityAndLiabilities = historical.equity_and_liabilities;
  const historicalLength = historical.years?.length ?? 0;
  const projectedLength = projected.years.length;
  const projectedBlanks = padHistorical(projectedLength);

  const historicalNetDebt = assets.current.cash_and_cash_equivalents.map((cash, index) => {
    const longTermDebt =
      equityAndLiabilities.non_current_liabilities.long_term_borrowings[index] ?? 0;
    const shortTermDebt =
      equityAndLiabilities.current_liabilities.short_term_borrowings[index] ?? 0;
    const currentMaturity =
      equityAndLiabilities.current_liabilities.current_maturities_of_long_term_debt[index] ?? 0;

    return longTermDebt + shortTermDebt + currentMaturity - (cash ?? 0);
  });

  const projectedNetDebt = projected.cash_and_equivalents.map((cash, index) => {
    return (projected.long_term_debt[index] ?? 0) + (projected.short_term_debt[index] ?? 0) - (cash ?? 0);
  });

  return [
    ["Line Item", ...allLabels],
    ...withSection("Assets"),
    ["Gross Block (PPE)", ...mergeValues(assets.non_current.property_plant_equipment_gross, projectedBlanks)],
    ["Accumulated Depreciation", ...mergeValues(assets.non_current.accumulated_depreciation, projectedBlanks)],
    ["Net Fixed Assets", ...mergeValues(assets.non_current.property_plant_equipment_net, projected.net_fixed_assets)],
    ["Capital Work in Progress", ...mergeValues(assets.non_current.capital_work_in_progress, projected.cwip)],
    ["Investments (Non-Current)", ...mergeValues(assets.non_current.non_current_investments, projected.investments)],
    [
      "Intangible & ROU Assets",
      ...mergeValues(
        assets.non_current.intangible_assets.map((value, index) => {
          return (value ?? 0) + (assets.non_current.right_of_use_assets[index] ?? 0);
        }),
        projectedBlanks
      ),
    ],
    ["Other Non-Current Assets", ...mergeValues(assets.non_current.other_non_current_assets, projected.other_non_current_assets)],
    ["Inventories", ...mergeValues(assets.current.inventories, projected.inventories)],
    ["Trade Receivables", ...mergeValues(assets.current.trade_receivables, projected.trade_receivables)],
    ["Cash & Cash Equivalents", ...mergeValues(assets.current.cash_and_cash_equivalents, projected.cash_and_equivalents)],
    ["Bank Balances (Other)", ...mergeValues(assets.current.bank_balances_other, projectedBlanks)],
    ["Current Investments", ...mergeValues(assets.current.current_investments, projectedBlanks)],
    ["Other Current Assets", ...mergeValues(assets.current.other_current_assets, projected.other_current_assets)],
    ["Total Assets", ...mergeValues(assets.total_assets, projected.total_assets)],
    ...withSection("Equity & Liabilities"),
    ["Share Capital", ...mergeValues(equityAndLiabilities.equity.share_capital, projected.share_capital)],
    ["Reserves & Surplus", ...mergeValues(equityAndLiabilities.equity.reserves_and_surplus, projected.reserves)],
    ["Total Equity", ...mergeValues(equityAndLiabilities.equity.total_equity, projected.total_equity)],
    ["Long-term Borrowings", ...mergeValues(equityAndLiabilities.non_current_liabilities.long_term_borrowings, projected.long_term_debt)],
    ["Lease Liabilities (NC)", ...mergeValues(equityAndLiabilities.non_current_liabilities.lease_liabilities_non_current, projectedBlanks)],
    ["Other Non-Current Liabilities", ...mergeValues(equityAndLiabilities.non_current_liabilities.other_non_current_liabilities, projectedBlanks)],
    ["Short-term Borrowings", ...mergeValues(equityAndLiabilities.current_liabilities.short_term_borrowings, projected.short_term_debt)],
    ["Trade Payables", ...mergeValues(equityAndLiabilities.current_liabilities.trade_payables, projected.trade_payables)],
    ["Other Current Liabilities", ...mergeValues(equityAndLiabilities.current_liabilities.other_current_liabilities, projected.other_current_liabilities)],
    ["Total Equity & Liabilities", ...mergeValues(equityAndLiabilities.total_equity_and_liabilities, projected.total_equity_and_liabilities)],
    ...withSection("Key Metrics"),
    ["Net Debt", ...mergeValues(historicalNetDebt, projectedNetDebt)],
    ["Balance Check", ...[...padHistorical(historicalLength), ...projected.balance_check.map((value) => (value ? "OK" : "Check"))]],
  ];
}

function buildCashFlowSheet(data: ExtractedData, model: FinancialModel): SheetRow[] {
  const historical = data.cash_flow_statement;
  const projected = model.cash_flow_projected;
  const { allLabels } = buildYearLabels(historical.years, projected.years);
  const historicalLength = historical.years?.length ?? 0;
  const historicalBlanks = padHistorical(historicalLength);

  const historicalFcf = historical.cash_from_operating_activities.map((value, index) => {
    return value + (historical.capital_expenditure[index] ?? 0);
  });

  const projectedFcf = projected.cfo.map((value, index) => {
    return value + (projected.capex[index] ?? 0);
  });

  return [
    ["Line Item", ...allLabels],
    ...withSection("Operating Activities"),
    ["PAT", ...mergeValues(historicalBlanks, projected.pat)],
    ["Add: Depreciation & Amortisation", ...mergeValues(historicalBlanks, projected.depreciation_add_back)],
    ["Change in Working Capital", ...mergeValues(historicalBlanks, projected.change_in_working_capital)],
    ["Other Non-Cash Adjustments", ...mergeValues(historicalBlanks, projected.other_non_cash)],
    ["Cash from Operations (CFO)", ...mergeValues(historical.cash_from_operating_activities, projected.cfo)],
    ...withSection("Investing Activities"),
    ["Capital Expenditure", ...mergeValues(historical.capital_expenditure, projected.capex)],
    ["Change in Investments", ...mergeValues(historicalBlanks, projected.change_in_investments)],
    ["Cash from Investing (CFI)", ...mergeValues(historical.cash_from_investing_activities, projected.cfi)],
    ...withSection("Financing Activities"),
    ["Net Change in Borrowings", ...mergeValues(historicalBlanks, projected.change_in_debt)],
    ["Dividends Paid", ...mergeValues(historicalBlanks, projected.dividends_paid)],
    ["Cash from Financing (CFF)", ...mergeValues(historical.cash_from_financing_activities, projected.cff)],
    ...withSection("Cash Position"),
    ["Free Cash Flow", ...mergeValues(historicalFcf, projectedFcf)],
    ["Net Change in Cash", ...mergeValues(historical.net_change_in_cash, projected.net_cash_flow)],
    ["Opening Cash Balance", ...mergeValues(historical.opening_cash_balance, projected.opening_cash)],
    ["Closing Cash Balance", ...mergeValues(historical.closing_cash_balance, projected.closing_cash)],
    ["Tie to Balance Sheet", ...[...historicalBlanks, ...projected.ties_to_bs.map((value) => (value ? "OK" : "Check"))]],
  ];
}

function buildDcfSheet(model: FinancialModel): SheetRow[] {
  const dcf = model.dcf_valuation;
  const years = dcf.fcff.years.map((year) => formatFYLabel(year, true));

  return [
    ["Metric", ...years],
    ["EBIT", ...dcf.fcff.ebit],
    ["Tax on EBIT", ...dcf.fcff.tax_on_ebit],
    ["NOPAT", ...dcf.fcff.nopat],
    ["Depreciation", ...dcf.fcff.depreciation],
    ["Capex", ...dcf.fcff.capex],
    ["Change in NWC", ...dcf.fcff.change_in_nwc],
    ["FCFF", ...dcf.fcff.fcff],
    ["Discount Factor", ...dcf.discount_factors],
    ["PV of FCFF", ...dcf.pv_of_fcffs],
    [],
    ["WACC Detail", "Value"],
    ["Cost of Equity", dcf.wacc.cost_of_equity],
    ["Pre-Tax Cost of Debt", dcf.wacc.cost_of_debt_pre_tax],
    ["Post-Tax Cost of Debt", dcf.wacc.cost_of_debt_post_tax],
    ["Equity Weight", dcf.wacc.equity_weight],
    ["Debt Weight", dcf.wacc.debt_weight],
    ["WACC", dcf.wacc.wacc],
    [],
    ["Terminal Value", "Value"],
    ["Terminal FCFF", dcf.terminal_value.terminal_fcff],
    ["Terminal Growth Rate", dcf.terminal_value.terminal_growth_rate],
    ["Terminal Value (Undiscounted)", dcf.terminal_value.terminal_value_undiscounted],
    ["PV of Terminal Value", dcf.terminal_value.terminal_value_discounted],
    ["TV % of EV", dcf.terminal_value.tv_as_pct_of_ev],
    [],
    ["Equity Bridge", "Value"],
    ["Sum of PV(FCFFs)", dcf.sum_pv_fcffs],
    ["Enterprise Value", dcf.enterprise_value],
    ["Less Net Debt", dcf.less_net_debt],
    ["Plus Cash", dcf.plus_cash],
    ["Plus Non-Operating Assets", dcf.plus_non_operating_assets],
    ["Equity Value", dcf.equity_value],
    ["Diluted Shares", dcf.diluted_shares],
    ["Intrinsic Value Per Share", dcf.per_share_value],
  ];
}

function buildSensitivitySheet(model: FinancialModel): SheetRow[] {
  const sensitivity = model.sensitivity_analysis;

  return [
    ["Growth / WACC", ...sensitivity.wacc_range],
    ...sensitivity.growth_range.map((growth, index) => {
      return [growth, ...sensitivity.grid[index]];
    }),
  ];
}

function buildAssumptionsSheet(model: FinancialModel): SheetRow[] {
  const assumptions = model.assumptions;
  const forecastHeaders = model.income_statement_projected.years.map((year) => formatFYLabel(year, true));

  return [
    ["Assumption", ...forecastHeaders],
    ["Revenue Growth Rate", ...assumptions.revenue_growth_rates],
    ["EBITDA Margin", ...assumptions.ebitda_margin],
    ["Capex / Revenue", ...Array.from({ length: 5 }, () => assumptions.capex_to_revenue)],
    ["Depreciation Rate", ...Array.from({ length: 5 }, () => assumptions.depreciation_rate)],
    ["Receivable Days", ...Array.from({ length: 5 }, () => assumptions.receivable_days)],
    ["Inventory Days", ...Array.from({ length: 5 }, () => assumptions.inventory_days)],
    ["Payable Days", ...Array.from({ length: 5 }, () => assumptions.payable_days)],
    ["Tax Rate", ...Array.from({ length: 5 }, () => assumptions.tax_rate)],
    ["Interest Rate on Debt", ...Array.from({ length: 5 }, () => assumptions.interest_rate_on_debt)],
    ["Risk-Free Rate", ...Array.from({ length: 5 }, () => assumptions.risk_free_rate)],
    ["Beta", ...Array.from({ length: 5 }, () => assumptions.beta)],
    ["Equity Risk Premium", ...Array.from({ length: 5 }, () => assumptions.equity_risk_premium)],
    ["WACC", ...Array.from({ length: 5 }, () => assumptions.wacc_calculated)],
    ["Terminal Growth Rate", ...Array.from({ length: 5 }, () => assumptions.terminal_growth_rate)],
    [],
    ["Rationale", "Detail"],
    ["Revenue Growth", assumptions.rationale.revenue_growth],
    ["EBITDA Margin", assumptions.rationale.margin],
    ["Capex", assumptions.rationale.capex],
    ["WACC", assumptions.rationale.wacc],
    ["Terminal Value", assumptions.rationale.terminal_growth],
  ];
}

export async function exportValuationExcel(
  data: ExtractedData,
  model: FinancialModel
): Promise<void> {
  const workbook = XLSX.utils.book_new();

  addSheet(workbook, "Summary", buildSummarySheet(data, model));
  addSheet(workbook, "Income Statement", buildIncomeStatementSheet(data, model));
  addSheet(workbook, "Balance Sheet", buildBalanceSheetSheet(data, model));
  addSheet(workbook, "Cash Flow", buildCashFlowSheet(data, model));
  addSheet(workbook, "DCF Valuation", buildDcfSheet(model));
  addSheet(workbook, "Sensitivity", buildSensitivitySheet(model));
  addSheet(workbook, "Assumptions", buildAssumptionsSheet(model));

  const companyName = data.metadata.company_name.replace(/[^a-zA-Z0-9]+/g, "_");
  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `Valkyrie_DCF_${companyName}_${date}.xlsx`);
}
