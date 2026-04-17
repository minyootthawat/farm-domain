import type { Session } from "next-auth";

export const AUTH_DISABLED_USER_ID = "auth-disabled-admin";
export const AUTH_DISABLED_EMAIL = "internal-admin@local.invalid";
export const AUTH_DISABLED_NAME = "Internal Admin";

export function isAuthEnabled() {
  return process.env.AUTH_ENABLED !== "false";
}

export function createDisabledSession(): Session {
  return {
    expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    user: {
      id: AUTH_DISABLED_USER_ID,
      email: AUTH_DISABLED_EMAIL,
      name: AUTH_DISABLED_NAME,
      role: "admin",
      username: "internal-admin",
      profileName: AUTH_DISABLED_NAME,
    },
  };
}
