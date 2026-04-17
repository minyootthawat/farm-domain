"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { auth } from "@/auth";
import type {
  CrudActionState,
  DryRunActionState,
  ImportActionState,
} from "@/app/action-states";
import {
  DRY_RUN_ACTION_INITIAL_STATE,
  IMPORT_ACTION_INITIAL_STATE,
} from "@/app/action-states";
import {
  addDomain,
  addServer,
  analyzeDomainsImportData,
  analyzeServersImportData,
  createUser as createUserRecord,
  deleteServerById,
  deleteDomainById,
  getUserById,
  importDomainsData,
  importServersData,
  listUsers,
  readStore,
  updateUserById as updateUserRecordById,
  updateServerById,
  updateDomainById,
} from "@/lib/store";
import {
  countDomainsImportRows,
  countServersImportRows,
  parseDomainsImport,
  parseServersImport,
} from "@/lib/import-export";
import {
  canManageUsers,
  canManageAllProfiles,
  canWriteInventory,
  canViewInventory,
  getInventoryScopeProfile,
  getSessionProfile,
  getSessionUserRole,
} from "@/lib/rbac";
import type {
  DomainStatus,
  Environment,
  HostType,
  PanelStatus,
  ServerProvider,
  ServiceStatus,
  UserRole,
} from "@/lib/schema";

function revalidateDashboard() {
  revalidatePath("/");
  revalidatePath("/servers");
  revalidatePath("/domains");
  revalidatePath("/users");
}

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function optionalText(formData: FormData, key: string) {
  const value = getText(formData, key);
  return value.length > 0 ? value : null;
}

function getCrudErrorReason(
  action: NonNullable<CrudActionState["action"]>,
  error: unknown,
): Exclude<CrudActionState["reason"], null> {
  if (error instanceof ZodError) {
    const issuePaths = new Set(
      error.issues
        .map((issue) => issue.path[0])
        .filter((value): value is string => typeof value === "string"),
    );

    if (
      (action === "create_server" || action === "update_server") &&
      issuePaths.has("ipAddress")
    ) {
      return "invalid_ip_address";
    }

    if (
      (action === "create_domain" || action === "update_domain") &&
      issuePaths.has("name")
    ) {
      return "invalid_domain_name";
    }

    if (
      (action === "create_user" || action === "update_user") &&
      issuePaths.has("username")
    ) {
      return "invalid_username";
    }

    return "validation";
  }

  return "unknown";
}

function getUserCrudErrorReason(error: unknown): Exclude<CrudActionState["reason"], null> {
  if (error instanceof ZodError) {
    const issuePaths = new Set(
      error.issues
        .map((issue) => issue.path[0])
        .filter((value): value is string => typeof value === "string"),
    );

    if (issuePaths.has("username")) {
      return "invalid_username";
    }

    return "validation";
  }

  return "unknown";
}

async function getUpload(formData: FormData, key: string) {
  const file = formData.get(key);
  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  return {
    fileName: file.name,
    text: await file.text(),
  };
}

async function prepareDomainImportEntries(
  formData: FormData,
  fileName: string,
  text: string,
  scopeProfile?: string | null,
) {
  const entries = parseDomainsImport(fileName, text);
  const serverMode = getText(formData, "serverMode");

  if (serverMode === "existing") {
    const serverId = getText(formData, "targetServerId");

    if (!serverId) {
      throw new Error("Select a server before importing domains.");
    }

    const store = await readStore(scopeProfile);
    const selectedServer = store.servers.find((server) => server.id === serverId);

    if (!selectedServer) {
      throw new Error("Selected server was not found.");
    }

    for (const entry of entries) {
      entry.serverId = selectedServer.id;
      entry.serverName = selectedServer.name;
      entry.serverIpAddress = selectedServer.ipAddress;
    }

    return entries;
  }

  if (serverMode === "create") {
    const name = getText(formData, "serverName");
    const ipAddress = getText(formData, "ipAddress");
    const profileName = getText(formData, "profileName");

    if (!name || !ipAddress || !profileName) {
      throw new Error("Fill in the new server details before importing domains.");
    }

    for (const entry of entries) {
      entry.serverId = undefined;
      entry.serverName = name;
      entry.serverIpAddress = ipAddress;
    }
  }

  return entries;
}

async function getScopedServerForDomainCreate(
  serverId: string,
  scopeProfile?: string | null,
) {
  const store = await readStore(scopeProfile);
  return store.servers.find((server) => server.id === serverId) ?? null;
}

