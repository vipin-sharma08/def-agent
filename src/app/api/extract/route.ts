import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { normalizeExtractedData } from "@/lib/normalizeExtractedData";
import { EXTRACTION_SYSTEM_PROMPT } from "@/lib/prompts";

export const maxDuration = 120;

export async function POST(request: Request) {
  // ── Guard: env var must be set ──────────────────────────────
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured on the server." },
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

  // ── Call Gemini 2.5 Flash directly ─────────────────────────
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-preview-05-20",
      systemInstruction: EXTRACTION_SYSTEM_PROMPT,
    });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "application/pdf",
          data: pdf,
        },
      },
      {
        text: `Extract all financial data from this Annual Report (${filename}) following the schema in your instructions.

Return ONLY the JSON object, no markdown, no explanation, no code fences.
If you cannot find a specific data point, set it to null — never guess.
Cross-verify that the balance sheet balances and cash flow ties.`,
      },
    ]);

    const responseText = result.response.text();

    // Strip markdown code fences if present
    let jsonStr = responseText.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }

    let data: unknown;
    try {
      data = JSON.parse(jsonStr);
    } catch {
      console.error("[extract] Gemini returned non-JSON response:", responseText.slice(0, 500));
      return NextResponse.json(
        {
          error: `Gemini returned invalid JSON. Response preview: ${responseText.slice(0, 200)}`,
        },
        { status: 502 }
      );
    }

    const normalized = normalizeExtractedData(data);
    return NextResponse.json(normalized);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unexpected extraction error";
    console.error("[extract] Gemini error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
