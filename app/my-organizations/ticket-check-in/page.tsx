"use client";
import { useState } from "react";
import MyHubHeader from "../../components/MyHubHeader";
import SiteFooter from "../../components/SiteFooter";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
const supabase = getSupabaseBrowserClient();
export default function TicketCheckInPage() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  async function checkIn() {
    setLoading(true);
    setResult(null);
    const response = await supabase.rpc("check_in_event_ticket", {
      p_ticket_code: code.trim(),
    });
    setLoading(false);
    setResult(
      response.error
        ? { status: "error", message: response.error.message }
        : response.data,
    );
  }
  return (
    <main className="min-h-screen bg-slate-50">
      <MyHubHeader />
      <section className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-sm font-black uppercase text-pink-600">
          Event Entry
        </p>
        <h1 className="mt-2 text-4xl font-black">Ticket Check-In</h1>
        <p className="mt-2 text-slate-600">
          For authorized organization managers and SDTV administrators.
        </p>
        <div className="mt-8 rounded-3xl border bg-white p-7 shadow-sm">
          <label className="font-black">
            Ticket code
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              onKeyDown={(event) => {
                if (event.key === "Enter") void checkIn();
              }}
              placeholder="SDTV-TKT-…"
              autoFocus
              className="mt-2 w-full rounded-xl border p-4 font-mono text-lg uppercase"
            />
          </label>
          <button
            onClick={checkIn}
            disabled={loading || code.trim().length < 8}
            className="mt-4 w-full rounded-xl bg-pink-600 p-4 text-lg font-black text-white disabled:opacity-40"
          >
            {loading ? "Checking…" : "Validate and Check In"}
          </button>
          {result && (
            <div
              className={`mt-5 rounded-2xl p-5 ${result.status === "checked_in" ? "bg-emerald-50 text-emerald-900" : result.status === "already_checked_in" ? "bg-amber-50 text-amber-900" : "bg-red-50 text-red-900"}`}
            >
              <p className="text-xl font-black">
                {result.status === "checked_in"
                  ? "Ticket valid — checked in"
                  : result.status === "already_checked_in"
                    ? "Already checked in"
                    : result.status === "not_found"
                      ? "Ticket not found"
                      : "Ticket could not be accepted"}
              </p>
              {result.attendeeName && (
                <p className="mt-2 font-bold">
                  Attendee: {result.attendeeName}
                </p>
              )}
              {result.checkedInAt && (
                <p className="mt-1 text-sm">
                  Previous check-in:{" "}
                  {new Date(result.checkedInAt).toLocaleString()}
                </p>
              )}
              {result.message && (
                <p className="mt-2 text-sm">{result.message}</p>
              )}
            </div>
          )}
          <p className="mt-5 text-xs text-slate-500">
            Camera QR scanning can be connected after the QR format is
            finalized. Entry staff can safely use the printed ticket code now.
          </p>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
