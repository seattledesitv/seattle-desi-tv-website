"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const AUTH_STORAGE_KEY = "sdtv-auth-token-v2";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  {
    auth: {
      storageKey: AUTH_STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

function roleContainsAdmin(role: string) {
  return String(role || "").toLowerCase().trim().includes("admin");
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const parsed = new Date(`${String(value).split("T")[0]}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
}

export default function StudioPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Checking Studio access...");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [events, setEvents] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);

  const canAccessStudio = Boolean(user && roleContainsAdmin(role));

  async function loadStudioData() {
    const [eventResult, businessResult] = await Promise.all([
      supabase
        .from("events")
        .select("id,title,date,location,status,image,created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("local_businesses")
        .select("id,name,category,address,status,created_at")
        .order("created_at", { ascending: false }),
    ]);

    if (!eventResult.error) setEvents(eventResult.data || []);
    if (!businessResult.error) setBusinesses(businessResult.data || []);
  }

  async function init() {
    setLoading(true);
    setMessage("Checking Studio access...");

    const sessionResult = await supabase.auth.getSession();
    const currentUser = sessionResult.data?.session?.user || null;
    setUser(currentUser);

    if (!currentUser) {
      setRole("");
      setEvents([]);
      setBusinesses([]);
      setMessage("Please login to access Studio.");
      setLoading(false);
      return;
    }

    const adminResult = await supabase
      .from("admins")
      .select("role")
      .or(`user_id.eq.${currentUser.id},email.eq.${currentUser.email}`)
      .maybeSingle();

    const nextRole = adminResult.data?.role || "";
    setRole(nextRole);

    if (!roleContainsAdmin(nextRole)) {
      setMessage("You are logged in, but this account does not have Studio admin access.");
      setLoading(false);
      return;
    }

    await loadStudioData();
    setMessage("");
    setLoading(false);
  }

  async function logout() {
    await supabase.auth.signOut({ scope: "global" });
    try {
      Object.keys(localStorage)
        .filter((key) => key.toLowerCase().includes("supabase") || key.toLowerCase().includes("sb-") || key === AUTH_STORAGE_KEY)
        .forEach((key) => localStorage.removeItem(key));
      Object.keys(sessionStorage)
        .filter((key) => key.toLowerCase().includes("supabase") || key.toLowerCase().includes("sb-") || key === AUTH_STORAGE_KEY)
        .forEach((key) => sessionStorage.removeItem(key));
    } catch {}
    window.location.href = "/login";
  }

  useEffect(() => {
    init();
  }, []);

  const pendingEvents = events.filter((item) => item.status !== "approved");
  const pendingBusinesses = businesses.filter((item) => item.status !== "approved");

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <a href="/" className="text-pink-300 font-bold">← Back to Seattle Desi TV</a>
            <h1 className="text-4xl md:text-5xl font-black mt-3">Seattle Desi TV Studio</h1>
            <p className="text-slate-300 mt-2">
              {user?.email ? `Logged in as ${user.email} · Role: ${role || "none"}` : "Admin dashboard"}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={init} className="bg-white text-slate-950 px-5 py-3 rounded-xl font-bold">Refresh</button>
            {user && <button onClick={logout} className="border border-red-400 text-red-300 px-5 py-3 rounded-xl font-bold">Logout</button>}
          </div>
        </div>

        {loading && <div className="bg-white/10 border border-white/10 rounded-2xl p-6">{message}</div>}

        {!loading && !canAccessStudio && (
          <div className="bg-white text-slate-950 rounded-2xl p-8 max-w-xl">
            <h2 className="text-2xl font-black">Studio Access</h2>
            <p className="text-gray-600 mt-3">{message}</p>
            <a href="/login" className="inline-block bg-pink-600 text-white px-5 py-3 rounded-xl font-bold mt-5">Go to Login</a>
          </div>
        )}

        {!loading && canAccessStudio && (
          <div className="space-y-8">
            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-white/10 border border-white/10 rounded-2xl p-5"><p className="text-slate-300">All Events</p><p className="text-3xl font-black">{events.length}</p></div>
              <div className="bg-white/10 border border-white/10 rounded-2xl p-5"><p className="text-slate-300">Pending Events</p><p className="text-3xl font-black">{pendingEvents.length}</p></div>
              <div className="bg-white/10 border border-white/10 rounded-2xl p-5"><p className="text-slate-300">All Businesses</p><p className="text-3xl font-black">{businesses.length}</p></div>
              <div className="bg-white/10 border border-white/10 rounded-2xl p-5"><p className="text-slate-300">Pending Businesses</p><p className="text-3xl font-black">{pendingBusinesses.length}</p></div>
            </div>

            <section className="bg-white text-slate-950 rounded-2xl p-6">
              <h2 className="text-2xl font-black mb-4">Recent Events</h2>
              <div className="grid gap-3">
                {events.map((event) => (
                  <div key={event.id} className="border rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <h3 className="font-black">{event.title}</h3>
                      <p className="text-sm text-gray-600">{formatDate(event.date)} · {event.location}</p>
                    </div>
                    <span className="text-sm font-bold bg-gray-100 px-3 py-1 rounded-full">{event.status || "pending"}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white text-slate-950 rounded-2xl p-6">
              <h2 className="text-2xl font-black mb-4">Recent Businesses</h2>
              <div className="grid gap-3">
                {businesses.map((business) => (
                  <div key={business.id} className="border rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <h3 className="font-black">{business.name}</h3>
                      <p className="text-sm text-gray-600">{business.category} · {business.address}</p>
                    </div>
                    <span className="text-sm font-bold bg-gray-100 px-3 py-1 rounded-full">{business.status || "pending"}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
