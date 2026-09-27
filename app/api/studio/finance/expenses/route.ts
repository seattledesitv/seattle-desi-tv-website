import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { cleanRole, isTeamRole, resolveUserRole } from "../../../../lib/roles";
import { resolveCurrentSite } from "../../../../lib/sites/siteResolver";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const r2Endpoint = process.env.R2_ENDPOINT || "";
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID || "";
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";
const r2BucketName = process.env.R2_BUCKET_NAME || "sdtv-private";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 10;
const MAX_TOTAL_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function isSuperAdmin(role?: string | null) {
  return cleanRole(role) === "super_admin";
}
function jsonError(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}
function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
function safeFileName(name: string) {
  const base = String(name || "receipt")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
  return base || "receipt";
}
function nextMonthStart(month: string) {
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(monthIndex) ||
    monthIndex < 1 ||
    monthIndex > 12
  )
    return "";
  const next = new Date(Date.UTC(year, monthIndex, 1));
  return next.toISOString().slice(0, 10);
}
function r2Client() {
  if (!r2Endpoint || !r2AccessKeyId || !r2SecretAccessKey)
    throw new Error(
      "R2 is not configured. Add R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME in Vercel.",
    );
  return new S3Client({
    region: "auto",
    endpoint: r2Endpoint,
    credentials: {
      accessKeyId: r2AccessKeyId,
      secretAccessKey: r2SecretAccessKey,
    },
  });
}

function claimFiles(formData: FormData) {
  const files = [
    ...formData.getAll("bill_files"),
    formData.get("bill_file"),
  ].filter((value): value is File => value instanceof File && value.size > 0);
  if (files.length > MAX_FILES) throw new Error(`Upload no more than ${MAX_FILES} files per submission.`);
  if (files.reduce((total, file) => total + file.size, 0) > MAX_TOTAL_FILE_SIZE)
    throw new Error("The combined upload must be 25 MB or smaller.");
  files.forEach((file) => {
    if (file.size > MAX_FILE_SIZE) throw new Error(`${file.name} must be 5 MB or smaller.`);
    if (!ALLOWED_TYPES.has(file.type)) throw new Error(`${file.name} must be PDF, JPG, PNG, or WebP.`);
  });
  return files;
}

async function uploadClaimFiles(files: File[], details: { expenseId: string; expenseDate: string; siteCode: string; siteId: string; userId: string; email?: string | null }) {
  const yyyy = details.expenseDate.slice(0, 4);
  const mm = details.expenseDate.slice(5, 7) || "00";
  const uploaded = [];
  for (const file of files) {
    const fileName = safeFileName(file.name);
    const filePath = `finance/${details.siteCode}/${yyyy}/${mm}/${details.expenseId}/${crypto.randomUUID()}-${fileName}`;
    await r2Client().send(new PutObjectCommand({ Bucket: r2BucketName, Key: filePath, Body: Buffer.from(await file.arrayBuffer()), ContentType: file.type, Metadata: { uploadedBy: details.email || "team-member" } }));
    uploaded.push({ site_id: details.siteId, expense_id: details.expenseId, file_path: filePath, file_name: fileName, mime_type: file.type, file_size: file.size, uploaded_by: details.userId, uploaded_by_email: details.email || null });
  }
  return uploaded;
}

async function appendRevision(db: any, details: { siteId: string; expenseId: string; snapshot: any; note?: string; userId: string; email?: string | null }) {
  const countResult = await db.from("finance_expense_revisions").select("id", { count: "exact", head: true }).eq("expense_id", details.expenseId);
  if (countResult.error) throw countResult.error;
  const revisionNumber = Number(countResult.count || 0) + 1;
  const result = await db.from("finance_expense_revisions").insert({ site_id: details.siteId, expense_id: details.expenseId, revision_number: revisionNumber, change_note: details.note || (revisionNumber === 1 ? "Initial submission" : "Claim updated"), snapshot: details.snapshot, created_by: details.userId, created_by_email: details.email || null });
  if (result.error) throw result.error;
}

async function preserveLegacyOriginal(db: any, details: { siteId: string; expenseId: string; snapshot: any; userId: string; email?: string | null }) {
  const countResult = await db.from("finance_expense_revisions").select("id", { count: "exact", head: true }).eq("expense_id", details.expenseId);
  if (countResult.error) throw countResult.error;
  if (Number(countResult.count || 0) === 0)
    await appendRevision(db, { ...details, note: "Original record before first tracked update" });
}
async function requireFinanceAccess(request: Request) {
  if (!supabaseUrl || !anonKey)
    return { error: jsonError("Supabase is not configured.", 500) };
  const authHeader = request.headers.get("authorization") || "";
  const sessionClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } =
    await sessionClient.auth.getUser();
  const user = userData?.user || null;
  if (userError || !user) return { error: jsonError("Login required.", 401) };
  const role = await resolveUserRole(sessionClient, user);
  if (!isTeamRole(role))
    return {
      error: jsonError(
        `Approved team-member access required. Resolved role: ${role}.`,
        403,
      ),
    };
  if (!serviceKey)
    return {
      error: jsonError(
        "SUPABASE_SERVICE_ROLE_KEY is required for finance management.",
        500,
      ),
    };
  return {
    user,
    role,
    isSuperAdmin: isSuperAdmin(role),
    db: createClient(supabaseUrl, serviceKey),
  };
}

