import { NextResponse } from "next/server";
import { quickFormsDb } from "../../../lib/quickForms/server";
import { resolveSiteForHostname } from "../../../lib/sites/siteResolver";

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params; const site = await resolveSiteForHostname(request.headers.get("x-forwarded-host") || request.headers.get("host"));
    if (!site.id) return NextResponse.json({ error: "Site not found." }, { status: 404 });
    const result = await quickFormsDb().from("team_quick_forms").select("id,title,slug,description,status,fields,confirmation_message").eq("site_id", site.id).eq("slug", slug).maybeSingle();
    if (result.error || !result.data || result.data.status === "draft") return NextResponse.json({ error: "Form not found." }, { status: 404 });
    return NextResponse.json({ form: result.data });
  } catch (error: any) { return NextResponse.json({ error: error?.message || "Form could not be loaded." }, { status: 500 }); }
}
