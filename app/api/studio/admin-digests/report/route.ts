import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { requireDigestAdmin } from "../../../../lib/adminDigest/server";
import { AdminDigestService } from "../../../../lib/adminDigest/services/adminDigestService";

export async function GET(request: Request) {
  const user = await requireDigestAdmin(request);
  if (!user) return NextResponse.json({ error: "Studio admin access required." }, { status: 403 });
  try {
    const requestUrl = new URL(request.url);
    const from = new Date(requestUrl.searchParams.get("from") || "");
    const to = new Date(requestUrl.searchParams.get("to") || "");
    if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || to <= from) return NextResponse.json({ error: "Choose a valid start and end date." }, { status: 400 });
    if (to.getTime() - from.getTime() > 366 * 24 * 60 * 60 * 1000) return NextResponse.json({ error: "Date ranges are limited to 366 days." }, { status: 400 });
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
    if (!supabaseUrl || !serviceKey) throw new Error("Activity report data source is unavailable.");
    const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    return NextResponse.json({ ok: true, report: await AdminDigestService.build(db, from, to) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not build the activity report." }, { status: 500 });
  }
}
