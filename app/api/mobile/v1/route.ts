import { NextResponse } from "next/server";
import { publicDirectoryResources } from "../../../lib/publicDirectory/types";

export const dynamic = "force-dynamic";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };

export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: cors }); }

export async function GET() {
  return NextResponse.json({
    name: "Seattle Desi TV public mobile API",
    version: "v1",
    authentication: "none",
    pagination: { defaultLimit: 50, maximumLimit: 100, parameters: ["limit", "offset"] },
    endpoints: publicDirectoryResources.map((resource) => ({ resource, path: `/api/mobile/v1/${resource}` })),
    radioSchedule: "/api/radio/schedule",
  }, { headers: { ...cors, "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
}
