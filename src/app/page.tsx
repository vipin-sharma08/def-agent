"use client";

import { Upload, TableProperties, SlidersHorizontal, BarChart3 } from "lucide-react";
import { PdfUploader } from "@/components/upload/PdfUploader";

// ─── 4-step flow overview ───────────────────────────────────────────

const FLOW_STEPS = [
  {
    icon: Upload,
    title: "Upload",
    description: "Drop an Annual Report PDF and our AI reads every financial statement.",
  },
  {
    icon: TableProperties,
    title: "Review",
    description: "Verify extracted Income Statement, Balance Sheet & Cash Flow data.",
  },
  {
    icon: SlidersHorizontal,
    title: "Assumptions",
    description: "Set growth rates, WACC, terminal value & working capital drivers.",
  },
  {
    icon: BarChart3,
    title: "Report",
    description: "Get a full DCF valuation with sensitivity analysis & PDF export.",
  },
] as const;

// ─── Landing Page ───────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="max-w-2xl w-full text-center space-y-4 mb-10">
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-zinc-50">
            Valkyrie <span className="text-teal">DCF</span>
          </h1>
          <p className="text-lg text-zinc-400 max-w-lg mx-auto leading-relaxed">
            AI-powered DCF valuation for Indian equities. Upload an Annual Report,
            review extracted financials, set assumptions, and get a professional
            valuation report — in minutes.
          </p>
        </div>

        {/* Upload zone */}
        <div className="w-full max-w-xl">
          <PdfUploader />
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border px-6 py-12">
        <p className="text-center text-[10px] font-mono tracking-[0.25em] text-zinc-600 uppercase mb-8">
          How it works
        </p>
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FLOW_STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="card p-5 space-y-3 group hover:border-teal/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-7 h-7 rounded-md bg-teal-dim text-teal text-xs font-mono font-bold">
                    {i + 1}
                  </span>
                  <Icon size={14} className="text-zinc-500 group-hover:text-teal transition-colors" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-200">{step.title}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">{step.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-4 text-center">
        <p className="text-[10px] font-mono text-zinc-700">
          For educational purposes only. Not financial advice. All values in ₹ Crores.
        </p>
      </footer>
    </div>
  );
}
