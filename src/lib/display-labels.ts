import type { Locale } from "@/lib/i18n";

const STATUS_LABELS = {
  en: {
    ACTIVE: "Active",
    DF: "Draft",
    ISSUE: "Issue",
    PENDING: "Pending",
  },
  th: {
    ACTIVE: "ใช้งานอยู่",
    DF: "ร่าง",
    ISSUE: "มีปัญหา",
    PENDING: "รอดำเนินการ",
  },
} as const;

const HOST_TYPE_LABELS = {
  en: {
    MIXED: "Mixed",
    ROOT: "Root",
    WWW: "WWW",
  },
  th: {
    MIXED: "ผสม",
    ROOT: "Root",
    WWW: "WWW",
  },
} as const;

const PANEL_LABELS = {
  en: {
    AAPANEL: "aaPanel",
    MANUAL: "Manual",
    NONE: "None",
  },
  th: {
    AAPANEL: "aaPanel",
    MANUAL: "Manual",
    NONE: "ไม่มี",
  },
} as const;

const SERVICE_LABELS = {
  en: {
    MISSING: "Missing",
    NA: "N/A",
    READY: "Ready",
  },
  th: {
    MISSING: "ยังไม่พร้อม",
    NA: "ไม่เกี่ยวข้อง",
    READY: "พร้อม",
  },
} as const;

const PROVIDER_LABELS = {
  en: {
    AWS_EC2: "AWS EC2",
    AWS_LIGHTSAIL: "AWS Lightsail",
    OTHER: "Other",
  },
  th: {
    AWS_EC2: "AWS EC2",
    AWS_LIGHTSAIL: "AWS Lightsail",
    OTHER: "อื่นๆ",
  },
} as const;

const ENVIRONMENT_LABELS = {
  en: {
    DEV: "Development",
    PROD: "Production",
    STAGING: "Staging",
  },
  th: {
    DEV: "พัฒนา",
    PROD: "ใช้งานจริง",
    STAGING: "ทดสอบก่อนขึ้นจริง",
  },
} as const;

function resolveLabel(
  labels: Record<Locale, Record<string, string>>,
  locale: Locale,
  value: string,
) {
  return labels[locale][value] ?? value;
}

export function getStatusLabel(locale: Locale, value: string) {
  return resolveLabel(STATUS_LABELS, locale, value);
}

export function getHostTypeLabel(locale: Locale, value: string) {
  return resolveLabel(HOST_TYPE_LABELS, locale, value);
}

export function getPanelStatusLabel(locale: Locale, value: string) {
  return resolveLabel(PANEL_LABELS, locale, value);
}

export function getServiceStatusLabel(locale: Locale, value: string) {
  return resolveLabel(SERVICE_LABELS, locale, value);
}

export function getServerProviderLabel(locale: Locale, value: string) {
  return resolveLabel(PROVIDER_LABELS, locale, value);
}

export function getEnvironmentLabel(locale: Locale, value: string) {
  return resolveLabel(ENVIRONMENT_LABELS, locale, value);
}
