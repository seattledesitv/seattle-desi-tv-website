import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function makeToken() {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return NextResponse.json({ ok: false, error: "Newsletter database is not configured." }, { status: 200 });

    const body = await request.json().catch(() => ({}));
    const email = normalizeEmail(body.email);
    const name = String(body.name || "").trim().slice(0, 160);
    const source = String(body.source || "footer").trim().slice(0, 120);
    const captchaAnswer = Number(body.captchaAnswer);
    const captchaExpected = Number(body.captchaExpected);

    if (!isValidEmail(email)) return NextResponse.json({ ok: false, error: "Please enter a valid email address." }, { status: 200 });
    if (!Number.isFinite(captchaAnswer) || !Number.isFinite(captchaExpected) || captchaAnswer !== captchaExpected) {
      return NextResponse.json({ ok: false, error: "Please complete the quick check correctly." }, { status: 200 });
    }

    const payload = {
      email,
      name: name || null,
      status: "active",
      source_page: source || "footer",
      subscribed_at: new Date().toISOString(),
      unsubscribe_token: makeToken(),
    };

    const { error } = await supabase
      .from("newsletter_subscribers")
      .upsert(payload, { onConflict: "email" });

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 200 });
    return NextResponse.json({ ok: true, message: "Thank you for subscribing to SDTV." });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "Could not subscribe right now." }, { status: 200 });
  }
}
