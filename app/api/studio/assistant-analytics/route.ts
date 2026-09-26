import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { isAdminRole, resolveUserRole } from "../../../lib/roles";
import { resolveCurrentSite } from "../../../lib/sites/siteResolver";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export async function GET(request: Request) {
  try {
    if (!url || !anonKey || !serviceKey) return NextResponse.json({ ok: false, error: "Supabase is not configured." }, { status: 500 });
    const session = createClient(url, anonKey, { global: { headers: { Authorization: request.headers.get("authorization") || "" } } });
    const userResult = await session.auth.getUser();
    const user = userResult.data?.user || null;
    if (!user) return NextResponse.json({ ok: false, error: "Login required." }, { status: 401 });
    const role = await resolveUserRole(session, user);
    if (!isAdminRole(role)) return NextResponse.json({ ok: false, error: "Studio admin access required." }, { status: 403 });

    const site = await resolveCurrentSite();
    if (!site.id) return NextResponse.json({ ok: false, error: "Site context is not configured." }, { status: 500 });
    const requestUrl = new URL(request.url);
    const days = [7, 30, 90].includes(Number(requestUrl.searchParams.get("days"))) ? Number(requestUrl.searchParams.get("days")) : 30;
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const result = await db
      .from("assistant_question_analytics")
      .select("id,question_redacted,category,outcome,page_path,created_at")
      .eq("site_id", site.id)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(2000);
    if (result.error) throw result.error;
    const rows = result.data || [];
    const countBy = (key: "category" | "outcome") => Object.entries(rows.reduce((totals: Record<string, number>, row: any) => {
      const value = String(row[key] || "unknown"); totals[value] = (totals[value] || 0) + 1; return totals;
    }, {})).map(([label, count]) => ({ label, count })).sort((a, b) => Number(b.count) - Number(a.count));
    const popularMap = new Map<string, { question: string; count: number; lastAskedAt: string }>();
    rows.forEach((row: any) => {
      if (row.question_redacted === "[Sensitive question withheld]") return;
      const key = String(row.question_redacted).toLowerCase().replace(/\s+/g, " ").trim();
      const current = popularMap.get(key);
      if (current) current.count += 1;
      else popularMap.set(key, { question: row.question_redacted, count: 1, lastAskedAt: row.created_at });
    });
    const popular = Array.from(popularMap.values()).sort((a, b) => b.count - a.count || b.lastAskedAt.localeCompare(a.lastAskedAt)).slice(0, 20);
    return NextResponse.json({
      ok: true, site: { code: site.code, name: site.name }, days, total: rows.length,
      sensitiveRefusals: rows.filter((row: any) => row.outcome === "refused_sensitive").length,
      writeRefusals: rows.filter((row: any) => row.outcome === "refused_write").length,
      contactReferrals: rows.filter((row: any) => row.outcome === "contact_sdtv").length,
      categories: countBy("category"), outcomes: countBy("outcome"), popular, recent: rows.slice(0, 100),
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "Could not load assistant analytics." }, { status: 500 });
  }
}