export async function GET(request: Request) {
  try {
    const auth = await requireFinanceAccess(request);
    if (auth.error) return auth.error;
    const site = await resolveCurrentSite();
    if (!site.id) return jsonError("Site context is not configured.", 500);
    const { searchParams } = new URL(request.url);
    const month = String(searchParams.get("month") || "").trim();
    const category = String(searchParams.get("category") || "").trim();
    const eventContext = String(searchParams.get("event_context") || "").trim();
    let query = auth.db
      .from("finance_expenses")
      .select("*")
      .eq("site_id", site.id)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500);
    if (!auth.isSuperAdmin) query = query.eq("created_by", auth.user.id);
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const startDate = `${month}-01`;
      const endDate = nextMonthStart(month);
      if (endDate)
        query = query
          .gte("expense_date", startDate)
          .lt("expense_date", endDate);
    }
    if (category && category !== "all") query = query.eq("category", category);
    if (eventContext && eventContext !== "all")
      query = query.eq("event_financial_type", eventContext);
    const { data, error } = await query;
    if (error) return jsonError(error.message, 500);
    const rows = data || [];
    const ids = rows.map((row: any) => row.id);
    if (!ids.length) return NextResponse.json({ ok: true, rows: [] });
    const [attachmentResult, revisionResult] = await Promise.all([
      auth.db.from("finance_expense_attachments").select("id,expense_id,file_name,mime_type,file_size,created_at").eq("site_id", site.id).in("expense_id", ids).order("created_at", { ascending: true }),
      auth.db.from("finance_expense_revisions").select("id,expense_id,revision_number,change_note,created_by_email,created_at").eq("site_id", site.id).in("expense_id", ids).order("revision_number", { ascending: true }),
    ]);
    if (attachmentResult.error) return jsonError(attachmentResult.error.message, 500);
    if (revisionResult.error) return jsonError(revisionResult.error.message, 500);
    return NextResponse.json({ ok: true, rows: rows.map((row: any) => ({ ...row, attachments: (attachmentResult.data || []).filter((item: any) => item.expense_id === row.id), revisions: (revisionResult.data || []).filter((item: any) => item.expense_id === row.id) })) });
  } catch (error: unknown) {
    return jsonError(
      errorMessage(error, "Could not load finance expenses."),
      500,
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireFinanceAccess(request);
    if (auth.error) return auth.error;
    const site = await resolveCurrentSite();
    if (!site.id) return jsonError("Site context is not configured.", 500);
    const formData = await request.formData();
    const expenseType =
      String(formData.get("expense_type") || "expense").trim() === "mileage"
        ? "mileage"
        : "expense";
    const expenseDate = String(formData.get("expense_date") || "").trim();
    const vendorName = String(formData.get("vendor_name") || "").trim();
    const category =
      expenseType === "mileage"
        ? "mileage"
        : String(formData.get("category") || "other").trim() || "other";
    const mileageMiles = Number(formData.get("mileage_miles") || 0);
    const mileageRate = Number(formData.get("mileage_rate") || 0);
    const enteredAmount = Number(formData.get("amount") || 0);
    const amount =
      expenseType === "mileage"
        ? Number((mileageMiles * mileageRate).toFixed(2))
        : enteredAmount;
    const paymentMethod = String(formData.get("payment_method") || "").trim();
    const requestedStatus =
      String(formData.get("reimbursement_status") || "submitted").trim() ||
      "submitted";
    const reimbursementStatus = auth.isSuperAdmin
      ? requestedStatus
      : "submitted";
    const reimbursedTo = String(formData.get("reimbursed_to") || "").trim();
    const payoutMethod = String(formData.get("payout_method") || "").trim();
    const payoutDetails = String(formData.get("payout_details") || "").trim();
    const eventFinancialType = String(
      formData.get("event_financial_type") || "",
    ).trim();
    const description = String(formData.get("description") || "").trim();
    const files = claimFiles(formData);

    if (!expenseDate) return jsonError("Expense date is required.");
    if (!vendorName)
      return jsonError(
        expenseType === "mileage"
          ? "Traveler/person name is required."
          : "Vendor name is required.",
      );
    if (
      expenseType === "mileage" &&
      (!Number.isFinite(mileageMiles) || mileageMiles <= 0)
    )
      return jsonError("Mileage miles must be greater than zero.");
    if (
      expenseType === "mileage" &&
      (!Number.isFinite(mileageRate) || mileageRate <= 0)
    )
      return jsonError("Mileage rate must be greater than zero.");
    if (!Number.isFinite(amount) || amount <= 0)
      return jsonError("Amount must be greater than zero.");
    if (!auth.isSuperAdmin && !payoutMethod)
      return jsonError("Please select how SDTV should reimburse you.");
    if (!auth.isSuperAdmin && !payoutDetails)
      return jsonError("Please enter the payout instructions for finance.");
    if (
      !auth.isSuperAdmin &&
      !["paid_event", "free_event", "not_event"].includes(eventFinancialType)
    )
      return jsonError(
        "Please select whether this claim is for a paid event, free event, or is not event-related.",
      );

    const id = crypto.randomUUID();
    let billFilePath: string | null = null;
    let billFileName: string | null = null;
    let billMimeType: string | null = null;
    let billFileSize: number | null = null;
    const attachments = await uploadClaimFiles(files, { expenseId: id, expenseDate, siteCode: site.code, siteId: site.id, userId: auth.user.id, email: auth.user.email });
    if (attachments.length) {
      billFilePath = attachments[0].file_path;
      billFileName = attachments[0].file_name;
      billMimeType = attachments[0].mime_type;
      billFileSize = attachments[0].file_size;
    }

    const payload = {
      id,
      site_id: site.id,
      expense_type: expenseType,
      expense_date: expenseDate,
      vendor_name: vendorName,
      category,
      amount,
      payment_method: auth.isSuperAdmin ? paymentMethod || null : null,
      reimbursement_status: reimbursementStatus,
      reimbursed_to: reimbursedTo || null,
      payout_method: payoutMethod || null,
      payout_details: payoutDetails || null,
      event_financial_type: eventFinancialType || null,
      mileage_miles: expenseType === "mileage" ? mileageMiles : null,
      mileage_rate: expenseType === "mileage" ? mileageRate : null,
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
    const { data, error } = await auth.db
      .from("finance_expenses")
      .insert(payload)
      .select("*")
      .single();
    if (error) return jsonError(error.message, 500);
    if (attachments.length) {
      const attachmentResult = await auth.db.from("finance_expense_attachments").insert(attachments);
      if (attachmentResult.error) return jsonError(attachmentResult.error.message, 500);
    }
    await appendRevision(auth.db, { siteId: site.id, expenseId: id, snapshot: data, note: "Initial submission", userId: auth.user.id, email: auth.user.email });
    return NextResponse.json({ ok: true, row: data });
  } catch (error: unknown) {
    return jsonError(
      errorMessage(error, "Could not create finance expense."),
      500,
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireFinanceAccess(request);
    if (auth.error) return auth.error;
    const site = await resolveCurrentSite();
    if (!site.id) return jsonError("Site context is not configured.", 500);

    if (
      (request.headers.get("content-type") || "").includes(
        "multipart/form-data",
      )
    ) {
      const formData = await request.formData();
      const id = String(formData.get("id") || "").trim();
      const expenseType =
        String(formData.get("expense_type") || "expense").trim() === "mileage"
          ? "mileage"
          : "expense";
      const expenseDate = String(formData.get("expense_date") || "").trim();
      const vendorName = String(formData.get("vendor_name") || "").trim();
      const category =
        expenseType === "mileage"
          ? "mileage"
          : String(formData.get("category") || "other").trim() || "other";
      const mileageMiles = Number(formData.get("mileage_miles") || 0);
      const mileageRate = Number(formData.get("mileage_rate") || 0);
      const enteredAmount = Number(formData.get("amount") || 0);
      const amount =
        expenseType === "mileage"
          ? Number((mileageMiles * mileageRate).toFixed(2))
          : enteredAmount;
      const paymentMethod = String(formData.get("payment_method") || "").trim();
      const reimbursementStatus = String(
        formData.get("reimbursement_status") || "submitted",
      ).trim();
      const reimbursedTo = String(formData.get("reimbursed_to") || "").trim();
      const payoutMethod = String(formData.get("payout_method") || "").trim();
      const payoutDetails = String(formData.get("payout_details") || "").trim();
      const eventFinancialType = String(
        formData.get("event_financial_type") || "",
      ).trim();
      const description = String(formData.get("description") || "").trim();
      const updateNote = String(formData.get("update_note") || "").trim();
      const files = claimFiles(formData);

      if (!id) return jsonError("Expense id is required.");
      if (!expenseDate) return jsonError("Expense date is required.");
      if (!vendorName)
        return jsonError(
          expenseType === "mileage"
            ? "Traveler/person name is required."
            : "Vendor name is required.",
        );
      if (
        expenseType === "mileage" &&
        (!Number.isFinite(mileageMiles) || mileageMiles <= 0)
      )
        return jsonError("Mileage miles must be greater than zero.");
      if (
        expenseType === "mileage" &&
        (!Number.isFinite(mileageRate) || mileageRate <= 0)
      )
        return jsonError("Mileage rate must be greater than zero.");
      if (!Number.isFinite(amount) || amount <= 0)
        return jsonError("Amount must be greater than zero.");
      if (!auth.isSuperAdmin && !payoutMethod)
        return jsonError("Please select how SDTV should reimburse you.");
      if (!auth.isSuperAdmin && !payoutDetails)
        return jsonError("Please enter the payout instructions for finance.");
      if (!auth.isSuperAdmin && !["paid_event", "free_event", "not_event"].includes(eventFinancialType))
        return jsonError("Please select whether this claim is for a paid event, free event, or is not event-related.");
      if (!auth.isSuperAdmin && !updateNote)
        return jsonError("Please explain what changed in this claim update.");
      if (
        !["submitted", "approved", "paid", "rejected"].includes(
          reimbursementStatus,
        )
      )
        return jsonError("Invalid reimbursement status.");

      const { data: existing, error: existingError } = await auth.db
        .from("finance_expenses")
        .select("*")
        .eq("id", id)
        .eq("site_id", site.id)
        .maybeSingle();
      if (existingError) return jsonError(existingError.message, 500);
      if (!existing) return jsonError("Finance item not found.", 404);
      if (!auth.isSuperAdmin && existing.created_by !== auth.user.id)
        return jsonError("You can only update claims submitted from your account.", 403);
      if (!auth.isSuperAdmin && existing.reimbursement_status === "paid")
        return jsonError("Paid claims are locked. Contact SDTV finance if a correction is required.", 409);

      await preserveLegacyOriginal(auth.db, { siteId: site.id, expenseId: id, snapshot: existing, userId: auth.user.id, email: auth.user.email });

      const effectiveStatus = auth.isSuperAdmin ? reimbursementStatus : "submitted";

      const patch: Record<string, unknown> = {
        expense_type: expenseType,
        expense_date: expenseDate,
        vendor_name: vendorName,
        category,
        amount,
        payment_method: auth.isSuperAdmin ? paymentMethod || null : existing.payment_method,
        reimbursement_status: effectiveStatus,
        reimbursed_to: reimbursedTo || null,
        payout_method: payoutMethod || null,
        payout_details: payoutDetails || null,
        event_financial_type: eventFinancialType || null,
        mileage_miles: expenseType === "mileage" ? mileageMiles : null,
        mileage_rate: expenseType === "mileage" ? mileageRate : null,
        description: description || null,
        paid_at:
          effectiveStatus === "paid"
            ? existing.paid_at || new Date().toISOString()
            : null,
        updated_by: auth.user.id,
        updated_by_email: auth.user.email || null,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await auth.db
        .from("finance_expenses")
        .update(patch)
        .eq("id", id)
        .eq("site_id", site.id)
        .select("*")
        .single();
      if (error) return jsonError(error.message, 500);
      const attachments = await uploadClaimFiles(files, { expenseId: id, expenseDate, siteCode: site.code, siteId: site.id, userId: auth.user.id, email: auth.user.email });
      if (attachments.length) {
        const attachmentResult = await auth.db.from("finance_expense_attachments").insert(attachments);
        if (attachmentResult.error) return jsonError(attachmentResult.error.message, 500);
      }
      await appendRevision(auth.db, { siteId: site.id, expenseId: id, snapshot: data, note: updateNote || (auth.isSuperAdmin ? "Finance administrator update" : "Submitter update"), userId: auth.user.id, email: auth.user.email });
      return NextResponse.json({ ok: true, row: data });
    }

    const body = await request.json();
    const id = String(body.id || "").trim();
    const reimbursementStatus = String(body.reimbursement_status || "").trim();
    if (!id) return jsonError("Expense id is required.");
    if (
      !["submitted", "approved", "paid", "rejected"].includes(
        reimbursementStatus,
      )
    )
      return jsonError("Invalid reimbursement status.");
    const patch: Record<string, unknown> = {
      reimbursement_status: reimbursementStatus,
      updated_by: auth.user.id,
      updated_by_email: auth.user.email || null,
      updated_at: new Date().toISOString(),
    };
    patch.paid_at =
      reimbursementStatus === "paid" ? new Date().toISOString() : null;
    const { data, error } = await auth.db
      .from("finance_expenses")
      .update(patch)
      .eq("id", id)
      .eq("site_id", site.id)
      .select("*")
      .single();
    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ ok: true, row: data });
  } catch (error: unknown) {
    return jsonError(
      errorMessage(error, "Could not update finance expense."),
      500,
    );
  }
}
