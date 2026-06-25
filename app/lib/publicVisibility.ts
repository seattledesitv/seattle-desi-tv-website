export type HiddenUserSet = {
  emails: Set<string>;
  userIds: Set<string>;
};

export async function loadHiddenUsers(supabase: any): Promise<HiddenUserSet> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("user_id,email,public_visibility_disabled")
    .eq("public_visibility_disabled", true);
  if (error) return { emails: new Set(), userIds: new Set() };
  return {
    emails: new Set((data || []).map((row: any) => String(row.email || "").toLowerCase()).filter(Boolean)),
    userIds: new Set((data || []).map((row: any) => String(row.user_id || "")).filter(Boolean)),
  };
}

export function isPubliclyHidden(row: any, hidden: HiddenUserSet) {
  const email = String(row?.email || row?.user_email || row?.submitter_email || row?.assigned_editor_email || "").toLowerCase();
  const userId = String(row?.user_id || row?.submitter_user_id || "");
  return Boolean((email && hidden.emails.has(email)) || (userId && hidden.userIds.has(userId)));
}
