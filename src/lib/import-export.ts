import {
  DOMAIN_STATUSES,
  ENVIRONMENTS,
  SERVER_PROVIDERS,
  type Domain,
  type DomainStatus,
  type Environment,
  type HostType,
  type PanelStatus,
  type Server,
  type ServerProvider,
  type ServiceStatus,
} from "@/lib/schema";

type NullableString = string | null;

export type ImportedServer = {
  id?: string;
  name: string;
  ipAddress: string;
  profileName: string;
  provider: ServerProvider;
  environment: Environment;
  region: NullableString;
  note: NullableString;
};

export type ImportedDomain = {
  id?: string;
  name: string;
  serverId?: string;
  serverName?: string;
  serverIpAddress?: string;
  hostType: HostType;
  status: DomainStatus;
  panelStatus: PanelStatus;
  s3Status: ServiceStatus;
  subdomainProvider: NullableString;
  ownerProfile: NullableString;
  postmanStatus: ServiceStatus;
  uptimeStatus: ServiceStatus;
  note: NullableString;
};

function normalizeString(value: unknown) {
  return String(value ?? "").replace(/^\uFEFF/, "").trim();
}

function nullableString(value: unknown): NullableString {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : null;
}

function resolveEnum<T extends readonly string[]>(
  values: T,
  value: unknown,
  fallback: T[number],
): T[number] {
  const normalized = normalizeString(value);
  return values.includes(normalized) ? (normalized as T[number]) : fallback;
}

function normalizeHeaderKey(value: string) {
  return normalizeString(value)
    .toLowerCase()
    .replace(/[\s/_-]+/g, "")
    .replace(/[()]+/g, "");
}

function mapHeaderAliases(
  headers: string[],
  aliases: Record<string, string>,
) {
  return headers.map((header) => aliases[normalizeHeaderKey(header)] ?? normalizeString(header));
}

function parseCsvCollection(
  text: string,
  aliases: Record<string, string>,
  carryForwardKeys: string[] = [],
) {
  const [headerRow = [], ...dataRows] = parseCsv(text);
  const headers = mapHeaderAliases(headerRow, aliases);
  const carryForwardState = new Map<string, string>();

  return dataRows.map((row) => {
    const entry = Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])) as Record<
      string,
      string
    >;

    for (const key of carryForwardKeys) {
      const currentValue = normalizeString(entry[key]);
      if (currentValue) {
        carryForwardState.set(key, currentValue);
      } else if (carryForwardState.has(key)) {
        entry[key] = carryForwardState.get(key) ?? "";
      }
    }

    return entry;
  });
}

function resolveHostType(value: unknown, fallback: HostType = "WWW"): HostType {
  const normalized = normalizeString(value).toUpperCase();

  if (normalized === "WWW") {
    return "WWW";
  }

  if (["NO", "ROOT", "NON-WWW", "NONWWW", "APEX"].includes(normalized)) {
    return "ROOT";
  }

  if (["MIXED", "BOTH", "WWW+ROOT", "ROOT+WWW"].includes(normalized)) {
    return "MIXED";
  }

  return fallback;
}

function resolvePanelStatus(value: unknown, fallback: PanelStatus = "AAPANEL"): PanelStatus {
  const normalized = normalizeString(value).toUpperCase();

  if (["AAPANEL", "AA PANEL"].includes(normalized)) {
    return "AAPANEL";
  }

  if (["MANUAL"].includes(normalized)) {
    return "MANUAL";
  }

  if (["NONE", "NO", "N/A", "NA"].includes(normalized)) {
    return "NONE";
  }

  return fallback;
}

function resolveServiceStatus(value: unknown, fallback: ServiceStatus = "MISSING"): ServiceStatus {
  const normalized = normalizeString(value).toUpperCase();

  if (
    [
      "READY",
      "DONE",
      "ADDED",
      "ACTIVE",
      "BYPLUGIN",
      "BY PLUGIN",
      "เพิ่มแล้ว",
      "พร้อมใช้งาน",
      "ใช้งาน",
    ].includes(normalized)
  ) {
    return "READY";
  }

  if (
    [
      "MISSING",
      "PENDING",
      "NOTADDED",
      "NOT ADDED",
      "ยังไม่ได้เพิ่ม",
      "ยังไม่เพิ่ม",
      "ยังไม่ได้ทำ",
    ].includes(normalized)
  ) {
    return "MISSING";
  }

  if (["NA", "N/A", "-", "NONE", "NO"].includes(normalized)) {
    return "NA";
  }

  return fallback;
}

