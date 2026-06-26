import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const resendKey = process.env.RESEND_API_KEY || "";
const fromEmail = process.env.RESEND_FROM_EMAIL || "Seattle Desi TV <updates@seattledesitv.com>";

type Recipient = { email?: string; user_id?: string | null; name?: string | null };

function cleanEmail(value?: string | null) { return String(value || "").trim().toLowerCase(); }
function adminAllowed(role?: string | null) {
  const value = String(role || "").toLowerCase();
  return value.includes("admin") || value === "super_admin";
}
function uniqueRecipients(recipients: Recipient[]) {
  const seen = new Set<string>();
  return recipients.map((item) => ({ ...item, email: cleanEmail(item.email) })).filter((item) => {
    if (!item.email || !item.email.includes("@") || seen.has(item.email)) return false;
    seen.add(item.email);
    return true;
  });
}

export async function POST(request: Request) {
  try {
    if (!supabaseUrl || !anonKey) return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
    const authHeader = request.headers.get("authorization") || "";
    const supabaseUser = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userError } = await supabaseUser.auth.getUser();
    const user = userData?.user || null;
    if (userError || !user) return NextResponse.json({ error: "Login required." }, { status: 401 });

    const service = createClient(supabaseUrl, serviceKey || anonKey);
    const userEmail = cleanEmail(user.email);
    const { data: adminRows, error: adminError } = await service
      .from("admins")
      .select("role,email,user_id")
      .or(`user_id.eq.${user.id},email.eq.${userEmail}`)
      .limit(5);
    if (adminError) return NextResponse.json({ error: `Admin check failed: ${adminError.message}` }, { status: 500 });
    const admin = (adminRows || []).find((row: any) => row.user_id === user.id || cleanEmail(row.email) === userEmail);
    if (!adminAllowed(admin?.role)) {
      return NextResponse.json({ error: `Studio admin access required. Logged in as ${userEmail || user.id}.` }, { status: 403 });
    }

    const body = await request.json();
    const recipients = uniqueRecipients(body.recipients || []);
    const subject = String(body.subject || "").trim();
    const message = String(body.message || "").trim();
    const notificationTitle = String(body.notificationTitle || subject || "Seattle Desi TV update").trim();
    const notificationLink = String(body.notificationLink || "/notifications?from=hub").trim();
    if (!recipients.length) return NextResponse.json({ error: "No valid recipients selected." }, { status: 400 });
    if (!subject || !message) return NextResponse.json({ error: "Subject and message are required." }, { status: 400 });

    let emailStatus: any = { skipped: true, reason: "RESEND_API_KEY is not configured." };
    if (resendKey) {
      const resend = new Resend(resendKey);
      const sendResult = await resend.emails.send({ from: fromEmail, to: recipients.map((item) => item.email as string), subject, text: message });
      if (sendResult.error) return NextResponse.json({ error: sendResult.error.message || "Email send failed." }, { status: 500 });
      emailStatus = { skipped: false, id: sendResult.data?.id || null };
    }

    const notificationRows = recipients.filter((item) => item.user_id).map((item) => ({ user_id: item.user_id, title: notificationTitle, message, link: notificationLink, read: false }));
    let notificationStatus: any = { inserted: 0 };
    if (notificationRows.length) {
      const { error } = await service.from("notifications").insert(notificationRows);
      notificationStatus = error ? { inserted: 0, error: error.message } : { inserted: notificationRows.length };
    }
    return NextResponse.json({ ok: true, recipients: recipients.length, emailStatus, notificationStatus });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Communication send failed." }, { status: 500 });
  }
}
