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
    if (!serviceKey) return NextResponse.json({ error: "Supabase server key is missing." }, { status: 500 });

    const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } }) as any;
    const body = await request.json();
    const eventId = String(body.event_id || "").trim();
    const uploadDestinationUrl = String(body.upload_destination_url || "").trim();
    if (!eventId) return NextResponse.json({ error: "Event id is required." }, { status: 400 });

    const existing = await db.from("event_video_workflows").select("id,status").eq("event_id", eventId).maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data?.id) {
      const result = await db.from("event_video_workflows").update({ upload_destination_url: uploadDestinationUrl || null, updated_by: user.id, updated_at: new Date().toISOString() }).eq("id", existing.data.id);
      if (result.error) throw result.error;
    } else {
      const result = await db.from("event_video_workflows").insert({ event_id: eventId, status: "ready_for_editing", upload_destination_url: uploadDestinationUrl || null, created_by: user.id, updated_by: user.id });
      if (result.error) throw result.error;
    }
    return NextResponse.json({ ok: true, message: uploadDestinationUrl ? "SDTV upload folder saved." : "SDTV upload folder cleared." });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Could not save upload folder." }, { status: 500 });
  }
}
