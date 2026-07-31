import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { isAdminRole, resolveUserRole } from "../../../lib/roles";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const resendKey = process.env.RESEND_API_KEY || "";
const fromEmail = process.env.RESEND_FROM_EMAIL || "Seattle Desi TV <updates@seattledesitv.com>";
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.seattledesitv.com").replace(/\/$/, "");
const postalAddress = process.env.SDTV_POSTAL_ADDRESS || "";

function cleanEmail(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character] || character);
}

export async function POST(request: Request) {
  try {
    if (!supabaseUrl || !anonKey || !serviceKey) return NextResponse.json({ error: "Supabase server configuration is incomplete." }, { status: 500 });
    if (!resendKey) return NextResponse.json({ error: "RESEND_API_KEY is not configured." }, { status: 500 });
    if (!postalAddress) return NextResponse.json({ error: "SDTV_POSTAL_ADDRESS must be configured before directory notices can be sent." }, { status: 500 });

    const authHeader = request.headers.get("authorization") || "";
    const sessionClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userError } = await sessionClient.auth.getUser();
    const user = userData?.user || null;
    if (userError || !user) return NextResponse.json({ error: "Login required." }, { status: 401 });
    const resolvedRole = await resolveUserRole(sessionClient, user);
    if (!isAdminRole(resolvedRole)) return NextResponse.json({ error: "Studio admin access required." }, { status: 403 });

    const body = await request.json();
    const businessId = String(body.businessId || "").trim();
    const forceResend = Boolean(body.forceResend);
    if (!businessId) return NextResponse.json({ error: "Business ID is required." }, { status: 400 });

    const db = createClient(supabaseUrl, serviceKey);
    const { data: business, error: businessError } = await db.from("local_businesses")
      .select("id,name,address,website,poc_name,poc_email,contact_email,status,outreach_status,outreach_sent_at,outreach_send_count,claim_token,opted_out_at")
      .eq("id", businessId).maybeSingle();
    if (businessError || !business) return NextResponse.json({ error: businessError?.message || "Business not found." }, { status: 404 });
    if (business.opted_out_at || business.outreach_status === "opted_out") return NextResponse.json({ error: "This business opted out and cannot be contacted from this workflow." }, { status: 409 });

    const recipient = cleanEmail(body.recipient || business.contact_email || business.poc_email);
    if (!recipient || !recipient.includes("@")) return NextResponse.json({ error: "Add a valid business contact email before sending the notice." }, { status: 400 });
    if (business.outreach_sent_at && !forceResend) return NextResponse.json({ error: "A listing notice has already been sent. Use the explicit resend option if another notice is needed." }, { status: 409 });
    if (!business.claim_token) return NextResponse.json({ error: "Claim token is missing. Apply the business outreach database migration first." }, { status: 500 });

    const responseDue = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const responseBase = `${siteUrl}/business-response?token=${encodeURIComponent(business.claim_token)}`;
    const claimUrl = `${responseBase}&action=claim`;
    const correctionUrl = `${responseBase}&action=correction`;
    const optOutUrl = `${responseBase}&action=opt_out`;
    const approveUrl = `${responseBase}&action=approve`;
    const businessName = String(business.name || "your business");
    const greeting = business.poc_name ? `Hello ${business.poc_name},` : `Hello ${businessName} Team,`;
    const dueText = responseDue.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const subject = "Please review your Seattle Desi TV community directory listing";
    const text = `${greeting}\n\nSeattle Desi TV is building a community directory to help residents discover local businesses. We prepared a complimentary draft listing for ${businessName} using publicly available information.\n\nWe plan to publish the basic listing after ${dueText} unless you ask us not to include it. You can still claim, correct, or request removal at any time after publication. The listing does not imply sponsorship, partnership, or endorsement.\n\nClaim and manage your listing: ${claimUrl}\nConfirm it is accurate: ${approveUrl}\nRequest a correction: ${correctionUrl}\nDo not include my business: ${optOutUrl}\n\nThere is no charge to claim or correct the basic listing.\n\nSeattle Desi TV\n${siteUrl}\n${postalAddress}`;
    const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033;max-width:680px;margin:auto"><h2 style="color:#be185d">Seattle Desi TV Community Directory</h2><p>${escapeHtml(greeting)}</p><p>Seattle Desi TV is building a community directory to help residents discover local businesses. We prepared a complimentary draft listing for <strong>${escapeHtml(businessName)}</strong> using publicly available information.</p><div style="background:#fff7ed;border:1px solid #fed7aa;padding:16px;border-radius:12px"><strong>Planned publication:</strong> We plan to publish the basic listing after ${escapeHtml(dueText)} unless you ask us not to include it. You can still claim, correct, or request removal at any time after publication.</div><p>This listing does not imply sponsorship, partnership, or endorsement.</p><p><a href="${claimUrl}" style="display:inline-block;background:#be185d;color:white;padding:11px 16px;border-radius:8px;text-decoration:none;font-weight:bold">Claim and manage listing</a></p><p><a href="${approveUrl}">Confirm the listing is accurate</a><br/><a href="${correctionUrl}">Request a correction</a><br/><a href="${optOutUrl}">Do not include my business</a></p><p>There is no charge to claim or correct the basic listing.</p><hr style="border:0;border-top:1px solid #ddd;margin:24px 0"/><p style="font-size:12px;color:#667085">Seattle Desi TV · ${escapeHtml(siteUrl)}<br/>${escapeHtml(postalAddress)}</p></div>`;

    const resend = new Resend(resendKey);
    const sendResult = await resend.emails.send({ from: fromEmail, to: recipient, subject, text, html });
    if (sendResult.error) {
      await db.from("local_businesses").update({ outreach_status: "send_failed", outreach_recipient: recipient, contact_email: recipient }).eq("id", businessId);
      await db.from("business_activity_log").insert({ business_id: businessId, activity_type: "listing_notice_failed", activity_label: "Listing notice send failed", actor_email: user.email || null, details: { recipient, error: sendResult.error.message } });
      return NextResponse.json({ error: sendResult.error.message || "Email send failed." }, { status: 500 });
    }

    const now = new Date().toISOString();
    const { error: updateError } = await db.from("local_businesses").update({
      contact_email: recipient,
      outreach_status: "notice_sent",
      outreach_sent_at: now,
      last_outreach_sent_at: now,
      outreach_send_count: Number(business.outreach_send_count || 0) + 1,
      outreach_response_due_at: responseDue.toISOString(),
      outreach_message_id: sendResult.data?.id || null,
      outreach_recipient: recipient,
    }).eq("id", businessId);
    if (updateError) return NextResponse.json({ error: `Email sent, but the business record could not be updated: ${updateError.message}` }, { status: 500 });

    await db.from("business_activity_log").insert({ business_id: businessId, activity_type: forceResend ? "listing_notice_resent" : "listing_notice_sent", activity_label: forceResend ? "Listing notice resent" : "Listing notice sent", actor_email: user.email || null, details: { recipient, response_due_at: responseDue.toISOString(), message_id: sendResult.data?.id || null } });
    return NextResponse.json({ ok: true, recipient, responseDueAt: responseDue.toISOString(), messageId: sendResult.data?.id || null });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Business listing notice failed." }, { status: 500 });
  }
}
