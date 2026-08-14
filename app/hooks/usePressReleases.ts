"use client";
import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../lib/roles";
import { PressReleaseService } from "../lib/pressReleases/services/pressReleaseService";
import type { PressRelease, PressReleaseInput, PressReleaseStatus } from "../lib/pressReleases/types";

function text(error: unknown) { return error instanceof Error ? error.message : "The press release operation could not be completed."; }

export function usePressReleases(mode: "public" | "owner" | "admin") {
  const [releases, setReleases] = useState<PressRelease[]>([]);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const { data } = await getSupabaseBrowserClient().auth.getUser();
      const user = data.user; setUserId(user?.id || "");
      if (mode === "public") setReleases(await PressReleaseService.listPublic());
      else {
        if (!user) throw new Error("Please log in to manage press releases.");
        if (mode === "admin" && !isAdminRole(await resolveUserRole(getSupabaseBrowserClient(), user))) throw new Error("Admin access is required.");
        setReleases(mode === "admin" ? await PressReleaseService.listAdmin() : await PressReleaseService.listOwner(user.id));
      }
    } catch (cause) { setError(text(cause)); }
    finally { setLoading(false); }
  }, [mode]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);
  async function run(task: () => Promise<unknown>) {
    setSaving(true); setError("");
    try { await task(); await refresh(); }
    catch (cause) { setError(text(cause)); throw cause; }
    finally { setSaving(false); }
  }
  return { releases, userId, loading, saving, error, refresh,
    create: (input: PressReleaseInput, status?: PressReleaseStatus) => run(() => PressReleaseService.create(input, userId, status)),
    update: (id: string, input: PressReleaseInput) => run(() => PressReleaseService.updateOwner(id, input)),
    review: (id: string, decision: string, notes: string) => run(() => PressReleaseService.review(id, decision, notes)),
    upload: (file: File) => PressReleaseService.uploadFile(file, userId),
  };
}
