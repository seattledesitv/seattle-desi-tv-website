import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const to = String(body?.to || "").trim();
    const subject = String(body?.subject || "").trim();
    const message = String(body?.message || "").trim();
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL || "Seattle Desi TV <onboarding@resend.dev>";

    if (!apiKey) return NextResponse.json({ error: "RESEND_API_KEY is not configured." }, { status: 500 });
    if (!to || !subject || !message) return NextResponse.json({ error: "Missing to, subject, or message." }, { status: 400 });

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text: message,
      }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) return NextResponse.json({ error: result?.message || result?.error || "Email failed." }, { status: response.status });
    return NextResponse.json({ ok: true, result });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Email failed." }, { status: 500 });
  }
}
