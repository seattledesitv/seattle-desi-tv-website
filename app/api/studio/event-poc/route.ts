import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminRole, resolveUserRole } from "../../../lib/roles";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const sessionClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data } = await sessionClient.auth.getUser();
    const user = data?.user || null;
    if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
    const role = await resolveUserRole(sessionClient as any, user);
    if (!isAdminRole(role)) return NextResponse.json({ error: "Studio admin access required." }, { status: 403 });
    if (!serviceKey) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY is missing." }, { status: 500 });
    const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } }) as any;
    const body = await request.json();
    const eventId = String(body.event_id || "");
    if (!eventId) return NextResponse.json({ error: "Event id is required." }, { status: 400 });
    const payload = {
      event_id: eventId,
      admin_user_id: body.admin_user_id || null,
      admin_email: String(body.admin_email || "").trim().toLowerCase() || null,
      admin_name: String(body.admin_name || "").trim() || null,
      admin_phone: String(body.admin_phone || "").trim() || null,
      admin_photo_url: String(body.admin_photo_url || "").trim() || null,
      notes: String(body.notes || "").trim() || null,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };
    const { error } = await db.from("event_admin_pocs").upsert(payload, { onConflict: "event_id" });
    if (error) throw error;
    return NextResponse.json({ ok: true, message: "Event admin POC saved." });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Could not save event POC." }, { status: 500 });
  }
}
