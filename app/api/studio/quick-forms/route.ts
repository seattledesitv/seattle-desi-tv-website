import { NextResponse } from "next/server";
import { assertQuickFormAccess, normalizeFields, quickFormsContext, quickFormsDb, slugify } from "../../../lib/quickForms/server";

function failure(error: any) {
  const message = error?.message || "Quick Forms request failed.";
  const status = /Login required/i.test(message) ? 401 : /access|restricted|team-member/i.test(message) ? 403 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  try {
    const context = await quickFormsContext(request); const db = quickFormsDb();
    const url = new URL(request.url); const formId = url.searchParams.get("formId") || "";
    if (formId) {
      await assertQuickFormAccess(db, formId, context);
      const [form, submissions, blocks] = await Promise.all([
        db.from("team_quick_forms").select("*").eq("id", formId).eq("site_id", context.siteId).maybeSingle(),
        db.from("team_quick_form_submissions").select("id,answers,source,submitted_at").eq("form_id", formId).eq("site_id", context.siteId).order("submitted_at", { ascending: false }),
        context.superAdmin ? db.from("team_quick_form_access_blocks").select("id,user_id,email").eq("form_id", formId).eq("site_id", context.siteId) : Promise.resolve({ data: [], error: null }),
      ]);
      if (form.error) throw form.error; if (!form.data) throw new Error("Form not found.");
      return NextResponse.json({ form: form.data, submissions: submissions.data || [], blocks: blocks.data || [], superAdmin: context.superAdmin });
    }
    const forms = await db.from("team_quick_forms").select("id,title,slug,description,status,fields,created_by_email,created_at,updated_at").eq("site_id", context.siteId).order("updated_at", { ascending: false });
    if (forms.error) throw forms.error;
    let rows = forms.data || [];
    if (!context.superAdmin && rows.length) {
      const blocks = await db.from("team_quick_form_access_blocks").select("form_id,user_id,email").eq("site_id", context.siteId).in("form_id", rows.map((row: any) => row.id));
      if (blocks.error) throw blocks.error;
      const denied = new Set((blocks.data || []).filter((block: any) => block.user_id === context.user.id || String(block.email || "").toLowerCase() === String(context.user.email || "").toLowerCase()).map((block: any) => block.form_id));
      rows = rows.filter((row: any) => !denied.has(row.id));
    }
    const counts = rows.length ? await db.from("team_quick_form_submissions").select("form_id").eq("site_id", context.siteId).in("form_id", rows.map((row: any) => row.id)) : { data: [], error: null };
    const countMap: Record<string, number> = {}; (counts.data || []).forEach((row: any) => { countMap[row.form_id] = (countMap[row.form_id] || 0) + 1; });
    const team = context.superAdmin ? await db.from("team_members").select("id,user_id,name,email,title").eq("site_id", context.siteId).order("name") : { data: [], error: null };
    return NextResponse.json({ forms: rows.map((row: any) => ({ ...row, submission_count: countMap[row.id] || 0 })), team: team.data || [], superAdmin: context.superAdmin });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    const context = await quickFormsContext(request); const db = quickFormsDb(); const body = await request.json();
    const title = String(body.title || "").trim().slice(0, 160); if (!title) throw new Error("Form title is required.");
    const inserted = await db.from("team_quick_forms").insert({ site_id: context.siteId, title, slug: slugify(title), description: String(body.description || "").trim().slice(0, 2000), fields: normalizeFields(body.fields), status: "draft", created_by: context.user.id, created_by_email: context.user.email || null }).select("*").single();
    if (inserted.error) throw inserted.error; return NextResponse.json({ form: inserted.data });
  } catch (error) { return failure(error); }
}

export async function PATCH(request: Request) {
  try {
    const context = await quickFormsContext(request); const db = quickFormsDb(); const body = await request.json(); const formId = String(body.formId || "");
    if (!formId) throw new Error("Form is required."); await assertQuickFormAccess(db, formId, context);
    if (body.action === "access") {
      if (!context.superAdmin) throw new Error("Only a super administrator can change form access.");
      const userId = String(body.userId || "").trim() || null; const email = String(body.email || "").trim() || null;
      if (!userId && !email) throw new Error("Team member is required.");
      const match = db.from("team_quick_form_access_blocks").delete().eq("form_id", formId).eq("site_id", context.siteId);
      const removed = userId ? await match.eq("user_id", userId) : await match.ilike("email", email!);
      if (removed.error) throw removed.error;
      if (body.blocked) { const added = await db.from("team_quick_form_access_blocks").insert({ site_id: context.siteId, form_id: formId, user_id: userId, email, blocked_by: context.user.id }); if (added.error) throw added.error; }
      return NextResponse.json({ ok: true });
    }
    const payload: any = { updated_at: new Date().toISOString() };
    if (body.title !== undefined) { payload.title = String(body.title || "").trim().slice(0, 160); if (!payload.title) throw new Error("Form title is required."); }
    if (body.description !== undefined) payload.description = String(body.description || "").trim().slice(0, 2000);
    if (body.confirmation_message !== undefined) payload.confirmation_message = String(body.confirmation_message || "").trim().slice(0, 500);
    if (body.status !== undefined) { if (!["draft", "published", "closed"].includes(body.status)) throw new Error("Invalid form status."); payload.status = body.status; }
    if (body.fields !== undefined) payload.fields = normalizeFields(body.fields);
    const updated = await db.from("team_quick_forms").update(payload).eq("id", formId).eq("site_id", context.siteId).select("*").single();
    if (updated.error) throw updated.error; return NextResponse.json({ form: updated.data });
  } catch (error) { return failure(error); }
}
