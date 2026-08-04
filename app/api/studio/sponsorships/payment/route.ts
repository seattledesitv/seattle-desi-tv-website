import { NextResponse } from "next/server";
import {
  activateAgreementIfReady,
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
    const body = await request.json();
    const status = body.decision === "verify" ? "verified" : "rejected";
    const db = sponsorshipDb(),
      now = new Date().toISOString();
    const { data: installment, error } = await db
      .from("sponsorship_payment_installments")
      .update({
        status,
        verified_at: status === "verified" ? now : null,
        verified_by: user.id,
        rejection_reason:
          status === "rejected"
            ? String(
                body.reason || "Payment confirmation could not be verified.",
              )
            : null,
        updated_at: now,
      })
      .eq("id", body.installmentId)
      .select("agreement_id,installment_number")
      .single();
    if (error) throw error;
    await db
      .from("sponsorship_agreement_events")
      .insert({
        agreement_id: installment.agreement_id,
        event_type: `payment_${status}`,
        actor_user_id: user.id,
        actor_email: user.email,
        details: { installment_number: installment.installment_number },
      });
    if (status === "verified")
      await activateAgreementIfReady(db, installment.agreement_id);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not verify payment.",
      },
      { status: 500 },
    );
  }
}
