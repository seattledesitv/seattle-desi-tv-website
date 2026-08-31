import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolveCurrentSite } from "../../lib/sites/siteResolver";

const allowedEntities = new Set(["business", "organization", "event", "group", "contributor", "video", "radio", "newsletter", "page"]);
const allowedActions = new Set(["page_view", "website_click", "phone_click", "email_click", "whatsapp_click", "directions_click", "ticket_click", "share_click", "calendar_click", "social_click", "profile_click", "manage_click", "other_click"]);

function clean(value: unknown, max = 500) {
  return String(value || "").trim().slice(0, max) || null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const entityType = clean(body.entityType, 40);
    const actionType = clean(body.actionType, 60);
    if (!entityType || !allowedEntities.has(entityType) || !actionType || !allowedActions.has(actionType)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    if (!url || !key) return NextResponse.json({ ok: false }, { status: 503 });

    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const site = await resolveCurrentSite();
    if (!site.id) return NextResponse.json({ ok: false }, { status: 503 });
    const { error } = await supabase.from("engagement_events").insert({
      site_id: site.id,
      entity_type: entityType,
      entity_id: clean(body.entityId, 160),
      entity_name: clean(body.entityName, 240),
      action_type: actionType,
      page_path: clean(body.pagePath, 500),
      target_url: clean(body.targetUrl, 1000),
      session_id: clean(body.sessionId, 120),
    });

    if (error) return NextResponse.json({ ok: false }, { status: 202 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 202 });
  }
}
