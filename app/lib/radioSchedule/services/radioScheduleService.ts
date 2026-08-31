import * as repository from "../repositories/radioScheduleRepository";
import type { RadioProgramInput, PublicRadioSchedule } from "../types";
import type { SupabaseClient } from "@supabase/supabase-js";

function normalize(input: RadioProgramInput): RadioProgramInput {
  const title = input.title.trim();
  if (title.length < 2) throw new Error("Program title is required.");
  if (input.schedule_type === "one_time") {
    if (
      !input.starts_at ||
      !input.ends_at ||
      new Date(input.ends_at) <= new Date(input.starts_at)
    )
      throw new Error("Choose a valid future start and end time.");
  } else if (
    !input.start_time ||
    !input.end_time ||
    input.end_time === input.start_time
  )
    throw new Error("Choose different recurring start and end times.");
  if (input.schedule_type === "weekly" && input.days_of_week.length === 0)
    throw new Error("Choose at least one weekday.");
  return {
    ...input,
    title,
    description: input.description?.trim() || null,
    host_name: input.host_name?.trim() || null,
    host_id: input.host_id || null,
    is_published: input.status === "published",
    starts_at: input.schedule_type === "one_time" ? input.starts_at : null,
    ends_at: input.schedule_type === "one_time" ? input.ends_at : null,
    days_of_week:
      input.schedule_type === "weekly"
        ? [...new Set(input.days_of_week)].sort()
        : [],
    start_time: input.schedule_type === "one_time" ? null : input.start_time,
    end_time: input.schedule_type === "one_time" ? null : input.end_time,
    effective_from:
      input.schedule_type === "one_time" ? null : input.effective_from,
    effective_until:
      input.schedule_type === "one_time" ? null : input.effective_until,
  };
}

export const RadioScheduleService = {
  async listPublic(
    siteId: string,
    db?: SupabaseClient,
    timezone = "America/Los_Angeles",
  ): Promise<PublicRadioSchedule> {
    const schedule = await repository.listPublic(siteId, db);
    return {
      generatedAt: new Date().toISOString(),
      timezone,
      ...schedule,
    };
  },
  listAdmin: repository.listAdmin,
  create: (input: RadioProgramInput, userId: string, siteId: string) =>
    repository.create(normalize(input), userId, siteId),
  update: (id: string, input: RadioProgramInput, siteId: string) =>
    repository.update(id, normalize(input), siteId),
  remove: repository.remove,
};
