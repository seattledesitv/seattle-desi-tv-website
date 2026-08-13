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

export type AdminDigestDelivery = {
  id: string;
  delivery_type: "scheduled" | "test";
  status: "processing" | "sent" | "failed";
  recipient: string;
  subject: string;
  report_from: string;
  report_to: string;
  counts: Record<string, unknown>;
  provider_email_id: string | null;
  error_message: string | null;
  triggered_by: string | null;
  created_at: string;
  sent_at: string | null;
};
