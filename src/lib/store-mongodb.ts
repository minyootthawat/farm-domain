import { randomUUID } from "node:crypto";
import { ObjectId, type WithId } from "mongodb";
import { hash } from "bcryptjs";
import type { ImportedDomain, ImportedServer } from "@/lib/import-export";
import { getMongoDatabase } from "@/lib/mongodb";
import type {
  Domain,
  DomainStatus,
  Environment,
  HostType,
  PanelStatus,
  Server,
  ServerProvider,
  ServiceStatus,
  StoreData,
  UserAccount,
  UserRole,
} from "@/lib/schema";
import type {
  DryRunReport,
  DryRunRow,
  ImportDataResult,
} from "@/lib/store-types";
import {
  normalizeImportedDomainName,
  normalizeImportedIpAddress,
  normalizeImportedServerName,
  parseDomainCreateInput,
  parseDomainUpdateInput,
  parseServerInput,
  parseUserCreateInput,
  parseUserUpdateInput,
} from "@/lib/validation";

type ServerDocument = Omit<Server, "createdAt" | "updatedAt"> & {
  createdAt: Date;
  updatedAt: Date;
};

type DomainDocument = Omit<Domain, "createdAt" | "updatedAt"> & {
  createdAt: Date;
  updatedAt: Date;
};

