import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "../../supabaseBrowser";
import type { RadioProgram, RadioProgramInput } from "../types";

const fields = "id,title,description,host_id,host_name,schedule_type,starts_at,ends_at,days_of_week,start_time,end_time,timezone,effective_from,effective_until,is_published,status,display_order,created_at,updated_at,host:radio_team_members(id,name,image)";
const client = (db?: SupabaseClient) => db || getSupabaseBrowserClient();

export async function listPublic(db?: SupabaseClient) {
  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const [dated, recurring] = await Promise.all([
    client(db).from("radio_programs").select(fields).eq("status", "published").eq("schedule_type", "one_time").gt("ends_at", now).order("starts_at"),
    client(db).from("radio_programs").select(fields).eq("status", "published").in("schedule_type", ["daily", "weekly"]).or(`effective_from.is.null,effective_from.lte.${today}`).or(`effective_until.is.null,effective_until.gte.${today}`).order("display_order").order("start_time"),
  ]);
  if (dated.error) throw dated.error;
  if (recurring.error) throw recurring.error;
  return { upcoming: (dated.data || []) as unknown as RadioProgram[], recurring: (recurring.data || []) as unknown as RadioProgram[] };
}

export async function listAdmin() {
  const { data, error } = await client().from("radio_programs").select(fields).order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as RadioProgram[];
}

export async function create(input: RadioProgramInput, userId: string) {
  const { error } = await client().from("radio_programs").insert({ ...input, created_by: userId });
  if (error) throw error;
}

export async function update(id: string, input: RadioProgramInput) {
  const { error } = await client().from("radio_programs").update(input).eq("id", id);
  if (error) throw error;
}

export async function remove(id: string) {
  const { error } = await client().from("radio_programs").delete().eq("id", id);
  if (error) throw error;
}
