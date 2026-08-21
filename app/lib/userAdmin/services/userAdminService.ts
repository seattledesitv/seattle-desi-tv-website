import * as repository from "../repositories/userAdminRepository";
import type { RegisteredUserSummary } from "../types";

export async function buildRegisteredUserSummary(...args: Parameters<typeof repository.listRegisteredUsers>): Promise<RegisteredUserSummary> {
  const users = await repository.listRegisteredUsers(...args);
  return {
    users,
    total: users.length,
    confirmed: users.filter((user) => user.emailConfirmedAt).length,
    signedIn: users.filter((user) => user.lastSignInAt).length,
  };
}

export async function deleteRegisteredUser(
  authAdmin: Parameters<typeof repository.deleteRegisteredUser>[0],
  target: { id: string; email: string; isAdmin: boolean },
  actor: { id: string; role: string },
  confirmationEmail: string,
) {
  if (target.id === actor.id) throw new Error("You cannot delete your own account.");
  if (target.email.trim().toLowerCase() !== confirmationEmail.trim().toLowerCase()) throw new Error("The confirmation email does not match.");
  if (target.isAdmin && !actor.role.toLowerCase().includes("super_admin")) throw new Error("Only a super admin can delete another administrator.");
  await repository.deleteRegisteredUser(authAdmin, target.id);
}
