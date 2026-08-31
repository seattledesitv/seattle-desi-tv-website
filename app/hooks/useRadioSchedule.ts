"use client";
import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { resolveUserRole, isAdminRole } from "../lib/roles";
import { RadioScheduleService } from "../lib/radioSchedule/services/radioScheduleService";
import type {
  RadioProgramInput,
  RadioProgram,
} from "../lib/radioSchedule/types";
import { useCurrentSite } from "../lib/sites/SiteContext";

export function useRadioSchedule(mode: "public" | "admin") {
  const site = useCurrentSite();
  const [programs, setPrograms] = useState<RadioProgram[]>([]);
  const [upcoming, setUpcoming] = useState<RadioProgram[]>([]);
  const [recurring, setRecurring] = useState<RadioProgram[]>([]);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (mode === "admin") {
        const auth = await getSupabaseBrowserClient().auth.getUser();
        if (!auth.data.user)
          throw new Error("Please log in to manage the radio schedule.");
        if (
          !isAdminRole(
            await resolveUserRole(getSupabaseBrowserClient(), auth.data.user),
          )
        )
          throw new Error("Admin access is required.");
        setUserId(auth.data.user.id);
        if (!site.id) throw new Error("The active site is not configured.");
        setPrograms(await RadioScheduleService.listAdmin(site.id));
      } else {
        if (!site.id) throw new Error("The active site is not configured.");
        const result = await RadioScheduleService.listPublic(
          site.id,
          undefined,
          site.timezone,
        );
        setUpcoming(result.upcoming);
        setRecurring(result.recurring);
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not load the radio schedule.",
      );
    } finally {
      setLoading(false);
    }
  }, [mode, site.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);
  async function run(task: () => Promise<unknown>) {
    setSaving(true);
    setError("");
    try {
      await task();
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not save the radio schedule.",
      );
      throw cause;
    } finally {
      setSaving(false);
    }
  }
  return {
    programs,
    upcoming,
    recurring,
    loading,
    saving,
    error,
    refresh,
    create: (input: RadioProgramInput) =>
      run(() => RadioScheduleService.create(input, userId, site.id!)),
    update: (id: string, input: RadioProgramInput) =>
      run(() => RadioScheduleService.update(id, input, site.id!)),
    remove: (id: string) =>
      run(() => RadioScheduleService.remove(id, site.id!)),
  };
}
