"use client";
import { useEffect, useState } from "react";
import { PressReleaseService } from "../lib/pressReleases/services/pressReleaseService";
import type { PressRelease } from "../lib/pressReleases/types";

export function usePressReleaseDetail(id: string) {
  const [release, setRelease] = useState<PressRelease | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    if (!id) return;
    PressReleaseService.getPublic(id).then((value) => {
      if (!active) return;
      setRelease(value);
      if (!value) setError("Press release not found.");
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : "Press release could not be loaded.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);
  return { release, loading, error };
}
