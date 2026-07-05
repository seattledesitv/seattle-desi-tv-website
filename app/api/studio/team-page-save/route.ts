import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminRole, resolveUserRole } from "../../../lib/roles";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const writeKey = process.env["SUPABASE_SECRET_KEY"] || "";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const sessionClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const userResult = await sessionClient.auth.getUser();
    const user = userResult.data?.user || null;
    if (!user) return NextResponse.json({ ok: false, error: "Login required." }, { status: 401 });
    const role = await resolveUserRole(sessionClient as any, user);
    if (!isAdminRole(role)) return NextResponse.json({ ok: false, error: "Studio admin access required." }, { status: 403 });
    if (!writeKey) return NextResponse.json({ ok: false, error: "SUPABASE_SECRET_KEY is missing in Vercel." }, { status: 500 });

    const db = createClient(supabaseUrl, writeKey, { auth: { persistSession: false } }) as any;
    const body = await request.json();
    const action = body.action;

    if (action === "text") {
      const text = body.text || {};
      const rows = Object.keys(text).map((key) => ({ key, value: String(text[key] || ""), updated_at: new Date().toISOString() }));
      const result = await db.from("team_page_settings").upsert(rows, { onConflict: "key" });
      if (result.error) throw result.error;
      return NextResponse.json({ ok: true, message: "Text saved." });
    }

    if (action === "section") {
      const s = body.section || {};
      const result = await db.from("team_page_sections").upsert({ section_key: s.section_key, title: s.title, subtitle: s.subtitle || "", display_order: Number(s.display_order || 100), enabled: s.enabled !== false, updated_at: new Date().toISOString() }, { onConflict: "section_key" });
      if (result.error) throw result.error;
      return NextResponse.json({ ok: true, message: "Section saved." });
    }

    if (action === "member") {
      const memberId = String(body.memberId || "");
      const sectionKey = String(body.sectionKey || "");
      if (!memberId) return NextResponse.json({ ok: false, error: "Missing member id." }, { status: 400 });
      if (!sectionKey) {
        const result = await db.from("team_page_member_assignments").delete().eq("member_id", memberId);
        if (result.error) throw result.error;
        return NextResponse.json({ ok: true, message: "Auto group restored." });
      }
      const result = await db.from("team_page_member_assignments").upsert({ member_id: memberId, section_key: sectionKey, display_order: Number(body.displayOrder || 100), updated_at: new Date().toISOString() }, { onConflict: "member_id,section_key" });
      if (result.error) throw result.error;
      return NextResponse.json({ ok: true, message: "Member moved." });
    }

    return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "Save failed." }, { status: 500 });
  }
}
