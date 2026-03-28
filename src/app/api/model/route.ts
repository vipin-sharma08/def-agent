import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { MODELLING_SYSTEM_PROMPT, buildModellingUserMessage } from "@/lib/prompts";

export const maxDuration = 180;

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  let body: { extracted_data?: unknown; assumptions?: unknown };
  try {
    body = (await request.json()) as { extracted_data?: unknown; assumptions?: unknown };
    if (!body.extracted_data || !body.assumptions) {
      return NextResponse.json(
        { error: "Missing required fields: extracted_data, assumptions" },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: MODELLING_SYSTEM_PROMPT,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const userMessage = buildModellingUserMessage(
      body.extracted_data as object,
      body.assumptions as object
    );

    const result = await model.generateContent([{ text: userMessage }]);
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
      console.error("[model] Gemini returned non-JSON:", responseText.slice(0, 500));
      return NextResponse.json(
        { error: `Gemini returned invalid JSON. Preview: ${responseText.slice(0, 200)}` },
        { status: 502 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected modelling error";
    console.error("[model] Gemini error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
