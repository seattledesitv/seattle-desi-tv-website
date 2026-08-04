import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sponsorshipDb } from "../../../lib/sponsorships/server";

export async function POST(request: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const session = createClient(url, anon, {
      global: {
        headers: { Authorization: request.headers.get("authorization") || "" },
      },
    });
    const { data } = await session.auth.getUser();
    if (!data.user)
      return NextResponse.json({ error: "Login required." }, { status: 401 });
    const body = await request.json();
    const db = sponsorshipDb();
    const { data: installment, error } = await db
      .from("sponsorship_payment_installments")
      .select(
        "id,agreement_id,status,sponsorship_agreements(id,business_id,sponsor_email,status)",
      )
      .eq("id", body.installmentId)
      .single();
    if (error || !installment)
      return NextResponse.json(
        { error: error?.message || "Payment not found." },
        { status: 404 },
      );
    const agreement = installment.sponsorship_agreements as unknown as {
      id: string;
      business_id: string | null;
      sponsor_email: string;
      status: string;
    };
    const emailMatch =
      agreement.sponsor_email.toLowerCase() ===
      (data.user.email || "").toLowerCase();
    let managerMatch = false;
    if (agreement.business_id) {
      const manager = await db
        .from("business_managers")
        .select("business_id")
        .eq("business_id", agreement.business_id)
        .eq("user_id", data.user.id)
        .eq("active", true)
        .maybeSingle();
      managerMatch = Boolean(manager.data);
    }
    if (!emailMatch && !managerMatch)
      return NextResponse.json(
        { error: "You do not have access to this sponsorship." },
        { status: 403 },
      );
    if (!["accepted", "active"].includes(agreement.status))
      return NextResponse.json(
        { error: "The agreement must be accepted first." },
        { status: 409 },
      );
    if (["verified", "waived"].includes(installment.status))
      return NextResponse.json(
        { error: "This payment is already complete." },
        { status: 409 },
      );
    const confirmationUrl = String(body.confirmationUrl || "");
    if (!confirmationUrl.startsWith("https://"))
      return NextResponse.json(
        { error: "Upload a valid confirmation image." },
        { status: 400 },
      );
    const now = new Date().toISOString();
    const result = await db
      .from("sponsorship_payment_installments")
      .update({
        status: "proof_submitted",
        confirmation_url: confirmationUrl,
        confirmation_submitted_at: now,
        updated_at: now,
      })
      .eq("id", installment.id);
    if (result.error) throw result.error;
    await db
      .from("sponsorship_agreement_events")
      .insert({
        agreement_id: agreement.id,
        event_type: "payment_proof_submitted",
        actor_user_id: data.user.id,
        actor_email: data.user.email,
        details: { source: "my_sponsorships" },
      });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not submit confirmation.",
      },
      { status: 500 },
    );
  }
}
