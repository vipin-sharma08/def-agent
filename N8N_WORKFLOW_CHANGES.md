# n8n Workflow Changes for Valkyrie DCF Agent

This document describes the n8n workflow changes required to automate the
Valkyrie DCF Agent pipeline — from PDF ingestion to DCF report delivery.

---

## Overview

The DCF Agent follows a 4-step flow:

```
upload → extract → assumptions → report
```

n8n orchestrates this pipeline by connecting file ingestion, Claude AI
extraction, assumption defaults, and report generation.

---

## Required Workflow Changes

### 1. Webhook Trigger Node — Receive PDF Uploads

**Change:** Add a **Webhook** node as the workflow entry point.

- Method: `POST`
- Path: `/dcf/upload`
- Response Mode: `Last Node`
- Binary Data: enabled (to receive PDF file)

This replaces manual file uploads; external systems (email, Slack, Google Drive)
can POST a PDF to this webhook to start the pipeline.

---

### 2. Extract Financial Data via Claude API

**Change:** Add an **HTTP Request** node to call the Anthropic Claude API.

- URL: `https://api.anthropic.com/v1/messages`
- Method: `POST`
- Headers:
  - `x-api-key`: `{{ $env.ANTHROPIC_API_KEY }}`
  - `anthropic-version`: `2023-06-01`
  - `content-type`: `application/json`
- Body (JSON):
  ```json
  {
    "model": "claude-sonnet-4-6",
    "max_tokens": 4096,
    "messages": [
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": "Extract financial data from this annual report. Return JSON matching the FinancialData schema: revenue[], ebit[], depreciation[], amortization[], interestExpense[], taxRate, totalAssets[], totalDebt[], cashAndEquivalents[], workingCapital[], operatingCashFlow[], capex[], freeCashFlow[], sharesOutstanding, companyName, reportYear, currency."
          },
          {
            "type": "document",
            "source": {
              "type": "base64",
              "media_type": "application/pdf",
              "data": "{{ $binary.data.data }}"
            }
          }
        ]
      }
    ]
  }
  ```

**Credential to add in n8n:** Create a new **Header Auth** credential named
`Anthropic API Key` with the `ANTHROPIC_API_KEY` value.

---

### 3. Parse Claude Response

**Change:** Add a **Code** node after the Claude API call to parse the response.

```javascript
const content = $input.first().json.content[0].text;
// Strip markdown code fences if present
const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
const financialData = JSON.parse(jsonStr);
return [{ json: financialData }];
```

---

### 4. Apply Default DCF Assumptions

**Change:** Add a **Set** node to inject default DCF assumptions alongside the
extracted financial data.

Fields to set:

| Field | Value |
|---|---|
| `projectionYears` | `5` |
| `revenueGrowthRate` | `12` (%) |
| `ebitMargin` | `15` (%) |
| `taxRate` | `25` (%) — or use extracted `taxRate` |
| `capexAsPercentRevenue` | `5` (%) |
| `workingCapitalChangeAsPercentRevenue` | `2` (%) |
| `wacc` | `12` (%) |
| `terminalGrowthRate` | `4` (%) |

Set `netDebt` and `sharesOutstanding` from the upstream extracted data:
- `netDebt`: `{{ $json.totalDebt[0] - $json.cashAndEquivalents[0] }}`
- `sharesOutstanding`: `{{ $json.sharesOutstanding }}`

---

### 5. Compute DCF Projections

**Change:** Add a **Code** node to run the DCF computation.

```javascript
const d = $input.first().json;
const projections = [];
let revenue = d.revenue[d.revenue.length - 1]; // last known revenue

for (let i = 1; i <= d.projectionYears; i++) {
  revenue = revenue * (1 + d.revenueGrowthRate / 100);
  const ebit = revenue * (d.ebitMargin / 100);
  const nopat = ebit * (1 - d.taxRate / 100);
  const depreciation = revenue * 0.03; // approx 3% of revenue
  const capex = revenue * (d.capexAsPercentRevenue / 100);
  const wcChange = revenue * (d.workingCapitalChangeAsPercentRevenue / 100);
  const fcf = nopat + depreciation - capex - wcChange;
  const discountFactor = Math.pow(1 + d.wacc / 100, i);
  projections.push({
    year: new Date().getFullYear() + i,
    revenue, ebit, nopat, depreciation, capex,
    workingCapitalChange: wcChange,
    freeCashFlow: fcf,
    discountFactor,
    presentValue: fcf / discountFactor,
  });
}

const sumPV = projections.reduce((s, p) => s + p.presentValue, 0);
const lastFCF = projections[projections.length - 1].freeCashFlow;
const terminalValue = lastFCF * (1 + d.terminalGrowthRate / 100) /
  ((d.wacc - d.terminalGrowthRate) / 100);
const pvTV = terminalValue / Math.pow(1 + d.wacc / 100, d.projectionYears);
const enterpriseValue = sumPV + pvTV;
const equityValue = enterpriseValue - d.netDebt;
const intrinsicValuePerShare = equityValue / d.sharesOutstanding;

return [{
  json: {
    projections,
    terminalValue,
    presentValueTerminalValue: pvTV,
    sumPVFreeCashFlows: sumPV,
    enterpriseValue,
    equityValue,
    intrinsicValuePerShare,
    companyName: d.companyName,
    reportYear: d.reportYear,
    currency: d.currency,
  }
}];
```

---

### 6. Send Report (Notification)

**Change:** Add a final **Send Email** (or **Slack**) node to deliver the result.

**Email node config:**
- To: `{{ $workflow.staticData.requesterEmail }}` (set from webhook body)
- Subject: `DCF Report: {{ $json.companyName }} ({{ $json.reportYear }})`
- Body:
  ```
  Company: {{ $json.companyName }}
  Intrinsic Value/Share: {{ $json.currency }} {{ $json.intrinsicValuePerShare.toFixed(2) }}
  Enterprise Value: {{ $json.currency }} {{ $json.enterpriseValue.toFixed(0) }}
  ```

---

### 7. Environment Variables to Add in n8n

Go to **n8n Settings → Environment Variables** and add:

| Key | Value |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key |

---

## Workflow Summary

```
[Webhook: POST /dcf/upload]
        ↓
[HTTP Request: Claude API — Extract Financial Data]
        ↓
[Code: Parse JSON from Claude response]
        ↓
[Set: Apply default DCF assumptions]
        ↓
[Code: Compute DCF projections & intrinsic value]
        ↓
[Send Email / Slack: Deliver DCF report]
```

---

## Notes

- The `FinancialData` and `DCFAssumptions` TypeScript interfaces are defined in
  `src/types/index.ts` — the n8n Code nodes above match those schemas exactly.
- For the Next.js frontend to stay in sync, the `/api/extract` and
  `/api/calculate` routes should accept the same JSON structure that n8n
  produces in steps 3 and 5.
- All arrays in `FinancialData` (e.g. `revenue[]`) represent historical years,
  oldest-first. Claude is prompted to return them in that order.
