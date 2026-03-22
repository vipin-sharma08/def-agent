// src/lib/exportPdf.ts
// ═══════════════════════════════════════════════════════════════════
// PROJECT VALKYRIE — PDF Export
// Generates an 11-page professional valuation report using jsPDF
// and jspdf-autotable (v5). Runs entirely client-side (browser).
// ═══════════════════════════════════════════════════════════════════

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ExtractedData, FinancialModel } from "./types";

// ─── Types ────────────────────────────────────────────────────────

type RGB = [number, number, number];
type CellVal = string | { content: string; styles: Record<string, unknown> };
type BodyRow  = CellVal[];

interface DocAT extends jsPDF {
  lastAutoTable: { finalY: number };
}

// ─── Color palette (matches design token system) ──────────────────

const CN:  RGB = [10,  10,  10 ]; // bg-base     #0A0A0A
const CP:  RGB = [22,  22,  22 ]; // bg-elevated #161616
const CE:  RGB = [20,  184, 166]; // teal        #14B8A6
const CB:  RGB = [161, 161, 170]; // zinc-400    #A1A1AA
const CT:  RGB = [212, 212, 216]; // zinc-300    #D4D4D8
const CM:  RGB = [82,  82,  91 ]; // zinc-600    #52525B
const CPJ: RGB = [10,  10,  10 ]; // projected col bg (base)
const CHS: RGB = [17,  17,  17 ]; // historical col header (surface)
const CTT: RGB = [22,  22,  22 ]; // total row bg (elevated)
const CST: RGB = [17,  17,  17 ]; // subtotal row bg (surface)
const CSH: RGB = [10,  10,  10 ]; // section header row bg (base)

// ─── Page constants ───────────────────────────────────────────────

const PW = 297;       // A4 landscape width  (mm)
const PH = 210;       // A4 landscape height (mm)
const ML = 14;        // left margin
const MR = 14;        // right margin
const HEADER_H = 12;  // top header bar height
const FOOTER_H = 10;  // bottom footer reserved space
const MT = HEADER_H + 4; // content start Y

// ─── Number formatters ────────────────────────────────────────────

/** Indian-grouped crore amount. Negatives in parentheses. No Rs glyph. */
function fc(v: number | null | undefined): string {
  if (v == null || !isFinite(v)) return "–";
  const neg = v < 0;
  const abs = Math.abs(v);
  const s = Math.round(abs).toString();
  const len = s.length;
  let out = "";
  if (len <= 3) {
    out = s;
  } else {
    out = s.slice(len - 3);
    let rem = s.slice(0, len - 3);
    while (rem.length > 2) {
      out = rem.slice(rem.length - 2) + "," + out;
      rem  = rem.slice(0, rem.length - 2);
    }
    if (rem) out = rem + "," + out;
  }
  return neg ? `(${out})` : out;
}

/** Percent to N decimal places */
function fp(v: number | null | undefined, d = 1): string {
  if (v == null || !isFinite(v)) return "–";
  return `${v.toFixed(d)}%`;
}

/** Per-share value: 2 decimal places for amounts < 100 000 */
function fs(v: number | null | undefined): string {
  if (v == null || !isFinite(v)) return "–";
  return `Rs.${Math.abs(v) < 100_000 ? Math.abs(v).toFixed(2) : fc(v)}`;
}

/** Days integer */
function fd(v: number | null | undefined): string {
  if (v == null || !isFinite(v)) return "–";
  return `${Math.round(v)}d`;
}

// ─── Page header / footer ─────────────────────────────────────────

let _pg = 0; // current page counter (reset at start of each export)

function drawHeader(doc: jsPDF, title: string): void {
  doc.setFillColor(...CN);
  doc.rect(0, 0, PW, HEADER_H, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...CE);
  doc.text("VALKYRIE", ML, 8);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...CM);
  doc.text("  |  DCF VALUATION REPORT", ML + 14, 8);

  doc.setTextColor(...CB);
  doc.text(title, PW - MR, 8, { align: "right" });
}

function drawFooter(doc: jsPDF): void {
  const y = PH - 8;
  doc.setDrawColor(...CP);
  doc.setLineWidth(0.25);
  doc.line(ML, y, PW - MR, y);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(6);
  doc.setTextColor(...CM);
  doc.text(
    "For educational purposes only. Not financial advice. All monetary values in Rs. Crores unless otherwise stated.",
    ML, y + 3.5
  );

  doc.setFont("helvetica", "normal");
  doc.text(`Page ${_pg}`, PW - MR, y + 3.5, { align: "right" });
}

/** Add a new page with standard header + footer. Returns content start Y. */
function newPage(doc: jsPDF, title: string): number {
  doc.addPage("a4", "landscape");
  _pg++;
  drawHeader(doc, title);
  drawFooter(doc);
  return MT;
}

/**
 * Returns a willDrawPage callback for autoTable.
 * Skips the first call (the page was already set up via newPage or cover).
 * Handles header/footer on overflow pages.
 */
function makePageHook(doc: jsPDF, title: string) {
  let first = true;
  return () => {
    if (first) { first = false; return; }
    _pg++;
    drawHeader(doc, title);
    drawFooter(doc);
  };
}

// ─── Table row builders ───────────────────────────────────────────

function sectionRow(label: string, nCols: number): BodyRow {
  return [{
    content: label,
    styles: { fillColor: CSH, textColor: CB, fontStyle: "bold",
               fontSize: 7, cellPadding: { top: 2.5, bottom: 2, left: 3, right: 2 },
               colSpan: nCols },
  }];
}

function dataRow(
  label: string,
  values: string[],
  opts?: { indent?: boolean; bold?: boolean; bg?: RGB; textColor?: RGB }
): BodyRow {
  const lbl: CellVal = {
    content: (opts?.indent ? "    " : "") + label,
    styles: {
      fontStyle:  opts?.bold ? "bold" : "normal",
      textColor:  opts?.textColor ?? CT,
      fillColor:  opts?.bg ?? CP,
    },
  };
  return [lbl, ...values.map<CellVal>((v) => ({
    content: v,
    styles: { textColor: opts?.textColor ?? CT, fillColor: opts?.bg ?? CP },
  }))];
}