export async function createServer(
  _previousState: CrudActionState,
  formData: FormData,
): Promise<CrudActionState> {
  const session = await auth();
  if (!canViewInventory(session) || !canWriteInventory(session)) {
    return { status: "error", action: "create_server", reason: "unauthorized" };
  }

  const canManageProfiles = canManageAllProfiles(session);
  const userProfile = getSessionProfile(session);
  let profileName = getText(formData, "profileName");
  const provider = getText(formData, "provider") as ServerProvider;
  const environment = getText(formData, "environment") as Environment;
  const name = getText(formData, "name");
  const ipAddress = getText(formData, "ipAddress");

  if (!name || !ipAddress) {
    return {
      status: "error",
      action: "create_server",
      reason: "validation",
    };
  }

  if (!canManageProfiles) {
    profileName = userProfile!;
  }

  if (!profileName) {
    return {
      status: "error",
      action: "create_server",
      reason: "validation",
    };
  }

  try {
    const created = await addServer({
      name,
      ipAddress,
      profileName,
      provider,
      environment,
      region: optionalText(formData, "region"),
      note: optionalText(formData, "note"),
    });

    if (!created) {
      return {
        status: "error",
        action: "create_server",
        reason: "duplicate",
      };
    }

    revalidateDashboard();

    return {
      status: "success",
      action: "create_server",
      reason: null,
    };
  } catch (error) {
    return {
      status: "error",
      action: "create_server",
      reason: getCrudErrorReason("create_server", error),
    };
  }
}

export async function createDomain(
  _previousState: CrudActionState,
  formData: FormData,
): Promise<CrudActionState> {
  const session = await auth();
  if (!canViewInventory(session) || !canWriteInventory(session)) {
    return { status: "error", action: "create_domain", reason: "unauthorized" };
  }

  const canManageProfiles = canManageAllProfiles(session);
  const userProfile = getSessionProfile(session);
  const name = getText(formData, "name");
  const serverId = getText(formData, "serverId");

  if (!name || !serverId) {
    return {
      status: "error",
      action: "create_domain",
      reason: "validation",
    };
  }

  let ownerProfile = optionalText(formData, "ownerProfile");
  if (!canManageProfiles) {
    ownerProfile = userProfile;
  }

  try {
    const selectedServer = await getScopedServerForDomainCreate(
      serverId,
      getInventoryScopeProfile(session),
    );

    if (!selectedServer) {
      return {
        status: "error",
        action: "create_domain",
        reason: "not_found",
      };
    }

    const created = await addDomain({
      name,
      serverId,
      hostType: getText(formData, "hostType") as HostType,
      status: getText(formData, "status") as DomainStatus,
      panelStatus: getText(formData, "panelStatus") as PanelStatus,
      s3Status: getText(formData, "s3Status") as ServiceStatus,
      subdomainProvider: optionalText(formData, "subdomainProvider"),
      ownerProfile,
      postmanStatus: getText(formData, "postmanStatus") as ServiceStatus,
      uptimeStatus: getText(formData, "uptimeStatus") as ServiceStatus,
      note: optionalText(formData, "note"),
    });

    if (!created) {
      return {
        status: "error",
        action: "create_domain",
        reason: "duplicate",
      };
    }

    revalidateDashboard();

    return {
      status: "success",
      action: "create_domain",
      reason: null,
    };
  } catch (error) {
    return {
      status: "error",
      action: "create_domain",
      reason: getCrudErrorReason("create_domain", error),
    };
  }
}

export async function importServers(
  _previousState: ImportActionState,
  formData: FormData,
): Promise<ImportActionState> {
  const session = await auth();
  if (!canViewInventory(session) || !canWriteInventory(session)) {
    return {
      ...IMPORT_ACTION_INITIAL_STATE,
      status: "error",
      message: "You do not have permission to import servers.",
    };
  }

  const canManageProfiles = canManageAllProfiles(session);
  const userProfile = getSessionProfile(session);

  const upload = await getUpload(formData, "file");

  if (!upload) {
    return {
      ...IMPORT_ACTION_INITIAL_STATE,
      status: "error",
      message: "No file uploaded.",
    };
  }

  try {
    const totalCount = countServersImportRows(upload.fileName, upload.text);
    const entries = parseServersImport(upload.fileName, upload.text).map((entry) => ({
      ...entry,
      profileName: canManageProfiles ? entry.profileName : userProfile!,
    }));
    const result = await importServersData(entries);
    revalidateDashboard();

    return {
      status: "success",
      totalCount,
      importedCount: result.importedCount,
      skippedCount: result.skippedCount + Math.max(0, totalCount - result.importedCount - result.skippedCount),
      skippedBreakdown: result.skippedBreakdown,
      message: null,
      fileName: upload.fileName,
    };
  } catch (error) {
    return {
      ...IMPORT_ACTION_INITIAL_STATE,
      status: "error",
      fileName: upload.fileName,
      message: error instanceof Error ? error.message : "Import failed.",
    };
  }
}

