import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cleanRole, resolveUserRole } from "../../../../lib/roles";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const VALID_STATUSES = new Set(["submitted", "approved", "paid", "rejected"]);

function jsonError(error: string, status = 400) { return NextResponse.json({ error }, { status }); }
function isSuperAdmin(role?: string | null) { return cleanRole(role) === "super_admin"; }

async function requireSuperAdmin(request: Request) {
  if (!supabaseUrl || !anonKey) return { error: jsonError("Supabase is not configured.", 500) };
  const authHeader = request.headers.get("authorization") || "";
  const sessionClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userError } = await sessionClient.auth.getUser();
  const user = userData?.user || null;
  if (userError || !user) return { error: jsonError("Login required.", 401) };
  const role = await resolveUserRole(sessionClient, user);
  if (!isSuperAdmin(role)) return { error: jsonError(`Super admin access required. Resolved role: ${role}.`, 403) };
  if (!serviceKey) return { error: jsonError("SUPABASE_SERVICE_ROLE_KEY is required for finance management.", 500) };
  return { user, db: createClient(supabaseUrl, serviceKey) };
}

export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdmin(request);
    if (auth.error) return auth.error;
    const body = await request.json();
    const id = String(body.id || "").trim();
    const status = String(body.reimbursement_status || "").trim();
    if (!id) return jsonError("Expense id is required.");
    if (!VALID_STATUSES.has(status)) return jsonError("Valid reimbursement status is required.");
    const payload: any = { reimbursement_status: status, updated_by: auth.user.id, updated_by_email: auth.user.email || null, updated_at: new Date().toISOString() };
    if (status === "paid") {
      payload.paid_at = new Date().toISOString();
      payload.paid_by = auth.user.id;
      payload.paid_by_email = auth.user.email || null;
    }
    const { data, error } = await auth.db.from("finance_expenses").update(payload).eq("id", id).select("*").single();
    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ ok: true, row: data });
  } catch (error: any) {
    return jsonError(error?.message || "Could not update reimbursement status.", 500);
  }
}