function totalRow(label: string, values: string[], emerald = false): BodyRow {
  const col: RGB = emerald ? CE : CT;
  return [
    { content: label, styles: { fillColor: CTT, fontStyle: "bold", textColor: CT, fontSize: 7.5 } },
    ...values.map<CellVal>((v) => ({
      content: v,
      styles: { fillColor: CTT, fontStyle: "bold", textColor: col, fontSize: 7.5 },
    })),
  ];
}

function subtotalRow(label: string, values: string[]): BodyRow {
  return [
    { content: label, styles: { fillColor: CST, fontStyle: "bold", textColor: CT } },
    ...values.map<CellVal>((v) => ({
      content: v,
      styles: { fillColor: CST, fontStyle: "bold", textColor: CT },
    })),
  ];
}

function metricRow(label: string, values: string[]): BodyRow {
  return [
    { content: label, styles: { fillColor: CPJ, textColor: CM, fontStyle: "italic" } },
    ...values.map<CellVal>((v) => {
      const num = parseFloat(v.replace("%", "").replace("(", "-").replace(")", ""));
      const color: RGB = !isNaN(num) && num < 0 ? [243, 113, 136] : CE;
      return { content: v, styles: { fillColor: CPJ, textColor: color, fontStyle: "bold" } };
    }),
  ];
}

// ─── Table column styling helper ─────────────────────────────────

function buildColStyles(
  nHist: number,
  nProj: number
): Record<number, Record<string, unknown>> {
  const cols: Record<number, Record<string, unknown>> = {
    0: { cellWidth: 60, fillColor: CP, textColor: CT, fontStyle: "bold" },
  };
  // Historical columns (index 1..nHist)
  for (let i = 1; i <= nHist; i++) {
    cols[i] = { fillColor: CHS, textColor: CT, halign: "right", cellWidth: "auto" };
  }
  // Projected columns (index nHist+1..nHist+nProj)
  for (let i = nHist + 1; i <= nHist + nProj; i++) {
    cols[i] = { fillColor: CPJ, textColor: CT, halign: "right", cellWidth: "auto" };
  }
  return cols;
}

function buildHead(
  histYears: string[],
  projYears: string[]
): string[][] {
  // Band row: Historical | Projected
  const bandRow = [
    "",
    ...histYears.map((_y, i) => i === 0 ? `Historical (Rs. Cr)` : ""),
    ...projYears.map((_y, i) => i === 0 ? `Projected (Rs. Cr)` : ""),
  ];
  // Year row
  const yearRow = ["", ...histYears, ...projYears];
  return [bandRow, yearRow];
}

// ─── Common autoTable options ─────────────────────────────────────

function baseTableOpts(doc: jsPDF, startY: number, title: string) {
  return {
    startY,
    margin: { left: ML, right: MR, bottom: FOOTER_H + 2, top: MT },
    styles: {
      fontSize: 7,
      cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 },
      lineColor: CP,
      lineWidth: 0.15,
      textColor: CT,
      font: "helvetica",
    },
    headStyles: {
      fillColor: CN,
      textColor: CB,
      fontStyle: "bold" as const,
      fontSize: 7,
    },
    theme: "plain" as const,
    willDrawPage: makePageHook(doc, title),
  };
}

// ─── KPI row helper (exec summary manual drawing) ─────────────────

function kpiLine(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  w: number,
  highlight = false
): void {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...CM);
  doc.text(label, x, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(highlight ? 10 : 8);
  doc.setTextColor(...(highlight ? CE : CT));
  doc.text(value, x + w, y, { align: "right" });
}

// ─── Cover page ───────────────────────────────────────────────────

function drawCover(doc: jsPDF, data: ExtractedData, model: FinancialModel): void {
  const meta = data.metadata;
  const dcf  = model.dcf_valuation;

  // Full navy background
  doc.setFillColor(...CN);
  doc.rect(0, 0, PW, PH, "F");

  // Accent bar (left edge)
  doc.setFillColor(...CE);
  doc.rect(0, 0, 3, PH, "F");

  // "VALKYRIE" wordmark
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...CE);
  doc.text("V A L K Y R I E", ML + 6, 28);

  // Company name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text(meta.company_name, ML + 6, 50);

  // Sub-info
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...CM);
  const sub = [meta.industry, meta.standalone_or_consolidated, `FY End: ${meta.financial_year_end}`]
    .filter(Boolean).join("   ·   ");
  doc.text(sub, ML + 6, 60);

  // "DCF Valuation Report" title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...CE);
  doc.text("DCF VALUATION REPORT", ML + 6, 74);

  // Divider
  doc.setDrawColor(...CP);
  doc.setLineWidth(0.5);
  doc.line(ML + 6, 79, PW - ML - 6, 79);

  // Summary stats block
  const statsY = 90;
  const statsData: [string, string][] = [
    ["Intrinsic Value per Share", fs(dcf.per_share_value)],
    ["Enterprise Value",          `Rs. ${fc(dcf.enterprise_value)} Cr`],
    ["WACC",                      fp(dcf.wacc.wacc, 2)],
    ["Terminal Growth Rate",      fp(dcf.terminal_value.terminal_growth_rate, 1)],
  ];
  if (dcf.current_market_price) {
    statsData.push(["Current Market Price", fs(dcf.current_market_price)]);
    if (dcf.upside_downside_pct != null) {
      statsData.push(["Upside / Downside", `${dcf.upside_downside_pct >= 0 ? "+" : ""}${dcf.upside_downside_pct.toFixed(1)}%`]);
    }
  }

  statsData.forEach(([lbl, val], i) => {
    const col = i % 2 === 0 ? ML + 6 : ML + 100;
    const row = statsY + Math.floor(i / 2) * 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...CM);
    doc.text(lbl, col, row);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...CT);
    doc.text(val, col, row + 6);
  });

  // Generated date
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...CM);
  const dateStr = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  doc.text(`Generated: ${dateStr}`, ML + 6, PH - 20);

  // Disclaimer box
  doc.setFillColor(...CP);
  doc.roundedRect(ML + 6, PH - 14, PW - ML * 2 - 6, 8, 1, 1, "F");
  doc.setFont("helvetica", "italic");
  doc.setFontSize(6.5);
  doc.setTextColor(...CM);
  doc.text(
    "DISCLAIMER: For educational and informational purposes only. Not financial advice. Past performance is not indicative of future results.",
    PW / 2, PH - 9.5, { align: "center" }
  );
}

