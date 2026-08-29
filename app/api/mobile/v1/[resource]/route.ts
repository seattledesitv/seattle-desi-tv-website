import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { PublicDirectoryService } from "../../../../lib/publicDirectory/services/publicDirectoryService";
import { isPublicDirectoryResource, publicDirectoryResources } from "../../../../lib/publicDirectory/types";
import { resolveSiteForHostname } from "../../../../lib/sites/siteResolver";

export const dynamic = "force-dynamic";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
const headers = { ...cors, "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" };

export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: cors }); }

export async function GET(request: NextRequest, context: { params: Promise<{ resource: string }> }) {
  try {
    const { resource } = await context.params;
    if (!isPublicDirectoryResource(resource)) return NextResponse.json({ error: "Unknown public directory resource.", resources: publicDirectoryResources }, { status: 404, headers });
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("Public directory data source is unavailable.");
    const requestedLimit = Number(request.nextUrl.searchParams.get("limit") || 50);
    const requestedOffset = Number(request.nextUrl.searchParams.get("offset") || 0);
    const limit = Number.isFinite(requestedLimit) ? Math.min(100, Math.max(1, Math.trunc(requestedLimit))) : 50;
    const offset = Number.isFinite(requestedOffset) ? Math.max(0, Math.trunc(requestedOffset)) : 0;
    const db = createClient(url, key, { auth: { persistSession: false } });
    const site = await resolveSiteForHostname(request.headers.get("x-forwarded-host") || request.headers.get("host"));
    return NextResponse.json(await PublicDirectoryService.list(db, resource, limit, offset, site.id), { headers });
  } catch (error) {
    console.error("Public mobile directory API failed", error);
    return NextResponse.json({ error: "Public directory data is temporarily unavailable." }, { status: 503, headers: cors });
  }
}