type UserDocument = {
  username?: string;
  email: string;
  name: string;
  role: UserRole;
  profileName: string | null;
  passwordHash?: string;
  password?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

let indexesReady: Promise<void> | null = null;

async function getCollections() {
  const db = await getMongoDatabase();

  if (!indexesReady) {
    indexesReady = Promise.all([
      db.collection<ServerDocument>("servers").createIndexes([
        { key: { id: 1 }, unique: true, name: "servers_id_unique" },
        { key: { name: 1, ipAddress: 1 }, unique: true, name: "servers_name_ip_unique" },
        { key: { profileName: 1, name: 1 }, name: "servers_profile_name_idx" },
      ]),
      db.collection<DomainDocument>("domains").createIndexes([
        { key: { id: 1 }, unique: true, name: "domains_id_unique" },
        { key: { name: 1 }, unique: true, name: "domains_name_unique" },
        { key: { serverId: 1 }, name: "domains_server_id_idx" },
        { key: { updatedAt: -1 }, name: "domains_updated_at_idx" },
      ]),
      db.collection<UserDocument>("users").createIndexes([
        { key: { email: 1 }, unique: true, name: "users_email_unique" },
        { key: { username: 1 }, unique: true, name: "users_username_unique", partialFilterExpression: { username: { $exists: true } } },
        { key: { role: 1, isActive: 1 }, name: "users_role_active_idx" },
        { key: { profileName: 1 }, name: "users_profile_name_idx" },
      ]),
    ]).then(() => undefined);
  }

  await indexesReady;

  return {
    servers: db.collection<ServerDocument>("servers"),
    domains: db.collection<DomainDocument>("domains"),
    users: db.collection<UserDocument>("users"),
  };
}

function toServer(server: WithId<ServerDocument>): Server {
  const { _id: mongoId, ...rest } = server;
  void mongoId;

  return {
    ...rest,
    createdAt: rest.createdAt.toISOString(),
    updatedAt: rest.updatedAt.toISOString(),
  };
}

function toDomain(domain: WithId<DomainDocument>): Domain {
  const { _id: mongoId, ...rest } = domain;
  void mongoId;

  return {
    ...rest,
    createdAt: rest.createdAt.toISOString(),
    updatedAt: rest.updatedAt.toISOString(),
  };
}

function toUserAccount(user: WithId<UserDocument>): UserAccount {
  const { _id, passwordHash, password, username, ...rest } = user;
  void _id;
  void passwordHash;
  void password;

  return {
    id: user._id.toString(),
    username:
      typeof username === "string" && username.trim().length > 0
        ? username.trim().toLowerCase()
        : rest.email.split("@")[0].toLowerCase(),
    ...rest,
    profileName: rest.profileName ?? null,
    isActive: rest.isActive !== false,
    createdAt: rest.createdAt.toISOString(),
    updatedAt: rest.updatedAt.toISOString(),
  };
}

function isDuplicateKeyError(error: unknown) {
  return !!error && typeof error === "object" && "code" in error && error.code === 11000;
}

export async function readStore(userProfile?: string | null): Promise<StoreData> {
  const { servers, domains } = await getCollections();
  const serverFilter = userProfile ? { profileName: userProfile } : {};
  const domainFilter = userProfile ? { ownerProfile: { $in: [userProfile as string, null] } } : {};
  const [serverRows, domainRows] = await Promise.all([
    servers.find(serverFilter, { sort: { profileName: 1, name: 1 } }).toArray(),
    domains.find(domainFilter, { sort: { updatedAt: -1 } }).toArray(),
  ]);

  return {
    servers: serverRows.map(toServer),
    domains: domainRows.map(toDomain),
  };
}

export async function addServer(input: {
  name: string;
  ipAddress: string;
  profileName: string;
  provider: ServerProvider;
  environment: Environment;
  region: string | null;
  note: string | null;
}) {
  const data = parseServerInput(input);
  const { servers } = await getCollections();
  const now = new Date();

  try {
    await servers.insertOne({
      id: randomUUID(),
      ...data,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return false;
    }
    throw error;
  }

  return true;
}

export async function updateServerById(
  id: string,
  input: {
    name: string;
    ipAddress: string;
    profileName: string;
    provider: ServerProvider;
    environment: Environment;
    region: string | null;
    note: string | null;
  },
  userProfile?: string | null,
) {
  const data = parseServerInput(input);
  const { servers } = await getCollections();
  const filter = userProfile ? { id, profileName: userProfile } : { id };

  try {
    const result = await servers.updateOne(
      filter,
      { $set: { ...data, updatedAt: new Date() } },
    );

    if (result.matchedCount === 0) {
      return false;
    }
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return false;
    }
    throw error;
  }

  return true;
}

export async function deleteServerById(id: string, userProfile?: string | null) {
  const { servers, domains } = await getCollections();
  const filter = userProfile ? { id, profileName: userProfile } : { id };
  const linkedDomains = await domains.countDocuments({ serverId: id });

  if (linkedDomains > 0) {
    return false;
  }

  const result = await servers.deleteOne(filter);
  return result.deletedCount > 0;
}

export async function importServersData(entries: ImportedServer[]) {
  if (entries.length === 0) {
    return { importedCount: 0, skippedCount: 0, skippedBreakdown: {} } satisfies ImportDataResult;
  }

  const { servers } = await getCollections();
  let importedCount = 0;
  let skippedCount = 0;
  const skippedBreakdown: ImportDataResult["skippedBreakdown"] = {};
  const seenKeys = new Set<string>();

  for (const entry of entries) {
    const normalized = parseServerInput({
      ...entry,
      name: normalizeImportedServerName(entry.name),
      ipAddress: normalizeImportedIpAddress(entry.ipAddress),
    });
    const dedupeKey = `${normalized.name}::${normalized.ipAddress}`;

    if (seenKeys.has(dedupeKey)) {
      skippedCount += 1;
      skippedBreakdown.duplicate_in_file = (skippedBreakdown.duplicate_in_file ?? 0) + 1;
      continue;
    }

    seenKeys.add(dedupeKey);

    const existing =
      (entry.id ? await servers.findOne({ id: entry.id }) : null) ??
      (await servers.findOne({ name: normalized.name, ipAddress: normalized.ipAddress }));

    if (existing) {
      await servers.updateOne(
        { id: existing.id },
        { $set: { ...normalized, updatedAt: new Date() } },
      );
    } else {
      const now = new Date();
      await servers.insertOne({
        id: entry.id ?? randomUUID(),
        ...normalized,
        createdAt: now,
        updatedAt: now,
      });
    }

    importedCount += 1;
  }

  return { importedCount, skippedCount, skippedBreakdown } satisfies ImportDataResult;
}

export async function analyzeServersImportData(entries: ImportedServer[]): Promise<DryRunReport> {
  if (entries.length === 0) {
    return { createCount: 0, updateCount: 0, skipCount: 0, rows: [] };
  }

  const { servers } = await getCollections();
  const existingServers = await servers.find().toArray();
  const serverById = new Map(existingServers.map((server) => [server.id, server]));
  const serverByKey = new Map(existingServers.map((server) => [`${server.name}::${server.ipAddress}`, server]));
  const seenKeys = new Set<string>();
  const rows: DryRunRow[] = [];
  let createCount = 0;
  let updateCount = 0;
  let skipCount = 0;

  for (const entry of entries) {
    let normalized;

    try {
      normalized = parseServerInput({
        ...entry,
        name: normalizeImportedServerName(entry.name),
        ipAddress: normalizeImportedIpAddress(entry.ipAddress),
      });
    } catch {
      rows.push({ action: "skip", key: entry.name || entry.ipAddress, reason: "invalid_data", secondary: entry.ipAddress || null });
      skipCount += 1;
      continue;
    }

    const dedupeKey = `${normalized.name}::${normalized.ipAddress}`;

    if (seenKeys.has(dedupeKey)) {
      rows.push({ action: "skip", key: normalized.name, reason: "duplicate_in_file", secondary: normalized.ipAddress });
      skipCount += 1;
      continue;
    }

    seenKeys.add(dedupeKey);
    const existing = (entry.id ? serverById.get(entry.id) : undefined) ?? serverByKey.get(dedupeKey);

    if (existing) {
      rows.push({ action: "update", key: normalized.name, reason: null, secondary: normalized.ipAddress });
      updateCount += 1;
    } else {
      rows.push({ action: "create", key: normalized.name, reason: null, secondary: normalized.ipAddress });
      createCount += 1;
    }
  }

  return { createCount, updateCount, skipCount, rows };
}

export async function importDomainsData(entries: ImportedDomain[]) {
  if (entries.length === 0) {
    return { importedCount: 0, skippedCount: 0, skippedBreakdown: {} } satisfies ImportDataResult;
  }

  const { servers, domains } = await getCollections();
  const existingServers = await servers.find().toArray();
  const serverById = new Map(existingServers.map((server) => [server.id, server]));
  const serverByName = new Map(existingServers.map((server) => [server.name, server]));
  const serverByIpAddress = new Map(existingServers.map((server) => [server.ipAddress, server]));
  let importedCount = 0;
  let skippedCount = 0;
  const skippedBreakdown: ImportDataResult["skippedBreakdown"] = {};
  const seenNames = new Set<string>();

  for (const entry of entries) {
    const normalizedName = normalizeImportedDomainName(entry.name);

    if (seenNames.has(normalizedName)) {
      skippedCount += 1;
      skippedBreakdown.duplicate_in_file = (skippedBreakdown.duplicate_in_file ?? 0) + 1;
      continue;
    }

    seenNames.add(normalizedName);

    const resolvedServer =
      (entry.serverId ? serverById.get(entry.serverId) : undefined) ??
      (entry.serverName ? serverByName.get(entry.serverName) : undefined) ??
      (entry.serverIpAddress ? serverByIpAddress.get(normalizeImportedIpAddress(entry.serverIpAddress)) : undefined);

    if (!resolvedServer) {
      skippedCount += 1;
      skippedBreakdown.server_not_found = (skippedBreakdown.server_not_found ?? 0) + 1;
      continue;
    }

    const normalized = parseDomainCreateInput({
      ...entry,
      name: normalizedName,
      serverId: resolvedServer.id,
    });

    const existing =
      (entry.id ? await domains.findOne({ id: entry.id }) : null) ??
      (await domains.findOne({ name: normalized.name }));

    if (existing) {
      await domains.updateOne(
        { id: existing.id },
        { $set: { ...normalized, updatedAt: new Date() } },
      );
    } else {
      const now = new Date();
      await domains.insertOne({
        id: entry.id ?? randomUUID(),
        ...normalized,
        createdAt: now,
        updatedAt: now,
      });
    }

    importedCount += 1;
  }

  return { importedCount, skippedCount, skippedBreakdown } satisfies ImportDataResult;
}

export async function analyzeDomainsImportData(entries: ImportedDomain[]): Promise<DryRunReport> {
  if (entries.length === 0) {
    return { createCount: 0, updateCount: 0, skipCount: 0, rows: [] };
  }

  const { servers, domains } = await getCollections();
  const [existingServers, existingDomains] = await Promise.all([
    servers.find().toArray(),
    domains.find().toArray(),
  ]);
  const serverById = new Map(existingServers.map((server) => [server.id, server]));
  const serverByName = new Map(existingServers.map((server) => [server.name, server]));
  const serverByIpAddress = new Map(existingServers.map((server) => [server.ipAddress, server]));
  const domainById = new Map(existingDomains.map((domain) => [domain.id, domain]));
  const domainByName = new Map(existingDomains.map((domain) => [domain.name, domain]));
  const seenNames = new Set<string>();
  const rows: DryRunRow[] = [];
  let createCount = 0;
  let updateCount = 0;
  let skipCount = 0;

  for (const entry of entries) {
    const normalizedName = normalizeImportedDomainName(entry.name);

    if (seenNames.has(normalizedName)) {
      rows.push({ action: "skip", key: normalizedName, reason: "duplicate_in_file", secondary: entry.serverName ?? entry.serverIpAddress ?? null });
      skipCount += 1;
      continue;
    }

    seenNames.add(normalizedName);

    const resolvedServer =
      (entry.serverId ? serverById.get(entry.serverId) : undefined) ??
      (entry.serverName ? serverByName.get(entry.serverName) : undefined) ??
      (entry.serverIpAddress ? serverByIpAddress.get(normalizeImportedIpAddress(entry.serverIpAddress)) : undefined);

    if (!resolvedServer) {
      rows.push({ action: "skip", key: normalizedName, reason: "server_not_found", secondary: entry.serverName ?? entry.serverIpAddress ?? null });
      skipCount += 1;
      continue;
    }

    try {
      parseDomainCreateInput({
        ...entry,
        name: normalizedName,
        serverId: resolvedServer.id,
      });
    } catch {
      rows.push({ action: "skip", key: normalizedName, reason: "invalid_data", secondary: resolvedServer.name });
      skipCount += 1;
      continue;
    }

    const existing = (entry.id ? domainById.get(entry.id) : undefined) ?? domainByName.get(normalizedName);

    if (existing) {
      rows.push({ action: "update", key: normalizedName, reason: null, secondary: resolvedServer.name });
      updateCount += 1;
    } else {
      rows.push({ action: "create", key: normalizedName, reason: null, secondary: resolvedServer.name });
      createCount += 1;
    }
  }

  return { createCount, updateCount, skipCount, rows };
}

export async function addDomain(input: {
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
  const normalized = parseDomainCreateInput(input);
  const { domains } = await getCollections();
  const now = new Date();

  try {
    await domains.insertOne({
      id: randomUUID(),
      ...normalized,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return false;
    }
    throw error;
  }

  return true;
}

export async function updateDomainById(
  id: string,
  input: {
    status: DomainStatus;
    hostType: HostType;
    panelStatus: PanelStatus;
    s3Status: ServiceStatus;
    subdomainProvider: string | null;
    ownerProfile: string | null;
    postmanStatus: ServiceStatus;
    uptimeStatus: ServiceStatus;
    note: string | null;
  },
  userProfile?: string | null,
) {
  const data = parseDomainUpdateInput(input);
  const { domains } = await getCollections();
  const filter = userProfile ? { id, ownerProfile: { $in: [userProfile as string, null] } } : { id };
  const result = await domains.updateOne(
    filter,
    { $set: { ...data, updatedAt: new Date() } },
  );

  return result.matchedCount > 0;
}

export async function deleteDomainById(id: string, userProfile?: string | null) {
  const { domains } = await getCollections();
  const filter = userProfile ? { id, ownerProfile: { $in: [userProfile as string, null] } } : { id };
  const result = await domains.deleteOne(filter);
  return result.deletedCount > 0;
}

export async function listUsers() {
  const { users } = await getCollections();
  const rows = await users.find({}, { sort: { role: 1, name: 1, email: 1 } }).toArray();
  return rows.map(toUserAccount);
}

async function countActiveAdmins() {
  const { users } = await getCollections();
  return users.countDocuments({
    role: "admin",
    $or: [{ isActive: { $exists: false } }, { isActive: true }],
  });
}

export async function createUser(input: {
  username: string;
  email: string;
  name: string;
  role: UserRole;
  profileName: string | null;
  password: string;
  isActive: boolean;
}) {
  const normalized = parseUserCreateInput(input);
  const { users } = await getCollections();
  const now = new Date();

  try {
    await users.insertOne({
      username: normalized.username,
      email: normalized.email,
      name: normalized.name,
      role: normalized.role,
      profileName: normalized.role === "admin" ? normalized.profileName : normalized.profileName,
      passwordHash: await hash(normalized.password, 12),
      isActive: normalized.isActive,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const keyPattern =
        typeof error === "object" && error !== null && "keyPattern" in error
          ? (error as { keyPattern?: Record<string, number> }).keyPattern
          : undefined;

      if (keyPattern?.username) {
        return { ok: false as const, reason: "duplicate_username" as const };
      }

      return { ok: false as const, reason: "duplicate_email" as const };
    }
    throw error;
  }

  return { ok: true as const };
}

function getUserObjectId(id: string) {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

export async function updateUserById(
  id: string,
  input: {
    username: string;
    email: string;
    name: string;
    role: UserRole;
    profileName: string | null;
    password?: string | null;
    isActive: boolean;
  },
) {
  const normalized = parseUserUpdateInput(input);
  const { users } = await getCollections();
  const objectId = getUserObjectId(id);

  if (!objectId) {
    return { ok: false as const, reason: "not_found" as const };
  }

  const existing = await users.findOne({ _id: objectId });

  if (!existing) {
    return { ok: false as const, reason: "not_found" as const };
  }

  const isDeactivatingLastAdmin =
    existing.role === "admin" &&
    existing.isActive !== false &&
    (normalized.role !== "admin" || normalized.isActive === false);

  if (isDeactivatingLastAdmin) {
    const activeAdminCount = await countActiveAdmins();
    if (activeAdminCount <= 1) {
      return { ok: false as const, reason: "protected_admin" as const };
    }
  }

  const updateFields: Partial<UserDocument> = {
    username: normalized.username,
    email: normalized.email,
    name: normalized.name,
    role: normalized.role,
    profileName: normalized.profileName,
    isActive: normalized.isActive,
    updatedAt: new Date(),
  };

  if (normalized.password) {
    updateFields.passwordHash = await hash(normalized.password, 12);
    updateFields.password = undefined;
  }

  try {
    await users.updateOne({ _id: objectId }, { $set: updateFields, $unset: { password: "" } });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const keyPattern =
        typeof error === "object" && error !== null && "keyPattern" in error
          ? (error as { keyPattern?: Record<string, number> }).keyPattern
          : undefined;

      if (keyPattern?.username) {
        return { ok: false as const, reason: "duplicate_username" as const };
      }

      return { ok: false as const, reason: "duplicate_email" as const };
    }
    throw error;
  }

  return { ok: true as const };
}

export async function getUserById(id: string) {
  const { users } = await getCollections();
  const objectId = getUserObjectId(id);

  if (!objectId) {
    return null;
  }

  const user = await users.findOne({ _id: objectId });
  return user ? toUserAccount(user) : null;
}
