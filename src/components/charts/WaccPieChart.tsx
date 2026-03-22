"use client";

// WACC Capital Structure Donut
// Shows Equity vs Debt weight with Ke/Kd labels.

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import type { WaccDetail } from "@/lib/types";

interface Props {
  wacc: WaccDetail;
}

export const WaccPieChart = ({ wacc }: Props) => {
  const data = [
    { name: "Equity", value: wacc.equity_weight, rate: wacc.cost_of_equity },
    { name: "Debt", value: wacc.debt_weight, rate: wacc.cost_of_debt_post_tax },
  ];

  const COLORS = ["#14B8A6", "#3B82F6"]; // teal, blue

  return (
    <div>
      <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider mb-2">
        Capital Structure
      </p>
      <div className="flex items-center gap-4">
        <ResponsiveContainer width={120} height={120}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={32}
              outerRadius={52}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
              isAnimationActive={false}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i]} opacity={0.8} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="space-y-2 text-xs">
          {data.map((d, i) => (
            <div key={d.name} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: COLORS[i] }} />
              <span className="text-zinc-400">{d.name}</span>
              <span className="font-mono font-semibold text-zinc-200">
                {d.value.toFixed(1)}%
              </span>
              <span className="font-mono text-zinc-600 text-[10px]">
                @ {d.rate.toFixed(1)}%
              </span>
            </div>
          ))}
          <div className="pt-1 border-t border-border flex items-center gap-2">
            <div className="w-2.5 h-2.5" />
            <span className="text-zinc-400">WACC</span>
            <span className="font-mono font-bold text-teal">{wacc.wacc.toFixed(2)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