export async function analyzeServersImport(
  _previousState: DryRunActionState,
  formData: FormData,
): Promise<DryRunActionState> {
  const session = await auth();
  if (!canViewInventory(session) || !canWriteInventory(session)) {
    return {
      ...DRY_RUN_ACTION_INITIAL_STATE,
      status: "error",
      message: "You do not have permission to analyze imports.",
    };
  }

  const canManageProfiles = canManageAllProfiles(session);
  const userProfile = getSessionProfile(session);

  const upload = await getUpload(formData, "file");

  if (!upload) {
    return {
      ...DRY_RUN_ACTION_INITIAL_STATE,
      status: "error",
      message: "No file uploaded.",
    };
  }

  try {
    const entries = parseServersImport(upload.fileName, upload.text).map((entry) => ({
      ...entry,
      profileName: canManageProfiles ? entry.profileName : userProfile!,
    }));
    const report = await analyzeServersImportData(entries);

    return {
      status: "success",
      fileName: upload.fileName,
      message: null,
      createCount: report.createCount,
      updateCount: report.updateCount,
      skipCount: report.skipCount,
      rows: report.rows,
    };
  } catch (error) {
    return {
      ...DRY_RUN_ACTION_INITIAL_STATE,
      status: "error",
      fileName: upload.fileName,
      message: error instanceof Error ? error.message : "Dry run failed.",
    };
  }
}

export async function importDomains(
  _previousState: ImportActionState,
  formData: FormData,
): Promise<ImportActionState> {
  const session = await auth();
  if (!canViewInventory(session) || !canWriteInventory(session)) {
    return {
      ...IMPORT_ACTION_INITIAL_STATE,
      status: "error",
      message: "You do not have permission to import domains.",
    };
  }

  const canManageProfiles = canManageAllProfiles(session);
  const userProfile = getSessionProfile(session);
  const scopeProfile = getInventoryScopeProfile(session);

  const upload = await getUpload(formData, "file");

  if (!upload) {
    return {
      ...IMPORT_ACTION_INITIAL_STATE,
      status: "error",
      message: "No file uploaded.",
    };
  }

  try {
    const totalCount = countDomainsImportRows(upload.fileName, upload.text);
    const entries = (await prepareDomainImportEntries(
      formData,
      upload.fileName,
      upload.text,
      scopeProfile,
    )).map((entry) => ({
      ...entry,
      ownerProfile: canManageProfiles ? entry.ownerProfile : userProfile,
    }));

    if (getText(formData, "serverMode") === "create") {
      const name = getText(formData, "serverName");
      const ipAddress = getText(formData, "ipAddress");
      let profileName = getText(formData, "profileName");
      const provider = getText(formData, "provider") as ServerProvider;
      const environment = getText(formData, "environment") as Environment;

      if (!canManageProfiles) {
        profileName = userProfile!;
      }

      if (!name || !ipAddress || !profileName) {
        return {
          ...IMPORT_ACTION_INITIAL_STATE,
          status: "error",
          fileName: upload.fileName,
          message: "Fill in the new server details before importing domains.",
        };
      }

      const created = await addServer({
        name,
        ipAddress,
        profileName,
        provider,
        environment,
        region: optionalText(formData, "region"),
        note: optionalText(formData, "note"),
      });

      if (!created) {
          const store = await readStore(scopeProfile);
        const existingServer = store.servers.find(
          (server) => server.name === name && server.ipAddress === ipAddress,
        );

        if (!existingServer) {
          return {
            ...IMPORT_ACTION_INITIAL_STATE,
            status: "error",
            fileName: upload.fileName,
            message: "Server already exists with conflicting details.",
          };
        }
      }

    }

    const result = await importDomainsData(entries);
    revalidateDashboard();

    return {
      status: "success",
      totalCount,
      importedCount: result.importedCount,
      skippedCount: result.skippedCount + Math.max(0, totalCount - result.importedCount - result.skippedCount),
      skippedBreakdown: result.skippedBreakdown,
      message: null,
      fileName: upload.fileName,
    };
  } catch (error) {
    return {
      ...IMPORT_ACTION_INITIAL_STATE,
      status: "error",
      fileName: upload.fileName,
      message: error instanceof Error ? error.message : "Import failed.",
    };
  }
}

