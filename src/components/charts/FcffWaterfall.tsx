"use client";

// FCFF Waterfall Chart
// Shows: EBIT → Tax → NOPAT → +D&A → −CapEx → −ΔNWC → FCFF
// Uses stacked bars to create waterfall effect.

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { FcffSchedule } from "@/lib/types";

interface Props {
  fcff: FcffSchedule;
  /** Which projection year index to show (default: last year) */
  yearIndex?: number;
}

interface WaterfallItem {
  name: string;
  value: number;
  base: number;   // invisible base bar
  bar: number;     // visible bar
  isTotal: boolean;
  isPositive: boolean;
}

function buildWaterfallData(fcff: FcffSchedule, yi: number): WaterfallItem[] {
  const ebit   = fcff.ebit[yi] ?? 0;
  const tax    = fcff.tax_on_ebit[yi] ?? 0;
  const nopat  = fcff.nopat[yi] ?? 0;
  const da     = fcff.depreciation[yi] ?? 0;
  const capex  = fcff.capex[yi] ?? 0;
  const nwc    = fcff.change_in_nwc[yi] ?? 0;
  const fcffV  = fcff.fcff[yi] ?? 0;

  const items: WaterfallItem[] = [];
  let running = 0;

  // EBIT (starting point)
  items.push({ name: "EBIT", value: ebit, base: 0, bar: ebit, isTotal: false, isPositive: true });
  running = ebit;

  // Tax on EBIT (subtracted)
  items.push({ name: "Tax", value: -Math.abs(tax), base: running - Math.abs(tax), bar: Math.abs(tax), isTotal: false, isPositive: false });
  running -= Math.abs(tax);

  // NOPAT (subtotal)
  items.push({ name: "NOPAT", value: nopat, base: 0, bar: nopat, isTotal: true, isPositive: true });
  running = nopat;

  // D&A (added)
  items.push({ name: "+D&A", value: da, base: running, bar: Math.abs(da), isTotal: false, isPositive: true });
  running += Math.abs(da);

  // CapEx (subtracted)
  items.push({ name: "−CapEx", value: -Math.abs(capex), base: running - Math.abs(capex), bar: Math.abs(capex), isTotal: false, isPositive: false });
  running -= Math.abs(capex);

  // ΔNWC (subtracted if positive)
  const nwcAbs = Math.abs(nwc);
  const nwcIsOutflow = nwc >= 0;
  if (nwcIsOutflow) {
    items.push({ name: "−ΔNWC", value: -nwcAbs, base: running - nwcAbs, bar: nwcAbs, isTotal: false, isPositive: false });
    running -= nwcAbs;
  } else {
    items.push({ name: "+ΔNWC", value: nwcAbs, base: running, bar: nwcAbs, isTotal: false, isPositive: true });
    running += nwcAbs;
  }

  // FCFF (total)
  items.push({ name: "FCFF", value: fcffV, base: 0, bar: Math.abs(fcffV), isTotal: true, isPositive: fcffV >= 0 });

  return items;
}

function fmtCr(v: number): string {
  if (!isFinite(v)) return "—";
  return `₹${Math.round(Math.abs(v)).toLocaleString("en-IN")} Cr`;
}

const COLORS = {
  positive: "#14B8A6",  // teal
  negative: "#F43F5E",  // rose
  total: "#3B82F6",     // blue
};

export const FcffWaterfall = ({ fcff, yearIndex }: Props) => {
  const yi = yearIndex ?? fcff.years.length - 1;
  const data = buildWaterfallData(fcff, yi);
  const year = fcff.years[yi] ?? "";

  return (
    <div>
      <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider mb-3">
        FCFF Build-Up — {year}
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 12 }}>
          <XAxis
            dataKey="name"
            tick={{ fill: "#71717A", fontSize: 10, fontFamily: "var(--font-mono)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide />
          <Tooltip
            cursor={false}
            contentStyle={{
              background: "#162336",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
              fontSize: 11,
              fontFamily: "var(--font-mono)",
            }}
            formatter={(_val, _name, props) => {
              const idx = (props as unknown as { index: number }).index ?? 0;
              const item = data[idx];
              return [fmtCr(item?.value ?? 0), ""];
            }}
            labelStyle={{ color: "#A1A1AA" }}
          />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.06)" />
          {/* Invisible base */}
          <Bar dataKey="base" stackId="a" fill="transparent" isAnimationActive={false} />
          {/* Visible bar */}
          <Bar dataKey="bar" stackId="a" radius={[3, 3, 0, 0]} isAnimationActive={false}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={d.isTotal ? COLORS.total : d.isPositive ? COLORS.positive : COLORS.negative}
                opacity={d.isTotal ? 0.9 : 0.7}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
