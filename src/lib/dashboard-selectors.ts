import type { DomainWithServer } from "@/lib/types";
import type { Server } from "@/lib/schema";

export function getOverviewMetrics(domains: DomainWithServer[], servers: Server[]) {
  const pendingSetup = domains.filter(
    (domain) =>
      domain.postmanStatus === "MISSING" || domain.s3Status === "MISSING",
  ).length;
  const missingMonitoring = domains.filter(
    (domain) => domain.uptimeStatus === "MISSING",
  ).length;

  return {
    domains: domains.length,
    servers: servers.length,
    pendingSetup,
    missingMonitoring,
  } as const;
}

export function getIssueDomains(domains: DomainWithServer[], limit = 5) {
  return domains.filter((domain) => domain.status === "ISSUE").slice(0, limit);
}

export function getRecentDomains(domains: DomainWithServer[], limit = 5) {
  return domains.slice(0, limit);
}

export function getDomainCountByServerId(domains: DomainWithServer[]) {
  return domains.reduce<Map<string, number>>((counts, domain) => {
    counts.set(domain.serverId, (counts.get(domain.serverId) ?? 0) + 1);
    return counts;
  }, new Map());
}

export function getDomainSummary(domains: DomainWithServer[]) {
  const missingMonitoring = domains.filter(
    (domain) => domain.uptimeStatus === "MISSING",
  ).length;
  const issueCount = domains.filter((domain) => domain.status === "ISSUE").length;

  return {
    issueCount,
    missingMonitoring,
    records: domains.length,
  };
}