const SERVER_CSV_ALIASES: Record<string, string> = {
  id: "id",
  name: "name",
  servername: "name",
  ipaddress: "ipAddress",
  ip: "ipAddress",
  profilename: "profileName",
  profile: "profileName",
  provider: "provider",
  environment: "environment",
  region: "region",
  note: "note",
  โน้ต: "note",
};

const DOMAIN_CSV_ALIASES: Record<string, string> = {
  id: "id",
  domainname: "name",
  domain: "name",
  name: "name",
  serverid: "serverId",
  servername: "serverName",
  serveripaddress: "serverIpAddress",
  ipaddress: "serverIpAddress",
  ip: "serverIpAddress",
  status: "status",
  hosttype: "hostType",
  on: "panelStatus",
  panelstatus: "panelStatus",
  awss3: "s3Status",
  s3status: "s3Status",
  subdomain: "subdomainProvider",
  subdomainprovider: "subdomainProvider",
  profile: "ownerProfile",
  ownerprofile: "ownerProfile",
  postman: "postmanStatus",
  uptimekuma: "uptimeStatus",
  note: "note",
  โน้ต: "note",
};

function getImportRows(
  fileName: string,
  text: string,
  key: "servers" | "domains",
  aliases: Record<string, string>,
  carryForwardKeys: string[] = [],
) {
  const format = inferFormat(fileName, text);

  return format === "json"
    ? parseJsonCollection<Record<string, unknown>>(text, key)
    : parseCsvCollection(text, aliases, carryForwardKeys);
}

function escapeCsvCell(value: unknown) {
  const raw = String(value ?? "");
  if (raw.includes(",") || raw.includes("\"") || raw.includes("\n")) {
    return `"${raw.replaceAll("\"", "\"\"")}"`;
  }
  return raw;
}

function rowsToCsv(rows: string[][]) {
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let cell = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === "\"") {
      if (inQuotes && nextCharacter === "\"") {
        cell += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }
      row.push(cell);
      if (row.some((value) => value.length > 0)) {
        rows.push(row);
      }
      row = [];
      cell = "";
      continue;
    }

    cell += character;
  }

  row.push(cell);
  if (row.some((value) => value.length > 0)) {
    rows.push(row);
  }

  return rows;
}

function inferFormat(fileName: string, text: string) {
  if (fileName.toLowerCase().endsWith(".csv")) {
    return "csv" as const;
  }

  if (fileName.toLowerCase().endsWith(".json")) {
    return "json" as const;
  }

  const trimmed = text.trim();
  return trimmed.startsWith("[") || trimmed.startsWith("{") ? "json" : "csv";
}

function parseJsonCollection<T>(text: string, key: "servers" | "domains") {
  const parsed = JSON.parse(text) as unknown;
  if (Array.isArray(parsed)) {
    return parsed as T[];
  }
  if (parsed && typeof parsed === "object" && key in parsed) {
    const collection = (parsed as Record<string, unknown>)[key];
    if (Array.isArray(collection)) {
      return collection as T[];
    }
  }
  return [] as T[];
}

export function serializeServersCsv(servers: Server[]) {
  return rowsToCsv([
    ["id", "name", "ipAddress", "profileName", "provider", "environment", "region", "note"],
    ...servers.map((server) => [
      server.id,
      server.name,
      server.ipAddress,
      server.profileName,
      server.provider,
      server.environment,
      server.region ?? "",
      server.note ?? "",
    ]),
  ]);
}

