import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { resolveCurrentSite } from "../../../lib/sites/siteResolver";

const allowedCategories = new Set(["events", "businesses", "organizations", "volunteer", "sponsorship", "about", "contact", "other", "sensitive", "write_request"]);
const allowedOutcomes = new Set(["answered", "no_match", "contact_sdtv", "refused_sensitive", "refused_write"]);

function redactQuestion(value: unknown, sensitive: boolean) {
  if (sensitive) return "[Sensitive question withheld]";
  return String(value || "")
    .trim()
    .slice(0, 300)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email redacted]")
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, "[phone redacted]")
    .replace(/https?:\/\/\S+/gi, "[link redacted]")
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, "[number redacted]");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body?.humanConfirmed !== true) return NextResponse.json({ ok: false }, { status: 400 });

    const site = await resolveCurrentSite();
    if (!site.id) return NextResponse.json({ ok: false }, { status: 503 });

    const category = allowedCategories.has(body?.category) ? body.category : "other";
    const outcome = allowedOutcomes.has(body?.outcome) ? body.outcome : "answered";
    const sensitive = category === "sensitive" || outcome === "refused_sensitive";
    const question = redactQuestion(body?.question, sensitive);
    if (!question) return NextResponse.json({ ok: false }, { status: 400 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
    if (!url || !key) return NextResponse.json({ ok: false }, { status: 503 });
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const pagePath = String(body?.pagePath || "/").startsWith("/") ? String(body.pagePath).slice(0, 200) : "/";
    const { error } = await db.from("assistant_question_analytics").insert({
      site_id: site.id,
      question_redacted: question,
      category,
      outcome,
      page_path: pagePath,
    });
    if (error) return NextResponse.json({ ok: false }, { status: 503 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
