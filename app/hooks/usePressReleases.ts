"use client";
import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../lib/roles";
import { PressReleaseService } from "../lib/pressReleases/services/pressReleaseService";
import type {
  PressRelease,
  PressReleaseInput,
  PressReleaseStatus,
} from "../lib/pressReleases/types";
import { useCurrentSite } from "../lib/sites/SiteContext";

function text(error: unknown) {
  return error instanceof Error
    ? error.message
    : "The press release operation could not be completed.";
}

export function usePressReleases(mode: "public" | "owner" | "admin") {
  const site = useCurrentSite();
  const [releases, setReleases] = useState<PressRelease[]>([]);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (!site.id) throw new Error("The active site could not be resolved.");
      const { data } = await getSupabaseBrowserClient().auth.getUser();
      const user = data.user;
      setUserId(user?.id || "");
      if (mode === "public")
        setReleases(await PressReleaseService.listPublic(site.id));
      else {
        if (!user) throw new Error("Please log in to manage press releases.");
        if (
          mode === "admin" &&
          !isAdminRole(await resolveUserRole(getSupabaseBrowserClient(), user))
        )
          throw new Error("Admin access is required.");
        setReleases(
          mode === "admin"
            ? await PressReleaseService.listAdmin(site.id)
            : await PressReleaseService.listOwner(user.id, site.id),
        );
      }
    } catch (cause) {
      setError(text(cause));
    } finally {
      setLoading(false);
    }
  }, [mode, site.id]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);
  async function run(task: () => Promise<unknown>) {
    setSaving(true);
    setError("");
    try {
      await task();
      await refresh();
    } catch (cause) {
      setError(text(cause));
      throw cause;
    } finally {
      setSaving(false);
    }
  }
  return {
    releases,
    userId,
    loading,
    saving,
    error,
    refresh,
    create: (input: PressReleaseInput, status?: PressReleaseStatus) =>
      run(() => {
        if (!site.id) throw new Error("The active site could not be resolved.");
        return PressReleaseService.create(input, userId, site.id, status);
      }),
    update: (id: string, input: PressReleaseInput) =>
      run(() => {
        if (!site.id) throw new Error("The active site could not be resolved.");
        return mode === "admin"
          ? PressReleaseService.updateAdmin(id, input, site.id)
          : PressReleaseService.updateOwner(id, input, site.id);
      }),
    review: (id: string, decision: string, notes: string) =>
      run(() => {
        if (!site.id) throw new Error("The active site could not be resolved.");
        return PressReleaseService.review(id, decision, notes, site.id);
      }),
    upload: (file: File) => PressReleaseService.uploadFile(file, userId),
  };
}