export function serializeDomainsCsv(
  domains: Domain[],
  serversById: Map<string, Server>,
) {
  return rowsToCsv([
    [
      "id",
      "name",
      "serverId",
      "serverName",
      "hostType",
      "status",
      "panelStatus",
      "s3Status",
      "subdomainProvider",
      "ownerProfile",
      "postmanStatus",
      "uptimeStatus",
      "note",
    ],
    ...domains.map((domain) => [
      domain.id,
      domain.name,
      domain.serverId,
      serversById.get(domain.serverId)?.name ?? "",
      domain.hostType,
      domain.status,
      domain.panelStatus,
      domain.s3Status,
      domain.subdomainProvider ?? "",
      domain.ownerProfile ?? "",
      domain.postmanStatus,
      domain.uptimeStatus,
      domain.note ?? "",
    ]),
  ]);
}

export function parseServersImport(fileName: string, text: string): ImportedServer[] {
  const rows = getImportRows(fileName, text, "servers", SERVER_CSV_ALIASES);

  const entries: ImportedServer[] = [];

  for (const row of rows) {
    const name = normalizeString(row.name);
    const ipAddress = normalizeString(row.ipAddress);
    const profileName = normalizeString(row.profileName);

    if (!name || !ipAddress || !profileName) {
      continue;
    }

    entries.push({
      id: normalizeString(row.id) || undefined,
      name,
      ipAddress,
      profileName,
      provider: resolveEnum(SERVER_PROVIDERS, row.provider, "OTHER"),
      environment: resolveEnum(ENVIRONMENTS, row.environment, "PROD"),
      region: nullableString(row.region),
      note: nullableString(row.note),
    });
  }

  return entries;
}

export function parseDomainsImport(fileName: string, text: string): ImportedDomain[] {
  const rows = getImportRows(fileName, text, "domains", DOMAIN_CSV_ALIASES, [
    "serverIpAddress",
    "serverName",
  ]);

  const entries: ImportedDomain[] = [];

  for (const row of rows) {
    const name = normalizeString(row.name);
    if (!name) {
      continue;
    }

    entries.push({
      id: normalizeString(row.id) || undefined,
      name,
      serverId: normalizeString(row.serverId) || undefined,
      serverName: normalizeString(row.serverName) || undefined,
      serverIpAddress: normalizeString(row.serverIpAddress) || undefined,
      hostType: resolveHostType(row.hostType, "WWW"),
      status: resolveEnum(DOMAIN_STATUSES, row.status, "DF"),
      panelStatus: resolvePanelStatus(row.panelStatus, "AAPANEL"),
      s3Status: resolveServiceStatus(row.s3Status, "MISSING"),
      subdomainProvider: nullableString(row.subdomainProvider),
      ownerProfile: nullableString(row.ownerProfile),
      postmanStatus: resolveServiceStatus(row.postmanStatus, "MISSING"),
      uptimeStatus: resolveServiceStatus(row.uptimeStatus, "MISSING"),
      note: nullableString(row.note),
    });
  }

  return entries;
}

export function countServersImportRows(fileName: string, text: string) {
  return getImportRows(fileName, text, "servers", SERVER_CSV_ALIASES).length;
}

export function countDomainsImportRows(fileName: string, text: string) {
  return getImportRows(fileName, text, "domains", DOMAIN_CSV_ALIASES, [
    "serverIpAddress",
    "serverName",
  ]).length;
}

export function serializeServersTemplateCsv() {
  return rowsToCsv([
    ["id", "name", "ipAddress", "profileName", "provider", "environment", "region", "note"],
    ["", "PBN-Farm-Sv.3", "18.138.47.255", "Stellar", "AWS_LIGHTSAIL", "PROD", "ap-southeast-1", ""],
  ]);
}

export function serializeDomainsTemplateCsv() {
  return rowsToCsv([
    [
      "id",
      "name",
      "serverId",
      "serverName",
      "serverIpAddress",
      "hostType",
      "status",
      "panelStatus",
      "s3Status",
      "subdomainProvider",
      "ownerProfile",
      "postmanStatus",
      "uptimeStatus",
      "note",
    ],
    [
      "",
      "example.com",
      "",
      "PBN-Farm-Sv.3",
      "18.138.47.255",
      "WWW",
      "DF",
      "AAPANEL",
      "READY",
      "Pioneerc",
      "Stellar",
      "MISSING",
      "MISSING",
      "",
    ],
  ]);
}
