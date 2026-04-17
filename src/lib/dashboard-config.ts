import type { LucideIcon } from "lucide-react";
import {
  Activity,
  CheckCircle2,
  Database,
  FileText,
  Filter,
  Globe,
  LayoutDashboard,
  Pencil,
  Server,
  Sparkles,
  UserRound,
} from "lucide-react";

export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export const DOMAIN_MONITORING_OPTIONS = [
  { label: "All monitoring", value: "" },
  { label: "Monitoring ready", value: "READY" },
  { label: "Monitoring missing", value: "MISSING" },
] as const;

export const DOMAIN_TABLE_COLUMNS: Array<{
  icon: LucideIcon;
  key: string;
  width: string;
}> = [
  { icon: Server, key: "server", width: "w-[268px]" },
  { icon: Globe, key: "domain", width: "w-[250px]" },
  { icon: Activity, key: "status", width: "w-[116px]" },
  { icon: Globe, key: "host", width: "w-[96px]" },
  { icon: LayoutDashboard, key: "panel", width: "w-[110px]" },
  { icon: Database, key: "s3", width: "w-[104px]" },
  { icon: Globe, key: "subdomain", width: "w-[150px]" },
  { icon: UserRound, key: "profile", width: "w-[150px]" },
  { icon: CheckCircle2, key: "postman", width: "w-[116px]" },
  { icon: CheckCircle2, key: "uptime", width: "w-[116px]" },
  { icon: FileText, key: "note", width: "w-[220px]" },
  { icon: Pencil, key: "action", width: "w-[96px]" },
];

export const SERVER_TABLE_COLUMNS: Array<{
  key: string;
  width: string;
}> = [
  { key: "server", width: "w-[240px]" },
  { key: "profile", width: "w-[150px]" },
  { key: "provider", width: "w-[170px]" },
  { key: "environment", width: "w-[130px]" },
  { key: "region", width: "w-[140px]" },
  { key: "domains", width: "w-[130px]" },
  { key: "note", width: "w-[260px]" },
  { key: "action", width: "w-[116px]" },
];

export const OVERVIEW_SNAPSHOT_COLUMNS: Array<{
  key: string;
  width: string;
}> = [
  { key: "server", width: "w-[240px]" },
  { key: "profile", width: "w-[160px]" },
  { key: "provider", width: "w-[170px]" },
  { key: "region", width: "w-[120px]" },
  { key: "domains", width: "w-[120px]" },
];

export const OVERVIEW_METRIC_DEFS = [
  { key: "domains" },
  { key: "servers" },
  { key: "pendingSetup" },
  { key: "missingMonitoring" },
] as const;

export const OVERVIEW_META_ITEMS: Array<{
  icon: LucideIcon;
  key: "domains" | "servers";
  label: string;
}> = [
  { icon: Sparkles, key: "domains", label: "Operations overview" },
  { icon: Globe, key: "domains", label: "domains" },
  { icon: Server, key: "servers", label: "servers" },
];

export const DOMAINS_INTRO_ITEMS: Array<{
  icon: LucideIcon;
  key: "workspace" | "records" | "missingMonitoring";
}> = [
  { icon: Globe, key: "workspace" },
  { icon: Filter, key: "records" },
  { icon: Activity, key: "missingMonitoring" },
];
