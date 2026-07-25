"use client";

import { useEffect, useMemo, useState } from "react";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();

type Review = { id: string; user_id: string; reviewer_name: string; rating: number; comment: string; status: string; created_at: string };

export default function BusinessReviewsPage() {
  const [business, setBusiness] = useState<any>(null), [reviews, setReviews] = useState<Review[]>([]), [user, setUser] = useState<any>(null);
  const [rating, setRating] = useState(5), [comment, setComment] = useState(""), [message, setMessage] = useState("Loading reviews..."), [saving, setSaving] = useState(false);
  const businessId = typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("business") || "";

  async function load() {
    if (!businessId) { setMessage("Business not specified."); return; }
    const auth = await supabase.auth.getUser(); const currentUser = auth.data.user || null; setUser(currentUser);
    const [businessResult, reviewResult] = await Promise.all([
      supabase.from("local_businesses").select("id,name,address,category").eq("id", businessId).eq("status", "approved").maybeSingle(),
      supabase.from("business_reviews").select("id,user_id,reviewer_name,rating,comment,status,created_at").eq("business_id", businessId).order("created_at", { ascending: false })
    ]);
    if (businessResult.error || !businessResult.data) { setMessage("Business not found."); return; }
    setBusiness(businessResult.data); setReviews((reviewResult.data || []) as Review[]);
    const mine = (reviewResult.data || []).find((review: any) => review.user_id === currentUser?.id);
    if (mine) { setRating(Number(mine.rating)); setComment(mine.comment || ""); }
    setMessage("");
  }
  useEffect(() => { load(); }, []);

  const approved = reviews.filter((review) => review.status === "approved");
  const average = useMemo(() => approved.length ? approved.reduce((sum, review) => sum + review.rating, 0) / approved.length : 0, [approved]);

  async function submit() {
    if (!user) { window.location.href = `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`; return; }
    if (comment.trim().length < 3) { setMessage("Please add a short comment."); return; }
    setSaving(true); setMessage("");
    const reviewerName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Community member";
    const { error } = await supabase.from("business_reviews").upsert({ business_id: businessId, user_id: user.id, reviewer_name: reviewerName, reviewer_email: user.email || null, rating, comment: comment.trim(), status: "pending", moderation_notes: null, moderated_by: null, moderated_at: null }, { onConflict: "business_id,user_id" });
    setSaving(false); if (error) { setMessage(`Could not submit review: ${error.message}`); return; }
    setMessage("Review submitted for admin approval."); await load();
  }

  return <main className="min-h-screen bg-slate-50 text-slate-950"><SiteHeader/><section className="mx-auto max-w-4xl px-6 py-10"><a href="/businesses" className="font-bold text-pink-600">← Back to businesses</a>{business && <><div className="mt-5 rounded-3xl border bg-white p-6 shadow-sm"><p className="text-sm font-black uppercase text-pink-600">Community Reviews</p><h1 className="mt-2 text-4xl font-black">{business.name}</h1><p className="mt-2 text-slate-500">{business.category || "Local business"} · {business.address}</p><div className="mt-5 flex items-center gap-3"><span className="text-3xl font-black text-amber-500">★ {approved.length ? average.toFixed(1) : "New"}</span><span className="text-slate-500">{approved.length} approved review{approved.length === 1 ? "" : "s"}</span></div></div><div className="mt-6 rounded-3xl border bg-white p-6"><h2 className="text-2xl font-black">Leave a review</h2><p className="mt-1 text-sm text-slate-500">One review per signed-in user. New and edited reviews are moderated before appearing publicly.</p><div className="mt-4 flex gap-2">{[1,2,3,4,5].map((star) => <button key={star} onClick={() => setRating(star)} aria-label={`${star} stars`} className={`text-3xl ${star <= rating ? "text-amber-500" : "text-slate-300"}`}>★</button>)}</div><textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1200} placeholder="Share your experience..." className="mt-4 min-h-32 w-full rounded-xl border p-4"/><button onClick={submit} disabled={saving} className="mt-4 rounded-xl bg-pink-600 px-5 py-3 font-black text-white disabled:opacity-50">{saving ? "Submitting..." : user ? "Submit review" : "Login to review"}</button>{message && <p className="mt-3 text-sm font-bold text-pink-700">{message}</p>}</div><div className="mt-6 space-y-4">{approved.length === 0 ? <div className="rounded-2xl border bg-white p-6 text-slate-500">No approved reviews yet.</div> : approved.map((review) => <article key={review.id} className="rounded-2xl border bg-white p-5"><div className="flex justify-between gap-3"><h3 className="font-black">{review.reviewer_name}</h3><span className="font-black text-amber-500">{"★".repeat(review.rating)}<span className="text-slate-300">{"★".repeat(5-review.rating)}</span></span></div><p className="mt-3 whitespace-pre-line text-slate-700">{review.comment}</p><p className="mt-3 text-xs text-slate-400">{new Date(review.created_at).toLocaleDateString()}</p></article>)}</div></>}</section><SiteFooter/></main>;
}
