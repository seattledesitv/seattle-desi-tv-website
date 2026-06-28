import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getClient() {
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

export async function POST(request: Request) {
  try {
    const supabase = getClient();
    if (!supabase) return NextResponse.json({ ok: false, error: "Newsletter database is not configured." }, { status: 200 });

    const body = await request.json().catch(() => ({}));
    const email = normalizeEmail(body.email);
    const action = String(body.action || "unsubscribe");

    if (!isValidEmail(email)) return NextResponse.json({ ok: false, error: "Please enter a valid email address." }, { status: 200 });

    const { data: existing, error: findError } = await supabase
      .from("newsletter_subscribers")
      .select("id,email,status")
      .eq("email", email)
      .maybeSingle();

    if (findError) return NextResponse.json({ ok: false, error: findError.message }, { status: 200 });
    if (!existing) return NextResponse.json({ ok: false, error: "This email is not currently on the SDTV newsletter list." }, { status: 200 });

    const nextStatus = action === "resubscribe" ? "active" : "unsubscribed";
    const payload: any = { status: nextStatus };
    if (nextStatus === "active") payload.subscribed_at = new Date().toISOString();
    if (nextStatus === "unsubscribed") payload.unsubscribed_at = new Date().toISOString();

    const { error } = await supabase
      .from("newsletter_subscribers")
      .update(payload)
      .eq("email", email);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 200 });
    return NextResponse.json({ ok: true, status: nextStatus, message: nextStatus === "active" ? "You are subscribed again." : "You have been unsubscribed from SDTV newsletter emails." });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "Could not update subscription right now." }, { status: 200 });
  }
}
