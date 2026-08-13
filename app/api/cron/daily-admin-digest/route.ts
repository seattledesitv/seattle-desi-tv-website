import { NextResponse } from "next/server";
import { sendDailyDigest } from "../../../lib/adminDigest/server";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET || "";
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) return unauthorized();
  try {
    return NextResponse.json({ ok: true, ...(await sendDailyDigest({ type: "scheduled", triggeredBy: "vercel_cron" })) });
  } catch (error: unknown) {
    console.error("Daily administrator digest failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Daily administrator digest failed." }, { status: 500 });
  }
}
