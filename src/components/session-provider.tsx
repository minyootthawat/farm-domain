"use client";

import type { Session } from "next-auth";
import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

export function SessionProvider({
  authEnabled,
  children,
  session,
}: {
  authEnabled: boolean;
  children: React.ReactNode;
  session: Session | null;
}) {
  if (!authEnabled) {
    return <>{children}</>;
  }

  return <NextAuthSessionProvider session={session}>{children}</NextAuthSessionProvider>;
}