export async function analyzeDomainsImport(
  _previousState: DryRunActionState,
  formData: FormData,
): Promise<DryRunActionState> {
  const session = await auth();
  if (!canViewInventory(session) || !canWriteInventory(session)) {
    return {
      ...DRY_RUN_ACTION_INITIAL_STATE,
      status: "error",
      message: "You do not have permission to analyze imports.",
    };
  }

  const canManageProfiles = canManageAllProfiles(session);
  const userProfile = getSessionProfile(session);
  const scopeProfile = getInventoryScopeProfile(session);

  const upload = await getUpload(formData, "file");

  if (!upload) {
    return {
      ...DRY_RUN_ACTION_INITIAL_STATE,
      status: "error",
      message: "No file uploaded.",
    };
  }

  try {
    const entries = (await prepareDomainImportEntries(
      formData,
      upload.fileName,
      upload.text,
      scopeProfile,
    )).map((entry) => ({
      ...entry,
      ownerProfile: canManageProfiles ? entry.ownerProfile : userProfile,
    }));
    const report = await analyzeDomainsImportData(entries);

    return {
      status: "success",
      fileName: upload.fileName,
      message: null,
      createCount: report.createCount,
      updateCount: report.updateCount,
      skipCount: report.skipCount,
      rows: report.rows,
    };
  } catch (error) {
    return {
      ...DRY_RUN_ACTION_INITIAL_STATE,
      status: "error",
      fileName: upload.fileName,
      message: error instanceof Error ? error.message : "Dry run failed.",
    };
  }
}

export async function updateServer(
  _previousState: CrudActionState,
  formData: FormData,
): Promise<CrudActionState> {
  const session = await auth();
  if (!canViewInventory(session) || !canWriteInventory(session)) {
    return { status: "error", action: "update_server", reason: "unauthorized" };
  }

  const canManageProfiles = canManageAllProfiles(session);
  const userProfile = getSessionProfile(session);
  const id = getText(formData, "id");
  const name = getText(formData, "name");
  const ipAddress = getText(formData, "ipAddress");
  let profileName = getText(formData, "profileName");
  const provider = getText(formData, "provider") as ServerProvider;
  const environment = getText(formData, "environment") as Environment;

  if (!id || !name || !ipAddress) {
    return {
      status: "error",
      action: "update_server",
      reason: "validation",
    };
  }

  if (!canManageProfiles) {
    profileName = userProfile!;
  }

  if (!profileName) {
    return {
      status: "error",
      action: "update_server",
      reason: "validation",
    };
  }

  try {
    const updated = await updateServerById(id, {
      name,
      ipAddress,
      profileName,
      provider,
      environment,
      region: optionalText(formData, "region"),
      note: optionalText(formData, "note"),
    }, getInventoryScopeProfile(session));

    if (!updated) {
      return {
        status: "error",
        action: "update_server",
        reason: "save_failed",
      };
    }

    revalidateDashboard();

    return {
      status: "success",
      action: "update_server",
      reason: null,
    };
  } catch (error) {
    return {
      status: "error",
      action: "update_server",
      reason: getCrudErrorReason("update_server", error),
    };
  }
}

export async function deleteServer(
  _previousState: CrudActionState,
  formData: FormData,
): Promise<CrudActionState> {
  const session = await auth();
  if (!canViewInventory(session) || !canWriteInventory(session)) {
    return { status: "error", action: "delete_server", reason: "unauthorized" };
  }

  const id = getText(formData, "id");

  if (!id) {
    return {
      status: "error",
      action: "delete_server",
      reason: "validation",
    };
  }

  try {
    const deleted = await deleteServerById(id, getInventoryScopeProfile(session));

    if (!deleted) {
      return {
        status: "error",
        action: "delete_server",
        reason: "linked_domains",
      };
    }

    revalidateDashboard();

    return {
      status: "success",
      action: "delete_server",
      reason: null,
    };
  } catch (error) {
    return {
      status: "error",
      action: "delete_server",
      reason: getCrudErrorReason("delete_server", error),
    };
  }
}

