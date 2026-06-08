"use client";

import { useEffect, useMemo, useState } from "react";
import MyHubHeader from "../components/MyHubHeader";
import SiteFooter from "../components/SiteFooter";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { isAdminRole, isTeamRole, resolveUserRole } from "../lib/roles";

const supabase = getSupabaseBrowserClient();

type SubmissionCounts = { events: number; businesses: number; coverage: number; contacts: number; roles: number };
type StatusCounts = { pending: number; approved: number; on_hold: number; rejected: number };

const emptySubmissionCounts: SubmissionCounts = { events: 0, businesses: 0, coverage: 0, contacts: 0, roles: 0 };
const emptyStatusCounts: StatusCounts = { pending: 0, approved: 0, on_hold: 0, rejected: 0 };

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function formatDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function statusText(value?: string | null) {
  const next = String(value || "pending").replaceAll("_", " ");
  return next.charAt(0).toUpperCase() + next.slice(1);
}

function firstImage(row: any) {
  if (Array.isArray(row?.image_urls) && row.image_urls.length > 0) return row.image_urls[0];
  return row?.image || row?.photo || row?.picture || "";
}

function MiniRow({ label, title, meta, href }: { label: string; title: string; meta?: string; href?: string }) {
  const body = <div className="bg-white/10 border border-white/10 rounded-2xl p-4 hover:bg-white/15 transition"><p className="text-pink-300 text-xs font-black uppercase tracking-wide">{label}</p><h3 className="font-black text-lg mt-1">{title}</h3>{meta && <p className="text-slate-300 text-sm mt-1">{meta}</p>}</div>;
  return href ? <a href={href}>{body}</a> : body;
}

