import { Resend } from "resend";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, phone, interest, message, captchaToken } = body;

    if (!captchaToken) {
      return NextResponse.json(
        { success: false, error: "Captcha token is missing" },
        { status: 400 }
      );
    }

    const verifyResponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        secret: process.env.TURNSTILE_SECRET_KEY!,
        response: captchaToken,
      }),
    });

    const verifyData = await verifyResponse.json();

    if (!verifyData.success) {
      return NextResponse.json(
        { success: false, error: "Captcha verification failed", details: verifyData },
        { status: 400 }
      );
    }

    const hasApiKey = Boolean(process.env.RESEND_API_KEY);

    if (!hasApiKey) {
      return NextResponse.json(
        {
          success: false,
          step: "env_check",
          error: "RESEND_API_KEY is missing in Vercel",
        },
        { status: 500 }
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const result = await resend.emails.send({
      from: "Seattle Desi TV <onboarding@resend.dev>",
      to: "seattledesitv@gmail.com",
     replyTo:
  email && email.includes("@")
    ? `${name} <${email.trim()}>`
    : undefined,
      subject: `New Contact Submission: ${name}`,
      html: `
        <h2>New Contact Submission</h2>
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Phone:</b> ${phone || ""}</p>
        <p><b>Interest:</b> ${interest || ""}</p>
        <p><b>Message:</b></p>
        <p>${message || ""}</p>
      `,
    });

    return NextResponse.json({
      success: true,
      step: "email_sent",
      resendResult: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        step: "catch_error",
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
