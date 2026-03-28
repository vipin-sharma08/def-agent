import { NextResponse } from "next/server";
import { normalizeExtractedData } from "@/lib/normalizeExtractedData";
import { EXTRACTION_SYSTEM_PROMPT } from "@/lib/prompts";

export const maxDuration = 120; // seconds — required for Vercel Pro/Enterprise timeout

const TIMEOUT_MS = 120_000; // 120 seconds — annual reports can be 200+ pages

// ── Mock mode: set USE_MOCK_EXTRACT=1 in .env to skip N8N calls ──
const MOCK_N8N_RESPONSE = [{"success":true,"extractedData":{"company_name":"Infosys Limited","report_period":"FY2024","period_start":"2023-04-01","period_end":"2024-03-31","currency":"INR Crores","income_statement":{"revenue":128933,"other_income":7417,"total_income":136350,"employee_benefit_expenses":65139,"cost_of_technical_sub_contractors":18638,"travel_expenses":1372,"cost_of_software_packages_and_others":6891,"communication_expenses":489,"consultancy_and_professional_charges":1059,"depreciation_and_amortization":2944,"finance_cost":277,"other_expenses":3588,"total_expenses":100397,"profit_before_tax":35953,"current_tax":7306,"deferred_tax":1413,"total_tax":8719,"profit_after_tax":27234,"other_comprehensive_income_net_of_tax":287,"total_comprehensive_income":27521,"earnings_per_share_basic":65.62,"earnings_per_share_diluted":65.56},"balance_sheet":{"assets":{"non_current_assets":{"property_plant_and_equipment":10813,"right_of_use_assets":3303,"capital_work_in_progress":277,"goodwill":211,"other_intangible_assets":0,"investments":23352,"loans":34,"other_financial_assets":1756,"deferred_tax_assets":0,"income_tax_assets_net":2583,"other_non_current_assets":1669,"total_non_current_assets":43998},"current_assets":{"investments":11307,"trade_receivables":25152,"cash_and_cash_equivalents":8191,"loans":208,"other_financial_assets":10129,"income_tax_assets_net":6329,"other_current_assets":9636,"total_current_assets":70952},"total_assets":114950},"liabilities":{"equity":{"equity_share_capital":2075,"other_equity":79101,"total_equity":81176},"non_current_liabilities":{"lease_liabilities":3088,"other_financial_liabilities":1941,"deferred_tax_liabilities":1509,"other_non_current_liabilities":150,"total_non_current_liabilities":6688},"current_liabilities":{"lease_liabilities":678,"trade_payables_msme":92,"trade_payables_others":2401,"other_financial_liabilities":11808,"other_current_liabilities":7681,"provisions":1464,"income_tax_liabilities_net":2962,"total_current_liabilities":27086}},"total_equity_and_liabilities":114950},"cash_flow_statement":{"operating_activities":{"net_cash_from_operating_activities":20787},"investing_activities":{"expenditure_on_property_plant_and_equipment":-1832,"net_cash_used_in_investing_activities":-3261},"financing_activities":{"net_cash_used_in_financing_activities":-15825},"net_change_in_cash":1701,"cash_at_beginning":6534,"cash_at_end":8191},"key_metrics":{"ebitda":38897,"revenue_growth_yoy":3.96,"pat_margin":21.12,"roe":36.6,"roce":42,"current_ratio":2.6,"debt_to_equity":0,"dividend_per_share":35.5,"book_value_per_share":195.51,"free_cash_flow":18955},"auditor":{"name":"Deloitte Haskins & Sells LLP","registration_number":"117366W/W-100018","partner_name":"Sanjiv V. Pilgaonkar","partner_membership_number":"039826"}}}];

function unwrapExtractionPayload(raw: unknown): unknown {
  if (Array.isArray(raw)) {
    const first = raw[0];
    if (first && typeof first === "object") {
      const obj = first as Record<string, unknown>;
      return obj.extractedData ?? obj.extracted_data ?? obj;
    }
    return raw;
  }

  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    return obj.extractedData ?? obj.extracted_data ?? obj;
  }

  return raw;
}

export async function POST(request: Request) {
  // ── Mock mode — return cached data without hitting N8N ──────
  if (process.env.USE_MOCK_EXTRACT === "1") {
    const normalized = normalizeExtractedData(MOCK_N8N_RESPONSE);
    return NextResponse.json(normalized);
  }

  // ── Guard: env var must be set ──────────────────────────────
  const webhookUrl = process.env.N8N_WEBHOOK_URL_EXTRACT;
  if (!webhookUrl) {
    return NextResponse.json(
      { error: "N8N_WEBHOOK_URL_EXTRACT is not configured on the server." },
      { status: 500 }
    );
  }

  // ── Parse request body ───────────────────────────────────────
  let pdf: string;
  let filename: string;
  try {
    const body = (await request.json()) as { pdf?: string; filename?: string };
    if (!body.pdf) {
      return NextResponse.json(
        { error: "Missing required field: pdf (base64 string)" },
        { status: 400 }
      );
    }
    pdf = body.pdf;
    filename = body.filename ?? "annual_report.pdf";
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // ── Forward to N8N with timeout ──────────────────────────────
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const n8nResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pdf_base64: pdf,
        system_prompt: EXTRACTION_SYSTEM_PROMPT,
        filename
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!n8nResponse.ok) {
      const errText = await n8nResponse.text();
      console.error("[extract] N8N error — status:", n8nResponse.status, "body:", errText.slice(0, 500));
      let detail = "";
      try {
        const errBody = JSON.parse(errText) as { message?: string };
        detail = errBody.message ? ` — ${errBody.message}` : ` — ${errText.slice(0, 200)}`;
      } catch {
        detail = errText ? ` — ${errText.slice(0, 200)}` : "";
      }

      // Surface 413 from N8N so the client can show a specific message
      if (n8nResponse.status === 413) {
        return NextResponse.json(
          { error: `N8N webhook rejected the payload as too large (413). Try a smaller PDF.${detail}` },
          { status: 413 }
        );
      }

      return NextResponse.json(
        {
          error: `Extraction service returned an error (HTTP ${n8nResponse.status})${detail}`,
        },
        { status: 502 }
      );
    }

    // Parse the N8N response body — may be plain text or invalid JSON
    let data: unknown;
    const responseText = await n8nResponse.text();
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error("[extract] N8N returned non-JSON response:", responseText.slice(0, 500));
      return NextResponse.json(
        {
          error: `Extraction service returned invalid JSON. Response preview: ${responseText.slice(0, 200)}`,
        },
        { status: 502 }
      );
    }

    const extractedPayload = unwrapExtractionPayload(data);
    const normalized = normalizeExtractedData(extractedPayload);
    return NextResponse.json(normalized);
  } catch (err) {
    clearTimeout(timeoutId);

    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json(
        {
          error:
            "Extraction timed out after 120 seconds. The PDF may be too large or the service is unavailable.",
        },
        { status: 504 }
      );
    }

    const message =
      err instanceof Error ? err.message : "Unexpected extraction error";
    console.error("[extract] Unexpected error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
