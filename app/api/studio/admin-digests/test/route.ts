import { NextResponse } from "next/server";
import { requireDigestAdmin, sendDailyDigest } from "../../../../lib/adminDigest/server";

export async function POST(request: Request) {
  const user = await requireDigestAdmin(request);
  if (!user) return NextResponse.json({ error: "Studio admin access required." }, { status: 403 });
  try {
    return NextResponse.json({ ok: true, ...(await sendDailyDigest({ type: "test", triggeredBy: user.email || user.id })) });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not send test digest." }, { status: 500 });
  }
}
