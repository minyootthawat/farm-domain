export const DOMAIN_STATUSES = ["DF", "ACTIVE", "PENDING", "ISSUE"] as const;
export const HOST_TYPES = ["WWW", "ROOT", "MIXED"] as const;
export const PANEL_STATUSES = ["AAPANEL", "MANUAL", "NONE"] as const;
export const SERVICE_STATUSES = ["READY", "MISSING", "NA"] as const;
export const SERVER_PROVIDERS = ["AWS_LIGHTSAIL", "AWS_EC2", "OTHER"] as const;
export const ENVIRONMENTS = ["PROD", "STAGING", "DEV"] as const;

export type DomainStatus = (typeof DOMAIN_STATUSES)[number];
export type HostType = (typeof HOST_TYPES)[number];
export type PanelStatus = (typeof PANEL_STATUSES)[number];
export type ServiceStatus = (typeof SERVICE_STATUSES)[number];
export type ServerProvider = (typeof SERVER_PROVIDERS)[number];
export type Environment = (typeof ENVIRONMENTS)[number];
export type UserRole = "admin" | "editor" | "viewer";

export type Server = {
  id: string;
  name: string;
  ipAddress: string;
  provider: ServerProvider;
  environment: Environment;
  profileName: string;
  region: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Domain = {
  id: string;
  name: string;
  hostType: HostType;
  status: DomainStatus;
  panelStatus: PanelStatus;
  s3Status: ServiceStatus;
  subdomainProvider: string | null;
  ownerProfile: string | null;
  postmanStatus: ServiceStatus;
  uptimeStatus: ServiceStatus;
  note: string | null;
  serverId: string;
  createdAt: string;
  updatedAt: string;
};

export type StoreData = {
  servers: Server[];
  domains: Domain[];
};

export type UserAccount = {
  id: string;
  username: string;
  email: string;
  name: string;
  role: UserRole;
  profileName: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
