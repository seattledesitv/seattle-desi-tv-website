import { NextResponse } from "next/server";
import { Resend } from "resend";
import {
  requireSponsorshipAdmin,
  sponsorshipDb,
} from "../../../../lib/sponsorships/server";

const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );

export async function POST(request: Request) {
  try {
    const user = await requireSponsorshipAdmin(request);
    if (!user)
      return NextResponse.json(
        { error: "Studio admin access required." },
        { status: 403 },
      );
    if (!process.env.RESEND_API_KEY)
      return NextResponse.json(
        { error: "RESEND_API_KEY is not configured." },
        { status: 500 },
      );
    const { installmentId } = await request.json();
    const db = sponsorshipDb();
    const { data: installment, error } = await db
      .from("sponsorship_payment_installments")
      .select(
        "*,sponsorship_agreements(id,agreement_number,sponsor_name,sponsor_email,sponsor_contact_name,status)",
      )
      .eq("id", installmentId)
      .single();
    if (error || !installment)
      return NextResponse.json(
        { error: error?.message || "Payment installment not found." },
        { status: 404 },
      );
    if (["verified", "waived"].includes(installment.status))
      return NextResponse.json(
        { error: "This payment is already complete." },
        { status: 409 },
      );
    const agreement = installment.sponsorship_agreements;
    const resend = new Resend(process.env.RESEND_API_KEY);
    const sent = await resend.emails.send({
      from:
        process.env.RESEND_FROM_EMAIL ||
        "Seattle Desi TV <updates@seattledesitv.com>",
      to: agreement.sponsor_email,
      subject: `Payment reminder for SDTV sponsorship ${agreement.agreement_number}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;line-height:1.6"><h2>Seattle Desi TV sponsorship payment reminder</h2><p>Hello ${agreement.sponsor_contact_name || agreement.sponsor_name},</p><p>This is a friendly reminder that payment ${installment.installment_number} for <strong>${money(installment.amount_cents)}</strong> is due on <strong>${installment.due_date}</strong>.</p><p>Please send the payment by Zelle to <strong>info@seattledesitv.com</strong>, then use your secure agreement link to upload the confirmation.</p><p>If payment has already been sent, thank you and please disregard this reminder.</p></div>`,
    });
    if (sent.error) throw new Error(sent.error.message);
    const now = new Date().toISOString();
    await db
      .from("sponsorship_payment_installments")
      .update({
        reminder_last_sent_at: now,
        reminder_count: Number(installment.reminder_count || 0) + 1,
        updated_at: now,
      })
      .eq("id", installment.id);
    await db
      .from("sponsorship_agreement_events")
      .insert({
        agreement_id: agreement.id,
        event_type: "payment_reminder_sent",
        actor_user_id: user.id,
        actor_email: user.email,
        details: { installment_number: installment.installment_number },
      });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not send reminder.",
      },
      { status: 500 },
    );
  }
}
