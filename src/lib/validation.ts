import { z } from "zod";
import {
  DOMAIN_STATUSES,
  ENVIRONMENTS,
  HOST_TYPES,
  PANEL_STATUSES,
  SERVER_PROVIDERS,
  SERVICE_STATUSES,
  type UserRole,
  type DomainStatus,
  type Environment,
  type HostType,
  type PanelStatus,
  type ServerProvider,
  type ServiceStatus,
} from "@/lib/schema";

export const IPV4_PATTERN =
  /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/;
export const DOMAIN_PATTERN =
  /^(?=.{1,253}$)(?!-)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
export const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{1,30}[a-z0-9])?$/i;
export const PASSWORD_MIN_LENGTH = 8;

function nullableTrimmedString() {
  return z
    .string()
    .trim()
    .transform((value) => (value.length > 0 ? value : null));
}

function normalizeDomainName(value: string) {
  return value.trim().toLowerCase();
}

export const serverInputSchema = z.object({
  name: z.string().trim().min(1),
  ipAddress: z.string().trim().regex(IPV4_PATTERN),
  profileName: z.string().trim().min(1),
  provider: z.enum(SERVER_PROVIDERS),
  environment: z.enum(ENVIRONMENTS),
  region: nullableTrimmedString(),
  note: nullableTrimmedString(),
});

export const domainCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .transform(normalizeDomainName)
    .refine((value) => DOMAIN_PATTERN.test(value)),
  serverId: z.string().trim().min(1),
  hostType: z.enum(HOST_TYPES),
  status: z.enum(DOMAIN_STATUSES),
  panelStatus: z.enum(PANEL_STATUSES),
  s3Status: z.enum(SERVICE_STATUSES),
  subdomainProvider: nullableTrimmedString(),
  ownerProfile: nullableTrimmedString(),
  postmanStatus: z.enum(SERVICE_STATUSES),
  uptimeStatus: z.enum(SERVICE_STATUSES),
  note: nullableTrimmedString(),
});

export const domainUpdateSchema = domainCreateSchema.omit({
  name: true,
  serverId: true,
});

const userRoleSchema = z.enum(["admin", "editor", "viewer"]);

const userBaseSchema = z.object({
  username: z.string().trim().toLowerCase().regex(USERNAME_PATTERN),
  email: z.string().trim().email(),
  name: z.string().trim().min(1),
  role: userRoleSchema,
  profileName: nullableTrimmedString(),
  isActive: z.boolean(),
});

export const userCreateSchema = userBaseSchema
  .extend({
    password: z.string().trim().min(PASSWORD_MIN_LENGTH),
  })
  .superRefine((value, ctx) => {
    if (value.role !== "admin" && !value.profileName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Profile name is required.",
        path: ["profileName"],
      });
    }
  });

export const userUpdateSchema = userBaseSchema
  .extend({
    password: z.string().trim().optional().transform((value) => {
      if (!value) {
        return null;
      }

      return value.length > 0 ? value : null;
    }),
  })
  .superRefine((value, ctx) => {
    if (value.role !== "admin" && !value.profileName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Profile name is required.",
        path: ["profileName"],
      });
    }

    if (value.password && value.password.length < PASSWORD_MIN_LENGTH) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_small,
        minimum: PASSWORD_MIN_LENGTH,
        inclusive: true,
        origin: "string",
        path: ["password"],
        message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
      });
    }
  });

export function parseServerInput(input: {
  name: string;
  ipAddress: string;
  profileName: string;
  provider: ServerProvider;
  environment: Environment;
  region: string | null;
  note: string | null;
}) {
  return serverInputSchema.parse({
    ...input,
    region: input.region ?? "",
    note: input.note ?? "",
  });
}

export function parseDomainCreateInput(input: {
  name: string;
  serverId: string;
  hostType: HostType;
  status: DomainStatus;
  panelStatus: PanelStatus;
  s3Status: ServiceStatus;
  subdomainProvider: string | null;
  ownerProfile: string | null;
  postmanStatus: ServiceStatus;
  uptimeStatus: ServiceStatus;
  note: string | null;
}) {
  return domainCreateSchema.parse({
    ...input,
    subdomainProvider: input.subdomainProvider ?? "",
    ownerProfile: input.ownerProfile ?? "",
    note: input.note ?? "",
  });
}

export function parseDomainUpdateInput(input: {
  status: DomainStatus;
  hostType: HostType;
  panelStatus: PanelStatus;
  s3Status: ServiceStatus;
  subdomainProvider: string | null;
  ownerProfile: string | null;
  postmanStatus: ServiceStatus;
  uptimeStatus: ServiceStatus;
  note: string | null;
}) {
  return domainUpdateSchema.parse({
    ...input,
    subdomainProvider: input.subdomainProvider ?? "",
    ownerProfile: input.ownerProfile ?? "",
    note: input.note ?? "",
  });
}

export function normalizeImportedServerName(name: string) {
  return name.trim();
}

export function normalizeImportedIpAddress(ipAddress: string) {
  return ipAddress.trim();
}

export function normalizeImportedDomainName(name: string) {
  return normalizeDomainName(name);
}

export function parseUserCreateInput(input: {
  email: string;
  username: string;
  name: string;
  role: UserRole;
  profileName: string | null;
  password: string;
  isActive: boolean;
}) {
  return userCreateSchema.parse({
    ...input,
    username: input.username.trim().toLowerCase(),
    email: input.email.trim().toLowerCase(),
    profileName: input.profileName ?? "",
    password: input.password ?? "",
  });
}

export function parseUserUpdateInput(input: {
  email: string;
  username: string;
  name: string;
  role: UserRole;
  profileName: string | null;
  password?: string | null;
  isActive: boolean;
}) {
  return userUpdateSchema.parse({
    ...input,
    username: input.username.trim().toLowerCase(),
    email: input.email.trim().toLowerCase(),
    profileName: input.profileName ?? "",
    password: input.password ?? "",
  });
}
