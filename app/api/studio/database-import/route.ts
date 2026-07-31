import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminRole, resolveUserRole } from "../../../lib/roles";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const appEnv = (process.env.NEXT_PUBLIC_APP_ENV || process.env.VERCEL_ENV || "").toLowerCase();

type LooseSupabaseClient = any;
type ImportMode = "dry_run" | "insert_missing";

const ALLOWED_TABLES = ["admins","community_groups","community_organizations","contact_requests","crew_availability","event_coverage_sources","event_crew_assignments","event_crew_media_submissions","event_deliverables","event_influencer_intents","event_video_notifications","event_video_revisions","event_video_workflows","events","featured_social_content","festival_hero_assets","hero_analytics","homepage_hero_banners","homepage_settings","homepage_sponsors","homepage_testimonials","influencer_profiles","local_businesses","newsletter_campaigns","newsletter_settings","newsletter_subscribers","notifications","public_content_requests","public_visibility_controls","radio_team_members","social_media_stats","sponsors","team_members","user_profiles","user_role_requests","volunteer_onboarding_submissions"];

const TABLE_PRIMARY_KEYS: Record<string, string[]> = {
  admins: ["user_id"], community_groups: ["id"], community_organizations: ["id"], contact_requests: ["id"], crew_availability: ["id"], event_coverage_sources: ["id"], event_crew_assignments: ["id"], event_crew_media_submissions: ["id"], event_deliverables: ["id"], event_influencer_intents: ["id"], event_video_notifications: ["id"], event_video_revisions: ["id"], event_video_workflows: ["id"], events: ["id"], featured_social_content: ["id"], festival_hero_assets: ["id"], hero_analytics: ["id"], homepage_hero_banners: ["id"], homepage_settings: ["section_key"], homepage_sponsors: ["id"], homepage_testimonials: ["id"], influencer_profiles: ["id"], local_businesses: ["id"], newsletter_campaigns: ["id"], newsletter_settings: ["section_key"], newsletter_subscribers: ["id"], notifications: ["id"], public_content_requests: ["id"], public_visibility_controls: ["email"], radio_team_members: ["id"], social_media_stats: ["platform"], sponsors: ["id"], team_members: ["id"], user_profiles: ["user_id"], user_role_requests: ["id"], volunteer_onboarding_submissions: ["id"],
};

function isStagingEnvironment() {
  return appEnv === "staging" || appEnv === "preview" || appEnv === "development";
}

async function assertAdmin(request: Request) {
  if (!supabaseUrl || !anonKey) throw new Error("Supabase public env vars are not configured.");
  const authHeader = request.headers.get("authorization") || "";
  const sessionClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data, error } = await sessionClient.auth.getUser();
  const user = data?.user || null;
  if (error || !user) return { ok: false as const, status: 401, error: "Login required." };
  const role = await resolveUserRole(sessionClient as LooseSupabaseClient, user);
  if (!isAdminRole(role)) return { ok: false as const, status: 403, error: `Studio admin access required. Current role: ${role}.` };
  return { ok: true as const, user, role };
}

function getBackupData(payload: any) {
  if (payload?.backup?.data && typeof payload.backup.data === "object") return payload.backup.data;
  if (payload?.data && typeof payload.data === "object") return payload.data;
  return null;
}

function getTableRows(data: Record<string, unknown>, table: string) {
  const rows = data?.[table];
  return Array.isArray(rows) ? rows : [];
}

function rowKey(row: any, keys: string[]) {
  return keys.map((key) => String(row?.[key] ?? "")).join("||");
}

function buildFailureSummary(failed: any[]) {
  if (!failed.length) return null;
  const details = failed.map((item) => `${item.table}: ${item.error || "Unknown error"}`);
  return `Import completed with ${failed.length} failed table(s). ${details.join(" | ")}`;
}

async function fetchExistingKeys(client: LooseSupabaseClient, table: string, keys: string[]) {
  const existing = new Set<string>();
  const selectCols = keys.join(",");
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await client.from(table).select(selectCols).range(from, to);
    if (error) throw new Error(`${table}: ${error.message}`);
    for (const row of data || []) existing.add(rowKey(row, keys));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return existing;
}

async function importTable(client: LooseSupabaseClient, table: string, rows: any[], mode: ImportMode) {
  const keys = TABLE_PRIMARY_KEYS[table];
  if (!keys?.length) return { table, ok: false, requested: rows.length, inserted: 0, skipped: 0, error: "No primary key mapping configured." };
  const validRows = rows.filter((row) => row && typeof row === "object" && keys.every((key) => row[key] != null));
  const existingKeys = await fetchExistingKeys(client, table, keys);
  const missingRows = validRows.filter((row) => !existingKeys.has(rowKey(row, keys)));
  if (mode === "dry_run") return { table, ok: true, requested: rows.length, valid: validRows.length, inserted: 0, would_insert: missingRows.length, skipped: rows.length - missingRows.length, error: null };
  let inserted = 0;
  const batchSize = 200;
  for (let i = 0; i < missingRows.length; i += batchSize) {
    const batch = missingRows.slice(i, i + batchSize);
    const { error } = await client.from(table).insert(batch);
    if (error) throw new Error(`${table}: ${error.message}`);
    inserted += batch.length;
  }
  return { table, ok: true, requested: rows.length, valid: validRows.length, inserted, would_insert: 0, skipped: rows.length - inserted, error: null };
}

export async function POST(request: Request) {
  try {
    const adminCheck = await assertAdmin(request);
    if (!adminCheck.ok) return NextResponse.json({ success: false, error: adminCheck.error }, { status: adminCheck.status });
    if (!isStagingEnvironment()) {
      return NextResponse.json({ success: false, blocked: true, error: "Database import is blocked because this deployment is not marked as staging. Import is only allowed for staging.", environment: appEnv || "unknown" }, { status: 403 });
    }
    if (!secretKey) return NextResponse.json({ success: false, error: "SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is required for database import." }, { status: 500 });

    const body = await request.json().catch(() => ({}));
    const mode: ImportMode = body?.mode === "insert_missing" ? "insert_missing" : "dry_run";
    const backupData = getBackupData(body?.backup);
    if (!backupData) return NextResponse.json({ success: false, error: "Invalid backup file. Expected backup.data table records." }, { status: 400 });
    const requestedTables = Array.isArray(body?.tables) && body.tables.length ? body.tables : ALLOWED_TABLES;
    const tables = requestedTables.filter((table: string) => ALLOWED_TABLES.includes(table));
    if (!tables.length) return NextResponse.json({ success: false, error: "No valid tables selected for import." }, { status: 400 });

    const serviceClient = createClient(supabaseUrl, secretKey, { auth: { persistSession: false } }) as LooseSupabaseClient;
    const results = [];
    for (const table of tables) {
      try {
        const rows = getTableRows(backupData, table);
        results.push(await importTable(serviceClient, table, rows, mode));
      } catch (error: any) {
        results.push({ table, ok: false, requested: getTableRows(backupData, table).length, inserted: 0, skipped: 0, error: error?.message || "Import failed." });
      }
    }

    const inserted = results.reduce((total, item: any) => total + Number(item.inserted || 0), 0);
    const wouldInsert = results.reduce((total, item: any) => total + Number(item.would_insert || 0), 0);
    const failed = results.filter((item: any) => !item.ok);
    const errorSummary = buildFailureSummary(failed);
    return NextResponse.json({ success: failed.length === 0, error: errorSummary, mode, environment: appEnv || "unknown", inserted, would_insert: wouldInsert, failed_table_count: failed.length, failed_tables: failed, results });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "Database import failed." }, { status: 500 });
  }
}
