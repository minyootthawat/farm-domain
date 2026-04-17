import type { ImportedDomain, ImportedServer } from "@/lib/import-export";
import * as mongoStore from "@/lib/store-mongodb";
import type {
  DomainStatus,
  Environment,
  HostType,
  PanelStatus,
  ServerProvider,
  ServiceStatus,
  StoreData,
  UserAccount,
  UserRole,
} from "@/lib/schema";
import type {
  DryRunReport,
  ImportDataResult,
} from "@/lib/store-types";

export async function readStore(userProfile?: string | null): Promise<StoreData> {
  return mongoStore.readStore(userProfile);
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
  return mongoStore.addServer(input);
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
  return mongoStore.updateServerById(id, input, userProfile);
}

export async function deleteServerById(id: string, userProfile?: string | null) {
  return mongoStore.deleteServerById(id, userProfile);
}

export async function importServersData(entries: ImportedServer[]): Promise<ImportDataResult> {
  return mongoStore.importServersData(entries);
}

export async function analyzeServersImportData(entries: ImportedServer[]): Promise<DryRunReport> {
  return mongoStore.analyzeServersImportData(entries);
}

export async function importDomainsData(entries: ImportedDomain[]): Promise<ImportDataResult> {
  return mongoStore.importDomainsData(entries);
}

export async function analyzeDomainsImportData(entries: ImportedDomain[]): Promise<DryRunReport> {
  return mongoStore.analyzeDomainsImportData(entries);
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
  return mongoStore.addDomain(input);
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
  return mongoStore.updateDomainById(id, input, userProfile);
}

export async function deleteDomainById(id: string, userProfile?: string | null) {
  return mongoStore.deleteDomainById(id, userProfile);
}

export async function listUsers(): Promise<UserAccount[]> {
  return mongoStore.listUsers();
}

export async function getUserById(id: string) {
  return mongoStore.getUserById(id);
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
  return mongoStore.createUser(input);
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
  return mongoStore.updateUserById(id, input);
}