function StatusSummary({ title, counts }: { title: string; counts: StatusCounts }) {
  const items = [
    ["Pending", counts.pending],
    ["Approved", counts.approved],
    ["On Hold", counts.on_hold],
    ["Rejected", counts.rejected],
  ];

  return (
    <div className="bg-white/10 border border-white/10 rounded-3xl p-6">
      <h3 className="text-xl font-black">{title}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        {items.map(([label, value]) => (
          <div key={String(label)} className="bg-white text-slate-950 rounded-2xl p-4">
            <p className="text-xs text-gray-500 font-black uppercase tracking-wide">{label}</p>
            <p className="text-3xl font-black text-pink-600 mt-1">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MyHubPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading...");
  const [actionMessage, setActionMessage] = useState("");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("general_public");
  const [assignmentsCount, setAssignmentsCount] = useState(0);
  const [availabilityCount, setAvailabilityCount] = useState(0);
  const [notificationsCount, setNotificationsCount] = useState(0);
  const [submissionCounts, setSubmissionCounts] = useState<SubmissionCounts>(emptySubmissionCounts);
  const [eventStatusCounts, setEventStatusCounts] = useState<StatusCounts>(emptyStatusCounts);
  const [businessStatusCounts, setBusinessStatusCounts] = useState<StatusCounts>(emptyStatusCounts);
  const [events, setEvents] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [coverageRequests, setCoverageRequests] = useState<any[]>([]);
  const [contactRequests, setContactRequests] = useState<any[]>([]);
  const [roleRequests, setRoleRequests] = useState<any[]>([]);

  const team = isTeamRole(role);
  const admin = isAdminRole(role);

  const recentActivity = useMemo(() => {
    const rows = [
      ...events.map((event) => ({ label: "Event", title: event.title || "Submitted event", meta: `${statusText(event.status)} · ${formatDate(event.date || event.created_at)}`, href: event.id ? `/events/${event.id}` : "/events" })),
      ...businesses.map((business) => ({ label: "Business", title: business.name || "Business listing", meta: `${statusText(business.status)} · ${formatDateTime(business.created_at)}`, href: "/businesses" })),
      ...coverageRequests.map((request) => ({ label: "Coverage", title: request.event_title || "Coverage request", meta: `${statusText(request.status)} · ${formatDateTime(request.created_at)}`, href: "#coverage" })),
      ...contactRequests.map((request) => ({ label: "Contact", title: request.interest || "Contact request", meta: formatDateTime(request.created_at), href: "#contacts" })),
      ...roleRequests.map((request) => ({ label: "Role", title: request.approved_role || request.requested_role || "Role request", meta: `${statusText(request.status)} · ${formatDateTime(request.created_at)}`, href: "#roles" })),
    ];
    return rows.slice(0, 8);
  }, [events, businesses, coverageRequests, contactRequests, roleRequests]);

  async function countQuery(query: any) {
    const result = await query;
    return result.count || 0;
  }

  async function loadHub() {
    setLoading(true);
    setMessage("Loading...");
    setActionMessage("");
    const { data } = await supabase.auth.getUser();
    const user = data?.user || null;
    const nextEmail = user?.email || "";
    const nextUserId = user?.id || "";
    setEmail(nextEmail);
    setUserId(nextUserId);
    const nextRole = await resolveUserRole(supabase, user);
    setRole(nextRole);

    if (user?.id) {
      const today = new Date().toISOString().split("T")[0];
      const [
        assignments,
        availability,
        notifications,
        eventsResult,
        businessesResult,
        coverageResult,
        contactsResult,
        roleRequestsResult,
        eventsTotal,
        businessesTotal,
        coverageTotal,
        contactsTotal,
        rolesTotal,
        eventPending,
        eventApproved,
        eventOnHold,
        eventRejected,
        businessPending,
        businessApproved,
        businessOnHold,
        businessRejected,
      ] = await Promise.all([
        supabase.from("event_crew_assignments").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "approved"),
        supabase.from("crew_availability").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("available_date", today),
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("read", false),
        supabase.from("events").select("id,title,date,location,status,image,image_urls,created_at").eq("created_by", user.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("local_businesses").select("id,name,category,status,image,image_urls,created_at").eq("created_by", user.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("event_crew_assignments").select("id,event_id,event_title,user_id,user_email,assignment_type,status,created_at,approved_at").or(`user_id.eq.${user.id},user_email.eq.${nextEmail}`).order("created_at", { ascending: false }).limit(5),
        supabase.from("contact_requests").select("id,name,email,phone,interest,message,created_at").ilike("email", nextEmail).order("created_at", { ascending: false }).limit(5),
        supabase.from("user_role_requests").select("id,requested_role,approved_role,status,created_at,email,user_id").or(`user_id.eq.${user.id},email.eq.${nextEmail}`).order("created_at", { ascending: false }).limit(5),
        countQuery(supabase.from("events").select("id", { count: "exact", head: true }).eq("created_by", user.id)),
        countQuery(supabase.from("local_businesses").select("id", { count: "exact", head: true }).eq("created_by", user.id)),
        countQuery(supabase.from("event_crew_assignments").select("id", { count: "exact", head: true }).or(`user_id.eq.${user.id},user_email.eq.${nextEmail}`)),
        countQuery(supabase.from("contact_requests").select("id", { count: "exact", head: true }).ilike("email", nextEmail)),
        countQuery(supabase.from("user_role_requests").select("id", { count: "exact", head: true }).or(`user_id.eq.${user.id},email.eq.${nextEmail}`)),
        countQuery(supabase.from("events").select("id", { count: "exact", head: true }).eq("created_by", user.id).or("status.is.null,status.eq.pending")),
        countQuery(supabase.from("events").select("id", { count: "exact", head: true }).eq("created_by", user.id).eq("status", "approved")),
        countQuery(supabase.from("events").select("id", { count: "exact", head: true }).eq("created_by", user.id).eq("status", "on_hold")),
        countQuery(supabase.from("events").select("id", { count: "exact", head: true }).eq("created_by", user.id).eq("status", "rejected")),
        countQuery(supabase.from("local_businesses").select("id", { count: "exact", head: true }).eq("created_by", user.id).or("status.is.null,status.eq.pending")),
        countQuery(supabase.from("local_businesses").select("id", { count: "exact", head: true }).eq("created_by", user.id).eq("status", "approved")),
        countQuery(supabase.from("local_businesses").select("id", { count: "exact", head: true }).eq("created_by", user.id).eq("status", "on_hold")),
        countQuery(supabase.from("local_businesses").select("id", { count: "exact", head: true }).eq("created_by", user.id).eq("status", "rejected")),
      ]);

      const errors = [assignments.error, availability.error, notifications.error, eventsResult.error, businessesResult.error, coverageResult.error, contactsResult.error, roleRequestsResult.error].filter(Boolean);
      if (errors.length) setActionMessage(`Some My Hub data could not load: ${errors.map((error: any) => error.message).join(" | ")}`);

      setAssignmentsCount(assignments.count || 0);
      setAvailabilityCount(availability.count || 0);
      setNotificationsCount(notifications.count || 0);
      setSubmissionCounts({ events: eventsTotal, businesses: businessesTotal, coverage: coverageTotal, contacts: contactsTotal, roles: rolesTotal });
      setEventStatusCounts({ pending: eventPending, approved: eventApproved, on_hold: eventOnHold, rejected: eventRejected });
      setBusinessStatusCounts({ pending: businessPending, approved: businessApproved, on_hold: businessOnHold, rejected: businessRejected });
      setEvents(eventsResult.data || []);
      setBusinesses(businessesResult.data || []);
      setCoverageRequests(coverageResult.data || []);
      setContactRequests(contactsResult.data || []);
      setRoleRequests(roleRequestsResult.data || []);
    } else {
      setAssignmentsCount(0);
      setAvailabilityCount(0);
      setNotificationsCount(0);
      setSubmissionCounts(emptySubmissionCounts);
      setEventStatusCounts(emptyStatusCounts);
      setBusinessStatusCounts(emptyStatusCounts);
      setEvents([]);
      setBusinesses([]);
      setCoverageRequests([]);
      setContactRequests([]);
      setRoleRequests([]);
      setMessage("Please login to access your personalized hub.");
    }
    setLoading(false);
  }

  useEffect(() => { loadHub(); }, []);

  const cards = [
    { title: "Portal", note: "General SDTV links and workspace entry point.", href: "/portal", value: "Open" },
    { title: "My Assignments", note: "Confirm, complete, and track event coverage.", href: "/my-assignments", value: team ? assignmentsCount : "Team" },
    { title: "My Availability", note: "Share dates you can support coverage.", href: "/my-availability", value: team ? availabilityCount : "Team" },
    { title: "My Events", note: "Events submitted from your account.", href: "#events", value: submissionCounts.events },
    { title: "My Businesses", note: "Business listings submitted from your account.", href: "#businesses", value: submissionCounts.businesses },
    { title: "My Coverage", note: "Coverage and crew requests tied to you.", href: "#coverage", value: submissionCounts.coverage },
    { title: "My Contact Requests", note: "Contact form submissions using your email.", href: "#contacts", value: submissionCounts.contacts },
    { title: "My Role Requests", note: "Team, crew, or access requests submitted by you.", href: "#roles", value: submissionCounts.roles },
    { title: "Notifications", note: "Unread SDTV alerts and updates.", href: "/notifications", value: notificationsCount },
    { title: "Account", note: "Login, role request, and account access.", href: "/login", value: email ? "Signed in" : "Login" },
    { title: "Studio", note: "Admin operations and content management.", href: "/studio", value: admin ? "Admin" : "Locked" },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <MyHubHeader />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="bg-white/10 border border-white/10 rounded-3xl p-8 md:p-10 mb-8">
          <p className="text-pink-300 font-black uppercase tracking-wide">Seattle Desi TV Workspace</p>
          <h1 className="text-4xl md:text-6xl font-black mt-3">My Hub</h1>
          <p className="text-slate-300 max-w-3xl mt-3">One place for your SDTV portal, assignments, availability, notifications, submissions, and account tools.</p>
          <div className="flex flex-wrap gap-3 items-center mt-4">
            <p className="text-slate-400 text-sm">{loading ? "Loading..." : email ? `${email} · ${role}` : message}</p>
            <button onClick={loadHub} className="bg-white text-slate-950 px-4 py-2 rounded-xl font-bold text-sm">Refresh</button>
          </div>
        </div>

        {actionMessage && <div className="bg-yellow-100 text-yellow-900 rounded-2xl p-4 font-bold mb-8">{actionMessage}</div>}

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {cards.map((card) => (
            <a key={card.href + card.title} href={card.href} className="bg-white text-slate-950 rounded-3xl p-6 shadow-xl border hover:scale-[1.01] transition block">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0"><h2 className="text-2xl font-black">{card.title}</h2><p className="text-gray-600 mt-2">{card.note}</p></div>
                <span className="bg-pink-50 text-pink-600 rounded-full px-4 py-1 text-sm font-black whitespace-nowrap shrink-0 text-center min-w-10">{card.value}</span>
              </div>
            </a>
          ))}
        </div>

        {!loading && !userId && <div className="bg-white text-slate-950 rounded-3xl p-8 mt-8"><h2 className="text-2xl font-black">Login required</h2><p className="text-gray-600 mt-2">Login to see your submissions, requests, assignments, and notifications.</p><a href="/login" className="inline-block bg-pink-600 text-white px-5 py-3 rounded-xl font-bold mt-5">Go to Login</a></div>}

        {!loading && userId && <div className="space-y-8 mt-8">
          <section className="grid xl:grid-cols-2 gap-6">
            <StatusSummary title="Event Submission Status" counts={eventStatusCounts} />
            <StatusSummary title="Business Listing Status" counts={businessStatusCounts} />
          </section>

          <section className="bg-white/10 border border-white/10 rounded-3xl p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
              <div><h2 className="text-2xl font-black">Recent Activity</h2><p className="text-slate-300 text-sm mt-1">Latest activity across your SDTV submissions and requests.</p></div>
              <a href="/contact" className="bg-pink-600 text-white px-4 py-2 rounded-xl font-bold">New Request</a>
            </div>
            <div className="grid md:grid-cols-2 gap-4">{recentActivity.map((item, index) => <MiniRow key={`${item.label}-${index}`} {...item} />)}{recentActivity.length === 0 && <div className="text-slate-300">No recent activity found yet.</div>}</div>
          </section>

          <section id="events" className="bg-white text-slate-950 rounded-3xl p-6 md:p-8 shadow-xl scroll-mt-24">
            <div className="flex items-center justify-between gap-4 mb-5"><div><h2 className="text-2xl font-black">My Events</h2><p className="text-gray-600 text-sm">Recent events submitted by your account.</p></div><a href="/events" className="text-pink-600 font-black">Open Events →</a></div>
            <div className="grid gap-4">{events.map((event) => { const image = firstImage(event); return <article key={event.id} className="border rounded-2xl p-4 grid md:grid-cols-[96px_1fr_auto] gap-4 items-center">{image ? <img src={image} alt={event.title} className="w-24 h-24 rounded-xl object-cover" /> : <div className="w-24 h-24 bg-pink-50 text-pink-600 rounded-xl grid place-items-center font-black text-xs">SDTV</div>}<div><h3 className="font-black text-xl">{event.title}</h3><p className="text-gray-600 text-sm">{formatDate(event.date)} · {event.location}</p><p className="text-xs text-gray-500 mt-1">Status: {statusText(event.status)}</p></div><a href={`/events/${event.id}`} className="bg-slate-950 text-white px-4 py-2 rounded-xl font-bold text-sm">View</a></article>; })}{events.length === 0 && <p className="text-gray-500">No event submissions found for this account.</p>}</div>
          </section>

          <section id="businesses" className="bg-white text-slate-950 rounded-3xl p-6 md:p-8 shadow-xl scroll-mt-24">
            <div className="flex items-center justify-between gap-4 mb-5"><div><h2 className="text-2xl font-black">My Business Listings</h2><p className="text-gray-600 text-sm">Recent business listings submitted by your account.</p></div><a href="/businesses" className="text-pink-600 font-black">Open Directory →</a></div>
            <div className="grid gap-4">{businesses.map((business) => { const image = firstImage(business); return <article key={business.id} className="border rounded-2xl p-4 grid md:grid-cols-[96px_1fr] gap-4 items-center">{image ? <img src={image} alt={business.name} className="w-24 h-24 rounded-xl object-cover" /> : <div className="w-24 h-24 bg-pink-50 text-pink-600 rounded-xl grid place-items-center font-black text-xs">Local</div>}<div><h3 className="font-black text-xl">{business.name}</h3><p className="text-gray-600 text-sm">{business.category || "Business"}</p><p className="text-xs text-gray-500 mt-1">Status: {statusText(business.status)}</p></div></article>; })}{businesses.length === 0 && <p className="text-gray-500">No business listings found for this account.</p>}</div>
          </section>

          <section id="coverage" className="bg-white text-slate-950 rounded-3xl p-6 md:p-8 shadow-xl scroll-mt-24">
            <h2 className="text-2xl font-black mb-1">My Coverage & Crew Requests</h2><p className="text-gray-600 text-sm mb-5">Coverage and crew requests tied to your account or email address.</p>
            <div className="grid gap-4">{coverageRequests.map((request) => <article key={request.id} className="border rounded-2xl p-4"><div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3"><div><h3 className="font-black text-xl">{request.event_title || "Coverage request"}</h3><p className="text-gray-600 text-sm">Type: {request.assignment_type || "request"}</p><p className="text-xs text-gray-500 mt-1">Submitted: {formatDateTime(request.created_at)}</p></div><span className="bg-pink-50 text-pink-600 px-3 py-1 rounded-full text-xs font-black uppercase">{statusText(request.status)}</span></div></article>)}{coverageRequests.length === 0 && <p className="text-gray-500">No coverage or crew requests found.</p>}</div>
          </section>

          <section id="contacts" className="bg-white text-slate-950 rounded-3xl p-6 md:p-8 shadow-xl scroll-mt-24">
            <div className="flex items-center justify-between gap-4 mb-5"><div><h2 className="text-2xl font-black">My Contact Requests</h2><p className="text-gray-600 text-sm">Contact requests submitted with {email}.</p></div><a href="/contact" className="text-pink-600 font-black">Submit New →</a></div>
            <div className="grid gap-4">{contactRequests.map((request) => <article key={request.id} className="border rounded-2xl p-4"><div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3"><div><h3 className="font-black text-xl">{request.interest || "Contact request"}</h3><p className="text-gray-600 text-sm whitespace-pre-wrap mt-1">{request.message || "No message provided."}</p></div><p className="text-xs text-gray-500">{formatDateTime(request.created_at)}</p></div></article>)}{contactRequests.length === 0 && <p className="text-gray-500">No contact requests found for this email.</p>}</div>
          </section>

          <section id="roles" className="bg-white text-slate-950 rounded-3xl p-6 md:p-8 shadow-xl scroll-mt-24">
            <h2 className="text-2xl font-black mb-1">My Role Requests</h2><p className="text-gray-600 text-sm mb-5">Team, crew, or access requests submitted by this account.</p>
            <div className="grid gap-4">{roleRequests.map((request) => <article key={request.id} className="border rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"><div><h3 className="font-black text-xl">{request.approved_role || request.requested_role || "Role request"}</h3><p className="text-gray-600 text-sm">Submitted {formatDateTime(request.created_at)}</p></div><span className="bg-pink-50 text-pink-600 px-3 py-1 rounded-full text-xs font-black uppercase">{statusText(request.status)}</span></article>)}{roleRequests.length === 0 && <p className="text-gray-500">No role requests found.</p>}</div>
          </section>
        </div>}
      </div>
      <SiteFooter />
    </main>
  );
}
