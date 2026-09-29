import "server-only";
import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";
import { seoEntityPath } from "../seo/urls";

export type FinalEntityType = "story" | "event" | "organization" | "business";
const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://seattledesitv.com"
).replace(/\/$/, "");
const email = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase();
const esc = (value: unknown) =>
  String(value || "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ] || c,
  );

async function details(
  db: SupabaseClient,
  siteId: string,
  type: FinalEntityType,
  id: string,
) {
  if (type === "story") {
    const { data } = await db
      .from("community_stories")
      .select("id,title,slug,status,source_request_id")
      .eq("site_id", siteId)
      .eq("id", id)
      .maybeSingle();
    if (!data || data.status !== "published") return null;
    const { data: source } = await db
      .from("public_content_requests")
      .select("submitter_email,submitter_name")
      .eq("id", data.source_request_id)
      .maybeSingle();
    return {
      title: data.title,
      recipient: email(source?.submitter_email),
      name: source?.submitter_name,
      path: `/news/stories/${data.slug}`,
      label: "story",
    };
  }
  if (type === "event") {
    const { data } = await db
      .from("events")
      .select("id,title,status,approved,poc_email,poc_name")
      .eq("site_id", siteId)
      .eq("id", id)
      .maybeSingle();
    if (!data || (!data.approved && data.status !== "approved")) return null;
    return {
      title: data.title,
      recipient: email(data.poc_email),
      name: data.poc_name,
      path: seoEntityPath("events", data.title, data.id),
      label: "event",
    };
  }
  if (type === "organization") {
    const { data } = await db
      .from("community_organizations")
      .select(
        "id,name,status,approved,contact_email,submitted_email,contact_name",
      )
      .eq("site_id", siteId)
      .eq("id", id)
      .maybeSingle();
    if (!data || (!data.approved && data.status !== "approved")) return null;
    return {
      title: data.name,
      recipient: email(data.submitted_email || data.contact_email),
      name: data.contact_name,
      path: seoEntityPath("community-organizations", data.name, data.id),
      label: "organization",
    };
  }
  const { data } = await db
    .from("local_businesses")
    .select("id,name,status,approved,contact_email,poc_email,poc_name")
    .eq("site_id", siteId)
    .eq("id", id)
    .maybeSingle();
  if (!data || (!data.approved && data.status !== "approved")) return null;
  return {
    title: data.name,
    recipient: email(data.contact_email || data.poc_email),
    name: data.poc_name,
    path: seoEntityPath("businesses", data.name, data.id),
    label: "business listing",
  };
}

export async function sendFinalApprovalNotification(
  db: SupabaseClient,
  input: {
    siteId: string;
    siteName: string;
    entityType: FinalEntityType;
    entityId: string;
  },
) {
  const existing = await db
    .from("final_approval_notifications")
    .select("id,status")
    .eq("site_id", input.siteId)
    .eq("entity_type", input.entityType)
    .eq("entity_id", input.entityId)
    .maybeSingle();
  if (existing.data?.status === "sent")
    return { ok: true, skipped: true, reason: "already_sent" };
  const item = await details(
    db,
    input.siteId,
    input.entityType,
    input.entityId,
  );
  if (!item) return { ok: false, skipped: true, reason: "not_public" };
  if (!item.recipient || !item.recipient.includes("@"))
    return { ok: true, skipped: true, reason: "no_recipient" };
  if (!process.env.RESEND_API_KEY)
    return { ok: true, skipped: true, reason: "email_not_configured" };
  const publicUrl = `${SITE_URL}${item.path}`;
  const resend = new Resend(process.env.RESEND_API_KEY);
  const result = await resend.emails.send({
    from:
      process.env.RESEND_FROM_EMAIL ||
      `${input.siteName} <onboarding@resend.dev>`,
    to: item.recipient,
    subject: `Your ${item.label} is now live on ${input.siteName}`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:640px"><h2>Your ${esc(item.label)} is now live</h2><p>Hello ${esc(item.name || "there")},</p><p><b>${esc(item.title)}</b> has been approved and published on ${esc(input.siteName)}.</p><p><a href="${esc(publicUrl)}" style="display:inline-block;background:#db2777;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:bold">View published page</a></p><p style="color:#64748b;font-size:13px">${esc(publicUrl)}</p></div>`,
  });
  const status = result.error ? "failed" : "sent";
  await db
    .from("final_approval_notifications")
    .upsert(
      {
        site_id: input.siteId,
        entity_type: input.entityType,
        entity_id: input.entityId,
        recipient_email: item.recipient,
        public_url: publicUrl,
        provider_message_id: result.data?.id || null,
        status,
        error_message: result.error?.message || null,
        sent_at: new Date().toISOString(),
      },
      { onConflict: "site_id,entity_type,entity_id" },
    );
  return result.error
    ? { ok: false, error: result.error.message }
    : { ok: true, skipped: false };
}
