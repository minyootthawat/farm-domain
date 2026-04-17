import type { Environment, ServerProvider } from "@/lib/schema";
import type { DomainWithServer } from "@/lib/types";
import { readStore } from "@/lib/store";

export type DomainSearchParams = {
  q?: string;
  server?: string;
  status?: string;
  monitoring?: string;
  page?: string;
  pageSize?: string;
};

export type ServerSearchParams = {
  q?: string;
  provider?: string;
  environment?: string;
  page?: string;
  pageSize?: string;
};

export async function getDashboardData(userProfile?: string | null) {
  const store = await readStore(userProfile);
  const servers = [...store.servers].sort((a, b) =>
    `${a.profileName}-${a.name}`.localeCompare(`${b.profileName}-${b.name}`),
  );
  const serverById = new Map(servers.map((server) => [server.id, server]));
  const domains = [...store.domains]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .flatMap((domain) => {
      const server = serverById.get(domain.serverId);
      return server ? [{ ...domain, server }] : [];
    }) as DomainWithServer[];

  return { servers, domains };
}

export function filterDomains(
  domains: DomainWithServer[],
  params: DomainSearchParams,
) {
  const query = params.q?.trim().toLowerCase() ?? "";
  const selectedServer = params.server?.trim() ?? "";
  const selectedStatus = params.status?.trim() ?? "";
  const selectedMonitoring = params.monitoring?.trim() ?? "";

  const filteredDomains = domains.filter((domain) => {
    const matchesQuery =
      query.length === 0 ||
      domain.name.toLowerCase().includes(query) ||
      domain.server.name.toLowerCase().includes(query) ||
      domain.server.ipAddress.toLowerCase().includes(query) ||
      (domain.ownerProfile ?? "").toLowerCase().includes(query) ||
      (domain.subdomainProvider ?? "").toLowerCase().includes(query);

    const matchesServer =
      selectedServer.length === 0 || domain.serverId === selectedServer;

    const matchesStatus =
      selectedStatus.length === 0 || domain.status === selectedStatus;

    const matchesMonitoring =
      selectedMonitoring.length === 0 ||
      (selectedMonitoring === "MISSING" && domain.uptimeStatus === "MISSING") ||
      (selectedMonitoring === "READY" && domain.uptimeStatus === "READY");

    return matchesQuery && matchesServer && matchesStatus && matchesMonitoring;
  });

  return {
    filteredDomains,
    query,
    selectedMonitoring,
    selectedServer,
    selectedStatus,
  };
}

export function getPagination(params: DomainSearchParams, totalItems: number) {
  const allowedPageSizes = new Set([10, 20, 50]);
  const rawPageSize = Number(params.pageSize ?? "10");
  const pageSize = allowedPageSizes.has(rawPageSize) ? rawPageSize : 10;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const rawPage = Number(params.page ?? "1");
  const currentPage =
    Number.isFinite(rawPage) && rawPage > 0
      ? Math.min(rawPage, totalPages)
      : 1;
  const pageStart = (currentPage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, totalItems);

  return {
    currentPage,
    pageEnd,
    pageSize,
    pageStart,
    totalPages,
  };
}

export function buildPageHref(params: {
  monitoring?: string;
  page: number;
  pageSize: number;
  q?: string;
  server?: string;
  status?: string;
}) {
  const query = new URLSearchParams();

  if (params.q) query.set("q", params.q);
  if (params.server) query.set("server", params.server);
  if (params.status) query.set("status", params.status);
  if (params.monitoring) query.set("monitoring", params.monitoring);
  query.set("page", String(params.page));
  query.set("pageSize", String(params.pageSize));

  return `/domains?${query.toString()}`;
}

export function getVisiblePages(currentPage: number, totalPages: number) {
  const pages = new Set<number>([1, totalPages, currentPage]);

  for (let page = currentPage - 2; page <= currentPage + 2; page += 1) {
    if (page > 1 && page < totalPages) {
      pages.add(page);
    }
  }

  return [...pages].sort((a, b) => a - b);
}

export function filterServers(
  servers: Awaited<ReturnType<typeof getDashboardData>>["servers"],
  params: ServerSearchParams,
) {
  const query = params.q?.trim().toLowerCase() ?? "";
  const selectedProvider = params.provider?.trim() ?? "";
  const selectedEnvironment = params.environment?.trim() ?? "";

  const filteredServers = servers.filter((server) => {
    const matchesQuery =
      query.length === 0 ||
      server.name.toLowerCase().includes(query) ||
      server.ipAddress.toLowerCase().includes(query) ||
      server.profileName.toLowerCase().includes(query) ||
      (server.region ?? "").toLowerCase().includes(query) ||
      (server.note ?? "").toLowerCase().includes(query);

    const matchesProvider =
      selectedProvider.length === 0 ||
      server.provider === (selectedProvider as ServerProvider);
    const matchesEnvironment =
      selectedEnvironment.length === 0 ||
      server.environment === (selectedEnvironment as Environment);

    return matchesQuery && matchesProvider && matchesEnvironment;
  });

  return {
    filteredServers,
    query,
    selectedEnvironment,
    selectedProvider,
  };
}

export function buildServersPageHref(params: {
  environment?: string;
  page: number;
  pageSize: number;
  provider?: string;
  q?: string;
}) {
  const query = new URLSearchParams();

  if (params.q) query.set("q", params.q);
  if (params.provider) query.set("provider", params.provider);
  if (params.environment) query.set("environment", params.environment);
  query.set("page", String(params.page));
  query.set("pageSize", String(params.pageSize));

  return `/servers?${query.toString()}`;
}
