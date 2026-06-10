"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();

export default function UpdatePasswordPage() {
  const [newValue, setNewValue] = useState("");
  const [confirmValue, setConfirmValue] = useState("");
  const [message, setMessage] = useState("Checking reset session...");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      const session = data?.session || null;
      setReady(Boolean(session));
      setMessage(session ? "Enter your new account password below." : "This reset link is missing or expired. Please request a new reset link from the login page.");
    }
    init();
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setReady(true);
        setMessage("Enter your new account password below.");
      }
    });
    return () => { cancelled = true; listener.subscription.unsubscribe(); };
  }, []);

  async function saveNewValue() {
    setMessage("");
    if (!newValue || newValue.length < 8) { setMessage("Please enter at least 8 characters."); return; }
    if (newValue !== confirmValue) { setMessage("The two entries do not match."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newValue });
    setLoading(false);
    if (error) { setMessage(error.message); return; }
    setNewValue("");
    setConfirmValue("");
    setMessage("Updated successfully. You can now continue to your account.");
  }

  return <main className="min-h-screen bg-slate-950 text-white px-6 py-12 grid place-items-center"><div className="w-full max-w-md bg-white text-slate-950 rounded-2xl p-8 shadow-2xl"><a href="/login" className="text-sm font-bold text-pink-600">← Back to Login</a><h1 className="text-3xl font-black mt-4">Set New Password</h1><p className="text-gray-500 mt-2 mb-6">Use this page after clicking the reset email from SDTV.</p>{ready && <div className="grid gap-3"><input className="w-full border rounded-lg p-3" placeholder="New password" type="password" autoComplete="new-password" value={newValue} onChange={(event) => setNewValue(event.target.value)} /><input className="w-full border rounded-lg p-3" placeholder="Confirm new password" type="password" autoComplete="new-password" value={confirmValue} onChange={(event) => setConfirmValue(event.target.value)} /><button type="button" onClick={saveNewValue} disabled={loading} className="w-full bg-pink-600 text-white py-3 rounded-xl font-black disabled:opacity-60">{loading ? "Updating..." : "Update Password"}</button></div>}{message && <p className="text-sm text-orange-600 mt-4 whitespace-pre-line">{message}</p>}{message.includes("successfully") && <a href="/login" className="block w-full bg-slate-900 text-white py-3 rounded-xl font-black text-center mt-4">Go to Account</a>}</div></main>;
}