// ─── Page 2: Executive Summary ────────────────────────────────────

function buildExecSummary(
  doc: jsPDF,
  data: ExtractedData,
  model: FinancialModel
): void {
  const TITLE = "Executive Summary";
  const y0    = newPage(doc, TITLE);
  const dcf   = model.dcf_valuation;
  const ass   = model.assumptions;
  const meta  = data.metadata;

  const LW = 90; // left column width
  const RX = ML + LW + 6; // right column start
  const RW = PW - MR - RX; // right column width

  // ── Left: KPI panel ──
  doc.setFillColor(...CP);
  doc.roundedRect(ML, y0, LW, 80, 2, 2, "F");

  // Intrinsic value per share
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...CM);
  doc.text("INTRINSIC VALUE PER SHARE", ML + 5, y0 + 8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...CE);
  doc.text(fs(dcf.per_share_value), ML + 5, y0 + 20);

  if (dcf.upside_downside_pct != null) {
    const up = dcf.upside_downside_pct;
    const col: RGB = up >= 0 ? CE : [243, 113, 136];
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...col);
    doc.text(`${up >= 0 ? "+" : ""}${up.toFixed(1)}% vs CMP`, ML + 5, y0 + 27);
  }

  // Divider
  doc.setDrawColor(...CN);
  doc.setLineWidth(0.3);
  doc.line(ML + 5, y0 + 31, ML + LW - 5, y0 + 31);

  // KPI rows
  const kpis: [string, string][] = [
    ["Enterprise Value (Rs. Cr)", fc(dcf.enterprise_value)],
    ["Equity Value (Rs. Cr)",     fc(dcf.equity_value)],
    ["Net Debt (Rs. Cr)",         fc(dcf.less_net_debt)],
    ["Diluted Shares (Cr)",       dcf.diluted_shares.toFixed(2)],
    ["TV as % of EV",             fp(dcf.terminal_value.tv_as_pct_of_ev, 1)],
  ];
  if (dcf.current_market_price) {
    kpis.splice(2, 0, ["CMP (Rs.)", fs(dcf.current_market_price)]);
  }

  kpis.forEach(([lbl, val], i) => {
    const ky = y0 + 37 + i * 9;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...CM);
    doc.text(lbl, ML + 5, ky);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...CT);
    doc.text(val, ML + LW - 5, ky, { align: "right" });
  });

  // Company badges
  const badgeY = y0 + 86;
  [meta.industry, meta.bse_code ?? meta.nse_symbol ?? ""].filter(Boolean).forEach((txt, i) => {
    doc.setFillColor(...CN);
    doc.roundedRect(ML + i * 42, badgeY, 40, 6, 1, 1, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(...CB);
    doc.text(txt, ML + i * 42 + 20, badgeY + 4, { align: "center" });
  });

  // ── Right: Key Assumptions + WACC ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...CB);
  doc.text("KEY ASSUMPTIONS", RX, y0 + 7);

  const avgGrowth = ass.revenue_growth_rates.reduce((a, b) => a + b, 0) / 5;
  const avgMargin = ass.ebitda_margin.reduce((a, b) => a + b, 0) / 5;

  const assumRows: BodyRow[] = [
    dataRow("WACC",                     [fp(ass.wacc_calculated, 2)],             { bold: true }),
    dataRow("Terminal Growth Rate",     [fp(ass.terminal_growth_rate, 1)]),
    dataRow("Avg. Revenue Growth",      [fp(avgGrowth, 1)]),
    dataRow("Avg. EBITDA Margin",       [fp(avgMargin, 1)]),
    dataRow("Beta",                     [ass.beta.toFixed(2)]),
    dataRow("Tax Rate",                 [fp(ass.tax_rate, 2)]),
    dataRow("Risk-Free Rate",           [fp(ass.risk_free_rate, 2)]),
    dataRow("Equity Risk Premium",      [fp(ass.equity_risk_premium, 2)]),
  ];

  autoTable(doc, {
    startY: y0 + 10,
    margin: { left: RX, right: MR, bottom: FOOTER_H + 2, top: MT },
    tableWidth: RW * 0.48,
    head: [["Assumption", "Value"]],
    body: assumRows,
    styles:     { fontSize: 7, cellPadding: 2, lineColor: CP, lineWidth: 0.15, textColor: CT },
    headStyles: { fillColor: CN, textColor: CB, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 55, fillColor: CP }, 1: { cellWidth: 25, fillColor: CP, halign: "right" } },
    theme: "plain",
    willDrawPage: makePageHook(doc, TITLE),
  });

  const midX = RX + RW * 0.5 + 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...CB);
  doc.text("WACC DERIVATION", midX, y0 + 7);

  const wacc = model.dcf_valuation.wacc;
  const waccRows: BodyRow[] = [
    dataRow("Risk-Free Rate (Rf)",          [fp(wacc.components.risk_free_rate, 2)]),
    dataRow("Beta (β)",                     [wacc.components.beta.toFixed(2)]),
    dataRow("Equity Risk Premium (ERP)",    [fp(wacc.components.equity_risk_premium ?? 0, 2)]),
    subtotalRow("Cost of Equity (Ke)",      [fp(wacc.cost_of_equity, 2)]),
    dataRow("Pre-tax Cost of Debt",         [fp(wacc.cost_of_debt_pre_tax, 2)]),
    dataRow("Post-tax Cost of Debt (Kd)",   [fp(wacc.cost_of_debt_post_tax, 2)]),
    dataRow("Equity Weight (E/V)",          [`${wacc.equity_weight.toFixed(1)}%`]),
    dataRow("Debt Weight (D/V)",            [`${wacc.debt_weight.toFixed(1)}%`]),
    totalRow("WACC",                        [fp(wacc.wacc, 2)], true),
  ];

  autoTable(doc, {
    startY: y0 + 10,
    margin: { left: midX, right: MR, bottom: FOOTER_H + 2, top: MT },
    tableWidth: RW * 0.48,
    head: [["Component", "Value"]],
    body: waccRows,
    styles:     { fontSize: 7, cellPadding: 2, lineColor: CP, lineWidth: 0.15, textColor: CT },
    headStyles: { fillColor: CN, textColor: CB, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 55, fillColor: CP }, 1: { cellWidth: 25, fillColor: CP, halign: "right" } },
    theme: "plain",
    willDrawPage: makePageHook(doc, TITLE),
  });
}

