import { Resend } from "resend";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, phone, interest, message } = body;

    const hasApiKey = Boolean(process.env.RESEND_API_KEY);
    const apiKeyStart = process.env.RESEND_API_KEY?.slice(0, 6) || "missing";

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
      apiKeyDetected: hasApiKey,
      apiKeyStart,
      resendResult: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        step: "catch_error",
        error: error?.message || "Unknown error",
        details: error,
      },
      { status: 500 }
    );
  }
}
