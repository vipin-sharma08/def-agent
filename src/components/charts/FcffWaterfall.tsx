"use client";

import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtCrore } from "@/lib/formatters";
import type { FcffSchedule } from "@/lib/types";
import { chartTheme } from "@/components/charts/ChartTheme";

interface Props {
  fcff: FcffSchedule;
  yearIndex?: number;
}

interface WaterfallItem {
  label: string;
  value: number;
  base: number;
  size: number;
  isTotal: boolean;
  isPositive: boolean;
}

function buildWaterfallData(fcff: FcffSchedule, yearIndex: number): WaterfallItem[] {
  const ebit = fcff.ebit[yearIndex] ?? 0;
  const tax = Math.abs(fcff.tax_on_ebit[yearIndex] ?? 0);
  const nopat = fcff.nopat[yearIndex] ?? 0;
  const depreciation = Math.abs(fcff.depreciation[yearIndex] ?? 0);
  const capex = Math.abs(fcff.capex[yearIndex] ?? 0);
  const changeInNwc = fcff.change_in_nwc[yearIndex] ?? 0;
  const fcffValue = fcff.fcff[yearIndex] ?? 0;

  const rows: WaterfallItem[] = [];
  let running = ebit;

  rows.push({
    label: "EBIT",
    value: ebit,
    base: 0,
    size: Math.abs(ebit),
    isTotal: false,
    isPositive: ebit >= 0,
  });

  rows.push({
    label: "Tax",
    value: -tax,
    base: running - tax,
    size: tax,
    isTotal: false,
    isPositive: false,
  });
  running -= tax;

  rows.push({
    label: "NOPAT",
    value: nopat,
    base: 0,
    size: Math.abs(nopat),
    isTotal: true,
    isPositive: nopat >= 0,
  });
  running = nopat;

  rows.push({
    label: "+D&A",
    value: depreciation,
    base: running,
    size: depreciation,
    isTotal: false,
    isPositive: true,
  });
  running += depreciation;

  rows.push({
    label: "−CapEx",
    value: -capex,
    base: running - capex,
    size: capex,
    isTotal: false,
    isPositive: false,
  });
  running -= capex;

  const nwcAbs = Math.abs(changeInNwc);
  const nwcPositive = changeInNwc < 0;
  rows.push({
    label: nwcPositive ? "+ΔNWC" : "−ΔNWC",
    value: nwcPositive ? nwcAbs : -nwcAbs,
    base: nwcPositive ? running : running - nwcAbs,
    size: nwcAbs,
    isTotal: false,
    isPositive: nwcPositive,
  });

  rows.push({
    label: "FCFF",
    value: fcffValue,
    base: 0,
    size: Math.abs(fcffValue),
    isTotal: true,
    isPositive: fcffValue >= 0,
  });

  return rows;
}

export const FcffWaterfall = ({ fcff, yearIndex }: Props) => {
  const activeYearIndex = yearIndex ?? fcff.years.length - 1;
  const year = fcff.years[activeYearIndex] ?? "";
  const data = buildWaterfallData(fcff, activeYearIndex);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-caption uppercase tracking-[0.12em] text-muted">FCF Bridge</p>
        <p className="text-caption text-muted">{year}</p>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: chartTheme.axis, fontSize: 12 }}
          />
          <YAxis hide />
          <ReferenceLine y={0} stroke={chartTheme.grid} />
          <Tooltip
            cursor={false}
            contentStyle={chartTheme.tooltip}
            formatter={(_value, _name, item) => {
              const payload = item.payload as WaterfallItem;
              return [fmtCrore(payload.value, 0), payload.label];
            }}
            labelStyle={{ color: chartTheme.label }}
          />
          <Bar dataKey="base" stackId="fcf" fill="transparent" isAnimationActive={false} />
          <Bar dataKey="size" stackId="fcf" radius={[6, 6, 0, 0]}>
            {data.map((item) => (
              <Cell
                key={item.label}
                fill={
                  item.isTotal
                    ? chartTheme.accent
                    : item.isPositive
                      ? chartTheme.profit
                      : chartTheme.loss
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