// ─── Page 3–4: Income Statement ───────────────────────────────────

function buildIncomeStatement(
  doc: jsPDF,
  data: ExtractedData,
  model: FinancialModel
): void {
  const TITLE = "Income Statement";
  const is    = data.income_statement;
  const proj  = model.income_statement_projected;
  const nH    = (is.years ?? []).length;
  const nP    = proj.years.length;
  const nAll  = nH + nP;

  const y0 = newPage(doc, TITLE);

  // Build hist COGS + derived metrics
  const histCogs  = is.cost_of_materials_consumed.map((v, i) =>
    v + is.purchase_of_stock_in_trade[i] + is.changes_in_inventories[i]);
  const histGP    = is.revenue_from_operations.map((v, i) => v - histCogs[i]);
  const histEBITDA = is.profit_before_tax.map((v, i) =>
    v + is.finance_costs[i] + is.depreciation_and_amortisation[i]);
  const histEBIT   = histEBITDA.map((v, i) => v - is.depreciation_and_amortisation[i]);

  function hv(arr: number[], fmt: (v: number) => string = fc) {
    return [...arr.map(fmt), ...Array<string>(nP).fill("")];
  }
  function pv(arr: number[], fmt: (v: number) => string = fc) {
    return [...Array<string>(nH).fill(""), ...arr.map(fmt)];
  }
  function hp(hist: number[], projected: number[], fmt: (v: number) => string = fc) {
    return [...hist.map(fmt), ...projected.map(fmt)];
  }

  // Revenue growth across the full timeline
  const allRev = [...is.revenue_from_operations, ...proj.revenue];
  const growthArr: string[] = allRev.map((v, i) => {
    if (i === 0) return "–";
    const prev = allRev[i - 1];
    return prev > 0 ? fp(((v - prev) / prev) * 100) : "–";
  });

  const head = buildHead(is.years ?? [], proj.years);

  const body: BodyRow[] = [
    sectionRow("INCOME STATEMENT", nAll + 1),
    dataRow("Revenue from Operations",  hp(is.revenue_from_operations, proj.revenue)),
    dataRow("Other Income",             hv(is.other_income)),
    subtotalRow("Total Income",         hp(
      is.total_income,
      proj.revenue.map((v, i) => v + (proj.ebitda[i] - proj.ebitda[i]))  // approx; use proj.revenue
    )),
    metricRow("Revenue Growth %",       growthArr),

    sectionRow("COSTS", nAll + 1),
    dataRow("COGS / Materials",         hp(histCogs, proj.cogs)),
    dataRow("Employee Benefits",        hv(is.employee_benefits_expense)),
    dataRow("Other Expenses",           hv(is.other_expenses)),
    dataRow("Total Expenses",           hv(is.total_expenses)),

    sectionRow("PROFITABILITY", nAll + 1),
    subtotalRow("EBITDA",               hp(histEBITDA, proj.ebitda)),
    metricRow("EBITDA Margin %",        hp(
      histEBITDA.map((v, i) => is.revenue_from_operations[i] > 0 ? (v / is.revenue_from_operations[i]) * 100 : 0),
      proj.ebitda_margin_pct,
      fp
    )),
    dataRow("Depreciation & Amort.",    hp(is.depreciation_and_amortisation, proj.depreciation)),
    subtotalRow("EBIT",                 hp(histEBIT, proj.ebit)),

    dataRow("Finance Costs",            hv(is.finance_costs)),
    dataRow("Other Income (below)",     pv(proj.other_income)),
    dataRow("Profit Before Tax",        hp(is.profit_before_tax, proj.pbt)),
    dataRow("Tax Expense",              hp(is.total_tax_expense, proj.tax)),
    totalRow("Profit After Tax",        hp(is.profit_after_tax, proj.pat), true),
    metricRow("PAT Margin %",           hp(
      is.profit_after_tax.map((v, i) => is.revenue_from_operations[i] > 0 ? (v / is.revenue_from_operations[i]) * 100 : 0),
      proj.pat.map((v, i) => proj.revenue[i] > 0 ? (v / proj.revenue[i]) * 100 : 0),
      fp
    )),
    dataRow("EPS (Diluted)",            hp(is.eps_diluted, proj.eps, (v) => v.toFixed(2))),
  ];

  autoTable(doc, {
    ...baseTableOpts(doc, y0, TITLE),
    head,
    body,
    columnStyles: buildColStyles(nH, nP),
  });
}

// ─── Pages 5–6: Balance Sheet ─────────────────────────────────────

