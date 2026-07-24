"use client";

import { useEffect, useMemo, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import CheckedExternalLink from "../../components/CheckedExternalLink";
import { AUTH_STORAGE_KEY, getSupabaseBrowserClient } from "../../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();
type Candidate = { url: string; source: string };
type Activity = { id: string; business_id: string; activity_label: string; activity_type: string; actor_email?: string | null; details?: any; created_at: string };

type InlineMessage = { text: string; tone: "info" | "success" | "error" };

function roleContainsAdmin(role: string) { return String(role || "").toLowerCase().trim().includes("admin"); }
function getImage(row: any) { return Array.isArray(row?.image_urls) && row.image_urls.length ? row.image_urls[0] : row?.image || ""; }
function normalizeWebsite(value: string) { const trimmed = String(value || "").trim(); return !trimmed ? "" : /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`; }
function formatDate(value?: string | null) { return value ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"; }
function normalizeWhatsAppPhone(value?: string | null) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 10) return `1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return digits;
  return digits;
}
function statusClass(status?: string | null) {
  const value = String(status || "pending").toLowerCase();
  if (["approved", "claimed", "approved_as_shown"].includes(value)) return "bg-green-100 text-green-800";
  if (["rejected", "opted_out", "send_failed"].includes(value)) return "bg-red-100 text-red-800";
  if (["on_hold", "correction_requested", "notice_sent"].includes(value)) return "bg-yellow-100 text-yellow-800";
  return "bg-gray-100 text-gray-800";
}
function ImageThumb({ src, label }: { src?: string; label: string }) {
  if (!src) return <div className="grid h-28 w-28 place-items-center rounded-xl bg-pink-50 px-2 text-center text-xs font-black text-pink-600">No image</div>;
  return <img src={src} alt={label} className="h-28 w-28 rounded-xl border bg-gray-100 object-cover" />;
}

export default function StudioBusinessesPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Checking access...");
  const [actionMessage, setActionMessage] = useState("");
  const [inlineMessages, setInlineMessages] = useState<Record<string, InlineMessage>>({});
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [activities, setActivities] = useState<Record<string, Activity[]>>({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [outreachFilter, setOutreachFilter] = useState("all");
  const [websiteDrafts, setWebsiteDrafts] = useState<Record<string, string>>({});
  const [emailDrafts, setEmailDrafts] = useState<Record<string, string>>({});
  const [phoneDrafts, setPhoneDrafts] = useState<Record<string, string>>({});
  const [savingWebsite, setSavingWebsite] = useState("");
  const [savingEmail, setSavingEmail] = useState("");
  const [savingPhone, setSavingPhone] = useState("");
  const [sendingNotice, setSendingNotice] = useState("");
  const [savingRights, setSavingRights] = useState("");
  const [discovering, setDiscovering] = useState("");
  const [candidates, setCandidates] = useState<Record<string, Candidate[]>>({});
  const canAccess = Boolean(user && roleContainsAdmin(role));

  function setBusinessMessage(id: string, text: string, tone: InlineMessage["tone"] = "info") {
    setInlineMessages((current) => ({ ...current, [id]: { text, tone } }));
  }

  async function loadBusinesses() {
    const { data, error } = await supabase.from("local_businesses")
      .select("id,name,address,website,category,discount,offer,poc_name,poc_email,poc_phone,contact_email,image,image_urls,status,approved,created_at,source_name,source_url,import_batch,imported_at,review_notes,outreach_status,outreach_sent_at,outreach_response_due_at,outreach_recipient,outreach_send_count,last_outreach_sent_at,claimed_at,opted_out_at,owner_response_type,owner_response_notes,owner_verified,logo_rights_status,logo_source_url,logo_reviewed_at")
      .order("created_at", { ascending: false });
    if (error) { setActionMessage(`Could not load businesses: ${error.message}`); return; }
    const rows = data || [];
    setBusinesses(rows);
    setWebsiteDrafts((current) => { const next = { ...current }; rows.forEach((row: any) => { if (next[row.id] === undefined) next[row.id] = row.website || ""; }); return next; });
    setEmailDrafts((current) => { const next = { ...current }; rows.forEach((row: any) => { if (next[row.id] === undefined) next[row.id] = row.contact_email || row.poc_email || ""; }); return next; });
    setPhoneDrafts((current) => { const next = { ...current }; rows.forEach((row: any) => { if (next[row.id] === undefined) next[row.id] = row.poc_phone || ""; }); return next; });
    if (rows.length) {
      const { data: activityRows } = await supabase.from("business_activity_log").select("id,business_id,activity_label,activity_type,actor_email,details,created_at").in("business_id", rows.map((row: any) => row.id)).order("created_at", { ascending: false });
      const grouped: Record<string, Activity[]> = {};
      (activityRows || []).forEach((activity: Activity) => { grouped[activity.business_id] = [...(grouped[activity.business_id] || []), activity].slice(0, 8); });
      setActivities(grouped);
    }
  }

  async function init() {
    setLoading(true); setMessage("Checking access...");
    const sessionResult = await supabase.auth.getSession();
    const currentUser = sessionResult.data?.session?.user || null;
    setUser(currentUser);
    if (!currentUser) { setRole(""); setBusinesses([]); setMessage("Please login to access Studio Businesses."); setLoading(false); return; }
    const adminResult = await supabase.from("admins").select("role").or(`user_id.eq.${currentUser.id},email.eq.${currentUser.email}`).maybeSingle();
    const nextRole = adminResult.data?.role || "";
    setRole(nextRole);
    if (!roleContainsAdmin(nextRole)) { setMessage("You are logged in, but this account does not have admin access."); setLoading(false); return; }
    await loadBusinesses(); setMessage(""); setLoading(false);
  }

  useEffect(() => { const params = new URLSearchParams(window.location.search); const requestedSearch = params.get("search"); if (requestedSearch) { setSearch(requestedSearch); setStatusFilter("all"); } init(); }, []);

  async function saveWebsite(business: any) {
    const website = normalizeWebsite(websiteDrafts[business.id] || "");
    if (!website) return setBusinessMessage(business.id, `Enter an official website for ${business.name}.`, "error");
    try { new URL(website); } catch { return setBusinessMessage(business.id, "Enter a valid website address.", "error"); }
    setSavingWebsite(business.id); setBusinessMessage(business.id, `Saving website for ${business.name}...`);
    const note = `${business.review_notes ? `${business.review_notes}\n` : ""}Official website reviewed and saved on ${new Date().toISOString()}`;
    const { error } = await supabase.from("local_businesses").update({ website, review_notes: note }).eq("id", business.id);
    setSavingWebsite("");
    if (error) return setBusinessMessage(business.id, `Could not save website: ${error.message}`, "error");
    setBusinessMessage(business.id, `Official website saved for ${business.name}.`, "success"); await loadBusinesses();
  }

  async function saveContactEmail(business: any) {
    const email = String(emailDrafts[business.id] || "").trim().toLowerCase();
    if (!email || !email.includes("@")) return setBusinessMessage(business.id, "Enter a valid business contact email.", "error");
    setSavingEmail(business.id); setBusinessMessage(business.id, "Saving contact email...");
    const { error } = await supabase.from("local_businesses").update({ contact_email: email }).eq("id", business.id);
    setSavingEmail("");
    if (error) return setBusinessMessage(business.id, `Could not save contact email: ${error.message}`, "error");
    await supabase.from("business_activity_log").insert({ business_id: business.id, activity_type: "contact_email_saved", activity_label: "Business contact email saved", actor_email: user?.email || null, details: { email } });
    setBusinessMessage(business.id, `Contact email saved for ${business.name}.`, "success"); await loadBusinesses();
  }

  async function saveContactPhone(business: any) {
    const phone = String(phoneDrafts[business.id] || "").trim();
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) return setBusinessMessage(business.id, "Enter a valid phone number with area code.", "error");
    setSavingPhone(business.id); setBusinessMessage(business.id, "Saving phone number...");
    const { error } = await supabase.from("local_businesses").update({ poc_phone: phone }).eq("id", business.id);
    setSavingPhone("");
    if (error) return setBusinessMessage(business.id, `Could not save phone number: ${error.message}`, "error");
    await supabase.from("business_activity_log").insert({ business_id: business.id, activity_type: "contact_phone_saved", activity_label: "Business phone number saved", actor_email: user?.email || null, details: { phone } });
    setBusinessMessage(business.id, `Phone number saved for ${business.name}.`, "success"); await loadBusinesses();
  }

  async function sendListingNotice(business: any) {
    const recipient = String(emailDrafts[business.id] || business.contact_email || business.poc_email || "").trim().toLowerCase();
    if (!recipient || !recipient.includes("@")) return setBusinessMessage(business.id, "Add and save a valid contact email first.", "error");
    const forceResend = Boolean(business.outreach_sent_at);
    if (forceResend && !window.confirm(`A notice was already sent to ${business.outreach_recipient || recipient}. Send it again and restart the 14-day review period?`)) return;
    setSendingNotice(business.id); setBusinessMessage(business.id, `${forceResend ? "Resending" : "Sending"} listing notice to ${recipient}...`);
    const session = await supabase.auth.getSession();
    const response = await fetch("/api/studio/business-listing-notice", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${session.data.session?.access_token || ""}` }, body: JSON.stringify({ businessId: business.id, recipient, forceResend }) });
    const result = await response.json();
    setSendingNotice("");
    if (!response.ok) return setBusinessMessage(business.id, result.error || "Could not send listing notice.", "error");
    setBusinessMessage(business.id, `Listing notice sent to ${result.recipient}. Response due ${formatDate(result.responseDueAt)}.`, "success"); await loadBusinesses();
  }

  async function updateLogoRights(business: any, value: string) {
    setSavingRights(business.id); setBusinessMessage(business.id, "Updating logo-rights review...");
    const payload: any = { logo_rights_status: value, logo_reviewed_by: user?.id || null, logo_reviewed_at: new Date().toISOString() };
    if (value === "official_site_review_needed" && business.website) payload.logo_source_url = business.website;
    const { error } = await supabase.from("local_businesses").update(payload).eq("id", business.id);
    setSavingRights("");
    if (error) return setBusinessMessage(business.id, `Could not update logo rights: ${error.message}`, "error");
    await supabase.from("business_activity_log").insert({ business_id: business.id, activity_type: "logo_rights_reviewed", activity_label: "Logo rights status updated", actor_email: user?.email || null, details: { status: value } });
    setBusinessMessage(business.id, `Logo rights status updated for ${business.name}.`, "success"); await loadBusinesses();
  }

  async function discoverImages(business: any) {
    if (!business.website) return setBusinessMessage(business.id, `Save an official website for ${business.name} first.`, "error");
    setDiscovering(business.id); setBusinessMessage(business.id, `Checking ${business.name}'s official website...`);
    const session = await supabase.auth.getSession();
    const response = await fetch("/api/studio/business-image-candidates", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${session.data.session?.access_token || ""}` }, body: JSON.stringify({ website: business.website }) });
    const result = await response.json(); setDiscovering("");
    if (!response.ok) return setBusinessMessage(business.id, result.error || "Could not discover images.", "error");
    setCandidates((current) => ({ ...current, [business.id]: result.candidates || [] }));
    setBusinessMessage(business.id, result.candidates?.length ? `Found ${result.candidates.length} candidate image(s) for ${business.name}.` : `No suitable official-site images were found for ${business.name}.`, result.candidates?.length ? "success" : "info");
  }

  async function applyImage(business: any, candidate: Candidate) {
    if (!window.confirm(`Use this ${candidate.source} for ${business.name}? This marks it as an official-site image requiring rights review.`)) return;
    const urls = Array.from(new Set([candidate.url, ...(business.image_urls || [])]));
    const { error } = await supabase.from("local_businesses").update({ image: candidate.url, image_urls: urls, logo_rights_status: "official_site_review_needed", logo_source_url: candidate.url, logo_reviewed_at: null, logo_reviewed_by: null }).eq("id", business.id);
    if (error) return setBusinessMessage(business.id, `Could not save image: ${error.message}`, "error");
    await supabase.from("business_activity_log").insert({ business_id: business.id, activity_type: "official_image_selected", activity_label: "Official-site image selected", actor_email: user?.email || null, details: { url: candidate.url, source: candidate.source } });
    setCandidates((current) => ({ ...current, [business.id]: [] })); setBusinessMessage(business.id, `Image saved for ${business.name}; rights review is still required.`, "success"); await loadBusinesses();
  }

  async function updateBusinessStatus(business: any, status: string) {
    const payload: any = { status, approved: status === "approved" };
    if (status === "approved") { payload.approved_by = user?.email || user?.id || null; payload.approved_at = new Date().toISOString(); }
    const { error } = await supabase.from("local_businesses").update(payload).eq("id", business.id);
    if (error) return setBusinessMessage(business.id, `Business update failed: ${error.message}`, "error");
    setBusinessMessage(business.id, `Business marked ${status}.`, "success"); await loadBusinesses();
  }

  async function deleteBusiness(id: string, name: string) { if (!window.confirm(`Delete business: ${name}? This cannot be undone.`)) return; const { error } = await supabase.from("local_businesses").delete().eq("id", id); if (error) return setBusinessMessage(id, `Business delete failed: ${error.message}`, "error"); setActionMessage(`${name} was deleted.`); await loadBusinesses(); }
  async function logout() { await supabase.auth.signOut({ scope: "global" }); try { Object.keys(localStorage).filter((key) => key.toLowerCase().includes("supabase") || key.toLowerCase().includes("sb-") || key === AUTH_STORAGE_KEY).forEach((key) => localStorage.removeItem(key)); } catch {} window.location.href = "/login"; }

  const pending = businesses.filter((b) => b.status !== "approved");
  const missingWebsite = businesses.filter((b) => !b.website).length;
  const missingImage = businesses.filter((b) => !getImage(b)).length;
  const waitingResponse = businesses.filter((b) => b.outreach_status === "notice_sent").length;
  const sources = Array.from(new Set(businesses.map((b) => b.source_name).filter(Boolean))).sort();
  const visibleBusinesses = useMemo(() => {
    const query = search.trim().toLowerCase();
    return businesses.filter((business) => {
      const normalizedStatus = String(business.status || "pending");
      const statusMatches = statusFilter === "all" || (statusFilter === "pending" ? normalizedStatus === "pending" : normalizedStatus === statusFilter);
      const sourceMatches = sourceFilter === "all" || (sourceFilter === "imported" ? Boolean(business.import_batch) : business.source_name === sourceFilter);
      const outreachMatches = outreachFilter === "all" || business.outreach_status === outreachFilter || (outreachFilter === "ready" && business.contact_email && !business.outreach_sent_at && !business.opted_out_at);
      const textMatches = !query || [business.name, business.address, business.category, business.source_name, business.import_batch, business.contact_email, business.poc_phone].some((value) => String(value || "").toLowerCase().includes(query));
      return statusMatches && sourceMatches && outreachMatches && textMatches;
    });
  }, [businesses, search, statusFilter, sourceFilter, outreachFilter]);

  return <main className="min-h-screen bg-slate-950 text-white"><StudioHeader/><div className="mx-auto max-w-7xl px-6 py-10">
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><h1 className="text-4xl font-black md:text-5xl">Businesses Management</h1><p className="mt-2 text-slate-300">Research, enrich, notify, and manage each business from one workspace.</p></div><div className="flex gap-3"><button onClick={init} className="rounded-xl bg-white px-5 py-3 font-bold text-slate-950">Refresh</button>{user&&<button onClick={logout} className="rounded-xl border border-red-400 px-5 py-3 font-bold text-red-300">Logout</button>}</div></div>
    {loading&&<div className="rounded-2xl border border-white/10 bg-white/10 p-6">{message}</div>}
    {!loading&&!canAccess&&<div className="max-w-xl rounded-2xl bg-white p-8 text-slate-950"><h2 className="text-2xl font-black">Access Required</h2><p className="mt-3 text-gray-600">{message}</p></div>}
    {!loading&&canAccess&&<div className="space-y-8">{actionMessage&&<div className="rounded-2xl bg-yellow-100 p-4 font-bold text-yellow-900">{actionMessage}</div>}
      <div className="grid gap-4 md:grid-cols-5">{[["All Businesses",businesses.length],["Pending",pending.length],["Missing Website",missingWebsite],["Missing Image",missingImage],["Awaiting Response",waitingResponse]].map(([label,value])=><div key={String(label)} className="rounded-2xl border border-white/10 bg-white/10 p-5"><p className="text-slate-300">{label}</p><p className="text-3xl font-black">{value}</p></div>)}</div>
      <section className="rounded-2xl bg-white p-6 text-slate-950"><div className="mb-5 flex flex-col gap-4"><div><h2 className="text-2xl font-black">Unified Business Review Queue</h2><p className="mt-1 text-sm text-gray-500">Find contact details, review image rights, send the 14-day notice, and track the owner response.</p></div><div className="grid gap-3 md:grid-cols-4"><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search name, email, phone, city..." className="rounded-lg border px-3 py-2"/><select value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)} className="rounded-lg border px-3 py-2"><option value="pending">Pending</option><option value="all">All listing statuses</option><option value="approved">Approved</option><option value="on_hold">On hold</option><option value="rejected">Rejected</option></select><select value={outreachFilter} onChange={(e)=>setOutreachFilter(e.target.value)} className="rounded-lg border px-3 py-2"><option value="all">All outreach</option><option value="ready">Ready to notify</option><option value="not_sent">Notice not sent</option><option value="notice_sent">Awaiting response</option><option value="claimed">Claimed</option><option value="correction_requested">Correction requested</option><option value="approved_as_shown">Approved as shown</option><option value="opted_out">Opted out</option><option value="send_failed">Send failed</option></select><select value={sourceFilter} onChange={(e)=>setSourceFilter(e.target.value)} className="rounded-lg border px-3 py-2"><option value="all">All sources</option><option value="imported">All imported</option>{sources.map((source:any)=><option key={source} value={source}>{source}</option>)}</select></div></div>
        <p className="mb-4 text-sm text-gray-500">Showing {visibleBusinesses.length} of {businesses.length} businesses.</p>
        <div className="grid gap-5">{visibleBusinesses.map((business)=>{const found=candidates[business.id]||[];const history=activities[business.id]||[];const websiteSearch=`https://www.google.com/search?q=${encodeURIComponent(`official website ${business.name} ${business.address||"Seattle Washington"}`)}`;const emailSearch=`https://www.google.com/search?q=${encodeURIComponent(`${business.name} ${business.address||"Seattle Washington"} contact email`)}`;const phoneSearch=`https://www.google.com/search?q=${encodeURIComponent(`${business.name} ${business.address||"Seattle Washington"} phone number`)}`;const whatsAppPhone=normalizeWhatsAppPhone(phoneDrafts[business.id]||business.poc_phone);const cardMessage=inlineMessages[business.id];return <article key={business.id} className="rounded-2xl border p-4"><div className="grid items-start gap-4 md:grid-cols-[112px_1fr] lg:grid-cols-[112px_1fr_auto]"><ImageThumb src={getImage(business)} label={business.name}/><div><h3 className="text-xl font-black">{business.name}</h3><p className="text-sm text-gray-600">{business.category||"Uncategorized"} · {business.address||"No address"}</p><div className="mt-2 flex flex-wrap gap-3">{business.website&&<CheckedExternalLink href={business.website} notFoundMessage="Page not found." className="text-sm font-bold text-pink-600">Business website</CheckedExternalLink>}{business.source_url&&<a href={business.source_url} target="_blank" rel="noreferrer" className="text-sm font-bold text-blue-700">Review source</a>}{business.poc_phone&&<a href={`tel:${business.poc_phone}`} className="text-sm font-bold text-slate-700">Call {business.poc_phone}</a>}{whatsAppPhone&&<a href={`https://wa.me/${whatsAppPhone}`} target="_blank" rel="noreferrer" className="text-sm font-bold text-green-700">WhatsApp</a>}</div><div className="mt-3 flex flex-wrap gap-2"><span className={`rounded-full px-3 py-1 text-sm font-bold ${statusClass(business.status)}`}>Listing: {business.status||"pending"}</span><span className={`rounded-full px-3 py-1 text-sm font-bold ${statusClass(business.outreach_status)}`}>Outreach: {business.outreach_status||"not_sent"}</span><span className="rounded-full bg-purple-100 px-3 py-1 text-sm font-bold text-purple-800">Logo: {business.logo_rights_status||"unknown"}</span></div>{business.outreach_sent_at&&<p className="mt-2 text-xs text-gray-600">Notice sent {formatDate(business.last_outreach_sent_at||business.outreach_sent_at)} · Due {formatDate(business.outreach_response_due_at)} · Sends {business.outreach_send_count||1}</p>}{business.owner_response_notes&&<p className="mt-2 rounded-lg bg-blue-50 p-2 text-sm text-blue-900"><strong>Owner response:</strong> {business.owner_response_notes}</p>}</div>
          <div className="flex max-w-md flex-wrap gap-2 lg:justify-end">{!business.website&&<a href={websiteSearch} target="_blank" rel="noreferrer" className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white">Find website</a>}<a href={emailSearch} target="_blank" rel="noreferrer" className="rounded-lg bg-cyan-700 px-3 py-2 text-sm font-bold text-white">Find email</a><a href={phoneSearch} target="_blank" rel="noreferrer" className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-bold text-white">Find phone</a>{business.website&&<button disabled={discovering===business.id} onClick={()=>discoverImages(business)} className="rounded-lg bg-pink-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">{discovering===business.id?"Checking...":"Find official images"}</button>}<a href={`/studio/businesses/${business.id}`} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white">Full Edit</a><button onClick={()=>updateBusinessStatus(business,"approved")} className="rounded-lg bg-green-600 px-3 py-2 text-sm font-bold text-white">Approve</button><button onClick={()=>updateBusinessStatus(business,"on_hold")} className="rounded-lg bg-yellow-500 px-3 py-2 text-sm font-bold text-white">On Hold</button><button onClick={()=>updateBusinessStatus(business,"rejected")} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white">Reject</button><button onClick={()=>deleteBusiness(business.id,business.name)} className="rounded-lg border border-red-600 px-3 py-2 text-sm font-bold text-red-600">Delete</button></div></div>
          {cardMessage&&<div className={`mt-4 rounded-xl border p-3 text-sm font-bold ${cardMessage.tone==="success"?"border-green-200 bg-green-50 text-green-800":cardMessage.tone==="error"?"border-red-200 bg-red-50 text-red-800":"border-blue-200 bg-blue-50 text-blue-800"}`}>{cardMessage.text}</div>}
          <div className="mt-4 grid gap-4 lg:grid-cols-4"><div className="rounded-xl bg-slate-50 p-4"><p className="mb-2 text-sm font-black">Official website</p><input value={websiteDrafts[business.id]??""} onChange={(e)=>setWebsiteDrafts((current)=>({...current,[business.id]:e.target.value}))} placeholder="https://official-site.com" className="w-full rounded-lg border bg-white px-3 py-2"/><button disabled={savingWebsite===business.id} onClick={()=>saveWebsite(business)} className="mt-2 w-full rounded-lg bg-amber-500 px-4 py-2 text-sm font-black">{savingWebsite===business.id?"Saving...":"Save website"}</button></div><div className="rounded-xl bg-slate-50 p-4"><p className="mb-2 text-sm font-black">Business contact email</p><input value={emailDrafts[business.id]??""} onChange={(e)=>setEmailDrafts((current)=>({...current,[business.id]:e.target.value}))} placeholder="owner@business.com" className="w-full rounded-lg border bg-white px-3 py-2"/><div className="mt-2 grid grid-cols-2 gap-2"><button disabled={savingEmail===business.id} onClick={()=>saveContactEmail(business)} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-black text-white">{savingEmail===business.id?"Saving...":"Save email"}</button><button disabled={sendingNotice===business.id||Boolean(business.opted_out_at)} onClick={()=>sendListingNotice(business)} className="rounded-lg bg-pink-600 px-3 py-2 text-sm font-black text-white disabled:opacity-40">{sendingNotice===business.id?"Sending...":business.outreach_sent_at?"Resend notice":"Send notice"}</button></div></div><div className="rounded-xl bg-slate-50 p-4"><p className="mb-2 text-sm font-black">Business phone</p><input value={phoneDrafts[business.id]??""} onChange={(e)=>setPhoneDrafts((current)=>({...current,[business.id]:e.target.value}))} placeholder="+1 425 555 0123" className="w-full rounded-lg border bg-white px-3 py-2"/><div className="mt-2 grid grid-cols-2 gap-2"><button disabled={savingPhone===business.id} onClick={()=>saveContactPhone(business)} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-black text-white">{savingPhone===business.id?"Saving...":"Save phone"}</button>{whatsAppPhone?<a href={`https://wa.me/${whatsAppPhone}`} target="_blank" rel="noreferrer" className="rounded-lg bg-green-600 px-3 py-2 text-center text-sm font-black text-white">WhatsApp</a>:<button disabled className="rounded-lg bg-gray-300 px-3 py-2 text-sm font-black text-gray-600">WhatsApp</button>}</div></div><div className="rounded-xl bg-slate-50 p-4"><p className="mb-2 text-sm font-black">Logo rights review</p><select value={business.logo_rights_status||"unknown"} disabled={savingRights===business.id} onChange={(e)=>updateLogoRights(business,e.target.value)} className="w-full rounded-lg border bg-white px-3 py-2"><option value="unknown">Unknown rights</option><option value="official_site_review_needed">Official-site image — review needed</option><option value="permission_confirmed">Permission confirmed</option><option value="registered_mark_signal">Registered-mark signal</option><option value="trademark_claimed">Trademark claimed</option><option value="do_not_use">Do not use</option></select><p className="mt-2 text-xs text-gray-500">This records review evidence; it does not provide a legal conclusion.</p></div></div>
          {history.length>0&&<details className="mt-4 rounded-xl border bg-white p-4"><summary className="cursor-pointer font-black">Activity timeline ({history.length})</summary><div className="mt-3 space-y-3">{history.map((item)=><div key={item.id} className="border-l-4 border-pink-200 pl-3"><p className="font-bold">{item.activity_label}</p><p className="text-xs text-gray-500">{formatDate(item.created_at)}{item.actor_email?` · ${item.actor_email}`:""}</p></div>)}</div></details>}
          {found.length>0&&<div className="mt-5 border-t pt-5"><p className="mb-3 font-black">Official-site image candidates</p><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{found.map((candidate)=><div key={candidate.url} className="rounded-xl border p-3"><img src={candidate.url} alt={`${business.name} candidate`} className="h-40 w-full rounded-lg bg-gray-50 object-contain"/><p className="mt-2 text-xs text-gray-500">{candidate.source}</p><button onClick={()=>applyImage(business,candidate)} className="mt-3 w-full rounded-lg bg-green-600 px-3 py-2 text-sm font-black text-white">Use & review rights</button></div>)}</div></div>}
        </article>})}{visibleBusinesses.length===0&&<p className="text-gray-500">No businesses match the current filters.</p>}</div>
      </section>
    </div>}
  </div></main>;
}
