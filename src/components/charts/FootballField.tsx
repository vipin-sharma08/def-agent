"use client";

// Football Field Chart
// Horizontal range bars showing Bear→Bull valuation range,
// with base case marked and CMP line overlay.

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
import type { SensitivityAnalysis, DcfValuation, Scenarios } from "@/lib/types";

interface Props {
  sensitivity: SensitivityAnalysis;
  dcf: DcfValuation;
  scenarios: Scenarios;
}

function fmtShare(v: number): string {
  if (!isFinite(v)) return "—";
  return `₹${Math.round(v).toLocaleString("en-IN")}`;
}

export const FootballField = ({ sensitivity, dcf, scenarios }: Props) => {
  const { wacc_range, growth_range, grid } = sensitivity;
  const cmp = dcf.current_market_price;

  // Compute min/max from the entire sensitivity grid
  let gridMin = Infinity;
  let gridMax = -Infinity;
  for (const row of grid) {
    for (const v of row) {
      if (v < gridMin) gridMin = v;
      if (v > gridMax) gridMax = v;
    }
  }

  const bearValue = scenarios.bear_case.per_share_value;
  const baseValue = scenarios.base_case.per_share_value;
  const bullValue = scenarios.bull_case.per_share_value;

  const data = [
    {
      name: "DCF Range",
      min: gridMin,
      range: gridMax - gridMin,
      base: baseValue,
    },
    {
      name: "Scenarios",
      min: bearValue,
      range: bullValue - bearValue,
      base: baseValue,
    },
  ];

  // Chart domain
  const domainMin = Math.min(gridMin, bearValue, cmp ?? Infinity) * 0.85;
  const domainMax = Math.max(gridMax, bullValue, cmp ?? -Infinity) * 1.15;

  return (
    <div>
      <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider mb-3">
        Valuation Range (₹ per Share)
      </p>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 40, bottom: 4, left: 80 }}
        >
          <XAxis
            type="number"
            domain={[domainMin, domainMax]}
            tick={{ fill: "#71717A", fontSize: 10, fontFamily: "var(--font-mono)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => fmtShare(v)}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: "#A1A1AA", fontSize: 11, fontFamily: "var(--font-mono)" }}
            axisLine={false}
            tickLine={false}
            width={75}
          />
          <Tooltip
            cursor={false}
            contentStyle={{
              background: "#162336",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
              fontSize: 11,
              fontFamily: "var(--font-mono)",
            }}
            formatter={(_value, name, props) => {
              const p = (props as unknown as { payload: { min: number; range: number } }).payload;
              if (name === "min") return [fmtShare(p.min), "Min"];
              return [fmtShare(p.min + p.range), "Max"];
            }}
            labelStyle={{ color: "#A1A1AA" }}
          />
          {/* CMP vertical line */}
          {cmp != null && cmp > 0 && (
            <ReferenceLine
              x={cmp}
              stroke="#F59E0B"
              strokeWidth={2}
              strokeDasharray="4 4"
              label={{
                value: `CMP ${fmtShare(cmp)}`,
                position: "top",
                fill: "#F59E0B",
                fontSize: 10,
                fontFamily: "var(--font-mono)",
              }}
            />
          )}
          {/* Base case line */}
          <ReferenceLine
            x={baseValue}
            stroke="#14B8A6"
            strokeWidth={2}
            label={{
              value: `Base ${fmtShare(baseValue)}`,
              position: "bottom",
              fill: "#14B8A6",
              fontSize: 10,
              fontFamily: "var(--font-mono)",
            }}
          />
          {/* Invisible base offset */}
          <Bar dataKey="min" stackId="a" fill="transparent" isAnimationActive={false} />
          {/* Visible range bar */}
          <Bar dataKey="range" stackId="a" radius={[0, 4, 4, 0]} barSize={24} isAnimationActive={false}>
            {data.map((_, i) => (
              <Cell key={i} fill={i === 0 ? "#14B8A6" : "#3B82F6"} opacity={0.5} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-2 text-[10px] font-mono text-zinc-600">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-1.5 rounded-sm bg-teal opacity-50" /> DCF Grid Range
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-1.5 rounded-sm bg-blue opacity-50" /> Bear–Bull Scenarios
        </span>
        {cmp != null && cmp > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-amber border-t border-dashed border-amber" /> CMP
          </span>
        )}
      </div>
    </div>
  );
};
