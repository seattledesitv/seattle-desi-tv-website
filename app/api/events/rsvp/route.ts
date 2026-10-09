import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolveSiteForHostname } from "../../../lib/sites/siteResolver";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const service =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  "";

export async function POST(request: Request) {
  try {
    if (!url || !service)
      return NextResponse.json(
        { error: "RSVP service is not configured." },
        { status: 500 },
      );
    const body = await request.json().catch(() => ({}));
    if (String(body.website || "").trim())
      return NextResponse.json({ ok: true });
    const eventId = String(body.eventId || "").trim();
    const attendeeName = String(body.name || "")
      .replace(/\s+/g, " ")
      .trim();
    const attendeeEmail = String(body.email || "").trim().toLowerCase();
    if (!eventId || attendeeName.length < 1 || attendeeName.length > 100)
      return NextResponse.json(
        { error: "Please enter your name." },
        { status: 400 },
      );
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(attendeeEmail) || attendeeEmail.length > 254)
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 },
      );
    const guestNames = (Array.isArray(body.guestNames) ? body.guestNames : [])
      .map((name: unknown) => String(name || "").replace(/\s+/g, " ").trim())
      .filter(Boolean);
    if (guestNames.length > 10 || guestNames.some((name: string) => name.length > 100))
      return NextResponse.json(
        { error: "You can add up to 10 guests, and each guest name must be 100 characters or fewer." },
        { status: 400 },
      );

    const site = await resolveSiteForHostname(
      request.headers.get("x-forwarded-host") || request.headers.get("host"),
    );
    if (!site.id)
      return NextResponse.json(
        { error: "Active site could not be resolved." },
        { status: 400 },
      );
    const db = createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const event = await db
      .from("events")
      .select("id,status,simple_rsvp_enabled")
      .eq("id", eventId)
      .eq("site_id", site.id)
      .maybeSingle();
    if (
      event.error ||
      !event.data ||
      event.data.status !== "approved" ||
      !event.data.simple_rsvp_enabled
    )
      return NextResponse.json(
        { error: "RSVP is not available for this event." },
        { status: 404 },
      );

    const inserted = await db
      .from("event_rsvps")
      .insert({
        site_id: site.id,
        event_id: eventId,
        attendee_name: attendeeName,
        attendee_email: attendeeEmail,
        guest_names: guestNames,
        party_size: 1 + guestNames.length,
        response: "attending",
        source: "website",
      });
    if (inserted.error)
      return NextResponse.json(
        { error: inserted.error.message },
        { status: 400 },
      );
    return NextResponse.json({
      ok: true,
      message: guestNames.length
        ? `Thank you, ${attendeeName}. We recorded your RSVP for ${guestNames.length + 1} people.`
        : `Thank you, ${attendeeName}. We recorded that you are coming.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "RSVP could not be recorded." },
      { status: 500 },
    );
  }
}
