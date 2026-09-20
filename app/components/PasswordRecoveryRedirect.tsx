"use client";

import { useEffect } from "react";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";

function hasRecoveryMarker() {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return (
    query.get("recovery") === "1" ||
    query.get("type") === "recovery" ||
    hash.get("type") === "recovery"
  );
}

export default function PasswordRecoveryRedirect() {
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const goToPasswordForm = () => {
      if (window.location.pathname === "/update-password") return;
      const query = new URLSearchParams(window.location.search);
      query.set("recovery", "1");
      window.location.replace(`/update-password?${query.toString()}${window.location.hash}`);
    };

    if (hasRecoveryMarker()) goToPasswordForm();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") goToPasswordForm();
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return null;
}
