import { NextResponse } from "next/server";
import {
  agreementForToken,
  sponsorshipDb,
} from "../../../lib/sponsorships/server";
import { resolveCurrentSite } from "../../../lib/sites/siteResolver";

export async function POST(request: Request) {
  try {
    const site = await resolveCurrentSite();
    if (!site.id) return NextResponse.json({ error: "The current site is not configured." }, { status: 500 });
    const body = await request.json();
    const agreement = await agreementForToken(String(body.token || ""), site.id);
    if (!agreement)
      return NextResponse.json(
        { error: "This agreement link is invalid or expired." },
        { status: 404 },
      );
    if (!["accepted", "active"].includes(agreement.status))
      return NextResponse.json(
        {
          error: "Accept the agreement before submitting payment confirmation.",
        },
        { status: 409 },
      );
    const installment = agreement.installments.find(
      (row: { id: string }) => row.id === body.installmentId,
    );
    if (!installment)
      return NextResponse.json(
        { error: "Payment installment not found." },
        { status: 404 },
      );
    const confirmationUrl = String(body.confirmationUrl || "");
    if (!confirmationUrl.startsWith("https://"))
      return NextResponse.json(
        { error: "Upload a valid payment confirmation." },
        { status: 400 },
      );
    const db = sponsorshipDb(),
      now = new Date().toISOString();
    const { error } = await db
      .from("sponsorship_payment_installments")
      .update({
        status: "proof_submitted",
        confirmation_url: confirmationUrl,
        confirmation_submitted_at: now,
        submitted_note: String(body.note || ""),
        updated_at: now,
      })
      .eq("id", installment.id);
    if (error) throw error;
    await db
      .from("sponsorship_agreement_events")
      .insert({
        agreement_id: agreement.id,
        event_type: "payment_proof_submitted",
        actor_email: agreement.sponsor_email,
        details: { installment_number: installment.installment_number },
      });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not submit payment confirmation.",
      },
      { status: 500 },
    );
  }
}
