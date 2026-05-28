"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type DebugResult = Record<string, any>;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function mask(value: string) {
  if (!value) return "MISSING";
  if (value.length <= 12) return `${value.slice(0, 4)}...`;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

export default function DebugSupabasePage() {
  const [result, setResult] = useState<DebugResult>({ loading: true });

  useEffect(() => {
    async function runDebug() {
      const output: DebugResult = {
        timestamp: new Date().toISOString(),
        supabaseUrl,
        supabaseUrlMasked: mask(supabaseUrl),
        anonKeyPresent: Boolean(supabaseAnonKey),
        anonKeyMasked: mask(supabaseAnonKey),
      };

      if (!supabaseUrl || !supabaseAnonKey) {
        setResult({
          ...output,
          loading: false,
          fatal: "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in deployed environment variables.",
        });
        return;
      }

      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      });

      const { data: userData, error: userError } = await supabase.auth.getUser();
      output.currentUser = userData?.user
        ? { id: userData.user.id, email: userData.user.email }
        : null;
      output.currentUserError = userError?.message || null;

      const { data: approvedEvents, error: approvedEventsError } = await supabase
        .from("events")
        .select("id,title,date,location,status,created_at")
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      output.approvedEventsCount = approvedEvents?.length || 0;
      output.approvedEvents = approvedEvents || [];
      output.approvedEventsError = approvedEventsError
        ? {
            message: approvedEventsError.message,
            details: approvedEventsError.details,
            hint: approvedEventsError.hint,
            code: approvedEventsError.code,
          }
        : null;

      const { data: allEvents, error: allEventsError } = await supabase
        .from("events")
        .select("id,title,status,created_at")
        .order("created_at", { ascending: false })
        .limit(20);

      output.allEventsCount = allEvents?.length || 0;
      output.allEvents = allEvents || [];
      output.allEventsError = allEventsError
        ? {
            message: allEventsError.message,
            details: allEventsError.details,
            hint: allEventsError.hint,
            code: allEventsError.code,
          }
        : null;

      const { data: businesses, error: businessesError } = await supabase
        .from("local_businesses")
        .select("id,name,status,created_at")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(20);

      output.approvedBusinessesCount = businesses?.length || 0;
      output.approvedBusinesses = businesses || [];
      output.approvedBusinessesError = businessesError
        ? {
            message: businessesError.message,
            details: businessesError.details,
            hint: businessesError.hint,
            code: businessesError.code,
          }
        : null;

      setResult({ ...output, loading: false });
    }

    runDebug().catch((error) => {
      setResult({
        loading: false,
        fatal: error?.message || "Unknown debug error",
        stack: error?.stack || null,
      });
    });
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-black mb-3">Seattle Desi TV Supabase Debug</h1>
        <p className="text-slate-300 mb-6">
          This temporary page checks what the deployed website can actually read from Supabase.
        </p>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-xs uppercase text-slate-400">Supabase URL</p>
            <p className="font-bold break-all">{result.supabaseUrlMasked || "Loading..."}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-xs uppercase text-slate-400">Approved Events</p>
            <p className="text-3xl font-black">{result.approvedEventsCount ?? "..."}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-xs uppercase text-slate-400">Approved Businesses</p>
            <p className="text-3xl font-black">{result.approvedBusinessesCount ?? "..."}</p>
          </div>
        </div>

        {result.fatal && (
          <div className="bg-red-500/20 border border-red-400 rounded-xl p-4 mb-6">
            <h2 className="font-black text-red-200">Fatal issue</h2>
            <p>{result.fatal}</p>
          </div>
        )}

        {(result.approvedEventsError || result.allEventsError || result.approvedBusinessesError) && (
          <div className="bg-yellow-500/20 border border-yellow-400 rounded-xl p-4 mb-6">
            <h2 className="font-black text-yellow-200">Supabase query error detected</h2>
            <pre className="whitespace-pre-wrap text-sm mt-3">
              {JSON.stringify(
                {
                  approvedEventsError: result.approvedEventsError,
                  allEventsError: result.allEventsError,
                  approvedBusinessesError: result.approvedBusinessesError,
                },
                null,
                2
              )}
            </pre>
          </div>
        )}

        <div className="bg-black rounded-xl p-4 overflow-auto border border-white/10">
          <h2 className="font-black mb-3">Full Debug JSON</h2>
          <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
        </div>
      </div>
    </main>
  );
}
