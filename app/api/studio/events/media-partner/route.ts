import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminRole, resolveUserRole } from "../../../../lib/roles";
import { resolveCurrentSite } from "../../../../lib/sites/siteResolver";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export async function PATCH(request: Request) {
  try {
    if (!supabaseUrl || !anonKey || !serviceKey) return NextResponse.json({ ok: false, error: "Supabase is not fully configured." }, { status: 500 });
    const sessionClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: request.headers.get("authorization") || "" } } });
    const userResult = await sessionClient.auth.getUser();
    const user = userResult.data?.user || null;
    if (!user) return NextResponse.json({ ok: false, error: "Login required." }, { status: 401 });
    const role = await resolveUserRole(sessionClient, user);
    if (!isAdminRole(role)) return NextResponse.json({ ok: false, error: "Studio admin access required." }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const eventId = String(body?.event_id || "").trim();
    const approved = Boolean(body?.approved);
    if (!eventId) return NextResponse.json({ ok: false, error: "Event is required." }, { status: 400 });

    const site = await resolveCurrentSite();
    if (!site.id) return NextResponse.json({ ok: false, error: "Site context is not configured." }, { status: 500 });
    const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const eventResult = await db.from("events").select("id,image,image_urls,media_partner_flyer_url").eq("id", eventId).eq("site_id", site.id).maybeSingle();
    if (eventResult.error) throw eventResult.error;
    if (!eventResult.data) return NextResponse.json({ ok: false, error: "Event was not found for this site." }, { status: 404 });

    const event: any = eventResult.data;
    const payload: any = approved
      ? { media_partner_status: "approved", media_partner_approved_at: new Date().toISOString(), media_partner_approved_by: user.email || user.id }
      : { media_partner_status: "none", media_partner_approved_at: null, media_partner_approved_by: null };
    if (approved && event.media_partner_flyer_url) {
      const images = Array.isArray(event.image_urls) ? event.image_urls.filter(Boolean) : [];
      payload.image = event.media_partner_flyer_url;
      payload.image_urls = [event.media_partner_flyer_url, ...images.filter((item: string) => item !== event.media_partner_flyer_url)];
    }
    const updateResult = await db.from("events").update(payload).eq("id", eventId).eq("site_id", site.id);
    if (updateResult.error) throw updateResult.error;

    const requestStatus = approved ? "approved" : "closed";
    const requestUpdate = await db.from("media_partnership_requests").update({ status: requestStatus, updated_at: new Date().toISOString() }).eq("event_id", eventId).eq("site_id", site.id).in("status", ["new", "pending"]);
    if (requestUpdate.error) throw requestUpdate.error;
    return NextResponse.json({ ok: true, approved, flyerApplied: Boolean(approved && event.media_partner_flyer_url) });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "Media partner status could not be updated." }, { status: 500 });
  }
}
