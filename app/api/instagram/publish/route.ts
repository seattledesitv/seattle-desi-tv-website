import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminRole, resolveUserRole } from "../../../lib/roles";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 25;

function cleanEnv(value: string) {
  return value.trim().replace(/^["']|["']$/g, "");
}

function getInstagramConfig() {
  const accessToken = cleanEnv(process.env.INSTAGRAM_ACCESS_TOKEN || process.env.META_INSTAGRAM_ACCESS_TOKEN || "");
  const instagramBusinessAccountId = cleanEnv(process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || process.env.META_INSTAGRAM_BUSINESS_ACCOUNT_ID || "");
  const isInstagramLoginToken = accessToken.startsWith("IG");
  const graphBase = isInstagramLoginToken ? "https://graph.instagram.com/v23.0" : "https://graph.facebook.com/v21.0";
  const actorId = isInstagramLoginToken ? "me" : instagramBusinessAccountId;
  return { accessToken, instagramBusinessAccountId, isInstagramLoginToken, graphBase, actorId };
}

function normalizeHandle(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

function parseCollaborators(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => normalizeHandle(String(item))).filter(Boolean);
  if (typeof value === "string") return value.split(/[\n,]/).map(normalizeHandle).filter(Boolean);
  return [];
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function graphRequest(url: URL, method: "GET" | "POST" = "GET") {
  const response = await fetch(url.toString(), { method, cache: "no-store" });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const error = result?.error;
    const details = [
      error?.message,
      error?.code ? `code ${error.code}` : "",
      error?.error_subcode ? `subcode ${error.error_subcode}` : "",
    ].filter(Boolean).join(" · ");
    throw new Error(details || `Instagram API request failed with status ${response.status}.`);
  }
  return result;
}

async function waitForContainer(graphBase: string, creationId: string, accessToken: string) {
  let lastStatus = "IN_PROGRESS";

  for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt += 1) {
    const statusUrl = new URL(`${graphBase}/${creationId}`);
    statusUrl.searchParams.set("fields", "id,status_code,status");
    statusUrl.searchParams.set("access_token", accessToken);

    const result = await graphRequest(statusUrl);
    const status = String(result?.status_code || result?.status || "IN_PROGRESS").toUpperCase();
    lastStatus = status;

    if (status === "FINISHED" || status === "PUBLISHED") {
      return { status, attempts: attempt, elapsedMs: (attempt - 1) * POLL_INTERVAL_MS };
    }

    if (["ERROR", "EXPIRED", "FAILED"].includes(status)) {
      throw new Error(`Instagram could not process the image. Container status: ${status}.`);
    }

    if (attempt < MAX_POLL_ATTEMPTS) await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`Instagram is still processing the image after ${Math.round((MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS) / 1000)} seconds. Container ${creationId} remains ${lastStatus}. Please try publishing again shortly.`);
}

export async function POST(request: Request) {
  try {
    if (!supabaseUrl || !anonKey) return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });

    const authHeader = request.headers.get("authorization") || "";
    const sessionClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userError } = await sessionClient.auth.getUser();
    const user = userData?.user || null;
    if (userError || !user) return NextResponse.json({ error: "Login required." }, { status: 401 });

    const resolvedRole = await resolveUserRole(sessionClient, user);
    if (!isAdminRole(resolvedRole)) return NextResponse.json({ error: `Studio admin access required. Resolved role: ${resolvedRole}.` }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const publicationId = String(body.publicationId || "").trim();
    if (publicationId) {
      const { data: publication, error: publicationError } = await sessionClient.from("publications").select("status").eq("id", publicationId).single();
      if (publicationError) return NextResponse.json({ error: publicationError.message }, { status: 400 });
      if (!["approved", "scheduled", "published"].includes(String(publication?.status))) return NextResponse.json({ error: "Approve this publication before posting it to Instagram." }, { status: 409 });
    }
    const requestedUrls = Array.isArray(body.imageUrls) ? body.imageUrls : [body.imageUrl];
    const imageUrls = requestedUrls.map((value: unknown) => String(value || "").trim()).filter(Boolean);
    const collaborators = parseCollaborators(body.collaborators);
    const collaboratorText = collaborators.length ? `\n\n${collaborators.join(" ")}` : "";
    const caption = `${String(body.caption || "").trim()}${collaboratorText}`.trim();

    if (!imageUrls.length || imageUrls.some((url: string) => !/^https:\/\//i.test(url))) {
      return NextResponse.json({ error: "Public HTTPS image URLs are required for Instagram publishing." }, { status: 400 });
    }
    if (imageUrls.length > 10) return NextResponse.json({ error: "Instagram carousels support no more than 10 images." }, { status: 400 });
    if (!caption) return NextResponse.json({ error: "Caption is required." }, { status: 400 });

    const { accessToken, instagramBusinessAccountId, isInstagramLoginToken, graphBase, actorId } = getInstagramConfig();
    if (!accessToken) return NextResponse.json({ error: "Instagram access token is not configured in Vercel." }, { status: 500 });
    if (!isInstagramLoginToken && !instagramBusinessAccountId) {
      return NextResponse.json({ error: "INSTAGRAM_BUSINESS_ACCOUNT_ID is required for Facebook Graph tokens." }, { status: 500 });
    }

    let creationId = "";
    if (imageUrls.length === 1) {
      const createContainerUrl = new URL(`${graphBase}/${actorId}/media`);
      createContainerUrl.searchParams.set("image_url", imageUrls[0]);
      createContainerUrl.searchParams.set("caption", caption);
      createContainerUrl.searchParams.set("access_token", accessToken);
      const container = await graphRequest(createContainerUrl, "POST");
      creationId = container?.id || "";
    } else {
      const children: string[] = [];
      for (const imageUrl of imageUrls) {
        const childUrl = new URL(`${graphBase}/${actorId}/media`);
        childUrl.searchParams.set("image_url", imageUrl);
        childUrl.searchParams.set("is_carousel_item", "true");
        childUrl.searchParams.set("access_token", accessToken);
        const child = await graphRequest(childUrl, "POST");
        if (!child?.id) throw new Error("Instagram did not return a carousel item ID.");
        await waitForContainer(graphBase, child.id, accessToken);
        children.push(child.id);
      }
      const carouselUrl = new URL(`${graphBase}/${actorId}/media`);
      carouselUrl.searchParams.set("media_type", "CAROUSEL");
      carouselUrl.searchParams.set("children", children.join(","));
      carouselUrl.searchParams.set("caption", caption);
      carouselUrl.searchParams.set("access_token", accessToken);
      const container = await graphRequest(carouselUrl, "POST");
      creationId = container?.id || "";
    }
    if (!creationId) throw new Error("Instagram did not return a media creation ID.");

    const processing = await waitForContainer(graphBase, creationId, accessToken);

    const publishUrl = new URL(`${graphBase}/${actorId}/media_publish`);
    publishUrl.searchParams.set("creation_id", creationId);
    publishUrl.searchParams.set("access_token", accessToken);

    const published = await graphRequest(publishUrl, "POST");
    const mediaId = published?.id || "";
    if (!mediaId) throw new Error("Instagram completed processing but did not return a published media ID.");

    let permalink = "";
    try {
      const mediaUrl = new URL(`${graphBase}/${mediaId}`);
      mediaUrl.searchParams.set("fields", "id,permalink");
      mediaUrl.searchParams.set("access_token", accessToken);
      const media = await graphRequest(mediaUrl);
      permalink = media?.permalink || "";
    } catch {}

    return NextResponse.json({
      ok: true,
      message: "Published to Instagram.",
      source: isInstagramLoginToken ? "instagram-login" : "facebook-graph",
      creationId,
      containerStatus: processing.status,
      processingAttempts: processing.attempts,
      processingElapsedMs: processing.elapsedMs,
      mediaId,
      permalink,
      collaborators,
      imageCount: imageUrls.length,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Instagram publish failed." }, { status: 500 });
  }
}
