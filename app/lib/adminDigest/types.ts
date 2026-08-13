export type DigestUser = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
};

export type DigestRoleRequest = {
  id: string;
  userId: string | null;
  email: string;
  requestedRole: "volunteer" | "team_member";
  status: string;
  createdAt: string;
};

export type DigestSubmission = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
};

export type DigestSubmissionSection = {
  key: string;
  label: string;
  studioPath: string;
  items: DigestSubmission[];
  error: string | null;
};

export type DailyAdminDigest = {
  from: string;
  to: string;
  users: DigestUser[];
  volunteerRequests: DigestRoleRequest[];
  teamMemberRequests: DigestRoleRequest[];
  submissions: DigestSubmissionSection[];
};
