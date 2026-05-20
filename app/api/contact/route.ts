import { Resend } from "resend";
import { NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { name, email, message } = body;

    const result = await resend.emails.send({
      from: "Seattle Desi TV <onboarding@resend.dev>",
      to: "info@seattledesitv.com",
      subject: `New Contact Form: ${name}`,
      html: `
        <h2>New Contact Submission</h2>

        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Message:</b></p>

        <p>${message}</p>
      `,
    });

    return NextResponse.json(result);

  } catch (error) {
    return NextResponse.json(
      { error: "Email failed" },
      { status: 500 }
    );
  }
}
