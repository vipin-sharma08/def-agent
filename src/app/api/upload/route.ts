import { NextRequest, NextResponse } from "next/server";

// Edge runtime streams the request body directly to n8n,
// bypassing Vercel's 4.5 MB serverless body-size limit.
export const runtime = "edge";

const N8N_WEBHOOK_URL =
  process.env.N8N_WEBHOOK_URL || "http://localhost:5678/webhook/dcf-upload";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") ?? "";

    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Expected multipart/form-data" },
        { status: 400 }
      );
    }

    // Proxy the multipart body directly to n8n without buffering the whole file.
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": contentType },
      body: req.body,
      // @ts-expect-error – duplex is required for streaming request bodies in Node fetch
      duplex: "half",
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: `n8n returned ${response.status}: ${text}` },
        { status: 502 }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
