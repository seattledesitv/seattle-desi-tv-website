import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
export async function GET(request: Request) {
  if (
    !process.env.CRON_SECRET ||
    request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  )
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SECRET_KEY ||
      "",
    { auth: { persistSession: false } },
  );
  const result = await db.rpc("expire_ticket_reservations");
  return result.error
    ? NextResponse.json({ error: result.error.message }, { status: 500 })
    : NextResponse.json({ ok: true, expired: result.data });
}
