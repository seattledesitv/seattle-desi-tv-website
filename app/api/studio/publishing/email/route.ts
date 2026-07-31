import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { isAdminRole, resolveUserRole } from "../../../../lib/roles";
import type { ChannelOutputPayload } from "../../../../lib/publishing/pipeline/types";

type EmailAction = "test" | "send_all";
type Subscriber = { id: string; email: string; name: string | null; unsubscribe_token: string | null };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
const resendKey = process.env.RESEND_API_KEY || "";
const fromEmail = process.env.NEWSLETTER_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || "Seattle Desi TV <updates@seattledesitv.com>";
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://seattledesitv.com").replace(/\/$/, "");

function validEmail(value: unknown) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim().toLowerCase()); }
function escapeHtml(value: unknown) { return String(value || "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] || character); }
function emailPayload(value: unknown): ChannelOutputPayload | null {
  if (!value || typeof value !== "object") return null;
  const payload = value as Partial<ChannelOutputPayload>;
  return payload.schemaVersion === 3 && typeof payload.title === "string" && typeof payload.html === "string" && typeof payload.text === "string" ? payload as ChannelOutputPayload : null;
}
function withFooter(html: string, email: string) {
  const manageUrl = `${siteUrl}/unsubscribe?email=${encodeURIComponent(email)}`;
  const footer = `<div style="background:#f1f5f9;color:#475569;text-align:center;padding:24px;font:13px/1.6 Arial,sans-serif"><p>You are receiving this because you subscribed to Seattle Desi TV updates.</p><p><a href="${escapeHtml(manageUrl)}" style="color:#be185d;font-weight:700">Manage subscription or unsubscribe</a></p></div>`;
  return html.includes("</body>") ? html.replace("</body>", `${footer}</body>`) : `${html}${footer}`;
}
async function subscribers(db: SupabaseClient) {
  const rows: Subscriber[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("newsletter_subscribers").select("id,email,name,unsubscribe_token").eq("status", "active").order("id").range(from, from + 999);
    if (error) throw error;
    const page = (data || []) as unknown as Subscriber[];
    rows.push(...page);
    if (page.length < 1000) break;
  }
  const seen = new Set<string>();
  return rows.filter((row) => { const email = String(row.email || "").trim().toLowerCase(); if (!validEmail(email) || seen.has(email)) return false; row.email = email; seen.add(email); return true; });
}
async function attempt(db: SupabaseClient, row: Record<string, unknown>) {
  const { error } = await db.from("publication_publish_attempts").insert(row);
  if (error) throw error;
}

export async function POST(request: Request) {
  if (!supabaseUrl || !anonKey || !serviceKey) return NextResponse.json({ error: "Supabase server credentials are not configured." }, { status: 500 });
  if (!resendKey) return NextResponse.json({ error: "Email delivery is not configured. Add RESEND_API_KEY and NEWSLETTER_FROM_EMAIL in Vercel." }, { status: 500 });
  const authHeader = request.headers.get("authorization") || "";
  const sessionClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: userData } = await sessionClient.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const role = await resolveUserRole(sessionClient, user);
  if (!isAdminRole(role)) return NextResponse.json({ error: "Studio admin access required." }, { status: 403 });

  const body = await request.json().catch(() => ({})) as { action?: EmailAction; outputId?: string; testEmail?: string; confirmed?: boolean };
  const action = body.action;
  const outputId = String(body.outputId || "").trim();
  if (!outputId || !["test", "send_all"].includes(String(action))) return NextResponse.json({ error: "A valid email action and output are required." }, { status: 400 });

  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: output, error: outputError } = await db.from("publication_outputs").select("id,publication_id,campaign_id,channel,status,content").eq("id", outputId).single();
  if (outputError || !output) return NextResponse.json({ error: outputError?.message || "Publication email output was not found." }, { status: 404 });
  if (!['email', 'newsletter'].includes(String(output.channel))) return NextResponse.json({ error: "Select an email or newsletter output." }, { status: 400 });
  const payload = emailPayload(output.content);
  if (!payload) return NextResponse.json({ error: "Generate a new email output before sending." }, { status: 400 });
  if (action === "send_all") {
    const { data: publication, error: publicationError } = await db.from("publications").select("status").eq("id", output.publication_id).single();
    if (publicationError) return NextResponse.json({ error: publicationError.message }, { status: 400 });
    if (!["approved", "scheduled", "published"].includes(String(publication?.status))) return NextResponse.json({ error: "Approve this publication in Review & approve before sending it to subscribers." }, { status: 409 });
  }
  const resend = new Resend(resendKey);
  const baseAttempt = { publication_id: output.publication_id, campaign_id: output.campaign_id, output_id: output.id, channel: output.channel, attempted_by: user.id };

  try {
    if (action === "test") {
      const testEmail = String(body.testEmail || "").trim().toLowerCase();
      if (!validEmail(testEmail)) return NextResponse.json({ error: "Enter a valid test email address." }, { status: 400 });
      const result = await resend.emails.send({ from: fromEmail, to: testEmail, subject: `[TEST] ${payload.subject || payload.title}`, html: withFooter(payload.html || "", testEmail), text: payload.text });
      if (result.error) throw new Error(result.error.message || "Test email failed.");
      await attempt(db, { ...baseAttempt, action: "email_test", status: "completed", request_snapshot: { testEmail }, response_snapshot: { providerMessageId: result.data?.id || null } });
      return NextResponse.json({ ok: true, message: `Test email sent to ${testEmail}.`, testEmail });
    }

    if (!body.confirmed) return NextResponse.json({ error: "Confirm subscriber delivery before sending." }, { status: 400 });
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: testCount, error: testError } = await db.from("publication_publish_attempts").select("id", { count: "exact", head: true }).eq("output_id", outputId).eq("action", "email_test").eq("status", "completed").gte("attempted_at", since);
    if (testError) throw testError;
    if (!testCount) return NextResponse.json({ error: "Send and review a test email for this output before sending to subscribers." }, { status: 400 });

    const activeSubscribers = await subscribers(db);
    if (!activeSubscribers.length) return NextResponse.json({ error: "There are no active subscribers." }, { status: 400 });
    const { data: delivered, error: deliveredError } = await db.from("publication_email_deliveries").select("email").eq("output_id", outputId).eq("status", "sent");
    if (deliveredError) throw deliveredError;
    const alreadySent = new Set((delivered || []).map((row) => String(row.email).toLowerCase()));
    const pending = activeSubscribers.filter((subscriber) => !alreadySent.has(subscriber.email));
    if (!pending.length) return NextResponse.json({ ok: true, message: "All active subscribers already received this output.", sent: 0, skipped: activeSubscribers.length });

    let sent = 0;
    for (let index = 0; index < pending.length; index += 100) {
      const batch = pending.slice(index, index + 100);
      const result = await resend.batch.send(batch.map((subscriber) => ({ from: fromEmail, to: [subscriber.email], subject: payload.subject || payload.title, html: withFooter(payload.html || "", subscriber.email), text: payload.text, tags: [{ name: "publication_output", value: outputId.replace(/-/g, "") }] })));
      if (result.error) {
        await db.from("publication_email_deliveries").upsert(batch.map((subscriber) => ({ publication_id: output.publication_id, output_id: outputId, subscriber_id: subscriber.id, email: subscriber.email, status: "failed", error_message: result.error?.message || "Batch send failed.", updated_at: new Date().toISOString() })), { onConflict: "output_id,email" });
        throw new Error(`${result.error.message || "Subscriber email batch failed."} ${sent} email(s) were accepted before this failure; retry will skip them.`);
      }
      const ids = Array.isArray(result.data) ? result.data : [];
      const now = new Date().toISOString();
      const { error: ledgerError } = await db.from("publication_email_deliveries").upsert(batch.map((subscriber, offset) => ({ publication_id: output.publication_id, output_id: outputId, subscriber_id: subscriber.id, email: subscriber.email, status: "sent", provider_message_id: ids[offset]?.id || null, error_message: null, sent_at: now, updated_at: now })), { onConflict: "output_id,email" });
      if (ledgerError) throw ledgerError;
      sent += batch.length;
    }
    const now = new Date().toISOString();
    await db.from("publication_outputs").update({ status: "published", published_at: now, last_attempt_at: now, last_error: null, updated_by: user.id, updated_at: now }).eq("id", outputId);
    await attempt(db, { ...baseAttempt, action: "email_send", status: "completed", request_snapshot: { activeSubscribers: activeSubscribers.length }, response_snapshot: { sent, skipped: alreadySent.size } });
    return NextResponse.json({ ok: true, message: `Email accepted for ${sent} active subscriber${sent === 1 ? "" : "s"}.`, sent, skipped: alreadySent.size });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Publication email delivery failed.";
    try { await attempt(db, { ...baseAttempt, action: action === "test" ? "email_test" : "email_send", status: "failed", error_message: message }); } catch { /* Preserve the delivery error. */ }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
