import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  activateAgreementIfReady,
  sponsorshipDb,
} from "../../../lib/sponsorships/server";

export async function POST(request: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    if (!url || !anon)
      return NextResponse.json(
        { error: "Sponsorship authentication is not configured." },
        { status: 500 },
      );
    const session = createClient(url, anon, {
      global: {
        headers: { Authorization: request.headers.get("authorization") || "" },
      },
    });
    const { data } = await session.auth.getUser();
    const user = data.user;
    if (!user)
      return NextResponse.json({ error: "Login required." }, { status: 401 });

    const body = await request.json();
    const agreementId = String(body.agreementId || "").trim();
    const signerName = String(body.signerName || "").trim();
    const signerTitle = String(body.signerTitle || "").trim();
    if (!agreementId)
      return NextResponse.json(
        { error: "Agreement is required." },
        { status: 400 },
      );
    if (!signerName)
      return NextResponse.json(
        { error: "Authorized signer name is required." },
        { status: 400 },
      );

    const db = sponsorshipDb();
    const { data: agreement, error } = await db
      .from("sponsorship_agreements")
      .select("id,business_id,sponsor_email,status")
      .eq("id", agreementId)
      .maybeSingle();
    if (error) throw error;
    if (!agreement)
      return NextResponse.json(
        { error: "Sponsorship agreement not found." },
        { status: 404 },
      );

    const emailMatch =
      agreement.sponsor_email.toLowerCase() ===
      (user.email || "").toLowerCase();
    let businessMatch = false;
    if (agreement.business_id) {
      const [manager, business] = await Promise.all([
        db
          .from("business_managers")
          .select("business_id")
          .eq("business_id", agreement.business_id)
          .eq("user_id", user.id)
          .eq("active", true)
          .maybeSingle(),
        db
          .from("local_businesses")
          .select("id")
          .eq("id", agreement.business_id)
          .eq("created_by", user.id)
          .maybeSingle(),
      ]);
      businessMatch = Boolean(manager.data || business.data);
    }
    if (!emailMatch && !businessMatch)
      return NextResponse.json(
        { error: "You are not authorized to accept this sponsorship." },
        { status: 403 },
      );
    if (!["sent", "viewed"].includes(agreement.status))
      return NextResponse.json(
        { error: "This agreement is no longer awaiting acceptance." },
        { status: 409 },
      );

    const now = new Date().toISOString();
    const { data: accepted, error: acceptanceError } = await db
      .from("sponsorship_agreements")
      .update({
        status: "accepted",
        accepted_at: now,
        signer_name: signerName,
        signer_title: signerTitle || null,
        signer_ip: (request.headers.get("x-forwarded-for") || "").split(",")[0],
        signer_user_agent: request.headers.get("user-agent"),
        updated_at: now,
      })
      .eq("id", agreement.id)
      .in("status", ["sent", "viewed"])
      .select("id")
      .maybeSingle();
    if (acceptanceError) throw acceptanceError;
    if (!accepted)
      return NextResponse.json(
        { error: "This agreement was already updated. Refresh and try again." },
        { status: 409 },
      );

    await db.from("sponsorship_agreement_events").insert({
      agreement_id: agreement.id,
      event_type: "accepted",
      actor_user_id: user.id,
      actor_email: user.email,
      details: { signer_name: signerName, source: "my_sponsorships" },
    });
    await activateAgreementIfReady(db, agreement.id);
    return NextResponse.json({ ok: true, status: "accepted" });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not accept sponsorship agreement.",
      },
      { status: 500 },
    );
  }
}
