import { NextResponse } from "next/server";
import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY || "";
const adminEmail = process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "seattledesitv@gmail.com";
const fromEmail = process.env.RESEND_FROM_EMAIL || "Seattle Desi TV <onboarding@resend.dev>";

function clean(value: unknown) {
  return String(value || "").trim();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const type = clean(body.type || "event");
    const title = clean(body.title);
    const date = clean(body.date);
    const location = clean(body.location);
    const submittedBy = clean(body.submittedBy);
    const reviewUrl = clean(body.reviewUrl);

    if (!title || !reviewUrl) {
      return NextResponse.json({ ok: false, error: "Missing title or reviewUrl." }, { status: 400 });
    }

    if (!resendApiKey) {
      return NextResponse.json({ ok: false, error: "RESEND_API_KEY is not configured." }, { status: 200 });
    }

    const resend = new Resend(resendApiKey);
    const subject = `New SDTV ${type} submitted: ${title}`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
        <h2>New Seattle Desi TV ${type} submitted</h2>
        <p>A new ${type} is waiting for admin review.</p>
        <table style="border-collapse: collapse; margin-top: 16px;">
          <tr><td style="font-weight: bold; padding: 6px 12px 6px 0;">Title</td><td>${title}</td></tr>
          ${date ? `<tr><td style="font-weight: bold; padding: 6px 12px 6px 0;">Date</td><td>${date}</td></tr>` : ""}
          ${location ? `<tr><td style="font-weight: bold; padding: 6px 12px 6px 0;">Location</td><td>${location}</td></tr>` : ""}
          ${submittedBy ? `<tr><td style="font-weight: bold; padding: 6px 12px 6px 0;">Submitted By</td><td>${submittedBy}</td></tr>` : ""}
        </table>
        <p style="margin-top: 24px;">
          <a href="${reviewUrl}" style="background:#db2777;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:bold;display:inline-block;">Review in Studio</a>
        </p>
        <p style="margin-top: 16px; color:#6b7280; font-size: 13px;">Review URL: ${reviewUrl}</p>
      </div>
    `;

    const result = await resend.emails.send({
      from: fromEmail,
      to: adminEmail,
      subject,
      html,
    });

    if (result.error) {
      return NextResponse.json({ ok: false, error: result.error.message || "Email failed." }, { status: 200 });
    }

    return NextResponse.json({ ok: true, id: result.data?.id || null });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || String(error) }, { status: 500 });
  }
}
