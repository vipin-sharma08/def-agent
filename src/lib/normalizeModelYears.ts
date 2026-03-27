import type { ExtractedData, FinancialModel } from "@/lib/types";

function parseYearValue(year: string | number | null | undefined): number | null {
  if (year == null) return null;

  const numeric = Number.parseInt(String(year).replace(/[^\d]/g, ""), 10);
  return Number.isFinite(numeric) ? numeric : null;
}

function buildProjectedYearLabels(
  historicalYears: Array<string | number>,
  projectedYears: Array<string | number>
): string[] {
  const parsedHistoricalYears = historicalYears
    .map((year) => parseYearValue(year))
    .filter((year): year is number => year != null);

  if (parsedHistoricalYears.length === 0) {
    return projectedYears.map((year) => String(year));
  }

  const latestHistoricalYear = Math.max(...parsedHistoricalYears);
  const parsedProjectedYears = projectedYears.map((year) => parseYearValue(year));

  const needsRebase = parsedProjectedYears.some((year, index) => {
    if (year == null || year <= latestHistoricalYear) {
      return true;
    }

    if (index === 0) {
      return false;
    }

    const previousYear = parsedProjectedYears[index - 1];
    return previousYear != null && year <= previousYear;
  });

  if (!needsRebase) {
    return projectedYears.map((year) => String(year));
  }

  return projectedYears.map((_, index) => String(latestHistoricalYear + index + 1));
}

export function normalizeFinancialModelYears(
  model: FinancialModel,
  extractedData: ExtractedData
): FinancialModel {
  const historicalYears = [
    ...(extractedData.income_statement.years ?? []),
    ...(extractedData.balance_sheet.years ?? []),
    ...(extractedData.cash_flow_statement.years ?? []),
  ];

  const projectedYears = buildProjectedYearLabels(
    historicalYears,
    model.income_statement_projected.years
  );

  return {
    ...model,
    income_statement_projected: {
      ...model.income_statement_projected,
      years: projectedYears,
    },
    balance_sheet_projected: {
      ...model.balance_sheet_projected,
      years: projectedYears,
    },
    cash_flow_projected: {
      ...model.cash_flow_projected,
      years: projectedYears,
    },
    schedules: {
      ...model.schedules,
      working_capital: {
        ...model.schedules.working_capital,
        years: projectedYears,
      },
      depreciation_and_capex: {
        ...model.schedules.depreciation_and_capex,
        years: projectedYears,
      },
      debt: {
        ...model.schedules.debt,
        years: projectedYears,
      },
      equity: {
        ...model.schedules.equity,
        years: projectedYears,
      },
      tax: {
        ...model.schedules.tax,
        years: projectedYears,
      },
    },
    dcf_valuation: {
      ...model.dcf_valuation,
      fcff: {
        ...model.dcf_valuation.fcff,
        years: projectedYears,
      },
    },
  };
}
