import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "../../supabaseBrowser";
import type { AdminDigestDelivery, DigestRoleRequest, DigestSubmissionSection, DigestUnlistedEventRsvp, DigestUser } from "../types";

type AuthAdminClient = SupabaseClient["auth"]["admin"];

export async function listNewUsers(authAdmin: AuthAdminClient, since: string, until: string): Promise<DigestUser[]> {
  const users: DigestUser[] = [];
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await authAdmin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const batch = data.users || [];
    for (const user of batch) {
      if (user.created_at < since || user.created_at >= until) continue;
      users.push({
        id: user.id,
        email: user.email || "Email unavailable",
        name: String(user.user_metadata?.full_name || user.user_metadata?.name || "").trim(),
        createdAt: user.created_at,
      });
    }
    if (batch.length < 1000) break;
  }
  return users.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function listNewRoleRequests(db: SupabaseClient, since: string, until: string): Promise<DigestRoleRequest[]> {
  const { data, error } = await db
    .from("user_role_requests")
    .select("id,user_id,email,requested_role,status,created_at")
    .in("requested_role", ["volunteer", "team_member"])
    .gte("created_at", since)
    .lt("created_at", until)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map((row) => ({
    id: String(row.id),
    userId: row.user_id ? String(row.user_id) : null,
    email: String(row.email || "Email unavailable"),
    requestedRole: row.requested_role as "volunteer" | "team_member",
    status: String(row.status || "pending"),
    createdAt: String(row.created_at),
  }));
}

const submissionSources = [
  { key: "events", label: "Events", table: "events", title: "title", studioPath: "/studio/events" },
  { key: "businesses", label: "Businesses", table: "local_businesses", title: "name", studioPath: "/studio/businesses" },
  { key: "organizations", label: "Organizations", table: "community_organizations", title: "name", studioPath: "/studio/community-orgs" },
  { key: "groups", label: "Community groups", table: "community_groups", title: "name", studioPath: "/studio/community-groups" },
  { key: "influencers", label: "Influencers", table: "influencer_profiles", title: "full_name", studioPath: "/studio/influencers" },
  { key: "classifieds", label: "Classified ads", table: "classified_ads", title: "title", studioPath: "/studio/classifieds" },
  { key: "matrimony_profiles", label: "Matrimony profiles", table: "matrimony_profiles", title: "display_name", studioPath: "/studio/matrimony" },
  { key: "matrimony_access", label: "Matrimony access requests", table: "matrimony_access_requests", title: "requester_email", studioPath: "/studio/matrimony" },
  { key: "business_offers", label: "Business offers", table: "business_offers", title: "title", studioPath: "/studio/businesses/offers" },
] as const;

export async function listNewSubmissions(db: SupabaseClient, since: string, until: string): Promise<DigestSubmissionSection[]> {
  return Promise.all(submissionSources.map(async (source) => {
    const { data, error } = await db
      .from(source.table)
      .select(`id,${source.title},status,created_at`)
      .gte("created_at", since)
      .lt("created_at", until)
      .order("created_at", { ascending: true });
    if (error) return { key: source.key, label: source.label, studioPath: source.studioPath, items: [], error: error.message };
    const rows = (data || []) as unknown as Record<string, unknown>[];
    return {
      key: source.key,
      label: source.label,
      studioPath: source.studioPath,
      items: rows.map((row) => ({ id: String(row.id), title: String(row[source.title] || "Untitled submission"), status: String(row.status || "pending"), createdAt: String(row.created_at) })),
      error: null,
    };
  }));
}

export async function listUnlistedEventRsvps(
  db: SupabaseClient,
  since: string,
  until: string,
): Promise<DigestUnlistedEventRsvp[]> {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const { data: events, error: eventError } = await db
    .from("events")
    .select("id,title,date,end_date")
    .eq("visibility", "unlisted")
    .eq("simple_rsvp_enabled", true)
    .eq("status", "approved")
    .or(`date.gte.${today},end_date.gte.${today}`)
    .order("date", { ascending: true });
  if (eventError) throw eventError;

  const eventRows = events || [];
  if (!eventRows.length) return [];
  const eventIds = eventRows.map((event) => String(event.id));
  const { data: rsvps, error: rsvpError } = await db
    .from("event_rsvps")
    .select("event_id,party_size,guest_names,guest_details,created_at")
    .in("event_id", eventIds)
    .eq("response", "attending");
  if (rsvpError) throw rsvpError;

  const byEvent = new Map<string, DigestUnlistedEventRsvp>();
  for (const event of eventRows) {
    byEvent.set(String(event.id), {
      eventId: String(event.id),
      title: String(event.title || "Unlisted event"),
      eventDate: String(event.date || ""),
      rsvpCount: 0,
      attendeeCount: 0,
      adultCount: 0,
      kidCount: 0,
      newRsvpCount: 0,
      newAttendeeCount: 0,
    });
  }

  for (const row of rsvps || []) {
    const item = byEvent.get(String(row.event_id));
    if (!item) continue;
    const guestDetails = Array.isArray(row.guest_details) ? row.guest_details : [];
    const legacyGuests = Array.isArray(row.guest_names) ? row.guest_names : [];
    const kids = guestDetails.filter((guest: any) => guest?.type === "kid").length;
    const adults = 1 + (guestDetails.length
      ? guestDetails.filter((guest: any) => guest?.type !== "kid").length
      : legacyGuests.length);
    const partySize = Number(row.party_size || adults + kids || 1);
    item.rsvpCount += 1;
    item.attendeeCount += partySize;
    item.adultCount += adults;
    item.kidCount += kids;
    const createdAt = String(row.created_at || "");
    if (createdAt >= since && createdAt < until) {
      item.newRsvpCount += 1;
      item.newAttendeeCount += partySize;
    }
  }

  return Array.from(byEvent.values());
}

export async function listDeliveries(): Promise<AdminDigestDelivery[]> {
  const { data, error } = await getSupabaseBrowserClient().from("admin_digest_deliveries").select("id,delivery_type,status,recipient,subject,report_from,report_to,counts,provider_email_id,error_message,triggered_by,created_at,sent_at").order("created_at", { ascending: false }).limit(100);
  if (error) throw error;
  return (data || []) as AdminDigestDelivery[];
}
