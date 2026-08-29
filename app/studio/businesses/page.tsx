"use client";

import { useEffect, useMemo, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import CheckedExternalLink from "../../components/CheckedExternalLink";
import { AUTH_STORAGE_KEY, getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { useCurrentSite } from "../../lib/sites/SiteContext";
import { forSite } from "../../lib/sites/query";

const supabase = getSupabaseBrowserClient();

type Candidate = { url: string; source: string };
type Activity = { id: string; business_id: string; activity_label: string; actor_email?: string | null; created_at: string };
type InlineMessage = { text: string; tone: "info" | "success" | "error"; fallbackUrl?: string };
type Draft = { website: string; email: string; phone: string; imageUrl: string; logoRights: string };

function roleContainsAdmin(role: string) { return String(role || "").toLowerCase().includes("admin"); }
function getImage(row: any) { return Array.isArray(row?.image_urls) && row.image_urls.length ? row.image_urls[0] : row?.image || ""; }
function normalizeWebsite(value: string) { const v = String(value || "").trim(); return !v ? "" : /^https?:\/\//i.test(v) ? v : `https://${v}`; }
function formatDate(value?: string | null) { return value ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"; }
function normalizeWhatsAppPhone(value?: string | null) { const d = String(value || "").replace(/\D/g, ""); return d.length === 10 ? `1${d}` : d; }
function statusClass(status?: string | null) {
  const value = String(status || "pending").toLowerCase();
  if (["approved", "claimed", "approved_as_shown"].includes(value)) return "bg-green-100 text-green-800";
  if (["rejected", "opted_out", "send_failed"].includes(value)) return "bg-red-100 text-red-800";
  if (["on_hold", "correction_requested", "notice_sent"].includes(value)) return "bg-yellow-100 text-yellow-800";
  return "bg-gray-100 text-gray-800";
}
function ImageThumb({ src, label }: { src?: string; label: string }) {
  return src ? <img src={src} alt={label} className="h-28 w-28 rounded-xl border bg-gray-100 object-cover" /> : <div className="grid h-28 w-28 place-items-center rounded-xl bg-pink-50 px-2 text-center text-xs font-black text-pink-600">No image</div>;
}

export default function StudioBusinessesPage() {
  const site = useCurrentSite();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Checking access...");
  const [actionMessage, setActionMessage] = useState("");
  const [inlineMessages, setInlineMessages] = useState<Record<string, InlineMessage>>({});
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [activities, setActivities] = useState<Record<string, Activity[]>>({});
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savedSnapshots, setSavedSnapshots] = useState<Record<string, Draft>>({});
  const [candidates, setCandidates] = useState<Record<string, Candidate[]>>({});
  const [busy, setBusy] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [outreachFilter, setOutreachFilter] = useState("all");
  const canAccess = Boolean(user && roleContainsAdmin(role));

  function setBusinessMessage(id: string, text: string, tone: InlineMessage["tone"] = "info", fallbackUrl?: string) {
    setInlineMessages((current) => ({ ...current, [id]: { text, tone, fallbackUrl } }));
  }
  function setBusyAction(id: string, action: string) { setBusy((current) => ({ ...current, [id]: action })); }
  function updateDraft(id: string, patch: Partial<Draft>) { setDrafts((current) => ({ ...current, [id]: { ...current[id], ...patch } })); }
  function fallbackUrl(b: any, mode: string) {
    const phrase = mode === "website" ? `official website ${b.name} ${b.address || "Seattle Washington"}` : mode === "email" ? `${b.name} ${b.address || "Seattle Washington"} contact email` : mode === "phone" ? `${b.name} ${b.address || "Seattle Washington"} phone number` : `${b.name} ${b.address || "Seattle Washington"} official logo`;
    return `https://www.google.com/search?q=${encodeURIComponent(phrase)}`;
  }

  async function loadBusinesses() {
    const { data, error } = await forSite(
      supabase.from("local_businesses").select("id,name,address,website,category,poc_name,poc_email,poc_phone,contact_email,image,image_urls,status,approved,created_at,source_name,source_url,import_batch,review_notes,outreach_status,outreach_sent_at,outreach_response_due_at,outreach_recipient,outreach_send_count,last_outreach_sent_at,opted_out_at,owner_response_notes,logo_rights_status"),
      site.id,
    )
      .order("created_at", { ascending: false });
    if (error) { setActionMessage(`Could not load businesses: ${error.message}`); return; }
    const rows = data || [];
    setBusinesses(rows);
    const snapshots: Record<string, Draft> = {};
    rows.forEach((row: any) => { snapshots[row.id] = { website: row.website || "", email: row.contact_email || row.poc_email || "", phone: row.poc_phone || "", imageUrl: getImage(row), logoRights: row.logo_rights_status || "unknown" }; });
    setSavedSnapshots(snapshots);
    setDrafts((current) => { const next = { ...current }; rows.forEach((row: any) => { if (!next[row.id]) next[row.id] = snapshots[row.id]; }); return next; });
    if (rows.length) {
      const { data: activityRows } = await supabase.from("business_activity_log").select("id,business_id,activity_label,actor_email,created_at").in("business_id", rows.map((row: any) => row.id)).order("created_at", { ascending: false });
      const grouped: Record<string, Activity[]> = {};
      (activityRows || []).forEach((item: any) => grouped[item.business_id] = [...(grouped[item.business_id] || []), item].slice(0, 8));
      setActivities(grouped);
    }
  }

  async function init() {
    setLoading(true);
    const session = await supabase.auth.getSession();
    const currentUser = session.data.session?.user || null;
    setUser(currentUser);
    if (!currentUser) { setMessage("Please login to access Studio Businesses."); setLoading(false); return; }
    const admin = await supabase.from("admins").select("role").or(`user_id.eq.${currentUser.id},email.eq.${currentUser.email}`).maybeSingle();
    const nextRole = admin.data?.role || "";
    setRole(nextRole);
    if (!roleContainsAdmin(nextRole)) { setMessage("This account does not have admin access."); setLoading(false); return; }
    await loadBusinesses(); setMessage(""); setLoading(false);
  }
  useEffect(() => { const q = new URLSearchParams(window.location.search).get("search"); if (q) { setSearch(q); setStatusFilter("all"); } init(); }, [site.id]);

  async function discoverContact(b: any, mode: "website" | "email" | "phone") {
    setBusyAction(b.id, `find-${mode}`); setBusinessMessage(b.id, `Checking available sources for ${mode}...`);
    const session = await supabase.auth.getSession();
    const response = await fetch("/api/studio/business-contact-discovery", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${session.data.session?.access_token || ""}` }, body: JSON.stringify({ mode, name: b.name, address: b.address, website: drafts[b.id]?.website || b.website, sourceUrl: b.source_url }) });
    const result = await response.json(); setBusyAction(b.id, "");
    if (!response.ok) return setBusinessMessage(b.id, result.error || `Could not find ${mode}.`, "error", fallbackUrl(b, mode));
    if (result.found && result.value) {
      updateDraft(b.id, mode === "website" ? { website: result.value } : mode === "email" ? { email: result.value } : { phone: result.value });
      return setBusinessMessage(b.id, `Found ${mode}: ${result.value}. Review before saving.`, "success");
    }
    setBusinessMessage(b.id, `No reliable ${mode} was found automatically.`, "info", fallbackUrl(b, mode));
  }

  async function discoverImages(b: any) {
    const website = drafts[b.id]?.website || b.website;
    if (!website) return setBusinessMessage(b.id, "Find the official website first.", "error", fallbackUrl(b, "website"));
    setBusyAction(b.id, "images"); setBusinessMessage(b.id, "Checking the official website for images...");
    const session = await supabase.auth.getSession();
    const response = await fetch("/api/studio/business-image-candidates", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${session.data.session?.access_token || ""}` }, body: JSON.stringify({ website }) });
    const result = await response.json(); setBusyAction(b.id, "");
    if (!response.ok) return setBusinessMessage(b.id, result.error || "Could not find images.", "error", fallbackUrl(b, "image"));
    const found = result.candidates || [];
    setCandidates((current) => ({ ...current, [b.id]: found }));
    if (found[0]?.url) updateDraft(b.id, { imageUrl: found[0].url, logoRights: "official_site_review_needed" });
    setBusinessMessage(b.id, found.length ? `Found ${found.length} image candidates. The first candidate was placed in the image URL field for review.` : "No official-site image was found automatically.", found.length ? "success" : "info", found.length ? undefined : fallbackUrl(b, "image"));
  }

  async function researchBusiness(b: any) {
    setBusyAction(b.id, "research"); setBusinessMessage(b.id, "Researching website, email, phone and images...");
    let website = drafts[b.id]?.website || b.website || "";
    const session = await supabase.auth.getSession();
    async function find(mode: "website" | "email" | "phone") {
      const response = await fetch("/api/studio/business-contact-discovery", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${session.data.session?.access_token || ""}` }, body: JSON.stringify({ mode, name: b.name, address: b.address, website, sourceUrl: b.source_url }) });
      if (!response.ok) return null;
      const result = await response.json(); return result.found ? result.value : null;
    }
    const foundWebsite = website || await find("website"); if (foundWebsite) website = foundWebsite;
    const [email, phone] = await Promise.all([find("email"), find("phone")]);
    let imageUrl = drafts[b.id]?.imageUrl || getImage(b); let imageCandidates: Candidate[] = [];
    if (website) {
      const imageResponse = await fetch("/api/studio/business-image-candidates", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${session.data.session?.access_token || ""}` }, body: JSON.stringify({ website }) });
      if (imageResponse.ok) { const imageResult = await imageResponse.json(); imageCandidates = imageResult.candidates || []; if (imageCandidates[0]?.url) imageUrl = imageCandidates[0].url; }
    }
    updateDraft(b.id, { website: website || drafts[b.id]?.website || "", email: email || drafts[b.id]?.email || "", phone: phone || drafts[b.id]?.phone || "", imageUrl, logoRights: imageUrl && imageUrl !== getImage(b) ? "official_site_review_needed" : drafts[b.id]?.logoRights || "unknown" });
    setCandidates((current) => ({ ...current, [b.id]: imageCandidates }));
    setBusyAction(b.id, "");
    const foundCount = [website, email, phone, imageUrl].filter(Boolean).length;
    setBusinessMessage(b.id, `Research complete: ${foundCount} of 4 core details available. Review highlighted changes, then save once.`, foundCount >= 3 ? "success" : "info", foundCount < 4 ? fallbackUrl(b, !website ? "website" : !email ? "email" : !phone ? "phone" : "image") : undefined);
  }

  async function saveBusinessDetails(b: any) {
    const draft = drafts[b.id]; if (!draft) return;
    const website = normalizeWebsite(draft.website);
    if (website) { try { new URL(website); } catch { return setBusinessMessage(b.id, "Enter a valid website URL.", "error"); } }
    if (draft.email && !draft.email.includes("@")) return setBusinessMessage(b.id, "Enter a valid email address.", "error");
    if (draft.phone && draft.phone.replace(/\D/g, "").length < 10) return setBusinessMessage(b.id, "Enter a valid phone number with area code.", "error");
    if (draft.imageUrl) { try { new URL(draft.imageUrl); } catch { return setBusinessMessage(b.id, "Enter a valid image URL.", "error"); } }
    setBusyAction(b.id, "save"); setBusinessMessage(b.id, "Saving business details...");
    const imageUrls = draft.imageUrl ? Array.from(new Set([draft.imageUrl, ...(b.image_urls || [])])) : (b.image_urls || []);
    const payload: any = { website: website || null, contact_email: draft.email.trim().toLowerCase() || null, poc_phone: draft.phone.trim() || null, image: draft.imageUrl || null, image_urls: imageUrls, logo_rights_status: draft.logoRights };
    if (draft.imageUrl && draft.imageUrl !== getImage(b)) { payload.logo_source_url = draft.imageUrl; payload.logo_reviewed_at = null; payload.logo_reviewed_by = null; }
    const { error } = await forSite(supabase.from("local_businesses").update(payload), site.id).eq("id", b.id);
    setBusyAction(b.id, "");
    if (error) return setBusinessMessage(b.id, error.message, "error");
    await supabase.from("business_activity_log").insert({ business_id: b.id, activity_type: "business_details_saved", activity_label: "Business research details saved", actor_email: user?.email || null, details: payload });
    setBusinessMessage(b.id, "All business details saved.", "success"); await loadBusinesses();
  }

  async function sendNotice(b: any) {
    const recipient = String(drafts[b.id]?.email || b.contact_email || b.poc_email || "").trim().toLowerCase();
    if (!recipient.includes("@")) return setBusinessMessage(b.id, "Find and save a valid email first.", "error");
    const forceResend = Boolean(b.outreach_sent_at); if (forceResend && !window.confirm("Resend the notice and restart the 14-day period?")) return;
    setBusyAction(b.id, "notice"); const session = await supabase.auth.getSession();
    const response = await fetch("/api/studio/business-listing-notice", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${session.data.session?.access_token || ""}` }, body: JSON.stringify({ businessId: b.id, recipient, forceResend }) });
    const result = await response.json(); setBusyAction(b.id, "");
    if (!response.ok) return setBusinessMessage(b.id, result.error || "Notice failed.", "error");
    setBusinessMessage(b.id, `Notice sent. Response due ${formatDate(result.responseDueAt)}.`, "success"); await loadBusinesses();
  }
  async function updateStatus(b: any, status: string) { const payload: any = { status, approved: status === "approved" }; if (status === "approved") { payload.approved_by = user?.email || user?.id; payload.approved_at = new Date().toISOString(); } const { error } = await forSite(supabase.from("local_businesses").update(payload), site.id).eq("id", b.id); if (error) return setBusinessMessage(b.id, error.message, "error"); setBusinessMessage(b.id, `Business marked ${status}.`, "success"); await loadBusinesses(); }
  async function logout() { await supabase.auth.signOut({ scope: "global" }); try { Object.keys(localStorage).filter((k) => k.toLowerCase().includes("supabase") || k.toLowerCase().includes("sb-") || k === AUTH_STORAGE_KEY).forEach((k) => localStorage.removeItem(k)); } catch {} window.location.href = "/login"; }

  const pending = businesses.filter((b) => b.status !== "approved");
  const missingWebsite = businesses.filter((b) => !b.website).length;
  const missingImage = businesses.filter((b) => !getImage(b)).length;
  const waiting = businesses.filter((b) => b.outreach_status === "notice_sent").length;
  const sources = Array.from(new Set(businesses.map((b) => b.source_name).filter(Boolean))).sort();
  const visible = useMemo(() => businesses.filter((b) => { const q = search.toLowerCase(); return (statusFilter === "all" || (statusFilter === "pending" ? (b.status || "pending") === "pending" : b.status === statusFilter)) && (sourceFilter === "all" || (sourceFilter === "imported" ? Boolean(b.import_batch) : b.source_name === sourceFilter)) && (outreachFilter === "all" || b.outreach_status === outreachFilter || (outreachFilter === "ready" && b.contact_email && !b.outreach_sent_at && !b.opted_out_at)) && (!q || [b.name, b.address, b.category, b.source_name, b.contact_email, b.poc_phone].some((v) => String(v || "").toLowerCase().includes(q))); }), [businesses, search, statusFilter, sourceFilter, outreachFilter]);

  return <main className="min-h-screen bg-slate-950 text-white"><StudioHeader/><div className="mx-auto max-w-7xl px-6 py-10">
    <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row"><div><h1 className="text-4xl font-black">Businesses Management</h1><p className="mt-2 text-slate-300">Research once, review all details, and save everything together.</p></div><div className="flex gap-3"><button onClick={init} className="rounded-xl bg-white px-5 py-3 font-bold text-slate-950">Refresh</button>{user&&<button onClick={logout} className="rounded-xl border border-red-400 px-5 py-3 font-bold text-red-300">Logout</button>}</div></div>
    {loading&&<div className="rounded-2xl bg-white/10 p-6">{message}</div>}
    {!loading&&!canAccess&&<div className="rounded-2xl bg-white p-6 text-slate-950">{message}</div>}
    {!loading&&canAccess&&<div className="space-y-8">{actionMessage&&<div className="rounded-xl bg-yellow-100 p-4 text-yellow-900">{actionMessage}</div>}
      <div className="grid gap-4 md:grid-cols-5">{[["All",businesses.length],["Pending",pending.length],["Missing Website",missingWebsite],["Missing Image",missingImage],["Awaiting Response",waiting]].map(([label,value])=><div key={String(label)} className="rounded-2xl bg-white/10 p-5"><p className="text-slate-300">{label}</p><p className="text-3xl font-black">{value}</p></div>)}</div>
      <section className="rounded-2xl bg-white p-6 text-slate-950"><div className="mb-5 grid gap-3 md:grid-cols-4"><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search name, email, phone, city..." className="rounded-lg border px-3 py-2"/><select value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)} className="rounded-lg border px-3 py-2"><option value="pending">Pending</option><option value="all">All listing statuses</option><option value="approved">Approved</option><option value="on_hold">On hold</option><option value="rejected">Rejected</option></select><select value={outreachFilter} onChange={(e)=>setOutreachFilter(e.target.value)} className="rounded-lg border px-3 py-2"><option value="all">All outreach</option><option value="ready">Ready to notify</option><option value="not_sent">Notice not sent</option><option value="notice_sent">Awaiting response</option><option value="claimed">Claimed</option><option value="correction_requested">Correction requested</option><option value="approved_as_shown">Approved as shown</option><option value="opted_out">Opted out</option></select><select value={sourceFilter} onChange={(e)=>setSourceFilter(e.target.value)} className="rounded-lg border px-3 py-2"><option value="all">All sources</option><option value="imported">All imported</option>{sources.map((source:any)=><option key={source} value={source}>{source}</option>)}</select></div>
        <div className="grid gap-5">{visible.map((b)=>{const draft=drafts[b.id]||savedSnapshots[b.id]||{website:"",email:"",phone:"",imageUrl:"",logoRights:"unknown"};const saved=savedSnapshots[b.id]||draft;const dirty=JSON.stringify(draft)!==JSON.stringify(saved);const changedCount=Object.keys(draft).filter((key)=>draft[key as keyof Draft]!==saved[key as keyof Draft]).length;const found=candidates[b.id]||[];const cardMessage=inlineMessages[b.id];const whatsapp=normalizeWhatsAppPhone(draft.phone);const completeness=[draft.website,draft.email,draft.phone,draft.imageUrl].filter(Boolean).length;return <article key={b.id} className="rounded-2xl border p-4">
          <div className="grid items-start gap-4 lg:grid-cols-[112px_1fr_auto]"><ImageThumb src={draft.imageUrl||getImage(b)} label={b.name}/><div><h3 className="text-xl font-black">{b.name}</h3><p className="text-sm text-gray-600">{b.category||"Uncategorised"} · {b.address||"No address"}</p><div className="mt-2 flex flex-wrap gap-3">{draft.website&&<CheckedExternalLink href={draft.website} notFoundMessage="Page not found." className="text-sm font-bold text-pink-600">Business website</CheckedExternalLink>}{draft.phone&&<a href={`tel:${draft.phone}`} className="text-sm font-bold text-slate-700">Call {draft.phone}</a>}{whatsapp&&<a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className="text-sm font-bold text-green-700">WhatsApp</a>}</div><div className="mt-3 flex flex-wrap gap-2"><span className={`rounded-full px-3 py-1 text-sm font-bold ${statusClass(b.status)}`}>Listing: {b.status||"pending"}</span><span className={`rounded-full px-3 py-1 text-sm font-bold ${statusClass(b.outreach_status)}`}>Outreach: {b.outreach_status||"not_sent"}</span><span className="rounded-full bg-purple-100 px-3 py-1 text-sm font-bold text-purple-800">Logo: {draft.logoRights}</span><span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-800">Profile: {completeness}/4</span>{dirty&&<span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800">Unsaved changes ({changedCount})</span>}</div>{b.outreach_sent_at&&<p className="mt-2 text-xs text-gray-600">Notice sent {formatDate(b.last_outreach_sent_at||b.outreach_sent_at)} · Due {formatDate(b.outreach_response_due_at)}</p>}</div>
            <div className="flex max-w-md flex-wrap gap-2 lg:justify-end"><button disabled={Boolean(busy[b.id])} onClick={()=>researchBusiness(b)} className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50">{busy[b.id]==="research"?"Researching...":"Research Business"}</button><a href={`/studio/businesses/${b.id}`} className="rounded-lg bg-slate-900 px-4 py-3 text-sm font-bold text-white">Full Edit</a><button onClick={()=>updateStatus(b,"approved")} className="rounded-lg bg-green-600 px-4 py-3 text-sm font-bold text-white">Approve</button><button onClick={()=>updateStatus(b,"on_hold")} className="rounded-lg bg-yellow-500 px-4 py-3 text-sm font-bold">On Hold</button><button onClick={()=>updateStatus(b,"rejected")} className="rounded-lg bg-red-600 px-4 py-3 text-sm font-bold text-white">Reject</button></div></div>
          {cardMessage&&<div className={`mt-4 rounded-xl border p-3 text-sm font-bold ${cardMessage.tone==="success"?"border-green-200 bg-green-50 text-green-800":cardMessage.tone==="error"?"border-red-200 bg-red-50 text-red-800":"border-blue-200 bg-blue-50 text-blue-800"}`}>{cardMessage.text}{cardMessage.fallbackUrl&&<a href={cardMessage.fallbackUrl} target="_blank" rel="noreferrer" className="ml-3 underline">Open search</a>}</div>}
          <div className="mt-4 rounded-2xl bg-slate-50 p-4"><div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center"><div><h4 className="text-lg font-black">Research details</h4><p className="text-xs text-gray-500">Review anything found automatically. Nothing is saved until you use the single save button.</p></div><div className="flex gap-2"><button disabled={Boolean(busy[b.id])} onClick={()=>discoverContact(b,"website")} className="rounded-lg border px-3 py-2 text-xs font-bold">Find website</button><button disabled={Boolean(busy[b.id])} onClick={()=>discoverContact(b,"email")} className="rounded-lg border px-3 py-2 text-xs font-bold">Find email</button><button disabled={Boolean(busy[b.id])} onClick={()=>discoverContact(b,"phone")} className="rounded-lg border px-3 py-2 text-xs font-bold">Find phone</button><button disabled={Boolean(busy[b.id])} onClick={()=>discoverImages(b)} className="rounded-lg border px-3 py-2 text-xs font-bold">Find images</button></div></div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5"><label className="text-sm font-black">Website<input value={draft.website} onChange={(e)=>updateDraft(b.id,{website:e.target.value})} className={`mt-2 w-full rounded-lg border px-3 py-2 font-normal ${draft.website!==saved.website?"bg-amber-50":"bg-white"}`}/></label><label className="text-sm font-black">Contact email<input value={draft.email} onChange={(e)=>updateDraft(b.id,{email:e.target.value})} className={`mt-2 w-full rounded-lg border px-3 py-2 font-normal ${draft.email!==saved.email?"bg-amber-50":"bg-white"}`}/></label><label className="text-sm font-black">Phone<input value={draft.phone} onChange={(e)=>updateDraft(b.id,{phone:e.target.value})} className={`mt-2 w-full rounded-lg border px-3 py-2 font-normal ${draft.phone!==saved.phone?"bg-amber-50":"bg-white"}`}/></label><label className="text-sm font-black">Image URL<input value={draft.imageUrl} onChange={(e)=>updateDraft(b.id,{imageUrl:e.target.value,logoRights:e.target.value!==saved.imageUrl?"official_site_review_needed":draft.logoRights})} className={`mt-2 w-full rounded-lg border px-3 py-2 font-normal ${draft.imageUrl!==saved.imageUrl?"bg-amber-50":"bg-white"}`}/></label><label className="text-sm font-black">Logo rights<select value={draft.logoRights} onChange={(e)=>updateDraft(b.id,{logoRights:e.target.value})} className={`mt-2 w-full rounded-lg border px-3 py-2 font-normal ${draft.logoRights!==saved.logoRights?"bg-amber-50":"bg-white"}`}><option value="unknown">Unknown rights</option><option value="official_site_review_needed">Official-site image — review needed</option><option value="permission_confirmed">Permission confirmed</option><option value="registered_mark_signal">Registered-mark signal</option><option value="trademark_claimed">Trademark claimed</option><option value="do_not_use">Do not use</option></select></label></div>
            {draft.imageUrl&&<div className="mt-4 flex items-center gap-3 rounded-xl border bg-white p-3"><img src={draft.imageUrl} alt="Image URL preview" className="h-20 w-20 rounded-lg object-contain"/><div><p className="font-black">Image preview</p><p className="text-xs text-gray-500">Confirm this belongs to the correct business and review usage rights.</p></div></div>}
            <div className="mt-4 flex flex-col justify-between gap-3 border-t pt-4 md:flex-row md:items-center"><p className="text-sm font-bold text-gray-600">{dirty?`${changedCount} unsaved field${changedCount===1?"":"s"}`:"All details saved"}</p><div className="flex flex-wrap gap-2"><button disabled={!dirty||busy[b.id]==="save"} onClick={()=>saveBusinessDetails(b)} className="rounded-lg bg-amber-500 px-5 py-3 text-sm font-black disabled:opacity-40">{busy[b.id]==="save"?"Saving...":"Save Business Details"}</button><button disabled={!draft.email||Boolean(b.opted_out_at)||Boolean(busy[b.id])} onClick={()=>sendNotice(b)} className="rounded-lg bg-pink-600 px-5 py-3 text-sm font-black text-white disabled:opacity-40">{busy[b.id]==="notice"?"Sending...":b.outreach_sent_at?"Resend Notice":"Send Listing Notice"}</button>{whatsapp&&<a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className="rounded-lg bg-green-600 px-5 py-3 text-sm font-black text-white">WhatsApp</a>}</div></div></div>
          {found.length>0&&<details className="mt-4 rounded-xl border p-4"><summary className="cursor-pointer font-black">Image candidates ({found.length})</summary><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{found.map((candidate)=><button key={candidate.url} onClick={()=>updateDraft(b.id,{imageUrl:candidate.url,logoRights:"official_site_review_needed"})} className="rounded-xl border p-3 text-left hover:bg-slate-50"><img src={candidate.url} alt={candidate.source} className="h-36 w-full rounded-lg object-contain"/><p className="mt-2 text-xs text-gray-500">{candidate.source}</p><p className="mt-1 text-sm font-black">Use this URL</p></button>)}</div></details>}
          {(activities[b.id]||[]).length>0&&<details className="mt-4 rounded-xl border p-4"><summary className="cursor-pointer font-black">Activity timeline ({activities[b.id].length})</summary><div className="mt-3 space-y-3">{activities[b.id].map((item)=><div key={item.id} className="border-l-4 border-pink-200 pl-3"><p className="font-bold">{item.activity_label}</p><p className="text-xs text-gray-500">{formatDate(item.created_at)}{item.actor_email?` · ${item.actor_email}`:""}</p></div>)}</div></details>}
        </article>})}{visible.length===0&&<p className="text-gray-500">No businesses match the current filters.</p>}</div>
      </section>
    </div>}
  </div></main>;
}
