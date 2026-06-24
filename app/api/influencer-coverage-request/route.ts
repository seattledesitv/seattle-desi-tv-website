import { Resend } from "resend";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

function clean(value: unknown) {
  return String(value || "").trim();
}

function escapeHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const businessName = clean(body.businessName);
    const contactName = clean(body.contactName);
    const email = clean(body.email).toLowerCase();
    const phone = clean(body.phone);
    const website = clean(body.website);
    const goal = clean(body.goal);
    const preferredDate = clean(body.preferredDate);
    const budget = clean(body.budget);
    const notes = clean(body.notes);

    if (businessName.length < 2) return NextResponse.json({ success: false, error: "Business name is required." }, { status: 400 });
    if (contactName.length < 2) return NextResponse.json({ success: false, error: "Contact name is required." }, { status: 400 });
    if (!EMAIL_REGEX.test(email)) return NextResponse.json({ success: false, error: "Enter a valid email address." }, { status: 400 });
    if ((goal + notes).length < 10) return NextResponse.json({ success: false, error: "Please share what influencer coverage you need." }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const supabase = createClient(supabaseUrl, supabaseKey);
    const interest = "Influencer Coverage - Business";
    const message = [
      `Business: ${businessName}`,
      website ? `Website/Social: ${website}` : "Website/Social: —",
      preferredDate ? `Preferred date/timing: ${preferredDate}` : "Preferred date/timing: —",
      budget ? `Budget/package: ${budget}` : "Budget/package: —",
      "",
      "Coverage Goal:",
      goal || "—",
      "",
      "Additional Notes:",
      notes || "—",
    ].join("\n");

    const { error: insertError } = await supabase.from("contact_requests").insert({
      name: `${contactName} - ${businessName}`,
      email,
      phone: phone || null,
      interest,
      message,
      source: "influencer_coverage_request",
      status: "new",
    });

    if (insertError) return NextResponse.json({ success: false, step: "db_insert", error: insertError.message }, { status: 500 });

    if (!process.env.RESEND_API_KEY) return NextResponse.json({ success: true, step: "db_saved_email_skipped" });

    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromAddress = process.env.CONTACT_EMAIL_FROM || process.env.RESEND_FROM_EMAIL || "Seattle Desi TV <onboarding@resend.dev>";
    const adminTo = process.env.CONTACT_EMAIL_TO || "seattledesitv@gmail.com";
    const safeBusiness = escapeHtml(businessName);
    const safeContact = escapeHtml(contactName);
    const safeEmail = escapeHtml(email);
    const safePhone = escapeHtml(phone);
    const safeMessage = escapeHtml(message).replace(/\n/g, "<br />");

    const adminEmail = await resend.emails.send({
      from: fromAddress,
      to: adminTo,
      replyTo: `${safeContact} <${email}>`,
      subject: `New Influencer Coverage Request: ${businessName}`,
      html: `<h2>New Influencer Coverage Request</h2><p><b>Business:</b> ${safeBusiness}</p><p><b>Contact:</b> ${safeContact}</p><p><b>Email:</b> ${safeEmail}</p><p><b>Phone:</b> ${safePhone || "—"}</p><p><b>Details:</b></p><p>${safeMessage}</p><p><a href="https://seattledesitv.com/studio/contact-requests">Open Contact Requests in Studio</a></p>`,
    });

    const autoReply = await resend.emails.send({
      from: fromAddress,
      to: email,
      subject: "We received your SDTV influencer coverage request",
      html: `<h2>Thank you for contacting Seattle Desi TV</h2><p>Hi ${safeContact},</p><p>We received your influencer coverage request for <b>${safeBusiness}</b>.</p><p>Our team will review it and respond with next steps.</p><p>Seattle Desi TV<br/>Community • Culture • Connection</p>`,
    });

    return NextResponse.json({ success: true, step: "db_saved_email_sent", adminEmail, autoReply });
  } catch (error: any) {
    return NextResponse.json({ success: false, step: "catch_error", error: error?.message || "Unknown error" }, { status: 500 });
  }
}
