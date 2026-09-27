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
async function publicImage(file: File, folder: string) {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || ""; const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";
  if (!cloud || !preset) throw new Error("Public image upload is not configured.");
  const body = new FormData(); body.append("file", file); body.append("upload_preset", preset); body.append("folder", folder);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: "POST", body }); const result = await response.json();
  if (!response.ok || !result?.secure_url) throw new Error(result?.error?.message || "Could not publish the submitted image.");
  return String(result.secure_url);
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
    const organizationId = clean(form.get("organization_id")); const eventId = clean(form.get("event_id"));
    if ((organizationId && !/^[0-9a-f-]{36}$/i.test(organizationId)) || (eventId && !/^[0-9a-f-]{36}$/i.test(eventId))) return NextResponse.json({ ok: false, error: "The selected organization or event is invalid." }, { status: 400 });
    const organizationName = clean(form.get("organization_name")); const contactName = clean(form.get("contact_name")); const contactEmail = clean(form.get("contact_email")).toLowerCase();
    const organizationCategory = clean(form.get("organization_category")); const organizationLocation = clean(form.get("organization_location")); const organizationWebsite = clean(form.get("organization_website")); const organizationDescription = clean(form.get("organization_description"));
    const contactPhone = clean(form.get("contact_phone")); const eventTitle = clean(form.get("event_title")); const eventDate = clean(form.get("event_date"));
    const eventLocation = clean(form.get("event_location")); const eventUrl = clean(form.get("event_url")); const eventType = clean(form.get("event_type")); const notes = clean(form.get("notes"));
    const mediaConsentAccepted = clean(form.get("media_consent_accepted")) === "yes";
    if (!organizationName || !contactName || !eventTitle || !eventDate || !eventLocation) return NextResponse.json({ ok: false, error: "Please complete all required event and contact fields." }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) return NextResponse.json({ ok: false, error: "Enter a valid contact email." }, { status: 400 });
    if (!new Set(["nonprofit_community", "private_ticketed"]).has(eventType)) return NextResponse.json({ ok: false, error: "Select the event type." }, { status: 400 });
    if (!mediaConsentAccepted) return NextResponse.json({ ok: false, error: "Please review and accept the Media Coverage & Consent terms." }, { status: 400 });
    const flyer = form.get("flyer");
    if (!(flyer instanceof File) || !flyer.size) return NextResponse.json({ ok: false, error: "Upload the event flyer showing the SDTV media-partner logo." }, { status: 400 });
    if (flyer.size > MAX_FILE_SIZE || !allowedTypes.has(flyer.type)) return NextResponse.json({ ok: false, error: "Flyer must be a PDF, JPG, PNG, or WebP file no larger than 10 MB." }, { status: 400 });
    const organizationImage = form.get("organization_image");
    if (!organizationId && !eventId && (!(organizationImage instanceof File) || !organizationImage.size)) return NextResponse.json({ ok: false, error: "Upload an organization logo or image when adding a new organization." }, { status: 400 });
    if (organizationImage instanceof File && (organizationImage.size > MAX_FILE_SIZE || !new Set(["image/jpeg", "image/png", "image/webp"]).has(organizationImage.type))) return NextResponse.json({ ok: false, error: "Organization image must be a JPG, PNG, or WebP file no larger than 10 MB." }, { status: 400 });
    if (!organizationId && !eventId && (!organizationCategory || !organizationLocation)) return NextResponse.json({ ok: false, error: "Enter a category and location for the new organization." }, { status: 400 });
    if (!eventId && !flyer.type.startsWith("image/")) return NextResponse.json({ ok: false, error: "A new event needs a JPG, PNG, or WebP flyer so it can appear on the Events page." }, { status: 400 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""; const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || ""; const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    if (!url || !key || !anonKey) throw new Error("Database service is not configured.");
    const db = createClient(url, key, { auth: { persistSession: false } });
    if (eventId) {
      const sessionClient = createClient(url, anonKey, { global: { headers: { Authorization: request.headers.get("authorization") || "" } } });
      const userResult = await sessionClient.auth.getUser(); const user = userResult.data?.user || null;
      if (!user) return NextResponse.json({ ok: false, error: "Please sign in as the event organizer to request media coverage for this event." }, { status: 401 });
      const ownedEvent = await db.from("events").select("id,created_by").eq("id", eventId).eq("site_id", site.id).maybeSingle();
      if (ownedEvent.error) throw ownedEvent.error;
      if (!ownedEvent.data) return NextResponse.json({ ok: false, error: "The selected event is not available for this site." }, { status: 400 });
      let mayManage = ownedEvent.data.created_by === user.id;
      if (!mayManage) {
        const links = await db.from("event_organizations").select("organization_id").eq("site_id", site.id).eq("event_id", eventId);
        if (links.error) throw links.error;
        const organizationIds = (links.data || []).map((row: any) => row.organization_id).filter(Boolean);
        if (organizationIds.length) {
          const manager = await db.from("organization_managers").select("id").eq("site_id", site.id).eq("user_id", user.id).eq("active", true).in("organization_id", organizationIds).limit(1).maybeSingle();
          if (manager.error) throw manager.error;
          mayManage = Boolean(manager.data);
        }
      }
      if (!mayManage) return NextResponse.json({ ok: false, error: "Only the event organizer or a verified manager of its linked organization can request media coverage for this event." }, { status: 403 });
      if (organizationId) {
        const linkedOrganization = await db.from("event_organizations").select("id").eq("site_id", site.id).eq("event_id", eventId).eq("organization_id", organizationId).maybeSingle();
        if (linkedOrganization.error) throw linkedOrganization.error;
        if (!linkedOrganization.data) {
          const managedOrganization = await db.from("organization_managers").select("id").eq("site_id", site.id).eq("organization_id", organizationId).eq("user_id", user.id).eq("active", true).maybeSingle();
          if (managedOrganization.error) throw managedOrganization.error;
          if (!managedOrganization.data) return NextResponse.json({ ok: false, error: "You can only attach an organization you are verified to manage." }, { status: 403 });
        }
      }
    }

    const id = crypto.randomUUID(); const fileName = safeName(flyer.name); const filePath = `media-partnerships/${site.code}/${eventDate.slice(0, 4)}/${id}-${fileName}`;
    await r2().send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET_NAME || "sdtv-private", Key: filePath, Body: Buffer.from(await flyer.arrayBuffer()), ContentType: flyer.type, Metadata: { requestId: id } }));
    const flyerPublicUrl = flyer.type.startsWith("image/") ? await publicImage(flyer, `sdtv/${site.code}/media-partnership-events`) : null;
    let resolvedOrganizationId = /^[0-9a-f-]{36}$/i.test(organizationId) ? organizationId : ""; let organizationImageUrl: string | null = null;
    if (resolvedOrganizationId) {
      const selectedOrganization = await db.from("community_organizations").select("id").eq("id", resolvedOrganizationId).eq("site_id", site.id).eq("status", "approved").maybeSingle();
      if (selectedOrganization.error) throw selectedOrganization.error;
      if (!selectedOrganization.data) return NextResponse.json({ ok: false, error: "The selected organization is not available for this site." }, { status: 400 });
    }
    if (!resolvedOrganizationId && organizationImage instanceof File) {
      organizationImageUrl = await publicImage(organizationImage, `sdtv/${site.code}/organizations`);
      const createdOrganization = await db.from("community_organizations").insert({ site_id: site.id, name: organizationName, organization_type: "Community Organization", category: organizationCategory, location: organizationLocation, website: organizationWebsite || null, description: organizationDescription || null, image: organizationImageUrl, image_urls: [organizationImageUrl], contact_email: contactEmail, status: "pending", approved: false, submitted_email: contactEmail }).select("id").single();
      if (createdOrganization.error) throw createdOrganization.error; resolvedOrganizationId = createdOrganization.data.id;
    }
    let resolvedEventId = /^[0-9a-f-]{36}$/i.test(eventId) ? eventId : "";
    if (resolvedEventId) {
      const selectedEvent = await db.from("events").select("id").eq("id", resolvedEventId).eq("site_id", site.id).maybeSingle();
      if (selectedEvent.error) throw selectedEvent.error;
      if (!selectedEvent.data) return NextResponse.json({ ok: false, error: "The selected event is not available for this site." }, { status: 400 });
    }
    if (!resolvedEventId) {
      const createdEvent = await db.from("events").insert({ site_id: site.id, title: eventTitle, date: eventDate, location: eventLocation, ticket_url: eventUrl || null, image: flyerPublicUrl, image_urls: flyerPublicUrl ? [flyerPublicUrl] : null, poc_name: contactName, poc_email: contactEmail, poc_phone: contactPhone || null, status: "pending", approved: false, media_partner_status: "requested", media_partner_flyer_url: flyerPublicUrl }).select("id").single();
      if (createdEvent.error) throw createdEvent.error; resolvedEventId = createdEvent.data.id;
    } else {
      const eventUpdate = await db.from("events").update({ media_partner_status: "requested", media_partner_flyer_url: flyerPublicUrl }).eq("id", resolvedEventId).eq("site_id", site.id);
      if (eventUpdate.error) throw eventUpdate.error;
    }
    if (resolvedOrganizationId && resolvedEventId) {
      const existingLink = await db.from("event_organizations").select("id").eq("site_id", site.id).eq("event_id", resolvedEventId).eq("organization_id", resolvedOrganizationId).maybeSingle();
      if (existingLink.error) throw existingLink.error;
      if (!existingLink.data) {
        const linkResult = await db.from("event_organizations").insert({ site_id: site.id, event_id: resolvedEventId, organization_id: resolvedOrganizationId, relationship: "Organizer", is_primary: !eventId, display_order: eventId ? 99 : 0 });
        if (linkResult.error) throw linkResult.error;
      }
    }
    const { error } = await db.from("media_partnership_requests").insert({ id, site_id: site.id, organization_id: resolvedOrganizationId || null, event_id: resolvedEventId || null, organization_name: organizationName, organization_image_url: organizationImageUrl, event_flyer_public_url: flyerPublicUrl, contact_name: contactName, contact_email: contactEmail, contact_phone: contactPhone || null, event_title: eventTitle, event_date: eventDate, event_location: eventLocation, event_url: eventUrl || null, event_type: eventType, notes: notes || null, flyer_file_path: filePath, flyer_file_name: fileName, flyer_mime_type: flyer.type, flyer_file_size: flyer.size, media_consent_accepted: true, media_consent_accepted_at: new Date().toISOString(), media_consent_version: "2026-09-26" });
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
