import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminRole, resolveUserRole } from "../../../lib/roles";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
const ALLOWED_ADMIN_ROLES = new Set(["super_admin", "pm_admin", "admin", "event_admin"]);

function normalizeRole(value?: string | null) {
  return String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const sessionClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const userResult = await sessionClient.auth.getUser();
    const user = userResult.data?.user || null;
    if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
    const role = await resolveUserRole(sessionClient as any, user);
    if (!isAdminRole(role)) return NextResponse.json({ error: "Studio admin access required." }, { status: 403 });
    if (!serviceKey) return NextResponse.json({ error: "Supabase server key is missing." }, { status: 500 });

    const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } }) as any;
    const body = await request.json();
    const eventId = String(body.event_id || "");
    if (!eventId) return NextResponse.json({ error: "Event id is required." }, { status: 400 });

    const raw = Array.isArray(body.pocs) && body.pocs.length ? body.pocs : [body];
    const seen = new Set<string>();
    const requestedPocs = raw.map((p: any) => ({
      admin_user_id: p.admin_user_id || null,
      admin_email: String(p.admin_email || "").trim().toLowerCase(),
      admin_name: String(p.admin_name || "").trim(),
      admin_phone: String(p.admin_phone || "").trim(),
      admin_photo_url: String(p.admin_photo_url || "").trim()
    })).filter((p: any) => {
      const key = p.admin_email || p.admin_user_id || p.admin_name;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const emails = requestedPocs.map((p: any) => p.admin_email).filter(Boolean);
    const userIds = requestedPocs.map((p: any) => p.admin_user_id).filter(Boolean);
    const [adminByEmailResult, adminByUserResult] = await Promise.all([
      emails.length ? db.from("admins").select("user_id,email,role,name").in("email", emails) : Promise.resolve({ data: [], error: null }),
      userIds.length ? db.from("admins").select("user_id,email,role,name").in("user_id", userIds) : Promise.resolve({ data: [], error: null })
    ]);
    if (adminByEmailResult.error) throw adminByEmailResult.error;
    if (adminByUserResult.error) throw adminByUserResult.error;

    const adminRows = [...(adminByEmailResult.data || []), ...(adminByUserResult.data || [])];
    const validByEmail: Record<string, any> = {};
    const validByUser: Record<string, any> = {};
    adminRows.forEach((row: any) => {
      const normalizedRole = normalizeRole(row.role);
      if (!ALLOWED_ADMIN_ROLES.has(normalizedRole)) return;
      if (row.email) validByEmail[String(row.email).toLowerCase()] = row;
      if (row.user_id) validByUser[String(row.user_id)] = row;
    });

    const pocs = requestedPocs.filter((p: any) => validByEmail[p.admin_email] || validByUser[String(p.admin_user_id || "")]);
    if (requestedPocs.length && !pocs.length) {
      return NextResponse.json({ error: "Only Super Admin, PM Admin, Admin, or Event Admin users can be assigned as Event Admin POCs." }, { status: 400 });
    }

    const primary = pocs[0] || {};
    const payload = {
      event_id: eventId,
      admin_user_id: primary.admin_user_id || null,
      admin_email: primary.admin_email || null,
      admin_name: primary.admin_name || null,
      admin_phone: primary.admin_phone || null,
      admin_photo_url: primary.admin_photo_url || null,
      pocs,
      notes: String(body.notes || "").trim() || null,
      updated_by: user.id,
      updated_at: new Date().toISOString()
    };
    const result = await db.from("event_admin_pocs").upsert(payload, { onConflict: "event_id" });
    if (result.error) throw result.error;
    return NextResponse.json({ ok: true, message: "Event admin POCs saved." });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Could not save event POC." }, { status: 500 });
  }
}
