import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminRole, resolveUserRole } from "../../../lib/roles";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const BACKUP_TABLES = [
  "admins",
  "community_groups",
  "community_organizations",
  "contact_requests",
  "crew_availability",
  "event_coverage_sources",
  "event_crew_assignments",
  "event_crew_media_submissions",
  "event_deliverables",
  "event_influencer_intents",
  "event_video_notifications",
  "event_video_revisions",
  "event_video_workflows",
  "events",
  "featured_social_content",
  "festival_hero_assets",
  "hero_analytics",
  "homepage_hero_banners",
  "homepage_settings",
  "homepage_sponsors",
  "homepage_testimonials",
  "influencer_profiles",
  "local_businesses",
  "newsletter_campaigns",
  "newsletter_settings",
  "newsletter_subscribers",
  "notifications",
  "public_content_requests",
  "public_visibility_controls",
  "radio_team_members",
  "social_media_stats",
  "sponsors",
  "team_members",
  "user_profiles",
  "user_role_requests",
  "volunteer_onboarding_submissions",
];

const CLOUDINARY_REGEX = /https?:\/\/(?:res\.cloudinary\.com|[^\s"']*cloudinary[^\s"']*)[^\s"'<>)]*/gi;

type LooseSupabaseClient = any;

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function extractCloudinaryUrls(value: unknown, urls: Set<string>) {
  if (value == null) return;
  if (typeof value === "string") {
    const matches = value.match(CLOUDINARY_REGEX) || [];
    matches.forEach((match) => urls.add(match));
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => extractCloudinaryUrls(item, urls));
    return;
  }
  if (typeof value === "object") {
    Object.values(value as Record<string, unknown>).forEach((item) => extractCloudinaryUrls(item, urls));
  }
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

async function exportTable(supabase: LooseSupabaseClient, table: string) {
  const rows: any[] = [];
  let count: number | null = null;
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const to = from + pageSize - 1;
    const query = supabase.from(table).select("*", from === 0 ? { count: "exact" } : undefined).range(from, to);
    const { data, error, count: exactCount } = await query;
    if (error) return { table, ok: false, error: error.message, rows: [], count: 0 };
    if (from === 0 && typeof exactCount === "number") count = exactCount;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }

  return { table, ok: true, error: null, rows, count: count ?? rows.length };
}

export async function GET(request: Request) {
  try {
    const adminCheck = await assertAdmin(request);
    if (!adminCheck.ok) return NextResponse.json({ success: false, error: adminCheck.error }, { status: adminCheck.status });
    if (!serviceRoleKey) return NextResponse.json({ success: false, error: "SUPABASE_SERVICE_ROLE_KEY is required for full backup export." }, { status: 500 });

    const url = new URL(request.url);
    const requested = url.searchParams.get("tables")?.split(",").map((item) => item.trim()).filter(Boolean) || BACKUP_TABLES;
    const tables = requested.filter((table) => BACKUP_TABLES.includes(table));
    if (!tables.length) return NextResponse.json({ success: false, error: "No valid backup tables were requested." }, { status: 400 });

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } }) as LooseSupabaseClient;
    const tableResults = await Promise.all(tables.map((table) => exportTable(serviceClient, table)));

    const cloudinaryUrls = new Set<string>();
    const data: Record<string, any[]> = {};
    const summary = tableResults.map((result: any) => {
      if (result.ok) {
        data[result.table] = result.rows;
        extractCloudinaryUrls(result.rows, cloudinaryUrls);
      }
      return {
        table: result.table,
        ok: result.ok,
        count: result.count,
        error: result.error,
      };
    });

    const backup = {
      meta: {
        app: "Seattle Desi TV",
        type: "database-content-backup",
        generated_at: new Date().toISOString(),
        generated_by: adminCheck.user.email || adminCheck.user.id,
        resolved_role: adminCheck.role,
        table_count: tables.length,
        format_version: "1.0",
        notes: [
          "This backup exports application table records only.",
          "Cloudinary media files are not downloaded; referenced Cloudinary URLs are listed for audit.",
          "Supabase Auth passwords are not exported.",
        ],
      },
      summary,
      cloudinary_references: Array.from(cloudinaryUrls).sort(),
      data,
    };

    return NextResponse.json({ success: true, filename: `sdtv-db-backup-${nowStamp()}.json`, backup });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "Backup export failed." }, { status: 500 });
  }
}
