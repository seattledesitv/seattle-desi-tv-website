import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
const resendKey = process.env.RESEND_API_KEY || "";
const fromEmail = process.env.RESEND_FROM_EMAIL || "Seattle Desi TV <updates@seattledesitv.com>";
const infoEmail = process.env.SDTV_INFO_EMAIL || "info@seattledesitv.com";

function cleanEmail(value?: string | null) { return String(value || "").trim().toLowerCase(); }
function unique(values: string[]) { const seen = new Set<string>(); return values.map(cleanEmail).filter((email) => email.includes("@") && !seen.has(email) && seen.add(email)); }
function pocEmails(poc: any) { const list = Array.isArray(poc?.pocs) ? poc.pocs : []; return unique([...list.map((p: any) => p.admin_email), poc?.admin_email, infoEmail]); }
function pocNames(poc: any) { const list = Array.isArray(poc?.pocs) && poc.pocs.length ? poc.pocs : [poc]; return list.filter(Boolean).map((p: any) => `${p.admin_name || "SDTV POC"}${p.admin_email ? ` <${p.admin_email}>` : ""}`).join(", ") || "Not assigned"; }

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const sessionClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data } = await sessionClient.auth.getUser();
    const user = data?.user || null;
    if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
    const db = serviceKey ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } }) as any : sessionClient as any;
    const body = await request.json();
    const eventId = String(body.event_id || "");
    const message = String(body.message || "").trim();
    if (!eventId || !message) return NextResponse.json({ error: "Event and message are required." }, { status: 400 });

    const { data: event, error: eventError } = await db.from("events").select("id,title,date,location,created_by,poc_email").eq("id", eventId).single();
    if (eventError || !event) return NextResponse.json({ error: "Event not found." }, { status: 404 });
    if (event.created_by && event.created_by !== user.id) return NextResponse.json({ error: "You can only contact SDTV for your own event listing." }, { status: 403 });
    const { data: poc } = await db.from("event_admin_pocs").select("*").eq("event_id", eventId).maybeSingle();
    const senderEmail = cleanEmail(user.email || event.poc_email || "");
    const senderName = String(user.user_metadata?.full_name || user.user_metadata?.name || senderEmail || "Organizer");
    const to = pocEmails(poc);
    if (!to.length) return NextResponse.json({ error: "No SDTV recipient configured." }, { status: 500 });

    const subject = `Organizer question: ${event.title || "SDTV event"}`;
    const text = [`Organizer message for SDTV`, ``, `Event: ${event.title || "—"}`, `Date: ${event.date || "—"}`, `Location: ${event.location || "—"}`, `Organizer: ${senderName}`, `Organizer email: ${senderEmail || "—"}`, `Assigned SDTV POC(s): ${pocNames(poc)}`, ``, `Message:`, message].join("\n");

    await db.from("event_contact_messages").insert({ event_id: eventId, sender_user_id: user.id, sender_email: senderEmail || null, sender_name: senderName || null, message, admin_poc_email: to.filter((e) => e !== infoEmail).join(", ") || null, recipients: to });

    let emailStatus: any = { skipped: true, reason: "RESEND_API_KEY is not configured." };
    if (resendKey) {
      const resend = new Resend(resendKey);
      const result = await resend.emails.send({ from: fromEmail, to, replyTo: senderEmail || undefined, subject, text });
      if (result.error) return NextResponse.json({ error: result.error.message || "Email send failed." }, { status: 500 });
      emailStatus = { skipped: false, id: result.data?.id || null };
    }
    return NextResponse.json({ ok: true, message: "Message sent to SDTV.", emailStatus, recipients: to.length });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Could not send message." }, { status: 500 });
  }
}
