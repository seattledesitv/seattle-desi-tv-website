"use client";

import { useEffect, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";

const supabase = getSupabaseBrowserClient();

function Badge({ ok }: { ok: boolean }) {
  return <span className={`${ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"} rounded-full px-3 py-1 text-xs font-black`}>{ok ? "Healthy" : "Needs attention"}</span>;
}

function Info({ label, value }: { label: string; value: any }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p><p className="break-words text-sm font-bold text-slate-950">{value || "—"}</p></div>;
}

export default function SocialDiagnosticsPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading diagnostics...");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("general_public");
  const [data, setData] = useState<any>(null);

  const canAccess = Boolean(user && isAdminRole(role));

  async function runChecks() {
    setMessage("Running checks...");
    const response = await fetch("/api/instagram/debug", { cache: "no-store" });
    const result = await response.json();
    setData(result);
    setMessage("");
  }

  async function init() {
    setLoading(true);
    const { data: authData } = await supabase.auth.getUser();
    const currentUser = authData?.user || null;
    setUser(currentUser);
    if (!currentUser) { setMessage("Please login to view diagnostics."); setLoading(false); return; }
    const nextRole = await resolveUserRole(supabase, currentUser);
    setRole(nextRole);
    if (!isAdminRole(nextRole)) { setMessage(`Social diagnostics requires admin access. Current role: ${nextRole}`); setLoading(false); return; }
    await runChecks();
    setLoading(false);
  }

  useEffect(() => { init(); }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <StudioHeader />
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-black md:text-5xl">Social Diagnostics</h1>
            <p className="mt-2 text-slate-300">Admin-only health checks for SDTV social integrations.</p>
            {user?.email && <p className="mt-2 text-sm text-slate-400">Logged in as {user.email} · Role: {role}</p>}
          </div>
          <button onClick={runChecks} disabled={!canAccess} className="rounded-xl bg-pink-600 px-5 py-3 font-black text-white disabled:opacity-50">Run Checks</button>
        </div>

        {loading && <div className="rounded-2xl bg-white/10 p-6">{message}</div>}
        {!loading && !canAccess && <div className="rounded-2xl bg-white p-8 text-slate-950">{message}</div>}

        {!loading && canAccess && <div className="space-y-6">
          {message && <div className="rounded-2xl bg-yellow-100 p-4 font-bold text-yellow-900">{message}</div>}

          <section className="rounded-3xl bg-white p-6 text-slate-950 shadow-2xl">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-wide text-pink-600">Instagram</p>
                <h2 className="mt-1 text-3xl font-black">Connection Health</h2>
                <p className="mt-2 text-sm text-slate-600">Checks the deployed environment without exposing the full token.</p>
              </div>
              {data && <Badge ok={Boolean(data.ok)} />}
            </div>

            {data && <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <Info label="Checked at" value={data.generatedAt} />
              <Info label="Token source" value={data.config?.tokenSource} />
              <Info label="Endpoint" value={data.config?.endpointMode} />
              <Info label="Token prefix" value={data.token?.prefix} />
              <Info label="Token suffix" value={data.token?.suffix} />
              <Info label="Token length" value={data.token?.length} />
              <Info label="Token type" value={data.token?.tokenType} />
              <Info label="Business account ID" value={data.config?.instagramBusinessAccountId} />
              <Info label="Warning" value={data.config?.warning || "None"} />
            </div>}
          </section>

          {data && <section className="grid gap-6 lg:grid-cols-2">
            <article className="rounded-3xl bg-white p-6 text-slate-950 shadow-2xl">
              <div className="mb-4 flex items-center justify-between gap-3"><h3 className="text-2xl font-black">Profile Check</h3><Badge ok={Boolean(data.checks?.profile?.ok)} /></div>
              <div className="grid gap-3">
                <Info label="Username" value={data.checks?.profile?.username} />
                <Info label="User ID" value={data.checks?.profile?.userId} />
                <Info label="Message" value={data.checks?.profile?.message} />
              </div>
            </article>

            <article className="rounded-3xl bg-white p-6 text-slate-950 shadow-2xl">
              <div className="mb-4 flex items-center justify-between gap-3"><h3 className="text-2xl font-black">Media Check</h3><Badge ok={Boolean(data.checks?.media?.ok)} /></div>
              <div className="grid gap-3">
                <Info label="Returned posts" value={data.checks?.media?.returnedCount} />
                <Info label="Message" value={data.checks?.media?.message} />
              </div>
            </article>
          </section>}

          <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-6">
            <h3 className="text-2xl font-black">Next time</h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">If Instagram stops showing, open this page first. If the prefix or length differs from the token you saved, Vercel is using a different value. If profile works but media fails, it is a media permission issue. If both fail, regenerate the Instagram token and redeploy.</p>
          </section>
        </div>}
      </div>
    </main>
  );
}
