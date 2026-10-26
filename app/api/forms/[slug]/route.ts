import { NextResponse } from "next/server";
import { quickFormsDb } from "../../../lib/quickForms/server";
import { resolveSiteForHostname } from "../../../lib/sites/siteResolver";

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params; const site = await resolveSiteForHostname(request.headers.get("x-forwarded-host") || request.headers.get("host"));
    if (!site.id) return NextResponse.json({ error: "Site not found." }, { status: 404 });
    const result = await quickFormsDb().from("team_quick_forms").select("id,title,slug,description,status,fields,confirmation_message,active_from,active_until,max_responses").eq("site_id", site.id).eq("slug", slug).maybeSingle();
    if (result.error || !result.data || result.data.status === "draft") return NextResponse.json({ error: "Form not found." }, { status: 404 });
    const now = Date.now();
    const startsInFuture = result.data.active_from && new Date(result.data.active_from).getTime() > now;
    const ended = result.data.active_until && new Date(result.data.active_until).getTime() <= now;
    if (result.data.status === "closed" || startsInFuture || ended) return NextResponse.json({ error: "This form is not currently active." }, { status: 404 });
    const count = await quickFormsDb().from("team_quick_form_submissions").select("id", { count: "exact", head: true }).eq("form_id", result.data.id).eq("site_id", site.id);
    if (count.error) throw count.error;
    if (result.data.max_responses && (count.count || 0) >= result.data.max_responses) return NextResponse.json({ error: "This form has reached its response limit." }, { status: 410 });
    return NextResponse.json({ form: result.data, response_count: count.count || 0 });
  } catch (error: any) { return NextResponse.json({ error: error?.message || "Form could not be loaded." }, { status: 500 }); }
}
