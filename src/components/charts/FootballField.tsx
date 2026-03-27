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
import { fmtShare } from "@/lib/formatters";
import type { DcfValuation, Scenarios, SensitivityAnalysis } from "@/lib/types";
import { chartTheme } from "@/components/charts/ChartTheme";

interface Props {
  sensitivity: SensitivityAnalysis;
  dcf: DcfValuation;
  scenarios: Scenarios;
}

interface RangeRow {
  label: string;
  start: number;
  span: number;
  base: number;
  tone: string;
}

function getGridBounds(grid: number[][]) {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  grid.forEach((row) => {
    row.forEach((value) => {
      min = Math.min(min, value);
      max = Math.max(max, value);
    });
  });

  return { min, max };
}

export const FootballField = ({ sensitivity, dcf, scenarios }: Props) => {
  const { min, max } = getGridBounds(sensitivity.grid);
  const rows: RangeRow[] = [
    {
      label: "DCF (Grid)",
      start: min,
      span: max - min,
      base: dcf.per_share_value,
      tone: chartTheme.accent,
    },
    {
      label: "DCF (Bull)",
      start: scenarios.base_case.per_share_value,
      span: scenarios.bull_case.per_share_value - scenarios.base_case.per_share_value,
      base: scenarios.bull_case.per_share_value,
      tone: chartTheme.teal,
    },
    {
      label: "DCF (Bear)",
      start: scenarios.bear_case.per_share_value,
      span: scenarios.base_case.per_share_value - scenarios.bear_case.per_share_value,
      base: scenarios.bear_case.per_share_value,
      tone: chartTheme.loss,
    },
  ];

  const currentPrice = dcf.current_market_price ?? undefined;

  return (
    <div className="space-y-3">
      <p className="text-caption uppercase tracking-[0.12em] text-muted">Football Field</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 8, right: 32, bottom: 0, left: 12 }}
        >
          <XAxis
            type="number"
            axisLine={false}
            tickLine={false}
            tick={{ fill: chartTheme.axis, fontSize: 12 }}
            tickFormatter={(value) => fmtShare(value)}
          />
          <YAxis
            type="category"
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: chartTheme.label, fontSize: 12 }}
            width={88}
          />
          <Tooltip
            cursor={false}
            contentStyle={chartTheme.tooltip}
            formatter={(_value, _name, item) => {
              const payload = item.payload as RangeRow;
              return [
                `${fmtShare(payload.start)} – ${fmtShare(payload.start + payload.span)}`,
                payload.label,
              ];
            }}
            labelStyle={{ color: chartTheme.label }}
          />
          {currentPrice ? (
            <ReferenceLine
              x={currentPrice}
              stroke={chartTheme.orange}
              strokeDasharray="4 4"
              label={{
                value: `CMP ${fmtShare(currentPrice)}`,
                fill: chartTheme.orange,
                fontSize: 12,
                position: "top",
              }}
            />
          ) : null}
          <Bar dataKey="start" stackId="range" fill="transparent" isAnimationActive={false} />
          <Bar dataKey="span" stackId="range" radius={[0, 6, 6, 0]}>
            {rows.map((row) => (
              <Cell key={row.label} fill={row.tone} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