function buildBalanceSheet(
  doc: jsPDF,
  data: ExtractedData,
  model: FinancialModel
): void {
  const TITLE = "Balance Sheet";
  const bs    = data.balance_sheet;
  const proj  = model.balance_sheet_projected;
  const nH    = (bs.years ?? []).length;
  const nP    = proj.years.length;
  const nAll  = nH + nP;

  const y0 = newPage(doc, TITLE);

  function hv(arr: number[]) { return [...arr.map(fc), ...Array<string>(nP).fill("")]; }
  function pv(arr: number[]) { return [...Array<string>(nH).fill(""), ...arr.map(fc)]; }
  function hp(hist: number[], projected: number[]) { return [...hist.map(fc), ...projected.map(fc)]; }

  const nca = bs.assets.non_current;
  const ca  = bs.assets.current;
  const el  = bs.equity_and_liabilities;

  const body: BodyRow[] = [
    sectionRow("ASSETS", nAll + 1),
    sectionRow("  Non-Current Assets", nAll + 1),
    dataRow("Property, Plant & Equipment (Net)", hv(nca.property_plant_equipment_net), { indent: true }),
    dataRow("Capital Work-in-Progress",          hv(nca.capital_work_in_progress),     { indent: true }),
    dataRow("Intangible Assets",                 hv(nca.intangible_assets),             { indent: true }),
    dataRow("Non-Current Investments",           hv(nca.non_current_investments),       { indent: true }),
    dataRow("Other Non-Current Assets",          hv(nca.other_non_current_assets),      { indent: true }),
    subtotalRow("Total Non-Current Assets",      hv(nca.total_non_current_assets)),

    sectionRow("  Current Assets", nAll + 1),
    dataRow("Inventories",                       hp(ca.inventories, proj.inventories),              { indent: true }),
    dataRow("Trade Receivables",                 hp(ca.trade_receivables, proj.trade_receivables),  { indent: true }),
    dataRow("Cash & Equivalents",                hp(ca.cash_and_cash_equivalents, proj.cash_and_equivalents), { indent: true }),
    dataRow("Other Current Assets",              hv(ca.other_current_assets),                       { indent: true }),
    subtotalRow("Total Current Assets",          hv(ca.total_current_assets)),
    totalRow("TOTAL ASSETS",                     hp(bs.assets.total_assets, proj.total_assets), false),

    sectionRow("EQUITY & LIABILITIES", nAll + 1),
    sectionRow("  Equity", nAll + 1),
    dataRow("Share Capital",                     hv(el.equity.share_capital),     { indent: true }),
    dataRow("Reserves & Surplus",                hv(el.equity.reserves_and_surplus), { indent: true }),
    subtotalRow("Total Equity",                  hp(el.equity.total_equity, proj.total_equity)),

    sectionRow("  Non-Current Liabilities", nAll + 1),
    dataRow("Long-Term Borrowings",              hv(el.non_current_liabilities.long_term_borrowings), { indent: true }),
    dataRow("Other Non-Current Liabilities",     hv(el.non_current_liabilities.other_non_current_liabilities), { indent: true }),
    subtotalRow("Total Non-Current Liabilities", hv(el.non_current_liabilities.total_non_current_liabilities)),

    sectionRow("  Current Liabilities", nAll + 1),
    dataRow("Short-Term Borrowings",             hp(el.current_liabilities.short_term_borrowings, proj.short_term_debt), { indent: true }),
    dataRow("Trade Payables",                    hp(el.current_liabilities.trade_payables, proj.trade_payables), { indent: true }),
    dataRow("Other Current Liabilities",         hv(el.current_liabilities.other_current_liabilities), { indent: true }),
    subtotalRow("Total Current Liabilities",     hv(el.current_liabilities.total_current_liabilities)),
    totalRow("TOTAL EQUITY & LIABILITIES",       hp(el.total_equity_and_liabilities, proj.total_equity_and_liabilities), false),
  ];

  autoTable(doc, {
    ...baseTableOpts(doc, y0, TITLE),
    head: buildHead(bs.years ?? [], proj.years),
    body,
    columnStyles: buildColStyles(nH, nP),
  });
}

// ─── Page 7: Cash Flow Statement ──────────────────────────────────

function buildCashFlow(
  doc: jsPDF,
  data: ExtractedData,
  model: FinancialModel
): void {
  const TITLE = "Cash Flow Statement";
  const cf    = data.cash_flow_statement;
  const proj  = model.cash_flow_projected;
  const nH    = (cf.years ?? []).length;
  const nP    = proj.years.length;
  const nAll  = nH + nP;

  const y0 = newPage(doc, TITLE);

  function hp(hist: number[], projected: number[]) { return [...hist.map(fc), ...projected.map(fc)]; }

  const histFCF = cf.cash_from_operating_activities.map((v, i) => v + cf.capital_expenditure[i]);
  const projFCF = proj.cfo.map((v, i) => v + proj.capex[i]);

  const body: BodyRow[] = [
    sectionRow("OPERATING ACTIVITIES", nAll + 1),
    totalRow("Cash from Operations (CFO)", hp(cf.cash_from_operating_activities, proj.cfo)),
    sectionRow("INVESTING ACTIVITIES", nAll + 1),
    dataRow("Capital Expenditure",         hp(cf.capital_expenditure, proj.capex)),
    totalRow("Cash from Investing (CFI)",  hp(cf.cash_from_investing_activities, proj.cfi)),
    sectionRow("FINANCING ACTIVITIES", nAll + 1),
    totalRow("Cash from Financing (CFF)",  hp(cf.cash_from_financing_activities, proj.cff)),
    sectionRow("CASH POSITION", nAll + 1),
    subtotalRow("Net Change in Cash",      hp(cf.net_change_in_cash, proj.net_cash_flow)),
    dataRow("Opening Cash Balance",        hp(cf.opening_cash_balance, proj.opening_cash)),
    totalRow("Closing Cash Balance",       hp(cf.closing_cash_balance, proj.closing_cash), true),
    metricRow("Free Cash Flow (FCF)",      hp(histFCF, projFCF)),
  ];

  autoTable(doc, {
    ...baseTableOpts(doc, y0, TITLE),
    head: buildHead(cf.years ?? [], proj.years),
    body,
    columnStyles: buildColStyles(nH, nP),
  });
}

// ─── Page 8: Working Capital + D&A Schedules ─────────────────────

