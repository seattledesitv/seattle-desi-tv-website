import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { AdminDigestService } from "../../../lib/adminDigest/services/adminDigestService";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET || "";
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) return unauthorized();
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
    const resendKey = process.env.RESEND_API_KEY || "";
    if (!supabaseUrl || !serviceKey || !resendKey) throw new Error("Daily digest server configuration is incomplete.");

    const to = new Date();
    const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
    const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const digest = await AdminDigestService.build(db, from, to);
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://seattledesitv.com").replace(/\/$/, "");
    const sent = await new Resend(resendKey).emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Seattle Desi TV <updates@seattledesitv.com>",
      to: process.env.ADMIN_DIGEST_EMAIL || "seattledesitv@gmail.com",
      subject: AdminDigestService.subject(digest),
      html: AdminDigestService.html(digest, `${siteUrl}/studio`),
    }, { idempotencyKey: `sdtv-daily-admin-digest-${to.toISOString().slice(0, 10)}` });
    if (sent.error) throw new Error(sent.error.message);
    return NextResponse.json({ ok: true, emailId: sent.data?.id || null, counts: { registrations: digest.users.length, volunteerRequests: digest.volunteerRequests.length, teamMemberRequests: digest.teamMemberRequests.length, submissions: Object.fromEntries(digest.submissions.map((section) => [section.key, section.items.length])) } });
  } catch (error: unknown) {
    console.error("Daily administrator digest failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Daily administrator digest failed." }, { status: 500 });
  }
}
