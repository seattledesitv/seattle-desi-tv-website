import { NextResponse } from "next/server";
import { normalizeFields, quickFormsDb } from "../../../../lib/quickForms/server";
import { resolveSiteForHostname } from "../../../../lib/sites/siteResolver";

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const body = await request.json().catch(() => ({})); if (String(body.website || "").trim()) return NextResponse.json({ ok: true });
    const { slug } = await context.params; const site = await resolveSiteForHostname(request.headers.get("x-forwarded-host") || request.headers.get("host"));
    if (!site.id) return NextResponse.json({ error: "Site not found." }, { status: 404 }); const db = quickFormsDb();
    const result = await db.from("team_quick_forms").select("id,status,fields,confirmation_message").eq("site_id", site.id).eq("slug", slug).maybeSingle();
    if (result.error || !result.data || result.data.status !== "published") return NextResponse.json({ error: result.data?.status === "closed" ? "This form is closed." : "Form not found." }, { status: 404 });
    const fields = normalizeFields(result.data.fields); const input = body.answers && typeof body.answers === "object" ? body.answers : {}; const answers: Record<string, any> = {};
    for (const field of fields) {
      const raw = input[field.id]; const value = field.type === "checkbox" ? Boolean(raw) : String(raw ?? "").trim().slice(0, 5000);
      if (field.required && (value === "" || value === false)) return NextResponse.json({ error: `${field.label} is required.` }, { status: 400 });
      if (field.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) return NextResponse.json({ error: `${field.label} must be a valid email address.` }, { status: 400 });
      if (["select", "radio"].includes(field.type) && value && !field.options.includes(String(value))) return NextResponse.json({ error: `${field.label} contains an invalid selection.` }, { status: 400 });
      answers[field.id] = value;
    }
    const inserted = await db.from("team_quick_form_submissions").insert({ site_id: site.id, form_id: result.data.id, answers, source: "website" });
    if (inserted.error) throw inserted.error; return NextResponse.json({ ok: true, message: result.data.confirmation_message });
  } catch (error: any) { return NextResponse.json({ error: error?.message || "Submission failed." }, { status: 500 }); }
}
