import { Resend } from "resend";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function escapeHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, phone, interest, message, captchaToken } = body;

    if (!name || !email || !message) {
      return NextResponse.json({ success: false, error: "Name, email, and message are required" }, { status: 400 });
    }

    if (!captchaToken) {
      return NextResponse.json({ success: false, error: "Captcha token is missing" }, { status: 400 });
    }

    const verifyResponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY || "", response: captchaToken }),
    });

    const verifyData = await verifyResponse.json();
    if (!verifyData.success) {
      return NextResponse.json({ success: false, error: "Captcha verification failed", details: verifyData }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const requestType = interest || "General Inquiry";
const { error: insertError } = await supabase
  .from("contact_requests")
  .insert({
    name,
    email,
    phone: phone || null,
    interest: requestType,
    message,
    source: "website_contact",
    status: "new",
  });

    if (insertError) {
      return NextResponse.json({ success: false, step: "db_insert", error: insertError.message }, { status: 500 });
    }

    const hasApiKey = Boolean(process.env.RESEND_API_KEY);
    if (!hasApiKey) {
      return NextResponse.json({ success: true, step: "db_saved_email_skipped", warning: "RESEND_API_KEY is missing in Vercel" });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safePhone = escapeHtml(phone || "");
    const safeType = escapeHtml(requestType);
    const safeMessage = escapeHtml(message || "").replace(/\n/g, "<br />");
    const fromAddress = process.env.CONTACT_EMAIL_FROM || "Seattle Desi TV <onboarding@resend.dev>";
    const adminTo = process.env.CONTACT_EMAIL_TO || "seattledesitv@gmail.com";

    const adminEmail = await resend.emails.send({
      from: fromAddress,
      to: adminTo,
      replyTo: email && email.includes("@") ? `${safeName} <${email.trim()}>` : undefined,
      subject: `New ${requestType} Request: ${name}`,
      html: `
        <h2>New Contact Request</h2>
        <p><b>Name:</b> ${safeName}</p>
        <p><b>Email:</b> ${safeEmail}</p>
        <p><b>Phone:</b> ${safePhone}</p>
        <p><b>Type:</b> ${safeType}</p>
        <p><b>Message:</b></p>
        <p>${safeMessage}</p>
        <p><a href="https://seattledesitv.com/studio/contact-requests">Open Contact Requests in Studio</a></p>
      `,
    });

    let autoReply: any = null;
    if (email && email.includes("@")) {
      autoReply = await resend.emails.send({
        from: fromAddress,
        to: email.trim(),
        subject: "We received your Seattle Desi TV request",
        html: `
          <h2>Thank you for contacting Seattle Desi TV</h2>
          <p>Hi ${safeName},</p>
          <p>We received your request regarding <b>${safeType}</b>.</p>
          <p>Our team will review it and get back to you soon.</p>
          <p>Seattle Desi TV<br/>Community • Culture • Connection</p>
        `,
      });
    }

    return NextResponse.json({ success: true, step: "db_saved_email_sent", adminEmail, autoReply });
  } catch (error: any) {
    return NextResponse.json({ success: false, step: "catch_error", error: error?.message || "Unknown error" }, { status: 500 });
  }
}
