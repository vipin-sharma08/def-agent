import { NextRequest, NextResponse } from "next/server";

const N8N_WEBHOOK_URL =
  process.env.N8N_WEBHOOK_URL || "http://localhost:5678/webhook/dcf-upload";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const email = formData.get("email") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No PDF file provided" }, { status: 400 });
    }

    // n8n webhook expects the binary file in a field named "data"
    // and reads email from json.body.email (multipart text field)
    const n8nForm = new FormData();
    n8nForm.append("data", file, file.name);
    if (email) n8nForm.append("email", email);

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      body: n8nForm,
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
