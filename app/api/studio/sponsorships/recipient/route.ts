import { NextResponse } from "next/server";
import {
  requireSponsorshipAdmin,
  sponsorshipDb,
} from "../../../../lib/sponsorships/server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const user = await requireSponsorshipAdmin(request);
    if (!user)
      return NextResponse.json(
        { error: "Studio admin access required." },
        { status: 403 },
      );
    const body = await request.json();
    const agreementId = String(body.agreementId || "").trim();
    const sponsorEmail = String(body.sponsorEmail || "")
      .trim()
      .toLowerCase();
    if (!agreementId)
      return NextResponse.json(
        { error: "Agreement is required." },
        { status: 400 },
      );
    if (!EMAIL_PATTERN.test(sponsorEmail))
      return NextResponse.json(
        { error: "Enter a valid sponsor email address." },
        { status: 400 },
      );

    const db = sponsorshipDb();
    const { data: agreement, error } = await db
      .from("sponsorship_agreements")
      .select("id,sponsor_email,status")
      .eq("id", agreementId)
      .maybeSingle();
    if (error) throw error;
    if (!agreement)
      return NextResponse.json(
        { error: "Sponsorship agreement not found." },
        { status: 404 },
      );
    if (!["draft", "sent", "viewed"].includes(agreement.status))
      return NextResponse.json(
        {
          error:
            "Accepted or active sponsorship identity cannot be changed with this action.",
        },
        { status: 409 },
      );
    if (agreement.sponsor_email.toLowerCase() === sponsorEmail)
      return NextResponse.json({ ok: true, status: agreement.status });

    const previouslySent = ["sent", "viewed"].includes(agreement.status);
    const now = new Date().toISOString();
    const changes: Record<string, unknown> = {
      sponsor_email: sponsorEmail,
      updated_at: now,
    };
    if (previouslySent) {
      Object.assign(changes, {
        status: "draft",
        access_token_hash: null,
        access_token_expires_at: null,
        sent_at: null,
        viewed_at: null,
      });
    }
    const { error: updateError } = await db
      .from("sponsorship_agreements")
      .update(changes)
      .eq("id", agreement.id)
      .in("status", ["draft", "sent", "viewed"]);
    if (updateError) throw updateError;

    await db.from("sponsorship_agreement_events").insert({
      agreement_id: agreement.id,
      event_type: "recipient_email_corrected",
      actor_user_id: user.id,
      actor_email: user.email,
      details: {
        previous_email: agreement.sponsor_email,
        corrected_email: sponsorEmail,
        previous_status: agreement.status,
        old_review_link_invalidated: previouslySent,
      },
    });
    return NextResponse.json({
      ok: true,
      status: previouslySent ? "draft" : agreement.status,
      requiresResend: previouslySent,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not correct sponsor email.",
      },
      { status: 500 },
    );
  }
}
