import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cleanRole, resolveUserRole } from "../../../../lib/roles";
import { resolveSiteForHostname } from "../../../../lib/sites/siteResolver";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const service =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  "";

export async function PATCH(request: Request) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const auth = createClient(url, anon, {
      global: { headers: { Authorization: authorization } },
    });
    const { data } = await auth.auth.getUser();
    if (!data.user)
      return NextResponse.json({ error: "Login required." }, { status: 401 });
    if (cleanRole(await resolveUserRole(auth, data.user)) !== "super_admin")
      return NextResponse.json(
        {
          error:
            "Only a super administrator can hide or remove a published community story.",
        },
        { status: 403 },
      );
    if (!service)
      return NextResponse.json(
        { error: "Server database access is not configured." },
        { status: 500 },
      );
    const body = await request.json().catch(() => ({}));
    const requestId = String(body.requestId || "");
    const action = String(body.action || "");
    if (!requestId || !["hold", "archive"].includes(action))
      return NextResponse.json(
        { error: "A valid story and action are required." },
        { status: 400 },
      );
    const site = await resolveSiteForHostname(
      request.headers.get("x-forwarded-host") || request.headers.get("host"),
    );
    if (!site.id)
      return NextResponse.json(
        { error: "Active site could not be resolved." },
        { status: 400 },
      );
    const db = createClient(url, service, { auth: { persistSession: false } });
    const story = await db
      .from("community_stories")
      .select("id,status")
      .eq("site_id", site.id)
      .eq("source_request_id", requestId)
      .maybeSingle();
    if (story.error || !story.data)
      return NextResponse.json(
        {
          error: story.error?.message || "Published community story not found.",
        },
        { status: 404 },
      );
    const storyStatus = action === "hold" ? "on_hold" : "archived";
    const requestStatus =
      action === "hold" ? "approved_for_publishing" : "closed";
    const storyUpdate = await db
      .from("community_stories")
      .update({ status: storyStatus, updated_at: new Date().toISOString() })
      .eq("id", story.data.id)
      .eq("site_id", site.id);
    if (storyUpdate.error)
      return NextResponse.json(
        { error: storyUpdate.error.message },
        { status: 400 },
      );
    const sourceUpdate = await db
      .from("public_content_requests")
      .update({ status: requestStatus, updated_at: new Date().toISOString() })
      .eq("id", requestId)
      .eq("site_id", site.id);
    if (sourceUpdate.error)
      return NextResponse.json(
        { error: sourceUpdate.error.message },
        { status: 400 },
      );
    return NextResponse.json({
      ok: true,
      status: storyStatus,
      message:
        action === "hold"
          ? "Story placed on hold and hidden from the Newsroom."
          : "Story removed from the Newsroom and archived.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Story status update failed." },
      { status: 500 },
    );
  }
}
