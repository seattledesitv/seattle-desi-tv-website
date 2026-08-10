import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { RadioScheduleService } from "../../../lib/radioSchedule/services/radioScheduleService";

export const dynamic = "force-dynamic";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: cors }); }
export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("Schedule data source is unavailable.");
    const schedule = await RadioScheduleService.listPublic(createClient(url, key, { auth: { persistSession: false } }));
    return NextResponse.json(schedule, { headers: { ...cors, "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
  } catch {
    return NextResponse.json({ error: "Radio schedule is temporarily unavailable." }, { status: 503, headers: cors });
  }
}
