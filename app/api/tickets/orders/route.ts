import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { resolveSiteForHostname } from "../../../lib/sites/siteResolver";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  "";
const db = () => createClient(url, key, { auth: { persistSession: false } });
const text = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

export async function GET(request: Request) {
  try {
    if (!url || !key) throw new Error("Ticket ordering is not configured.");
    const site = await resolveSiteForHostname(
      request.headers.get("x-forwarded-host") || request.headers.get("host"),
    );
    const token = new URL(request.url).searchParams.get("token") || "";
    if (!site.id || !/^[0-9a-f-]{36}$/i.test(token))
      throw new Error("Order not found.");
    const { data, error } = await db()
      .from("ticket_orders")
      .select(
        "order_number,status,currency,subtotal_cents,fee_cents,total_cents,payment_expires_at,paid_at,refund_policy_snapshot,terms_snapshot,buyer_name,buyer_email,events(title,date,local_start_time,local_end_time,location,image,image_urls),community_organizations(name,image),ticket_order_items(ticket_name,unit_price_cents,quantity,line_total_cents),event_tickets(ticket_code,status,attendee_name,checked_in_at)",
      )
      .eq("site_id", site.id)
      .eq("public_token", token)
      .maybeSingle();
    if (error || !data) throw new Error("Order not found.");
    return NextResponse.json({
      ...data,
      testPaymentEnabled:
        process.env.VERCEL_ENV !== "production" &&
        process.env.TICKET_TEST_PAYMENTS_ENABLED === "true",
    });
  } catch (cause) {
    return NextResponse.json(
      { error: cause instanceof Error ? cause.message : "Order not found." },
      { status: 404 },
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!url || !key) throw new Error("Ticket ordering is not configured.");
    const site = await resolveSiteForHostname(
      request.headers.get("x-forwarded-host") || request.headers.get("host"),
    );
    if (!site.id) throw new Error("The active site could not be resolved.");
    const body = (await request.json()) as Record<string, unknown>;
    const items = Array.isArray(body.items)
      ? body.items.slice(0, 20).map((item) => {
          const row = item as Record<string, unknown>;
          return {
            ticketTypeId: text(row.ticketTypeId, 50),
            quantity: Number(row.quantity),
          };
        })
      : [];
    const authorization = request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "")
      .trim();
    let userId: string | null = null;
    let userEmail = "";
    if (authorization) {
      const auth = createClient(
        url,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
        {
          auth: { persistSession: false },
          global: { headers: { Authorization: `Bearer ${authorization}` } },
        },
      );
      const result = await auth.auth.getUser();
      userId = result.data.user?.id || null;
      userEmail = result.data.user?.email?.toLowerCase() || "";
    }
    const eventId = text(body.eventId, 50);
    const privateTest = await db()
      .from("event_ticket_settings")
      .select("organization_id,test_mode,test_access_emails")
      .eq("site_id", site.id)
      .eq("event_id", eventId)
      .maybeSingle();
    if (privateTest.data?.test_mode) {
      if (!userId)
        throw new Error("Please sign in with an approved testing account.");
      const [admin, manager] = await Promise.all([
        db()
          .from("admins")
          .select("user_id")
          .or(`user_id.eq.${userId},email.ilike.${userEmail}`)
          .maybeSingle(),
        db()
          .from("organization_managers")
          .select("id")
          .eq("site_id", site.id)
          .eq("organization_id", privateTest.data.organization_id)
          .eq("user_id", userId)
          .eq("active", true)
          .maybeSingle(),
      ]);
      const allowed = (privateTest.data.test_access_emails || [])
        .map((value: string) => value.toLowerCase())
        .includes(userEmail);
      if (!admin.data && !manager.data && !allowed)
        throw new Error(
          "This private ticket test is not available to your account.",
        );
    }
    const forwarded =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
    const ipHash = forwarded
      ? createHash("sha256")
          .update(`${process.env.TICKET_AUDIT_SALT || key}:${forwarded}`)
          .digest("hex")
      : null;
    const { data, error } = await db().rpc("create_ticket_order_reservation", {
      p_site_id: site.id,
      p_event_id: eventId,
      p_buyer_user_id: userId,
      p_buyer_name: text(body.buyerName, 120),
      p_buyer_email: text(body.buyerEmail, 254),
      p_buyer_phone: text(body.buyerPhone, 40),
      p_items: items,
      p_policy_accepted: body.policyAccepted === true,
      p_ip_hash: ipHash,
      p_user_agent: text(request.headers.get("user-agent"), 300),
    });
    if (error) throw new Error(error.message);
    return NextResponse.json(data, { status: 201 });
  } catch (cause) {
    return NextResponse.json(
      {
        error:
          cause instanceof Error
            ? cause.message
            : "Order could not be created.",
      },
      { status: 400 },
    );
  }
}
