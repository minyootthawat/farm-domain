import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { CredentialsSignin } from "next-auth";
import { compare } from "bcryptjs";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { getMongoDatabase } from "@/lib/mongodb";
import { createDisabledSession, isAuthEnabled } from "@/lib/auth-config";
import { normalizeUserRole } from "@/lib/rbac";
import type { UserRole } from "@/lib/schema";
import { redirect } from "next/navigation";
import { z } from "zod";

class InactiveUserError extends CredentialsSignin {
  code = "inactive";
}

const credentialsSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

function deriveUsername(user: { username?: unknown; email?: unknown; name?: unknown }) {
  if (typeof user.username === "string" && user.username.trim().length > 0) {
    return user.username.trim().toLowerCase();
  }

  if (typeof user.email === "string" && user.email.includes("@")) {
    return user.email.split("@")[0].trim().toLowerCase();
  }

  if (typeof user.name === "string" && user.name.trim().length > 0) {
    return user.name.trim().toLowerCase().replace(/\s+/g, ".");
  }

  return null;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type AuthUserDocument = {
  username?: string;
  email?: string;
  name?: string;
  role?: string;
  profileName?: string;
  passwordHash?: string;
  password?: string;
  isActive?: boolean;
  _id?: unknown;
};

async function getDatabase() {
  return getMongoDatabase();
}

const nextAuthResult = NextAuth({
  adapter: MongoDBAdapter(getDatabase as never),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/signin",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { username, password } = parsed.data;
        const identifier = username.trim().toLowerCase();
        const db = await getMongoDatabase();
        const candidateUsers = await db
          .collection<AuthUserDocument>("users")
          .find({
            $or: [
              { email: identifier },
              { username: identifier },
              ...(identifier.includes("@")
                ? []
                : [{ email: { $regex: `^${escapeRegex(identifier)}@`, $options: "i" } }]),
            ],
          })
          .limit(5)
          .toArray();

        const user =
          candidateUsers.find((candidate) => {
            const candidateEmail =
              typeof candidate.email === "string" ? candidate.email.trim().toLowerCase() : "";

            return candidateEmail === identifier || deriveUsername(candidate) === identifier;
          }) ?? null;

        if (!user) return null;
        if (user.isActive === false) {
          throw new InactiveUserError();
        }

        const passwordHash =
          typeof user.passwordHash === "string"
            ? user.passwordHash
            : typeof user.password === "string"
              ? user.password
              : null;

        if (!passwordHash) return null;

        const passwordMatch = await compare(password, passwordHash);
        if (!passwordMatch) return null;

        return {
          id: String(user._id),
          email: String(user.email ?? "").trim().toLowerCase(),
          name: user.name ?? user.email,
          role: normalizeUserRole(user.role),
          username: deriveUsername(user),
          profileName:
            typeof user.profileName === "string" && user.profileName.trim().length > 0
              ? user.profileName.trim()
              : user.name ?? user.email,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = normalizeUserRole((user as { role?: string }).role);
        token.profileName =
          typeof (user as { profileName?: string }).profileName === "string"
            ? (user as { profileName?: string }).profileName
            : null;
        token.username =
          typeof (user as { username?: string | null }).username === "string"
            ? (user as { username?: string | null }).username
            : null;
      } else if (token.role) {
        token.role = normalizeUserRole(String(token.role));
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = normalizeUserRole(token.role as string | undefined);
        session.user.profileName =
          typeof token.profileName === "string" && token.profileName.length > 0
            ? token.profileName
            : null;
        session.user.username =
          typeof token.username === "string" && token.username.length > 0
            ? token.username
            : null;
      }
      return session;
    },
  },
});

const {
  handlers,
  signIn: nextAuthSignIn,
  signOut: nextAuthSignOut,
  auth: nextAuthAuth,
} = nextAuthResult;

function getRedirectTarget(options: unknown, fallback = "/") {
  if (!options || typeof options !== "object") {
    return fallback;
  }

  if ("redirectTo" in options && typeof options.redirectTo === "string" && options.redirectTo.length > 0) {
    return options.redirectTo;
  }

  if ("callbackUrl" in options && typeof options.callbackUrl === "string" && options.callbackUrl.length > 0) {
    return options.callbackUrl;
  }

  return fallback;
}

export { handlers };

export async function auth() {
  if (!isAuthEnabled()) {
    return createDisabledSession();
  }

  return nextAuthAuth();
}

export async function signIn(...args: Parameters<typeof nextAuthSignIn>) {
  if (!isAuthEnabled()) {
    const options = args[1];

    if (options && typeof options === "object" && "redirect" in options && options.redirect === false) {
      return undefined as Awaited<ReturnType<typeof nextAuthSignIn>>;
    }

    redirect(getRedirectTarget(options));
  }

  return nextAuthSignIn(...args);
}

export async function signOut(...args: Parameters<typeof nextAuthSignOut>) {
  if (!isAuthEnabled()) {
    const options = args[0];

    if (options && typeof options === "object" && "redirect" in options && options.redirect === false) {
      return undefined as Awaited<ReturnType<typeof nextAuthSignOut>>;
    }

    redirect(getRedirectTarget(options));
  }

  return nextAuthSignOut(...args);
}

declare module "next-auth" {
  interface Session {
    expires: string;
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: UserRole;
      username: string | null;
      profileName: string | null;
    };
  }

  interface User {
    role?: UserRole;
    username?: string | null;
    profileName?: string | null;
  }
}
