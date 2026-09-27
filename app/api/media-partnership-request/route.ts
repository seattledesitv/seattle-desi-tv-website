import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { resolveCurrentSite } from "../../lib/sites/siteResolver";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
function clean(value: FormDataEntryValue | null) { return String(value || "").trim(); }
function safeName(value: string) { return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100) || "event-flyer"; }
function escapeHtml(value: string) { return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] || character); }
function r2() {
  const endpoint = process.env.R2_ENDPOINT || ""; const accessKeyId = process.env.R2_ACCESS_KEY_ID || ""; const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";
  if (!endpoint || !accessKeyId || !secretAccessKey) throw new Error("Private file storage is not configured.");
  return new S3Client({ region: "auto", endpoint, credentials: { accessKeyId, secretAccessKey } });
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const captchaToken = clean(form.get("captcha_token"));
    if (!captchaToken) return NextResponse.json({ ok: false, error: "Please complete the human verification." }, { status: 400 });
    const captcha = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY || "", response: captchaToken }) });
    const captchaResult = await captcha.json();
    if (!captchaResult.success) return NextResponse.json({ ok: false, error: "Human verification failed. Please try again." }, { status: 400 });

    const site = await resolveCurrentSite();
    if (!site.id) return NextResponse.json({ ok: false, error: "Site context is not configured." }, { status: 500 });
    const organizationName = clean(form.get("organization_name")); const contactName = clean(form.get("contact_name")); const contactEmail = clean(form.get("contact_email")).toLowerCase();
    const contactPhone = clean(form.get("contact_phone")); const eventTitle = clean(form.get("event_title")); const eventDate = clean(form.get("event_date"));
    const eventLocation = clean(form.get("event_location")); const eventUrl = clean(form.get("event_url")); const eventType = clean(form.get("event_type")); const notes = clean(form.get("notes"));
    if (!organizationName || !contactName || !eventTitle || !eventDate || !eventLocation) return NextResponse.json({ ok: false, error: "Please complete all required event and contact fields." }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) return NextResponse.json({ ok: false, error: "Enter a valid contact email." }, { status: 400 });
    if (!new Set(["nonprofit_community", "private_ticketed"]).has(eventType)) return NextResponse.json({ ok: false, error: "Select the event type." }, { status: 400 });
    const flyer = form.get("flyer");
    if (!(flyer instanceof File) || !flyer.size) return NextResponse.json({ ok: false, error: "Upload the event flyer showing the SDTV media-partner logo." }, { status: 400 });
    if (flyer.size > MAX_FILE_SIZE || !allowedTypes.has(flyer.type)) return NextResponse.json({ ok: false, error: "Flyer must be a PDF, JPG, PNG, or WebP file no larger than 10 MB." }, { status: 400 });

    const id = crypto.randomUUID(); const fileName = safeName(flyer.name); const filePath = `media-partnerships/${site.code}/${eventDate.slice(0, 4)}/${id}-${fileName}`;
    await r2().send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET_NAME || "sdtv-private", Key: filePath, Body: Buffer.from(await flyer.arrayBuffer()), ContentType: flyer.type, Metadata: { requestId: id } }));
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""; const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
    if (!url || !key) throw new Error("Database service is not configured.");
    const db = createClient(url, key, { auth: { persistSession: false } });
    const { error } = await db.from("media_partnership_requests").insert({ id, site_id: site.id, organization_name: organizationName, contact_name: contactName, contact_email: contactEmail, contact_phone: contactPhone || null, event_title: eventTitle, event_date: eventDate, event_location: eventLocation, event_url: eventUrl || null, event_type: eventType, notes: notes || null, flyer_file_path: filePath, flyer_file_name: fileName, flyer_mime_type: flyer.type, flyer_file_size: flyer.size });
    if (error) throw error;

    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const adminEmail = String(site.settings.contact_email || "info@seattledesitv.com");
      await resend.emails.send({ from: process.env.CONTACT_EMAIL_FROM || `${site.name} <onboarding@resend.dev>`, to: adminEmail, replyTo: contactEmail, subject: `Media partnership request: ${eventTitle}`, html: `<h2>New media partnership request</h2><p><b>Event:</b> ${escapeHtml(eventTitle)}</p><p><b>Organization:</b> ${escapeHtml(organizationName)}</p><p><b>Date:</b> ${escapeHtml(eventDate)}</p><p><b>Location:</b> ${escapeHtml(eventLocation)}</p><p><b>Type:</b> ${escapeHtml(eventType.replaceAll("_", " "))}</p><p><b>Contact:</b> ${escapeHtml(contactName)} · ${escapeHtml(contactEmail)}</p><p>The flyer is stored privately with request ${id}.</p>` });
    }
    return NextResponse.json({ ok: true, request_id: id });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "Could not submit the media partnership request." }, { status: 500 });
  }
}
