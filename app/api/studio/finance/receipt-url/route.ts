import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { cleanRole, resolveUserRole } from "../../../../lib/roles";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const r2Endpoint = process.env.R2_ENDPOINT || "";
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID || "";
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";
const r2BucketName = process.env.R2_BUCKET_NAME || "sdtv-private";

function isSuperAdmin(role?: string | null) { return cleanRole(role) === "super_admin"; }
function jsonError(error: string, status = 400) { return NextResponse.json({ error }, { status }); }
function r2Client() {
  if (!r2Endpoint || !r2AccessKeyId || !r2SecretAccessKey) throw new Error("R2 is not configured.");
  return new S3Client({ region: "auto", endpoint: r2Endpoint, credentials: { accessKeyId: r2AccessKeyId, secretAccessKey: r2SecretAccessKey } });
}
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
  return { user, role, db: createClient(supabaseUrl, serviceKey) };
}

export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdmin(request);
    if (auth.error) return auth.error;
    const body = await request.json();
    const expenseId = String(body.expense_id || "").trim();
    if (!expenseId) return jsonError("expense_id is required.");
    const { data, error } = await auth.db.from("finance_expenses").select("id,bill_file_path,bill_file_name").eq("id", expenseId).maybeSingle();
    if (error) return jsonError(error.message, 500);
    if (!data?.bill_file_path) return jsonError("No bill file found for this expense.", 404);
    const url = await getSignedUrl(r2Client(), new GetObjectCommand({ Bucket: r2BucketName, Key: data.bill_file_path }), { expiresIn: 600 });
    return NextResponse.json({ ok: true, url, expires_in_seconds: 600, file_name: data.bill_file_name || "receipt" });
  } catch (error: any) {
    return jsonError(error?.message || "Could not create receipt link.", 500);
  }
}
