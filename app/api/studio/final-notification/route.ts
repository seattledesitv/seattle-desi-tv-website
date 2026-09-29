import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminRole, resolveUserRole } from "../../../lib/roles";
import { resolveSiteForHostname } from "../../../lib/sites/siteResolver";
import {
  sendFinalApprovalNotification,
  type FinalEntityType,
} from "../../../lib/notifications/finalApproval";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const service =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  "";
const allowed = new Set<FinalEntityType>([
  "story",
  "event",
  "organization",
  "business",
]);

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const auth = createClient(url, anon, {
      global: { headers: { Authorization: authorization } },
    });
    const { data } = await auth.auth.getUser();
    if (!data.user)
      return NextResponse.json({ error: "Login required." }, { status: 401 });
    if (!isAdminRole(await resolveUserRole(auth, data.user)))
      return NextResponse.json(
        { error: "Admin access required." },
        { status: 403 },
      );
    if (!service)
      return NextResponse.json(
        { error: "Server email service is not configured." },
        { status: 500 },
      );
    const body = await request.json().catch(() => ({}));
    const entityType = String(body.entityType || "") as FinalEntityType;
    const entityId = String(body.entityId || "");
    if (!allowed.has(entityType) || !entityId)
      return NextResponse.json(
        { error: "Valid entity type and ID are required." },
        { status: 400 },
      );
    const site = await resolveSiteForHostname(
      request.headers.get("x-forwarded-host") || request.headers.get("host"),
    );
    if (!site.id)
      return NextResponse.json(
        { error: "Active site could not be resolved." },
        { status: 400 },
      );
    const db = createClient(url, service, { auth: { persistSession: false } });
    return NextResponse.json(
      await sendFinalApprovalNotification(db, {
        siteId: site.id,
        siteName: site.name,
        entityType,
        entityId,
      }),
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Final notification failed." },
      { status: 500 },
    );
  }
}