function buildSchedules(doc: jsPDF, model: FinancialModel): void {
  const TITLE = "Supporting Schedules";
  const sc    = model.schedules;
  const proj  = model.income_statement_projected;
  const years = sc.working_capital.years;
  const nP    = years.length;
  const nAll  = nP;

  const y0 = newPage(doc, TITLE);

  function pv(arr: number[], fmt: (v: number) => string = fc) { return arr.map(fmt); }

  const dso = sc.working_capital.trade_receivables.map((v, i) =>
    proj.revenue[i] > 0 ? (v / proj.revenue[i]) * 365 : null);
  const dio = sc.working_capital.inventories.map((v, i) =>
    proj.cogs[i] > 0 ? (v / proj.cogs[i]) * 365 : null);
  const dpo = sc.working_capital.trade_payables.map((v, i) =>
    proj.cogs[i] > 0 ? (v / proj.cogs[i]) * 365 : null);

  const wcHead = [["Working Capital Schedule (Rs. Cr)", ...years]];
  const wcBody: BodyRow[] = [
    dataRow("Trade Receivables",     pv(sc.working_capital.trade_receivables)),
    dataRow("Inventories",           pv(sc.working_capital.inventories)),
    dataRow("Trade Payables",        pv(sc.working_capital.trade_payables)),
    subtotalRow("Net Working Capital", pv(sc.working_capital.net_working_capital)),
    dataRow("Change in NWC (Δ)",     pv(sc.working_capital.change_in_nwc)),
    sectionRow("Efficiency Ratios", nAll + 1),
    metricRow("Receivable Days (DSO)", dso.map((v) => v != null ? fd(v) : "–")),
    metricRow("Inventory Days (DIO)",  dio.map((v) => v != null ? fd(v) : "–")),
    metricRow("Payable Days (DPO)",    dpo.map((v) => v != null ? fd(v) : "–")),
  ];

  const projCols: Record<number, Record<string, unknown>> = {
    0: { cellWidth: 60, fillColor: CP, fontStyle: "bold", textColor: CT },
  };
  for (let i = 1; i <= nP; i++) {
    projCols[i] = { fillColor: CPJ, textColor: CT, halign: "right" };
  }

  autoTable(doc, {
    ...baseTableOpts(doc, y0, TITLE),
    head: wcHead,
    body: wcBody,
    columnStyles: projCols,
  });

  const finalY1 = (doc as DocAT).lastAutoTable.finalY + 6;

  const dep = sc.depreciation_and_capex;
  const capexRevPct = dep.capex.map((v, i) =>
    proj.revenue[i] > 0 ? (Math.abs(v) / proj.revenue[i]) * 100 : 0);
  const daRevPct = dep.depreciation.map((v, i) =>
    proj.revenue[i] > 0 ? (v / proj.revenue[i]) * 100 : 0);

  const daHead = [["D&A / CapEx Schedule (Rs. Cr)", ...dep.years]];
  const daBody: BodyRow[] = [
    dataRow("Opening Gross Block",  pv(dep.opening_gross_block)),
    dataRow("Add: CapEx",           pv(dep.capex)),
    dataRow("Less: Disposals",      pv(dep.disposals)),
    subtotalRow("Closing Gross Block", pv(dep.closing_gross_block)),
    dataRow("Less: Depreciation",   pv(dep.depreciation)),
    totalRow("Closing Net Block",   pv(dep.closing_net_block)),
    metricRow("CapEx / Revenue %",  capexRevPct.map(fp)),
    metricRow("D&A / Revenue %",    daRevPct.map(fp)),
  ];

  autoTable(doc, {
    ...baseTableOpts(doc, finalY1, TITLE),
    head: daHead,
    body: daBody,
    columnStyles: projCols,
  });
}

// ─── Page 9: DCF Valuation ────────────────────────────────────────

function buildDcfValuation(doc: jsPDF, model: FinancialModel): void {
  const TITLE = "DCF Valuation";
  const y0    = newPage(doc, TITLE);
  const dcf   = model.dcf_valuation;
  const fcff  = dcf.fcff;
  const nP    = fcff.years.length;
  const wacc  = dcf.wacc;
  const tv    = dcf.terminal_value;

  const projCols: Record<number, Record<string, unknown>> = {
    0: { cellWidth: 65, fillColor: CP, fontStyle: "bold", textColor: CT },
  };
  for (let i = 1; i <= nP; i++) {
    projCols[i] = { fillColor: CPJ, textColor: CT, halign: "right" };
  }

  const head = [["FCFF Schedule (Rs. Cr)", ...fcff.years]];
  const body: BodyRow[] = [
    dataRow("EBIT",                         fcff.ebit.map(fc)),
    dataRow("Less: Tax on EBIT",            fcff.tax_on_ebit.map(fc), { indent: true }),
    subtotalRow("NOPAT (EBIT × (1−t))",     fcff.nopat.map(fc)),
    dataRow("Add: Depreciation & Amort.",   fcff.depreciation.map(fc), { indent: true }),
    dataRow("Less: Capital Expenditure",    fcff.capex.map(fc),        { indent: true }),
    dataRow("Less: Increase in NWC",        fcff.change_in_nwc.map(fc),{ indent: true }),
    totalRow("FCFF",                        fcff.fcff.map(fc), true),
    sectionRow("DISCOUNTING", nP + 1),
    metricRow("Discount Factor (1/(1+WACC)ⁿ)", dcf.discount_factors.map((v) => v.toFixed(4))),
    subtotalRow("PV of FCFF",               dcf.pv_of_fcffs.map(fc)),
  ];

  autoTable(doc, {
    ...baseTableOpts(doc, y0, TITLE),
    head,
    body,
    columnStyles: projCols,
  });

  const afterTable = (doc as DocAT).lastAutoTable.finalY + 8;

  // Two panels below: WACC derivation | Equity Bridge
  const panelW = (PW - ML - MR - 6) / 2;
  const PX2    = ML + panelW + 6;

  // Panel backgrounds
  doc.setFillColor(...CP);
  doc.roundedRect(ML, afterTable, panelW, 60, 1.5, 1.5, "F");
  doc.roundedRect(PX2, afterTable, panelW, 60, 1.5, 1.5, "F");

  // WACC panel
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...CB);
  doc.text("WACC DERIVATION", ML + 5, afterTable + 7);

  const wrows: [string, string][] = [
    ["Risk-Free Rate (Rf)",     fp(wacc.components.risk_free_rate, 2)],
    ["Beta (β)",                wacc.components.beta.toFixed(2)],
    ["Equity Risk Premium",     fp(wacc.components.equity_risk_premium ?? 0, 2)],
    ["Cost of Equity (Ke)",     fp(wacc.cost_of_equity, 2)],
    ["Pre-Tax Cost of Debt",    fp(wacc.cost_of_debt_pre_tax, 2)],
    ["Post-Tax Cost of Debt",   fp(wacc.cost_of_debt_post_tax, 2)],
    ["Equity Weight (E/V)",     `${wacc.equity_weight.toFixed(1)}%`],
    ["Debt Weight (D/V)",       `${wacc.debt_weight.toFixed(1)}%`],
  ];
  wrows.forEach(([lbl, val], i) => {
    kpiLine(doc, lbl, val, ML + 5, afterTable + 14 + i * 6, panelW - 10);
  });
  // WACC highlight
  doc.setFillColor(...CN);
  doc.roundedRect(ML + 5, afterTable + 48, panelW - 10, 9, 1, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(...CM);
  doc.text("WACC", ML + 10, afterTable + 53);
  doc.setFontSize(10);
  doc.setTextColor(...CE);
  doc.text(fp(wacc.wacc, 2), ML + panelW - 5, afterTable + 53, { align: "right" });

  // Equity bridge panel
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...CB);
  doc.text("EQUITY VALUE BRIDGE", PX2 + 5, afterTable + 7);

  const brows: [string, string, boolean][] = [
    ["Sum of PV(FCFFs)",         fc(dcf.sum_pv_fcffs),                             false],
    ["+ PV of Terminal Value",   fc(tv.terminal_value_discounted),                 false],
    ["= Enterprise Value",       fc(dcf.enterprise_value),                         true],
    ["− Net Debt",               fc(dcf.less_net_debt),                            false],
    ["+ Non-Operating Assets",   fc(dcf.plus_non_operating_assets),                false],
    ["= Equity Value",           fc(dcf.equity_value),                             true],
    ["Diluted Shares (Cr)",      dcf.diluted_shares.toFixed(2) + " Cr",            false],
    ["= Intrinsic Value / Share",fs(dcf.per_share_value),                          true],
  ];
  brows.forEach(([lbl, val, bold], i) => {
    const col: RGB = bold ? CE : CT;
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(7);
    doc.setTextColor(...CM);
    doc.text(lbl, PX2 + 5, afterTable + 14 + i * 6);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(...col);
    doc.text(val, PX2 + panelW - 5, afterTable + 14 + i * 6, { align: "right" });
  });
}

