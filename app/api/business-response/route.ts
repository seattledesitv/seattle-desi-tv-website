import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const allowedActions = new Set(["claim", "approve", "correction", "opt_out"]);

export async function POST(request: Request) {
  try {
    if (!supabaseUrl || !serviceKey) return NextResponse.json({ error: "Server configuration is incomplete." }, { status: 500 });
    const body = await request.json();
    const token = String(body.token || "").trim();
    const action = String(body.action || "").trim();
    const message = String(body.message || "").trim().slice(0, 4000);
    const contactName = String(body.contactName || "").trim().slice(0, 200);
    const contactEmail = String(body.contactEmail || "").trim().toLowerCase().slice(0, 320);

    if (!token || !allowedActions.has(action)) return NextResponse.json({ error: "Invalid response link or action." }, { status: 400 });
    const db = createClient(supabaseUrl, serviceKey);
    const { data: business, error } = await db.from("local_businesses")
      .select("id,name,outreach_status,opted_out_at")
      .eq("claim_token", token)
      .maybeSingle();
    if (error || !business) return NextResponse.json({ error: "This business response link is invalid or has expired." }, { status: 404 });

    const now = new Date().toISOString();
    const statusMap: Record<string, string> = {
      claim: "claimed",
      approve: "approved_as_shown",
      correction: "correction_requested",
      opt_out: "opted_out",
    };
    const labelMap: Record<string, string> = {
      claim: "Business owner requested to claim the listing",
      approve: "Business owner approved the listing as shown",
      correction: "Business owner requested a correction",
      opt_out: "Business owner requested removal from the directory",
    };
    const update: Record<string, any> = {
      outreach_status: statusMap[action],
      owner_response: message || labelMap[action],
      owner_response_at: now,
    };
    if (action === "claim") update.claimed_at = now;
    if (action === "opt_out") {
      update.opted_out_at = now;
      update.approved = false;
      update.status = "rejected";
      update.logo_rights_status = "do_not_use";
    }
    if (contactEmail) update.poc_email = contactEmail;
    if (contactName) update.poc_name = contactName;

    const { error: updateError } = await db.from("local_businesses").update(update).eq("id", business.id);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    await db.from("business_activity_log").insert({
      business_id: business.id,
      activity_type: `owner_${action}`,
      activity_label: labelMap[action],
      actor_email: contactEmail || null,
      details: { message, contact_name: contactName, contact_email: contactEmail },
    });

    return NextResponse.json({ ok: true, businessName: business.name, action, message: labelMap[action] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Could not save the business response." }, { status: 500 });
  }
}
