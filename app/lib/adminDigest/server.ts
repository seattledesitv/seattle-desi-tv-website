import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { isAdminRole, resolveUserRole } from "../roles";
import { AdminDigestService } from "./services/adminDigestService";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";

export async function requireDigestAdmin(request: Request) {
  if (!url || !anon) return null;
  const client = createClient(url, anon, { global: { headers: { Authorization: request.headers.get("authorization") || "" } } });
  const { data } = await client.auth.getUser();
  if (!data.user || !isAdminRole(await resolveUserRole(client, data.user))) return null;
  return data.user;
}

export async function sendDailyDigest(options: { type: "scheduled" | "test"; triggeredBy: string }) {
  const resendKey = process.env.RESEND_API_KEY || "";
  if (!url || !serviceKey || !resendKey) throw new Error("Daily digest server configuration is incomplete.");
  const to = new Date();
  const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const digest = await AdminDigestService.build(db, from, to);
  const subject = `${options.type === "test" ? "TEST — " : ""}${AdminDigestService.subject(digest)}`;
  const recipient = process.env.ADMIN_DIGEST_EMAIL || "seattledesitv@gmail.com";
  const counts = { registrations: digest.users.length, volunteerRequests: digest.volunteerRequests.length, teamMemberRequests: digest.teamMemberRequests.length, submissions: Object.fromEntries(digest.submissions.map((section) => [section.key, section.items.length])) };
  const idempotencyKey = options.type === "scheduled" ? `sdtv-daily-admin-digest-${to.toISOString().slice(0, 10)}` : `sdtv-admin-digest-test-${randomUUID()}`;
  const { data: archive, error: archiveError } = await db.from("admin_digest_deliveries").insert({ idempotency_key: idempotencyKey, delivery_type: options.type, recipient, subject, report_from: digest.from, report_to: digest.to, counts, triggered_by: options.triggeredBy }).select("id").single();
  if (archiveError || !archive) throw new Error(archiveError?.message || "Could not create digest archive record.");
  try {
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://seattledesitv.com").replace(/\/$/, "");
    const sent = await new Resend(resendKey).emails.send({ from: process.env.RESEND_FROM_EMAIL || "Seattle Desi TV <updates@seattledesitv.com>", to: recipient, subject, html: AdminDigestService.html(digest, `${siteUrl}/studio`) }, { idempotencyKey });
    if (sent.error) throw new Error(sent.error.message);
    await db.from("admin_digest_deliveries").update({ status: "sent", provider_email_id: sent.data?.id || null, sent_at: new Date().toISOString(), error_message: null }).eq("id", archive.id);
    return { emailId: sent.data?.id || null, counts };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Email delivery failed.";
    await db.from("admin_digest_deliveries").update({ status: "failed", error_message: message }).eq("id", archive.id);
    throw error;
  }
}
