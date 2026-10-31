import { UserRole } from "@/generated/prisma/enums";

export function canManageUsers(role: UserRole): boolean {
  return (
    role === UserRole.ADMINISTRATIONS ||
    role === UserRole.DIRECTOR
  );
}

export const userManagerRoles = [
  UserRole.ADMINISTRATIONS,
  UserRole.DIRECTOR,
] as const;