// ─── Page 10: Sensitivity Analysis ───────────────────────────────

function buildSensitivity(doc: jsPDF, model: FinancialModel): void {
  const TITLE = "Sensitivity Analysis";
  const y0    = newPage(doc, TITLE);
  const sens  = model.sensitivity_analysis;
  const dcf   = model.dcf_valuation;

  const { wacc_range, growth_range, grid } = sens;
  const cmp       = dcf.current_market_price;
  const baseValue = dcf.per_share_value;
  const reference = cmp && cmp > 0 ? cmp : baseValue;

  // Find base case indices
  const baseWaccIdx = wacc_range.reduce(
    (b, w, i) => Math.abs(w - dcf.wacc.wacc) < Math.abs(wacc_range[b] - dcf.wacc.wacc) ? i : b, 0);
  const baseGIdx = growth_range.reduce(
    (b, g, i) => Math.abs(g - dcf.terminal_value.terminal_growth_rate) < Math.abs(growth_range[b] - dcf.terminal_value.terminal_growth_rate) ? i : b, 0);

  function getSensColor(upside: number): RGB {
    if (upside > 40)  return [5,  100, 60 ];
    if (upside > 20)  return [8,  120, 75 ];
    if (upside > 5)   return [12, 140, 90 ];
    if (upside > -5)  return [30, 45,  70 ];
    if (upside > -20) return [120, 30, 50 ];
    if (upside > -40) return [150, 20, 40 ];
    return [170, 10, 30];
  }

  // Description label
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...CM);
  const refLabel = cmp && cmp > 0
    ? `Colors relative to CMP (Rs. ${Math.round(cmp)})`
    : "Colors relative to base-case intrinsic value";
  doc.text(
    `Rows = Terminal Growth Rate (g%)  ·  Columns = WACC (%)  ·  ${refLabel}`,
    ML, y0 + 3
  );

  const head: string[][] = [
    ["g \\ WACC", ...wacc_range.map((w) => `${w.toFixed(1)}%`)],
  ];

  const body: BodyRow[] = growth_range.map((g, gi) => {
    const row: BodyRow = [{ content: `${g.toFixed(1)}%`, styles: { fillColor: CP, textColor: CB, fontStyle: "bold" } }];
    wacc_range.forEach((_w, wi) => {
      const value  = grid[gi]?.[wi] ?? 0;
      const upside = ((value - reference) / Math.abs(reference)) * 100;
      const isBase = gi === baseGIdx && wi === baseWaccIdx;
      const bg     = isBase ? CE : getSensColor(upside);
      const tc: RGB = isBase ? [10, 22, 40] : [220, 235, 255];
      row.push({
        content: fc(value),
        styles:  { fillColor: bg, textColor: tc, fontStyle: isBase ? "bold" : "normal", halign: "center" },
      });
    });
    return row;
  });

  const nCols = wacc_range.length;
  const cellW  = Math.min(28, (PW - ML - MR - 22) / nCols);
  const colStyles: Record<number, Record<string, unknown>> = {
    0: { cellWidth: 18, fillColor: CP, fontStyle: "bold", textColor: CB },
  };
  for (let i = 1; i <= nCols; i++) {
    colStyles[i] = { cellWidth: cellW, halign: "center" };
  }

  autoTable(doc, {
    ...baseTableOpts(doc, y0 + 6, TITLE),
    head,
    body,
    columnStyles: colStyles,
    headStyles: { fillColor: CN, textColor: CB, fontStyle: "bold", halign: "center" },
  });

  const afterGrid = (doc as DocAT).lastAutoTable.finalY + 6;

  // Bear / Base / Bull cards
  const cardW = (PW - ML - MR - 8) / 3;
  const scenarios = [
    { label: "Bear Case",  waccIdx: wacc_range.length - 1, gIdx: 0,                   color: [120, 30, 50] as RGB },
    { label: "Base Case",  waccIdx: baseWaccIdx,            gIdx: baseGIdx,             color: CE },
    { label: "Bull Case",  waccIdx: 0,                      gIdx: growth_range.length - 1, color: CB },
  ];

  scenarios.forEach((sc, i) => {
    const v     = grid[sc.gIdx]?.[sc.waccIdx] ?? 0;
    const up    = cmp && cmp > 0 ? ((v - cmp) / cmp) * 100 : null;
    const cx    = ML + i * (cardW + 4);
    doc.setFillColor(...CP);
    doc.roundedRect(cx, afterGrid, cardW, 22, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...CM);
    doc.text(sc.label.toUpperCase(), cx + cardW / 2, afterGrid + 6, { align: "center" });
    doc.setFontSize(11);
    doc.setTextColor(...sc.color);
    doc.text(fc(v), cx + cardW / 2, afterGrid + 14, { align: "center" });
    if (up != null) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(...(up >= 0 ? CE : [243, 113, 136] as RGB));
      doc.text(`${up >= 0 ? "+" : ""}${up.toFixed(1)}% vs CMP`, cx + cardW / 2, afterGrid + 19, { align: "center" });
    }
  });
}

