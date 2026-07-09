import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { cleanRole, resolveUserRole } from "../../../../lib/roles";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const r2Endpoint = process.env.R2_ENDPOINT || "";
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID || "";
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";
const r2BucketName = process.env.R2_BUCKET_NAME || "sdtv-private";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

function isSuperAdmin(role?: string | null) {
  return cleanRole(role) === "super_admin";
}
function jsonError(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}
function safeFileName(name: string) {
  const base = String(name || "receipt").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);
  return base || "receipt";
}
function nextMonthStart(month: string) {
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText);
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || monthIndex < 1 || monthIndex > 12) return "";
  const next = new Date(Date.UTC(year, monthIndex, 1));
  return next.toISOString().slice(0, 10);
}
function r2Client() {
  if (!r2Endpoint || !r2AccessKeyId || !r2SecretAccessKey) throw new Error("R2 is not configured. Add R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME in Vercel.");
  return new S3Client({
    region: "auto",
    endpoint: r2Endpoint,
    credentials: { accessKeyId: r2AccessKeyId, secretAccessKey: r2SecretAccessKey },
  });
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

export async function GET(request: Request) {
  try {
    const auth = await requireSuperAdmin(request);
    if (auth.error) return auth.error;
    const { searchParams } = new URL(request.url);
    const month = String(searchParams.get("month") || "").trim();
    const category = String(searchParams.get("category") || "").trim();
    let query = auth.db.from("finance_expenses").select("*").order("expense_date", { ascending: false }).order("created_at", { ascending: false }).limit(500);
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const startDate = `${month}-01`;
      const endDate = nextMonthStart(month);
      if (endDate) query = query.gte("expense_date", startDate).lt("expense_date", endDate);
    }
    if (category && category !== "all") query = query.eq("category", category);
    const { data, error } = await query;
    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ ok: true, rows: data || [] });
  } catch (error: any) {
    return jsonError(error?.message || "Could not load finance expenses.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdmin(request);
    if (auth.error) return auth.error;
    const formData = await request.formData();
    const expenseDate = String(formData.get("expense_date") || "").trim();
    const vendorName = String(formData.get("vendor_name") || "").trim();
    const category = String(formData.get("category") || "other").trim() || "other";
    const amount = Number(formData.get("amount") || 0);
    const paymentMethod = String(formData.get("payment_method") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const file = formData.get("bill_file");

    if (!expenseDate) return jsonError("Expense date is required.");
    if (!vendorName) return jsonError("Vendor name is required.");
    if (!Number.isFinite(amount) || amount <= 0) return jsonError("Amount must be greater than zero.");

    const id = crypto.randomUUID();
    let billFilePath: string | null = null;
    let billFileName: string | null = null;
    let billMimeType: string | null = null;
    let billFileSize: number | null = null;

    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_FILE_SIZE) return jsonError("Bill file must be 5 MB or smaller.");
      if (!ALLOWED_TYPES.has(file.type)) return jsonError("Bill file must be PDF, JPG, PNG, or WebP.");
      const yyyy = expenseDate.slice(0, 4);
      const mm = expenseDate.slice(5, 7) || "00";
      billFileName = safeFileName(file.name);
      billMimeType = file.type;
      billFileSize = file.size;
      billFilePath = `finance/${yyyy}/${mm}/${id}-${billFileName}`;
      const body = Buffer.from(await file.arrayBuffer());
      await r2Client().send(new PutObjectCommand({ Bucket: r2BucketName, Key: billFilePath, Body: body, ContentType: file.type, Metadata: { uploadedBy: auth.user.email || "super-admin" } }));
    }

    const payload = {
      id,
      expense_date: expenseDate,
      vendor_name: vendorName,
      category,
      amount,
      payment_method: paymentMethod || null,
      description: description || null,
      bill_file_path: billFilePath,
      bill_file_name: billFileName,
      bill_mime_type: billMimeType,
      bill_file_size: billFileSize,
      created_by: auth.user.id,
      created_by_email: auth.user.email || null,
      updated_by: auth.user.id,
      updated_by_email: auth.user.email || null,
    };
    const { data, error } = await auth.db.from("finance_expenses").insert(payload).select("*").single();
    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ ok: true, row: data });
  } catch (error: any) {
    return jsonError(error?.message || "Could not create finance expense.", 500);
  }
}
