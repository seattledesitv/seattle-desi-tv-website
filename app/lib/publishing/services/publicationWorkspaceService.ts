import type { SupabaseClient } from "@supabase/supabase-js";
import { isAdminRole, resolveUserRole } from "../../roles";
import { getPublication } from "../repository";
import type { PublicationRecord } from "../types";

export async function openPublicationEditorialWorkspace(
  supabase: SupabaseClient,
  publicationId: string,
): Promise<PublicationRecord> {
  const session = await supabase.auth.getSession();
  const user = session.data.session?.user;
  if (!user) throw new Error("Please log in to access the Publishing Platform.");

  const role = await resolveUserRole(supabase, user);
  if (!isAdminRole(role)) {
    throw new Error("This account does not have Studio admin access.");
  }

  return getPublication(supabase, publicationId);
}
