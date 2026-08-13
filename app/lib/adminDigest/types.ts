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

export type DailyAdminDigest = {
  from: string;
  to: string;
  users: DigestUser[];
  volunteerRequests: DigestRoleRequest[];
  teamMemberRequests: DigestRoleRequest[];
};
