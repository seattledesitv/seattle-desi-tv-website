import type { SupabaseClient } from "@supabase/supabase-js";
import * as repository from "../repositories/adminDigestRepository";
import type { DailyAdminDigest, DigestRoleRequest, DigestSubmissionSection, DigestUser } from "../types";

const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] || character);
const pacificTime = (value: string) => new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

function emptyRow(message: string) {
  return `<tr><td colspan="3" style="padding:14px;border-bottom:1px solid #e5e7eb;color:#64748b">${escapeHtml(message)}</td></tr>`;
}

function userRows(users: DigestUser[]) {
  if (!users.length) return emptyRow("No new registrations during this reporting period.");
  return users.map((user) => `<tr><td style="padding:10px;border-bottom:1px solid #e5e7eb">${escapeHtml(user.name || "Not provided")}</td><td style="padding:10px;border-bottom:1px solid #e5e7eb">${escapeHtml(user.email)}</td><td style="padding:10px;border-bottom:1px solid #e5e7eb">${escapeHtml(pacificTime(user.createdAt))}</td></tr>`).join("");
}

function requestRows(requests: DigestRoleRequest[], emptyMessage: string) {
  if (!requests.length) return emptyRow(emptyMessage);
  return requests.map((request) => `<tr><td style="padding:10px;border-bottom:1px solid #e5e7eb">${escapeHtml(request.email)}</td><td style="padding:10px;border-bottom:1px solid #e5e7eb">${escapeHtml(request.status.replaceAll("_", " "))}</td><td style="padding:10px;border-bottom:1px solid #e5e7eb">${escapeHtml(pacificTime(request.createdAt))}</td></tr>`).join("");
}

function submissionRows(section: DigestSubmissionSection) {
  if (section.error) return emptyRow("This section could not be loaded. Check the module configuration in Studio.");
  if (!section.items.length) return emptyRow(`No new ${section.label.toLowerCase()} during this reporting period.`);
  return section.items.map((item) => `<tr><td style="padding:10px;border-bottom:1px solid #e5e7eb">${escapeHtml(item.title)}</td><td style="padding:10px;border-bottom:1px solid #e5e7eb">${escapeHtml(item.status.replaceAll("_", " "))}</td><td style="padding:10px;border-bottom:1px solid #e5e7eb">${escapeHtml(pacificTime(item.createdAt))}</td></tr>`).join("");
}

function table(title: string, headings: string[], rows: string, count: number) {
  return `<section style="margin-top:24px"><h2 style="margin:0 0 10px;color:#0f172a">${escapeHtml(title)} (${count})</h2><table style="width:100%;border-collapse:collapse;background:#fff"><thead><tr>${headings.map((heading) => `<th style="padding:10px;text-align:left;background:#f1f5f9;border-bottom:2px solid #cbd5e1">${escapeHtml(heading)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></section>`;
}

export const AdminDigestService = {
  listDeliveries: repository.listDeliveries,
  async build(db: SupabaseClient, from: Date, to: Date): Promise<DailyAdminDigest> {
    const [users, requests, submissions] = await Promise.all([
      repository.listNewUsers(db.auth.admin, from.toISOString(), to.toISOString()),
      repository.listNewRoleRequests(db, from.toISOString(), to.toISOString()),
      repository.listNewSubmissions(db, from.toISOString(), to.toISOString()),
    ]);
    return {
      from: from.toISOString(),
      to: to.toISOString(),
      users,
      volunteerRequests: requests.filter((request) => request.requestedRole === "volunteer"),
      teamMemberRequests: requests.filter((request) => request.requestedRole === "team_member"),
      submissions,
    };
  },

  subject(digest: DailyAdminDigest) {
    const total = digest.users.length + digest.volunteerRequests.length + digest.teamMemberRequests.length + digest.submissions.reduce((sum, section) => sum + section.items.length, 0);
    return `SDTV daily user activity: ${total} new update${total === 1 ? "" : "s"}`;
  },

  html(digest: DailyAdminDigest, studioUrl: string) {
    const submissionTables = digest.submissions.map((section) => `${table(section.label, ["Submission", "Status", "Added"], submissionRows(section), section.items.length)}<p style="margin:8px 0 0"><a href="${escapeHtml(`${studioUrl.replace(/\/$/, "")}${section.studioPath.replace("/studio", "")}`)}" style="color:#be185d;font-weight:bold">Review ${escapeHtml(section.label.toLowerCase())} →</a></p>`).join("");
    return `<div style="font-family:Arial,sans-serif;max-width:760px;margin:auto;line-height:1.5;color:#334155"><div style="background:#080d1d;color:#fff;padding:24px;border-radius:18px 18px 0 0"><p style="margin:0;color:#f9a8d4;font-weight:bold;text-transform:uppercase">Seattle Desi TV</p><h1 style="margin:8px 0 0">Daily platform activity</h1><p style="margin:10px 0 0;color:#cbd5e1">${escapeHtml(pacificTime(digest.from))} through ${escapeHtml(pacificTime(digest.to))}</p></div><div style="padding:24px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 18px 18px">${table("New registrations", ["Name", "Email", "Registered"], userRows(digest.users), digest.users.length)}${table("Volunteer requests", ["Email", "Status", "Requested"], requestRows(digest.volunteerRequests, "No new volunteer requests during this reporting period."), digest.volunteerRequests.length)}${table("Team-member requests", ["Email", "Status", "Requested"], requestRows(digest.teamMemberRequests, "No new team-member requests during this reporting period."), digest.teamMemberRequests.length)}${submissionTables}<p style="margin-top:26px"><a href="${escapeHtml(studioUrl)}" style="display:inline-block;background:#db2777;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:bold">Review everything in SDTV Studio</a></p><p style="margin-top:18px;color:#64748b;font-size:13px">This automated report covers the previous 24 hours and contains administrative account information. Please do not forward it outside the SDTV team.</p></div></div>`;
  },
};