// ─── Page 11: Assumptions + Rationale ────────────────────────────

function buildAssumptions(doc: jsPDF, model: FinancialModel): void {
  const TITLE = "Assumptions & Rationale";
  const y0    = newPage(doc, TITLE);
  const ass   = model.assumptions;

  const head = [["Assumption", "F+1", "F+2", "F+3", "F+4", "F+5"]];

  const body: BodyRow[] = [
    sectionRow("GROWTH & MARGINS", 6),
    dataRow("Revenue Growth Rate",  ass.revenue_growth_rates.map(fp)),
    dataRow("EBITDA Margin",        ass.ebitda_margin.map(fp)),

    sectionRow("CAPITAL EXPENDITURE & DEPRECIATION", 6),
    dataRow("CapEx / Revenue %",    Array(5).fill(fp(ass.capex_to_revenue))),
    dataRow("Depreciation Rate %",  Array(5).fill(fp(ass.depreciation_rate))),

    sectionRow("WORKING CAPITAL", 6),
    dataRow("Receivable Days (DSO)", Array(5).fill(fd(ass.receivable_days))),
    dataRow("Inventory Days (DIO)",  Array(5).fill(fd(ass.inventory_days))),
    dataRow("Payable Days (DPO)",    Array(5).fill(fd(ass.payable_days))),

    sectionRow("FINANCING & TAX", 6),
    dataRow("Tax Rate",             Array(5).fill(fp(ass.tax_rate, 2))),
    dataRow("Interest Rate on Debt",Array(5).fill(fp(ass.interest_rate_on_debt, 2))),

    sectionRow("WACC INPUTS", 6),
    dataRow("Risk-Free Rate",       Array(5).fill(fp(ass.risk_free_rate, 2))),
    dataRow("Beta (β)",             Array(5).fill(ass.beta.toFixed(2))),
    dataRow("Equity Risk Premium",  Array(5).fill(fp(ass.equity_risk_premium, 2))),
    subtotalRow("WACC (Calculated)",Array(5).fill(fp(ass.wacc_calculated, 2))),

    sectionRow("TERMINAL VALUE", 6),
    totalRow("Terminal Growth Rate",Array(5).fill(fp(ass.terminal_growth_rate, 1)), false),
  ];

  autoTable(doc, {
    ...baseTableOpts(doc, y0, TITLE),
    head,
    body,
    columnStyles: {
      0: { cellWidth: 65, fillColor: CP, fontStyle: "bold", textColor: CT },
      1: { fillColor: CPJ, halign: "right" },
      2: { fillColor: CPJ, halign: "right" },
      3: { fillColor: CPJ, halign: "right" },
      4: { fillColor: CPJ, halign: "right" },
      5: { fillColor: CPJ, halign: "right" },
    },
  });

  const afterTable = (doc as DocAT).lastAutoTable.finalY + 8;

  // Rationale section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...CB);
  doc.text("ANALYST RATIONALE", ML, afterTable);

  const rationales: [string, string][] = [
    ["Revenue Growth",  ass.rationale.revenue_growth],
    ["EBITDA Margin",   ass.rationale.margin],
    ["CapEx",           ass.rationale.capex],
    ["WACC",            ass.rationale.wacc],
    ["Terminal Value",  ass.rationale.terminal_growth],
  ];

  let ry = afterTable + 6;
  rationales.forEach(([label, text]) => {
    if (ry > PH - FOOTER_H - 10) return; // guard against overflow
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...CE);
    doc.text(`${label}:`, ML, ry);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...CT);
    const lines = doc.splitTextToSize(text ?? "—", PW - ML - MR - 22);
    doc.text(lines.slice(0, 2) as string[], ML + 28, ry);
    ry += Math.min(lines.length, 2) * 4 + 2;
  });
}

// ─── Main export function ─────────────────────────────────────────

export async function exportValuationPdf(
  data: ExtractedData,
  model: FinancialModel
): Promise<void> {
  _pg = 0;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  // Page 1 — Cover (uses the initial page created by jsPDF)
  _pg = 1;
  drawCover(doc, data, model);

  // Page 2 — Executive Summary
  buildExecSummary(doc, data, model);

  // Pages 3–4 — Income Statement
  buildIncomeStatement(doc, data, model);

  // Pages 5–6 — Balance Sheet
  buildBalanceSheet(doc, data, model);

  // Page 7 — Cash Flow Statement
  buildCashFlow(doc, data, model);

  // Page 8 — Working Capital + D&A Schedules
  buildSchedules(doc, model);

  // Page 9 — DCF Valuation
  buildDcfValuation(doc, model);

  // Page 10 — Sensitivity Analysis
  buildSensitivity(doc, model);

  // Page 11 — Assumptions + Rationale
  buildAssumptions(doc, model);

  // Save
  const name = data.metadata.company_name.replace(/[^a-zA-Z0-9]+/g, "_");
  const date = new Date().toISOString().slice(0, 10);
  doc.save(`Valkyrie_DCF_${name}_${date}.pdf`);
}
