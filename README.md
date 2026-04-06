# 🤖 DCF Valuation Agent — AI-Powered Equity Valuation for Indian Markets

> Spent the last week vibe coding an AI-powered DCF valuation agent for Indian equities.
> It reads annual reports, extracts financials, and builds a full FCFF-based DCF model — automatically.
>
> **Why?** Manually valuing one company takes hours. I wanted to run 20 in the same time.

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript) ![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js) ![Status](https://img.shields.io/badge/status-work%20in%20progress-orange)

---

## ✨ What It Does

- **Annual Report Reader** — Ingests PDF annual reports and extracts revenue, EBIT, capex, working capital changes
- **FCFF Model Builder** — Constructs a full Free Cash Flow to Firm DCF model automatically
- **WACC Estimation** — Calculates cost of equity (CAPM), cost of debt, and blended WACC
- **Intrinsic Value Output** — Returns per-share fair value with bull/base/bear scenario ranges
- **Batch Valuation** — Run 20 valuations in the time it takes to do one manually

---

## 🏗️ Architecture

```
def-agent/
├── src/
│   ├── agent/           # AI orchestration layer (Claude API)
│   ├── extractors/      # PDF parsing & financial data extraction
│   ├── models/          # FCFF DCF model engine
│   ├── wacc/            # WACC & beta calculation
│   └── ui/              # Next.js frontend
├── .env.example
└── package.json
```

---

## 🚀 Quickstart

```bash
git clone https://github.com/vipin-sharma08/def-agent.git
cd def-agent
cp .env.example .env        # Add your API keys
npm install
npm run dev
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, Tailwind CSS |
| AI Orchestration | Claude API (Anthropic) |
| PDF Extraction | TypeScript + PDF parsing |
| DCF Engine | Custom FCFF model |
| Deployment | Vercel |

---

## 📌 Status

**Work in progress. Launching soon.**

If you're building at the intersection of AI and finance — [let's connect](https://github.com/vipin-sharma08).

---

## 📝 License

MIT © [Vipin Sharma](https://github.com/vipin-sharma08)
