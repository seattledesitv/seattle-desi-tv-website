"use client";
import { useCallback, useEffect, useState } from "react";
import {
  loadClassifiedCheckout,
  type ClassifiedCheckoutIntent,
} from "../lib/swirepay/services/classifiedCheckoutService";

export function useClassifiedCheckout(token: string) {
  const [intent, setIntent] = useState<ClassifiedCheckoutIntent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!token) return;
    setError("");
    try {
      setIntent(await loadClassifiedCheckout(token));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not load checkout.",
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  return { intent, loading, error, refresh };
}
