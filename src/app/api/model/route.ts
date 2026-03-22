// src/app/api/model/route.ts
// ═══════════════════════════════════════════════════════════════════
// Proxy to N8N modelling webhook.
// Accepts { extracted_data, assumptions } JSON body and returns
// a FinancialModel. 3-minute timeout for complex models.
// ═══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";

export const maxDuration = 180; // seconds — required for Vercel Pro/Enterprise timeout

const TIMEOUT_MS = 180_000; // 3 minutes

export async function POST(request: Request) {
  const webhookUrl = process.env.N8N_WEBHOOK_URL_MODEL;
  if (!webhookUrl) {
    return NextResponse.json(
      { error: "N8N_WEBHOOK_URL_MODEL is not configured on the server." },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const n8nRes = await fetch(webhookUrl, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
      signal:  controller.signal,
    });

    clearTimeout(timeoutId);

    if (!n8nRes.ok) {
      let detail = "";
      try {
        const errBody = (await n8nRes.json()) as { message?: string };
        detail = errBody.message ? ` — ${errBody.message}` : "";
      } catch {
        // Non-JSON error body; ignore
      }
      return NextResponse.json(
        { error: `Modelling service returned HTTP ${n8nRes.status}${detail}` },
        { status: 502 }
      );
    }

    const data: unknown = await n8nRes.json();
    return NextResponse.json(data);
  } catch (err) {
    clearTimeout(timeoutId);

    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json(
        { error: "Model generation timed out after 3 minutes. The service may be overloaded." },
        { status: 504 }
      );
    }

    const message = err instanceof Error ? err.message : "Unexpected modelling error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
