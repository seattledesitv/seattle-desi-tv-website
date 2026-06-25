export type ProfilePrivacyStatus = "hidden" | "private" | "public" | "custom";

export type ProfilePrivacyInput = {
  public_visibility_disabled?: boolean | null;
  keep_profile_private?: boolean | null;
  show_name_publicly?: boolean | null;
  allow_social_credit?: boolean | null;
  allow_sdtv_contact?: boolean | null;
};

export const PROFILE_PRIVACY_LABELS = {
  displayName: "Display my name publicly",
  socialCredit: "Credit me when SDTV publishes my content",
  sdtvContact: "Allow SDTV to contact me",
  hidePublicProfile: "Hide my public profile",
};

export function getProfilePrivacyStatus(profile: ProfilePrivacyInput): ProfilePrivacyStatus {
  if (profile.public_visibility_disabled) return "hidden";

  const hidePublicProfile = profile.keep_profile_private !== false;
  const displayName = Boolean(profile.show_name_publicly);
  const credit = Boolean(profile.allow_social_credit);

  if (hidePublicProfile && !displayName && !credit) return "private";
  if (!hidePublicProfile && displayName && credit) return "public";
  return "custom";
}

export function getProfilePrivacyStatusLabel(profile: ProfilePrivacyInput): string {
  const status = getProfilePrivacyStatus(profile);
  if (status === "hidden") return "Hidden";
  if (status === "private") return "Private";
  if (status === "public") return "Public";
  return "Custom";
}

export function getProfilePrivacyStatusClass(profile: ProfilePrivacyInput): string {
  const status = getProfilePrivacyStatus(profile);
  if (status === "hidden") return "bg-red-100 text-red-700";
  if (status === "private") return "bg-slate-100 text-slate-700";
  if (status === "public") return "bg-green-100 text-green-700";
  return "bg-yellow-100 text-yellow-800";
}

export function getProfilePrivacyDescription(profile: ProfilePrivacyInput): string {
  const status = getProfilePrivacyStatus(profile);
  if (status === "hidden") return "Admin has hidden this person from public SDTV experiences.";
  if (status === "private") return "Profile is private by default.";
  if (status === "public") return "Profile and name can be shown publicly where appropriate.";
  return "Mixed privacy permissions are enabled.";
}

export type ProfileVisibilityMode = "private" | "public" | "custom";

export function visibilityModeFromProfile(profile: ProfilePrivacyInput): ProfileVisibilityMode {
  const status = getProfilePrivacyStatus(profile);
  if (status === "public") return "public";
  if (status === "private") return "private";
  return "custom";
}

export function visibilityModeFlags(mode: ProfileVisibilityMode) {
  if (mode === "public") return { keep_profile_private: false, show_name_publicly: true, allow_social_credit: true };
  if (mode === "private") return { keep_profile_private: true, show_name_publicly: false, allow_social_credit: false };
  return { keep_profile_private: true, show_name_publicly: true, allow_social_credit: true };
}
