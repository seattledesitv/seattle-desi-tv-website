"use client";

import { useEffect, useMemo, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();

export default function BusinessReviewModerationPage() {
  const [reviews, setReviews] = useState<any[]>([]), [search, setSearch] = useState(""), [status, setStatus] = useState("pending"), [message, setMessage] = useState("Checking access..."), [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  async function load() {
    setLoading(true); const session = await supabase.auth.getSession(); const currentUser = session.data.session?.user || null; setUser(currentUser);
    if (!currentUser) { setMessage("Please log in."); setLoading(false); return; }
    const admin = await supabase.from("admins").select("role").or(`user_id.eq.${currentUser.id},email.eq.${currentUser.email}`).maybeSingle();
    if (!String(admin.data?.role || "").toLowerCase().includes("admin")) { setMessage("Studio admin access is required."); setLoading(false); return; }
    const result = await supabase.from("business_reviews").select("id,business_id,reviewer_name,reviewer_email,rating,comment,status,created_at,moderation_notes,local_businesses(name,address)").order("created_at", { ascending: false });
    if (result.error) { setMessage(result.error.message.includes("business_reviews") ? "Run the business reviews migration first." : result.error.message); setLoading(false); return; }
    setReviews(result.data || []); setMessage(""); setLoading(false);
  }
  useEffect(() => { load(); }, []);
  const visible = useMemo(() => reviews.filter((review) => {
    const q = search.trim().toLowerCase(); const business = Array.isArray(review.local_businesses) ? review.local_businesses[0] : review.local_businesses;
    const matchesSearch = !q || [business?.name,business?.address,review.reviewer_name,review.reviewer_email,review.comment].some((value) => String(value || "").toLowerCase().includes(q));
    return matchesSearch && (status === "all" || review.status === status);
  }), [reviews, search, status]);
  async function moderate(review: any, nextStatus: string) {
    const notes = nextStatus === "rejected" ? window.prompt("Optional rejection note:", review.moderation_notes || "") || "" : review.moderation_notes || "";
    const { error } = await supabase.from("business_reviews").update({ status: nextStatus, moderation_notes: notes || null, moderated_by: user.id, moderated_at: new Date().toISOString() }).eq("id", review.id);
    if (error) { setMessage(error.message); return; } setMessage(`Review ${nextStatus}.`); await load();
  }
  return <main className="min-h-screen bg-slate-950 text-white"><StudioHeader/><div className="mx-auto max-w-6xl px-6 py-10"><div className="mb-7"><p className="text-sm font-black uppercase tracking-widest text-pink-300">Business Directory</p><h1 className="mt-2 text-4xl font-black">Review Moderation</h1><p className="mt-2 text-slate-300">Approve or reject community ratings and comments before they appear publicly.</p></div><div className="mb-6 grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-[1fr_220px_auto]"><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search business, reviewer or comment..." className="rounded-xl border border-white/20 bg-white px-4 py-3 text-slate-950"/><select value={status} onChange={(e)=>setStatus(e.target.value)} className="rounded-xl border border-white/20 bg-white px-4 py-3 text-slate-950"><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="all">All statuses</option></select><button onClick={load} className="rounded-xl bg-white px-4 py-3 font-black text-slate-950">Refresh</button></div>{message && <div className="mb-5 rounded-xl bg-amber-100 p-4 font-bold text-amber-900">{message}</div>}{loading ? <div className="rounded-2xl bg-white/10 p-6">Loading...</div> : visible.length === 0 ? <div className="rounded-2xl bg-white/10 p-6">No matching reviews.</div> : <div className="space-y-4">{visible.map((review) => { const business = Array.isArray(review.local_businesses) ? review.local_businesses[0] : review.local_businesses; return <article key={review.id} className="rounded-2xl border border-white/10 bg-white/10 p-5"><div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><h2 className="text-xl font-black">{business?.name || "Business"}</h2><p className="text-sm text-slate-300">{business?.address}</p><p className="mt-2 font-black text-amber-400">{"★".repeat(review.rating)}<span className="text-slate-600">{"★".repeat(5-review.rating)}</span></p><p className="mt-1 text-sm text-slate-300">{review.reviewer_name} · {review.reviewer_email || "No email"}</p></div><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase">{review.status}</span></div><p className="mt-4 whitespace-pre-line rounded-xl bg-slate-950/50 p-4 text-slate-100">{review.comment}</p><div className="mt-4 flex flex-wrap gap-3"><button onClick={()=>moderate(review,"approved")} className="rounded-xl bg-green-500 px-4 py-2 font-black text-slate-950">Approve</button><button onClick={()=>moderate(review,"rejected")} className="rounded-xl bg-red-500 px-4 py-2 font-black">Reject</button><button onClick={()=>moderate(review,"pending")} className="rounded-xl border border-white/20 px-4 py-2 font-black">Return to pending</button></div></article>})}</div>}</div></main>;
}
