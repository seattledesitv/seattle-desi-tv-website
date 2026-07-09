import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cleanRole, resolveUserRole } from "../../../../lib/roles";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

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
    const expenseDate = String(body.expense_date || "").trim();
    const reimburseeName = String(body.reimbursee_name || "").trim();
    const reimburseeEmail = String(body.reimbursee_email || "").trim();
    const miles = Number(body.miles || 0);
    const ratePerMile = Number(body.rate_per_mile || 0);
    const amount = Number((miles * ratePerMile).toFixed(2));
    if (!expenseDate) return jsonError("Expense date is required.");
    if (!reimburseeName) return jsonError("Traveler name is required.");
    if (!Number.isFinite(miles) || miles <= 0) return jsonError("Miles must be greater than zero.");
    if (!Number.isFinite(ratePerMile) || ratePerMile <= 0) return jsonError("Rate per mile must be greater than zero.");
    const payload = {
      expense_type: "mileage",
      expense_date: expenseDate,
      vendor_name: reimburseeName,
      category: "travel",
      amount,
      payment_method: "reimbursement",
      description: String(body.description || "").trim() || null,
      reimbursement_status: "submitted",
      reimbursee_name: reimburseeName,
      reimbursee_email: reimburseeEmail || null,
      miles,
      rate_per_mile: ratePerMile,
      trip_from: String(body.trip_from || "").trim() || null,
      trip_to: String(body.trip_to || "").trim() || null,
      trip_purpose: String(body.trip_purpose || "").trim() || null,
      created_by: auth.user.id,
      created_by_email: auth.user.email || null,
      updated_by: auth.user.id,
      updated_by_email: auth.user.email || null,
    };
    const { data, error } = await auth.db.from("finance_expenses").insert(payload).select("*").single();
    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ ok: true, row: data });
  } catch (error: any) {
    return jsonError(error?.message || "Could not submit mileage reimbursement.", 500);
  }
}
