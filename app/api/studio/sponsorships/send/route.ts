import { randomBytes, createHash } from "crypto";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import {
  requireSponsorshipAdmin,
  sponsorshipDb,
} from "../../../../lib/sponsorships/server";

export async function POST(request: Request) {
  try {
    const user = await requireSponsorshipAdmin(request);
    if (!user)
      return NextResponse.json(
        { error: "Studio admin access required." },
        { status: 403 },
      );
    const { agreementId } = await request.json();
    const db = sponsorshipDb();
    const { data: agreement, error } = await db
      .from("sponsorship_agreements")
      .select("*")
      .eq("id", agreementId)
      .eq("status", "draft")
      .single();
    if (error || !agreement)
      return NextResponse.json(
        { error: error?.message || "Draft agreement not found." },
        { status: 404 },
      );
    const token = randomBytes(32).toString("hex"),
      now = new Date(),
      expires = new Date(now.getTime() + 45 * 86400000);
    const contentHash = createHash("sha256")
      .update(agreement.agreement_content)
      .digest("hex");
    const { error: updateError } = await db
      .from("sponsorship_agreements")
      .update({
        status: "sent",
        sent_at: now.toISOString(),
        access_token_hash: createHash("sha256").update(token).digest("hex"),
        access_token_expires_at: expires.toISOString(),
        agreement_content_hash: contentHash,
        updated_at: now.toISOString(),
      })
      .eq("id", agreement.id);
    if (updateError) throw updateError;
    const site = (
      process.env.NEXT_PUBLIC_SITE_URL || "https://www.seattledesitv.com"
    ).replace(/\/$/, "");
    const reviewUrl = `${site}/sponsorship/review?token=${token}`;
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const sent = await resend.emails.send({
        from:
          process.env.RESEND_FROM_EMAIL ||
          "Seattle Desi TV <updates@seattledesitv.com>",
        to: agreement.sponsor_email,
        subject: `Seattle Desi TV sponsorship agreement ${agreement.agreement_number}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;line-height:1.6"><h2>Seattle Desi TV Sponsorship Agreement</h2><p>Hello ${agreement.sponsor_contact_name || agreement.sponsor_name},</p><p>Your sponsorship agreement is ready to review.</p><p><a style="display:inline-block;background:#c93678;color:white;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold" href="${reviewUrl}">Review and accept agreement</a></p><p>This secure link expires in 45 days.</p></div>`,
      });
      if (sent.error) throw new Error(sent.error.message);
    }
    await db
      .from("sponsorship_agreement_events")
      .insert({
        agreement_id: agreement.id,
        event_type: "sent",
        actor_user_id: user.id,
        actor_email: user.email,
        details: { email: agreement.sponsor_email },
      });
    return NextResponse.json({
      ok: true,
      emailConfigured: Boolean(process.env.RESEND_API_KEY),
      reviewUrl: process.env.RESEND_API_KEY ? undefined : reviewUrl,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not send agreement.",
      },
      { status: 500 },
    );
  }
}