export async function updateDomain(
  _previousState: CrudActionState,
  formData: FormData,
): Promise<CrudActionState> {
  const session = await auth();
  if (!canViewInventory(session) || !canWriteInventory(session)) {
    return { status: "error", action: "update_domain", reason: "unauthorized" };
  }

  const canManageProfiles = canManageAllProfiles(session);
  const userProfile = getSessionProfile(session);
  const id = getText(formData, "id");

  if (!id) {
    return {
      status: "error",
      action: "update_domain",
      reason: "validation",
    };
  }

  let ownerProfile = optionalText(formData, "ownerProfile");
  if (!canManageProfiles) {
    ownerProfile = userProfile;
  }

  try {
    const updated = await updateDomainById(id, {
      status: getText(formData, "status") as DomainStatus,
      hostType: getText(formData, "hostType") as HostType,
      panelStatus: getText(formData, "panelStatus") as PanelStatus,
      s3Status: getText(formData, "s3Status") as ServiceStatus,
      subdomainProvider: optionalText(formData, "subdomainProvider"),
      ownerProfile,
      postmanStatus: getText(formData, "postmanStatus") as ServiceStatus,
      uptimeStatus: getText(formData, "uptimeStatus") as ServiceStatus,
      note: optionalText(formData, "note"),
    }, getInventoryScopeProfile(session));

    if (!updated) {
      return {
        status: "error",
        action: "update_domain",
        reason: "not_found",
      };
    }

    revalidateDashboard();

    return {
      status: "success",
      action: "update_domain",
      reason: null,
    };
  } catch (error) {
    return {
      status: "error",
      action: "update_domain",
      reason: getCrudErrorReason("update_domain", error),
    };
  }
}

export async function deleteDomain(
  _previousState: CrudActionState,
  formData: FormData,
): Promise<CrudActionState> {
  const session = await auth();
  if (!canViewInventory(session) || !canWriteInventory(session)) {
    return { status: "error", action: "delete_domain", reason: "unauthorized" };
  }

  const id = getText(formData, "id");

  if (!id) {
    return {
      status: "error",
      action: "delete_domain",
      reason: "validation",
    };
  }

  try {
    const deleted = await deleteDomainById(id, getInventoryScopeProfile(session));

    if (!deleted) {
      return {
        status: "error",
        action: "delete_domain",
        reason: "not_found",
      };
    }

    revalidateDashboard();

    return {
      status: "success",
      action: "delete_domain",
      reason: null,
    };
  } catch (error) {
    return {
      status: "error",
      action: "delete_domain",
      reason: getCrudErrorReason("delete_domain", error),
    };
  }
}

export async function createUser(
  _previousState: CrudActionState,
  formData: FormData,
): Promise<CrudActionState> {
  const session = await auth();

  if (!canViewInventory(session) || !canManageUsers(session)) {
    return { status: "error", action: "create_user", reason: "unauthorized" };
  }

  try {
    const created = await createUserRecord({
      username: getText(formData, "username"),
      email: getText(formData, "email"),
      name: getText(formData, "name"),
      role: getText(formData, "role") as UserRole,
      profileName: optionalText(formData, "profileName"),
      password: getText(formData, "password"),
      isActive: formData.get("isActive") === "on",
    });

    if (!created.ok) {
      return {
        status: "error",
        action: "create_user",
        reason: created.reason,
      };
    }

    revalidateDashboard();

    return {
      status: "success",
      action: "create_user",
      reason: null,
    };
  } catch (error) {
    return {
      status: "error",
      action: "create_user",
      reason: getUserCrudErrorReason(error),
    };
  }
}

export async function updateUser(
  _previousState: CrudActionState,
  formData: FormData,
): Promise<CrudActionState> {
  const session = await auth();

  if (!canViewInventory(session) || !canManageUsers(session)) {
    return { status: "error", action: "update_user", reason: "unauthorized" };
  }

  const id = getText(formData, "id");

  if (!id) {
    return {
      status: "error",
      action: "update_user",
      reason: "validation",
    };
  }

  const existingUser = await getUserById(id);

  if (!existingUser) {
    return {
      status: "error",
      action: "update_user",
      reason: "not_found",
    };
  }

  const result = await updateUserRecordById(id, {
    username: getText(formData, "username"),
    email: existingUser.email,
    name: getText(formData, "name"),
    role: getText(formData, "role") as UserRole,
    profileName: optionalText(formData, "profileName"),
    password: optionalText(formData, "password"),
    isActive: formData.get("isActive") === "on",
  }).catch((error: unknown) => {
    throw error;
  });

  if (!result.ok) {
    return {
      status: "error",
      action: "update_user",
      reason: result.reason,
    };
  }

  const currentSessionRole = getSessionUserRole(session);

  if (session?.user?.id === id && currentSessionRole === "admin") {
    const updatedUsers = await listUsers();
    const refreshed = updatedUsers.find((user) => user.id === id);

    if (!refreshed || refreshed.role !== "admin" || refreshed.isActive === false) {
      return {
        status: "error",
        action: "update_user",
        reason: "protected_admin",
      };
    }
  }

  revalidateDashboard();

  return {
    status: "success",
    action: "update_user",
    reason: null,
  };
}
