"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

const AUTH_STORAGE_KEY = "sdtv-auth-token-v2";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "", { auth: { storageKey: AUTH_STORAGE_KEY, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });

function dateText(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading notifications...");
  const [user, setUser] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const unread = items.filter((item) => !item.read).length;

  async function loadNotifications(currentUser?: any) {
    const activeUser = currentUser || user;
    if (!activeUser?.id) {
      setItems([]);
      setMessage("Please login to view notifications.");
      return;
    }
    const { data, error } = await supabase
      .from("notifications")
      .select("id,user_id,title,message,link,read,created_at")
      .eq("user_id", activeUser.id)
      .order("created_at", { ascending: false });
    if (error) {
      setItems([]);
      setMessage(`Could not load notifications: ${error.message}`);
      return;
    }
    setItems(data || []);
    setMessage((data || []).length ? "" : "No notifications yet.");
  }

  async function init() {
    setLoading(true);
    const { data } = await supabase.auth.getUser();
    const currentUser = data?.user || null;
    setUser(currentUser);
    await loadNotifications(currentUser);
    setLoading(false);
  }

  async function markRead(item: any) {
    const { error } = await supabase.from("notifications").update({ read: true }).eq("id", item.id);
    if (error) {
      setMessage(`Could not mark notification read: ${error.message}`);
      return;
    }
    await loadNotifications();
    if (item.link) window.location.href = item.link;
  }

  async function markAllRead() {
    if (!user?.id) return;
    const { error } = await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    if (error) setMessage(`Could not mark all read: ${error.message}`);
    else await loadNotifications();
  }

  useEffect(() => { init(); }, []);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <SiteHeader />
      <section className="bg-slate-950 text-white px-6 md:px-10 py-12">
        <div className="max-w-5xl mx-auto">
          <a href="/" className="text-pink-300 font-bold">← Back to Seattle Desi TV</a>
          <h1 className="text-4xl md:text-6xl font-black mt-4">Notifications</h1>
          <p className="text-slate-300 mt-3">Updates about role approvals, assignments, coverage, events, and business listings.</p>
        </div>
      </section>
      <section className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="bg-white border rounded-2xl p-5 flex-1">
            <p className="text-gray-500">Unread</p>
            <p className="text-4xl font-black text-pink-600">{unread}</p>
            {user?.email && <p className="text-sm text-gray-500 mt-2">Logged in as {user.email}</p>}
          </div>
          <div className="flex gap-3">
            <button onClick={init} className="bg-white border px-5 py-3 rounded-xl font-bold">Refresh</button>
            <button onClick={markAllRead} className="bg-slate-950 text-white px-5 py-3 rounded-xl font-bold">Mark all read</button>
          </div>
        </div>
        {loading && <div className="bg-white border rounded-2xl p-6">{message}</div>}
        {!loading && message && <div className="bg-white border rounded-2xl p-6 mb-5">{message}</div>}
        <div className="grid gap-4">
          {items.map((item) => (
            <article key={item.id} className={`border rounded-2xl p-5 bg-white ${item.read ? "opacity-70" : "shadow-md"}`}>
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-pink-600">{item.read ? "Read" : "Unread"}</p>
                  <h2 className="text-xl font-black mt-1">{item.title}</h2>
                  <p className="text-gray-600 mt-2 whitespace-pre-line">{item.message}</p>
                  <p className="text-xs text-gray-400 mt-3">{dateText(item.created_at)}</p>
                </div>
                <button onClick={() => markRead(item)} className="bg-pink-600 text-white px-4 py-2 rounded-xl font-bold whitespace-nowrap">{item.link ? "Open" : "Mark Read"}</button>
              </div>
            </article>
          ))}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
