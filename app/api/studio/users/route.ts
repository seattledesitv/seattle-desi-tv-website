import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { isAdminRole, resolveUserRole } from "../../../lib/roles";
import { buildRegisteredUserSummary, deleteRegisteredUser } from "../../../lib/userAdmin/services/userAdminService";

function clients(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
  if (!url || !anon || !service) throw new Error("Supabase user administration is not configured.");
  const session = createClient(url, anon, { auth: { persistSession: false }, global: { headers: { Authorization: request.headers.get("authorization") || "" } } });
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  return { session, admin };
}

async function authorize(request: Request) {
  const { session, admin } = clients(request);
  const { data } = await session.auth.getUser();
  if (!data.user) return null;
  const role = await resolveUserRole(session, data.user);
  if (!isAdminRole(role)) return null;
  return { actor: { id: data.user.id, role }, admin };
}

export async function GET(request: Request) {
  try {
    const context = await authorize(request);
    if (!context) return NextResponse.json({ error: "Studio admin access required." }, { status: 403 });
    return NextResponse.json(await buildRegisteredUserSummary(context.admin.auth.admin, context.admin), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Registered users could not be loaded." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const context = await authorize(request);
    if (!context) return NextResponse.json({ error: "Studio admin access required." }, { status: 403 });
    const body = await request.json() as { userId?: string; confirmationEmail?: string };
    if (!body.userId) return NextResponse.json({ error: "Choose a registered user." }, { status: 400 });
    const summary = await buildRegisteredUserSummary(context.admin.auth.admin, context.admin);
    const target = summary.users.find((user) => user.id === body.userId);
    if (!target) return NextResponse.json({ error: "Registered user not found." }, { status: 404 });
    await deleteRegisteredUser(context.admin.auth.admin, target, context.actor, body.confirmationEmail || "");
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "The login account could not be deleted.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
