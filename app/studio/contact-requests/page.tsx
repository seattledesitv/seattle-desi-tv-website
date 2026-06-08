"use client";

import { useEffect, useMemo, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";

const supabase = getSupabaseBrowserClient();

type ContactRequest = {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  interest?: string | null;
  message?: string | null;
  created_at?: string | null;
};

function dateTimeText(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function normalize(value?: string | null) {
  return String(value || "").trim();
}

export default function StudioContactRequestsPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Checking access...");
  const [actionMessage, setActionMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [interestFilter, setInterestFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  const canAccess = Boolean(user && isAdminRole(role));

  const interests = useMemo(() => {
    const values = requests.map((request) => normalize(request.interest)).filter(Boolean);
    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const needle = searchText.trim().toLowerCase();
    return requests.filter((request) => {
      const interestMatches = interestFilter === "all" || normalize(request.interest) === interestFilter;
      if (!interestMatches) return false;
      if (!needle) return true;
      return [request.name, request.email, request.phone, request.interest, request.message].some((value) => String(value || "").toLowerCase().includes(needle));
    });
  }, [requests, interestFilter, searchText]);

  async function loadData() {
    setActionMessage("");
    const result = await supabase
      .from("contact_requests")
      .select("id,name,email,phone,interest,message,created_at")
      .order("created_at", { ascending: false });

    if (result.error) {
      setActionMessage(`Could not load contact requests: ${result.error.message}`);
      setRequests([]);
      return;
    }

    setRequests(result.data || []);
  }

  async function init() {
    setLoading(true);
    setMessage("Checking access...");
    const sessionResult = await supabase.auth.getSession();
    const currentUser = sessionResult.data?.session?.user || null;
    setUser(currentUser);

    if (!currentUser) {
      setRole("");
      setMessage("Please login to access contact requests.");
      setLoading(false);
      return;
    }

    const nextRole = await resolveUserRole(supabase, currentUser);
    setRole(nextRole);

    if (!isAdminRole(nextRole)) {
      setMessage("This account does not have contact request access.");
      setLoading(false);
      return;
    }

    await loadData();
    setMessage("");
    setLoading(false);
  }

  useEffect(() => { init(); }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <StudioHeader />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-black">Contact Requests</h1>
            <p className="text-slate-300 mt-2">Review volunteer, intern, RJ, VJ, sponsorship, and general website inquiries.</p>
            {user?.email && <p className="text-slate-400 text-sm mt-2">Logged in as {user.email} · Role: {role || "none"}</p>}
          </div>
          <button onClick={init} className="bg-white text-slate-950 px-5 py-3 rounded-xl font-bold">Refresh</button>
        </div>

        {loading && <div className="bg-white/10 rounded-2xl p-6">{message}</div>}
        {!loading && !canAccess && <div className="bg-white text-slate-950 rounded-2xl p-8">{message}</div>}

        {!loading && canAccess && (
          <div className="space-y-5">
            {actionMessage && <div className="bg-yellow-100 text-yellow-900 rounded-2xl p-4 font-bold">{actionMessage}</div>}

            <section className="grid md:grid-cols-[1fr_auto_auto] gap-4 bg-white/10 border border-white/10 rounded-2xl p-5 items-end">
              <div>
                <p className="text-slate-300 text-sm font-bold uppercase tracking-wide">Total requests</p>
                <p className="text-4xl font-black">{requests.length}</p>
              </div>
              <label className="block">
                <span className="text-sm text-slate-300 font-bold">Filter by interest</span>
                <select value={interestFilter} onChange={(event) => setInterestFilter(event.target.value)} className="mt-2 w-full md:w-56 rounded-xl px-4 py-3 text-slate-950 font-bold">
                  <option value="all">All interests</option>
                  {interests.map((interest) => <option key={interest} value={interest}>{interest}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-sm text-slate-300 font-bold">Search</span>
                <input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Name, email, phone..." className="mt-2 w-full md:w-72 rounded-xl px-4 py-3 text-slate-950 font-bold" />
              </label>
            </section>

            <section className="grid gap-4">
              {filteredRequests.map((request) => (
                <article key={request.id} className="bg-white text-slate-950 rounded-2xl p-5 shadow-xl">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap gap-2 items-center">
                        <h2 className="text-2xl font-black">{request.name || "Unnamed contact"}</h2>
                        {request.interest && <span className="bg-pink-50 text-pink-600 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide">{request.interest}</span>}
                      </div>
                      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-600 mt-2">
                        {request.email && <a href={`mailto:${request.email}`} className="font-bold text-pink-600">{request.email}</a>}
                        {request.phone && <a href={`tel:${request.phone}`} className="font-bold text-slate-800">{request.phone}</a>}
                        {request.created_at && <span>{dateTimeText(request.created_at)}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {request.email && <a href={`mailto:${request.email}`} className="bg-pink-600 text-white px-4 py-2 rounded-xl font-bold text-sm">Email</a>}
                      {request.phone && <a href={`tel:${request.phone}`} className="bg-slate-900 text-white px-4 py-2 rounded-xl font-bold text-sm">Call</a>}
                    </div>
                  </div>
                  <p className="mt-4 whitespace-pre-wrap text-gray-700 leading-relaxed">{request.message || "No message provided."}</p>
                </article>
              ))}
              {filteredRequests.length === 0 && <div className="bg-white text-slate-950 rounded-2xl p-8">No contact requests found.</div>}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
