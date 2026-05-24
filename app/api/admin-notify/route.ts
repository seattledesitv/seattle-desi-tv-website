import { Resend } from "resend";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, name, description, submitterEmail, phone, location } = body;

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { success: false, error: "RESEND_API_KEY is missing" },
        { status: 500 }
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const result = await resend.emails.send({
      from: "Seattle Desi TV <onboarding@resend.dev>",
      to: "seattledesitv@gmail.com",
      subject: `New ${type} awaiting approval: ${name}`,
      html: `
        <h2>New ${type} Awaiting Approval</h2>
        <p><b>Name:</b> ${name}</p>
        <p><b>Submitted By:</b> ${submitterEmail || ""}</p>
        <p><b>Phone:</b> ${phone || ""}</p>
        <p><b>Location/Address:</b> ${location || ""}</p>
        <p><b>Description/Offer:</b></p>
        <p>${description || ""}</p>
        <hr />
        <p>Please login to Seattle Desi TV Studio/Admin area to review and approve.</p>
      `,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
