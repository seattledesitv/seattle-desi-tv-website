import { NextResponse } from "next/server";
import { assertQuickFormAccess, normalizeFields, quickFormsContext, quickFormsDb, slugify } from "../../../lib/quickForms/server";

function failure(error: any) {
  const message = error?.message || "Quick Forms request failed.";
  const status = /Login required/i.test(message) ? 401 : /access|restricted|team-member|organizer/i.test(message) ? 403 : 400;
  return NextResponse.json({ error: message }, { status });
}
async function eventFor(db: any, eventId: string, siteId: string) {
  if (!eventId) return null;
  const result = await db.from("events").select("id,title,created_by").eq("id", eventId).eq("site_id", siteId).maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) throw new Error("Event not found.");
  return result.data;
}
async function assertEventFormAccess(db: any, form: any, context: any) {
  if (!form?.event_id || context.admin) return;
  const event = await eventFor(db, form.event_id, context.siteId);
  if (event.created_by !== context.user.id) throw new Error("Only the event organizer or an administrator can manage this form.");
}
export async function GET(request: Request) {
  try {
    const context = await quickFormsContext(request); const db = quickFormsDb();
    const url = new URL(request.url); const formId = url.searchParams.get("formId") || ""; const eventId = url.searchParams.get("eventId") || context.requestedEventId || "";
    if (formId) {
      await assertQuickFormAccess(db, formId, context);
      const form = await db.from("team_quick_forms").select("*").eq("id", formId).eq("site_id", context.siteId).maybeSingle();
      if (form.error) throw form.error; if (!form.data) throw new Error("Form not found.");
      await assertEventFormAccess(db, form.data, context);
      const [submissions, blocks] = await Promise.all([
        db.from("team_quick_form_submissions").select("id,answers,source,submitted_at").eq("form_id", formId).eq("site_id", context.siteId).order("submitted_at", { ascending: false }),
        context.superAdmin ? db.from("team_quick_form_access_blocks").select("id,user_id,email").eq("form_id", formId).eq("site_id", context.siteId) : Promise.resolve({ data: [], error: null }),
      ]);
      return NextResponse.json({ form: form.data, submissions: submissions.data || [], blocks: blocks.data || [], superAdmin: context.superAdmin, eventOrganizer: context.eventOrganizer });
    }
    let query = db.from("team_quick_forms").select("id,title,slug,description,status,fields,event_id,active_from,active_until,max_responses,created_by,created_by_email,created_at,updated_at").eq("site_id", context.siteId);
    if (eventId) query = query.eq("event_id", eventId);
    const forms = await query.order("updated_at", { ascending: false });
    if (forms.error) throw forms.error;
    let rows = forms.data || [];
    if (eventId) {
      for (const row of rows) await assertEventFormAccess(db, row, context);
    } else if (!context.superAdmin && rows.length) {
      const blocks = await db.from("team_quick_form_access_blocks").select("form_id,user_id,email").eq("site_id", context.siteId).in("form_id", rows.map((row: any) => row.id));
      if (blocks.error) throw blocks.error;
      const denied = new Set((blocks.data || []).filter((block: any) => block.user_id === context.user.id || String(block.email || "").toLowerCase() === String(context.user.email || "").toLowerCase()).map((block: any) => block.form_id));
      rows = rows.filter((row: any) => !denied.has(row.id));
    }
    const counts = rows.length ? await db.from("team_quick_form_submissions").select("form_id").eq("site_id", context.siteId).in("form_id", rows.map((row: any) => row.id)) : { data: [], error: null };
    const countMap: Record<string, number> = {}; (counts.data || []).forEach((row: any) => { countMap[row.form_id] = (countMap[row.form_id] || 0) + 1; });
    const team = context.superAdmin ? await db.from("team_members").select("id,user_id,name,email,title").eq("site_id", context.siteId).order("name") : { data: [], error: null };
    return NextResponse.json({ forms: rows.map((row: any) => ({ ...row, submission_count: countMap[row.id] || 0 })), team: team.data || [], superAdmin: context.superAdmin, eventOrganizer: context.eventOrganizer, eventId });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    const context = await quickFormsContext(request); const db = quickFormsDb(); const body = await request.json();
    const title = String(body.title || "").trim().slice(0, 160); if (!title) throw new Error("Form title is required.");
    const eventId = String(body.event_id || context.requestedEventId || "").trim(); let event = null;
    if (eventId) {
      event = await eventFor(db, eventId, context.siteId);
      if (!context.admin && event.created_by !== context.user.id) throw new Error("Only the event organizer or an administrator can create this form.");
    }
    const maxResponses = body.max_responses === null || body.max_responses === "" || body.max_responses === undefined ? null : Math.max(1, Math.floor(Number(body.max_responses)));
    if (maxResponses !== null && !Number.isFinite(maxResponses)) throw new Error("Maximum responses must be a positive number.");
    const inserted = await db.from("team_quick_forms").insert({ site_id: context.siteId, event_id: eventId || null, title, slug: slugify(title), description: String(body.description || "").trim().slice(0, 2000), fields: normalizeFields(body.fields), active_from: body.active_from || null, active_until: body.active_until || null, max_responses: maxResponses, status: "draft", created_by: context.user.id, created_by_email: context.user.email || null }).select("*").single();
    if (inserted.error) throw inserted.error; return NextResponse.json({ form: inserted.data });
  } catch (error) { return failure(error); }
}
export async function PATCH(request: Request) {
  try {
    const context = await quickFormsContext(request); const db = quickFormsDb(); const body = await request.json(); const formId = String(body.formId || "");
    if (!formId) throw new Error("Form is required."); await assertQuickFormAccess(db, formId, context);
    const existing = await db.from("team_quick_forms").select("id,event_id").eq("id", formId).eq("site_id", context.siteId).maybeSingle();
    if (existing.error) throw existing.error; if (!existing.data) throw new Error("Form not found."); await assertEventFormAccess(db, existing.data, context);
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
    if (body.active_from !== undefined) payload.active_from = body.active_from || null;
    if (body.active_until !== undefined) payload.active_until = body.active_until || null;
    if (body.max_responses !== undefined) {
      const maxResponses = body.max_responses === null || body.max_responses === "" ? null : Math.max(1, Math.floor(Number(body.max_responses)));
      if (maxResponses !== null && !Number.isFinite(maxResponses)) throw new Error("Maximum responses must be a positive number.");
      payload.max_responses = maxResponses;
    }
    const updated = await db.from("team_quick_forms").update(payload).eq("id", formId).eq("site_id", context.siteId).select("*").single();
    if (updated.error) throw updated.error; return NextResponse.json({ form: updated.data });
  } catch (error) { return failure(error); }
}