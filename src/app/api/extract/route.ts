import { NextResponse } from "next/server";
import { normalizeExtractedData } from "@/lib/normalizeExtractedData";

export const maxDuration = 120; // seconds — required for Vercel Pro/Enterprise timeout

const TIMEOUT_MS = 120_000; // 120 seconds — annual reports can be 200+ pages

export async function POST(request: Request) {
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
        system_prompt: "You are a financial data extraction expert. Extract all key financial data from this Indian equity annual report including revenue, EBITDA, PAT, EPS, balance sheet items, cash flow statement, and any segment-wise data. Return structured JSON.",
        filename
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!n8nResponse.ok) {
      let detail = "";
      try {
        const errBody = (await n8nResponse.json()) as { message?: string };
        detail = errBody.message ? ` — ${errBody.message}` : "";
      } catch {
        // N8N returned non-JSON error body; ignore
      }
      return NextResponse.json(
        {
          error: `Extraction service returned an error (HTTP ${n8nResponse.status})${detail}`,
        },
        { status: 502 }
      );
    }

    const data: unknown = await n8nResponse.json();
    const normalized = normalizeExtractedData(data);
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
