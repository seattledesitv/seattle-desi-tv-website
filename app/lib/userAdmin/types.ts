export type RegisteredUser = {
  id: string;
  email: string;
  fullName: string;
  createdAt: string;
  lastSignInAt: string | null;
  emailConfirmedAt: string | null;
  isAdmin: boolean;
};

export type RegisteredUserSummary = {
  users: RegisteredUser[];
  total: number;
  confirmed: number;
  signedIn: number;
};
