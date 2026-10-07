import "server-only";
import { createClient } from "@supabase/supabase-js";
import { cleanRole, isTeamRole, resolveUserRole } from "../roles";
import { resolveSiteForHostname } from "../sites/siteResolver";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";

export function quickFormsDb() {
  if (!url || !service) throw new Error("Quick Forms database access is not configured.");
  return createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function quickFormsContext(request: Request) {
  if (!url || !anon) throw new Error("Authentication is not configured.");
  const auth = createClient(url, anon, { global: { headers: { Authorization: request.headers.get("authorization") || "" } } });
  const result = await auth.auth.getUser();
  const user = result.data.user;
  if (!user) throw new Error("Login required.");
  const role = cleanRole(await resolveUserRole(auth, user));
  if (!isTeamRole(role)) throw new Error("SDTV team-member access is required.");
  const site = await resolveSiteForHostname(request.headers.get("x-forwarded-host") || request.headers.get("host"));
  if (!site.id) throw new Error("Active site could not be resolved.");
  return { user, role, siteId: site.id, superAdmin: role === "super_admin" };
}

export async function assertQuickFormAccess(db: any, formId: string, context: any) {
  if (context.superAdmin) return;
  const query = db.from("team_quick_form_access_blocks").select("id").eq("form_id", formId).eq("site_id", context.siteId);
  const filters = [`user_id.eq.${context.user.id}`];
  if (context.user.email) filters.push(`email.ilike.${context.user.email}`);
  const blocked = await query.or(filters.join(",")).limit(1).maybeSingle();
  if (blocked.error) throw blocked.error;
  if (blocked.data) throw new Error("A super administrator has restricted your access to this form.");
}

export function normalizeFields(input: unknown) {
  const allowed = new Set(["text", "textarea", "email", "phone", "number", "date", "select", "radio", "checkbox"]);
  if (!Array.isArray(input)) return [];
  return input.slice(0, 50).map((field: any, index) => {
    const label = String(field?.label || "").trim().slice(0, 120);
    const type = allowed.has(String(field?.type)) ? String(field.type) : "text";
    const options = ["select", "radio"].includes(type) && Array.isArray(field?.options)
      ? field.options.map((item: any) => String(item || "").trim().slice(0, 100)).filter(Boolean).slice(0, 30)
      : [];
    return { id: String(field?.id || `field_${index + 1}`).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80), label, type, required: Boolean(field?.required), options };
  }).filter((field) => field.label && field.id);
}

export function slugify(value: string) {
  const base = String(value || "form").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "form";
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}
