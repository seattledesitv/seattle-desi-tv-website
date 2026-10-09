import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { Resend } from "resend";

function localDate(timeZone: string, addDays: number) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  const date = new Date(Date.UTC(year, month - 1, day + addDays));
  return date.toISOString().slice(0, 10);
}

function readableDate(value: string, timeZone: string) {
  return new Date(`${value}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone });
}

function escapeHtml(value: unknown) {
  return String(value || "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] || character);
}

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
  const resendKey = process.env.RESEND_API_KEY || "";
  if (!url || !service || !resendKey) return NextResponse.json({ error: "RSVP reminder service is not configured." }, { status: 500 });

  const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const sites = await db.from("sites").select("id,name,timezone,status").eq("status", "active");
  if (sites.error) return NextResponse.json({ error: sites.error.message }, { status: 500 });
  const resend = new Resend(resendKey);
  let sent = 0; let failed = 0; let eligible = 0;

  for (const site of sites.data || []) {
    const timeZone = site.timezone || "America/Los_Angeles";
    const twoDaysAway = localDate(timeZone, 2);
    const oneDayAway = localDate(timeZone, 1);
    const events = await db.from("events").select("id,title,date,end_date,location,description").eq("site_id", site.id).eq("status", "approved").eq("simple_rsvp_enabled", true).in("date", [twoDaysAway, oneDayAway]);
    if (events.error || !(events.data || []).length) continue;
    const eventIds = (events.data || []).map((event) => event.id);
    const rsvps = await db.from("event_rsvps").select("id,event_id,attendee_name,attendee_email,party_size,guest_names").eq("site_id", site.id).in("event_id", eventIds).is("reminder_sent_at", null).not("attendee_email", "is", null).limit(1000);
    if (rsvps.error) continue;
    const primaryDomain = await db.from("site_domains").select("hostname").eq("site_id", site.id).eq("is_primary", true).limit(1).maybeSingle();
    const hostname = primaryDomain.data?.hostname || "www.seattledesitv.com";
    const eventMap = new Map((events.data || []).map((event) => [event.id, event]));

    for (const rsvp of rsvps.data || []) {
      const event: any = eventMap.get(rsvp.event_id); if (!event || !rsvp.attendee_email) continue;
      eligible += 1;
      const eventUrl = `https://${hostname}/events/${event.id}`;
      const daysText = event.date === twoDaysAway ? "in two days" : "tomorrow";
      const partyText = Number(rsvp.party_size || 1) > 1 ? `Your RSVP is for ${rsvp.party_size} people.` : "Your RSVP is for one person.";
      const result = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || `${site.name} <updates@seattledesitv.com>`,
        to: rsvp.attendee_email,
        subject: `Reminder: ${event.title} is ${daysText}`,
        text: `Hello ${rsvp.attendee_name},\n\nThis is a reminder that ${event.title} is ${daysText}, on ${readableDate(event.date, timeZone)}${event.location ? ` at ${event.location}` : ""}. ${partyText}\n\nEvent details and calendar: ${eventUrl}\n\nWe look forward to seeing you!\n${site.name}`,
        html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a"><p>Hello ${escapeHtml(rsvp.attendee_name)},</p><h2 style="margin-bottom:8px">${escapeHtml(event.title)} is ${escapeHtml(daysText)}</h2><p><strong>${escapeHtml(readableDate(event.date, timeZone))}</strong>${event.location ? `<br>${escapeHtml(event.location)}` : ""}</p><p>${escapeHtml(partyText)}</p><p><a href="${escapeHtml(eventUrl)}" style="display:inline-block;border-radius:10px;background:#db2777;color:white;padding:12px 18px;text-decoration:none;font-weight:bold">View event and add to calendar</a></p><p>We look forward to seeing you!</p><p><strong>${escapeHtml(site.name)}</strong></p></div>`,
      }, { idempotencyKey: `event-rsvp-reminder-${rsvp.id}` });
      if (result.error) {
        failed += 1;
        await db.from("event_rsvps").update({ reminder_error: result.error.message }).eq("id", rsvp.id).eq("site_id", site.id);
      } else {
        sent += 1;
        await db.from("event_rsvps").update({ reminder_sent_at: new Date().toISOString(), reminder_email_id: result.data?.id || null, reminder_error: null }).eq("id", rsvp.id).eq("site_id", site.id);
      }
    }
  }
  return NextResponse.json({ ok: failed === 0, eligible, sent, failed });
}
