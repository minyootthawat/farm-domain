import type { UserRole } from "@/lib/schema";

export const USER_ROLES = ["admin", "editor", "viewer"] as const satisfies readonly UserRole[];

type SessionLike =
  | {
      user?: {
        role?: string | null;
        profileName?: string | null;
        name?: string | null;
        email?: string | null;
      } | null;
    }
  | null;

export function normalizeUserRole(role?: string | null): UserRole {
  switch (role) {
    case "admin":
      return "admin";
    case "viewer":
      return "viewer";
    case "editor":
    case "user":
    default:
      return "editor";
  }
}

export function getSessionUserRole(session: SessionLike): UserRole | null {
  if (!session?.user) {
    return null;
  }

  return normalizeUserRole(session.user.role);
}

export function getSessionProfile(session: SessionLike): string | null {
  return session?.user?.profileName ?? session?.user?.name ?? session?.user?.email ?? null;
}

export function canViewInventory(session: SessionLike) {
  return Boolean(session?.user);
}

export function canWriteInventory(session: SessionLike) {
  const role = getSessionUserRole(session);
  return role === "admin" || role === "editor";
}

export function canManageAllProfiles(session: SessionLike) {
  return getSessionUserRole(session) === "admin";
}

export function canManageUsers(session: SessionLike) {
  return getSessionUserRole(session) === "admin";
}

export function getInventoryScopeProfile(session: SessionLike) {
  return canManageAllProfiles(session) ? null : getSessionProfile(session);
}
