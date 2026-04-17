import { Globe, Search, Server } from "lucide-react";
import { auth } from "@/auth";
import { CreateServerDialog, ImportServersDialog } from "@/components/crud-dialogs";
import {
  IntroBar,
  MetaPill,
  PageContainer,
  SubtleActionLink,
  SurfaceCard,
} from "@/components/dashboard-shell";
import { ServerInventoryRow, ServerMobileCard } from "@/components/server-table-row";
import { TablePagination, TableSummaryBar } from "@/components/table-pagination";
import { SearchField, TableToolbar } from "@/components/table-toolbar";
import {
  PAGE_SIZE_OPTIONS,
  SERVER_TABLE_COLUMNS,
} from "@/lib/dashboard-config";
import {
  getEnvironmentLabel,
  getServerProviderLabel,
} from "@/lib/display-labels";
import {
  buildServersPageHref,
  filterServers,
  getDashboardData,
  getPagination,
  getVisiblePages,
  type ServerSearchParams,
} from "@/lib/dashboard";
import { getDomainCountByServerId } from "@/lib/dashboard-selectors";
import { getLocale } from "@/lib/i18n-server";
import { canWriteInventory, getInventoryScopeProfile, getSessionUserRole } from "@/lib/rbac";
import { ENVIRONMENTS, SERVER_PROVIDERS } from "@/lib/schema";
import { COMMON_UI_COPY, SERVERS_COPY, getCopy } from "@/lib/ui-copy";

export const dynamic = "force-dynamic";

const inputClass =
  "h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--surface-control)] px-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)]";
type PageProps = {
  searchParams?: Promise<ServerSearchParams>;
};

export default async function ServersPage({ searchParams }: PageProps) {
  const session = await auth();
  const userProfile = getInventoryScopeProfile(session);
  const canManageInventory = canWriteInventory(session);
  const userRole = getSessionUserRole(session);
  const locale = await getLocale();
  const commonCopy = COMMON_UI_COPY[locale];
  const serversCopy = SERVERS_COPY[locale];
  const copy = getCopy(locale);
  const params = (await searchParams) ?? {};
  const { servers, domains } = await getDashboardData(userProfile);
  const { filteredServers, selectedEnvironment, selectedProvider } = filterServers(
    servers,
    params,
  );
  const { currentPage, pageEnd, pageSize, pageStart, totalPages } = getPagination(
    params,
    filteredServers.length,
  );
  const pagedServers = filteredServers.slice(pageStart, pageStart + pageSize);
  const visiblePages = getVisiblePages(currentPage, totalPages);
  const domainCountByServerId = getDomainCountByServerId(domains);

  return (
    <PageContainer>
      <IntroBar>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <MetaPill>
              <Server className="h-3.5 w-3.5" />
              {filteredServers.length} {serversCopy.serverUnit}
            </MetaPill>
            <MetaPill>
              <Globe className="h-3.5 w-3.5" />
              {domains.length} {serversCopy.linkedDomainsSuffix}
            </MetaPill>
          </div>
          <p className="max-w-[72ch] text-sm leading-6 text-[var(--muted)]">
            {serversCopy.introDescription}
          </p>
          {!canManageInventory ? (
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
              {userRole === "viewer"
                ? copy.dialogs.readOnlyAccess
                : copy.dialogs.limitedAccess}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canManageInventory ? <CreateServerDialog canManageProfiles={userRole === "admin"} locale={locale} /> : null}
          {canManageInventory ? <ImportServersDialog canManageProfiles={userRole === "admin"} locale={locale} /> : null}
          <SubtleActionLink href="/api/export/templates/servers">
            <Server className="h-4 w-4" />
            {commonCopy.template}
          </SubtleActionLink>
          <SubtleActionLink href="/api/export/servers">
            <Server className="h-4 w-4" />
            {commonCopy.export}
          </SubtleActionLink>
          <SubtleActionLink href="/domains">
            <Globe className="h-4 w-4" />
            {serversCopy.openDomains}
          </SubtleActionLink>
        </div>
      </IntroBar>

      <SurfaceCard className="overflow-hidden">
        <TableToolbar>
          <form
            className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(280px,1.5fr)_repeat(3,minmax(0,0.8fr))_auto]"
            method="get"
          >
            <SearchField>
              <Search className="h-4 w-4 text-[var(--muted)]" />
              <input
                className="w-full border-0 bg-transparent text-sm text-[var(--text)] outline-none"
                defaultValue={params.q ?? ""}
                name="q"
                placeholder={serversCopy.searchPlaceholder}
              />
            </SearchField>
            <select className={inputClass} defaultValue={selectedProvider} name="provider">
              <option value="">{serversCopy.allProviders}</option>
              {SERVER_PROVIDERS.map((provider) => (
                <option key={provider} value={provider}>
                  {getServerProviderLabel(locale, provider)}
                </option>
              ))}
            </select>
            <select
              className={inputClass}
              defaultValue={selectedEnvironment}
              name="environment"
            >
              <option value="">{serversCopy.allEnvironments}</option>
              {ENVIRONMENTS.map((environment) => (
                <option key={environment} value={environment}>
                  {getEnvironmentLabel(locale, environment)}
                </option>
              ))}
            </select>
            <select className={inputClass} defaultValue={String(pageSize)} name="pageSize">
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={String(size)}>
                  {size} {commonCopy.rows}
                </option>
              ))}
            </select>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                className="ui-hover-rise inline-flex h-11 items-center justify-center rounded-xl [background:var(--surface-active)] px-4 text-sm font-semibold text-[var(--on-accent)]"
                type="submit"
              >
                {commonCopy.apply}
              </button>
              <SubtleActionLink href="/servers">{commonCopy.reset}</SubtleActionLink>
            </div>
          </form>
        </TableToolbar>

        <TableSummaryBar
          summary={
            filteredServers.length === 0
              ? commonCopy.showingZero
              : commonCopy.showingRange(
                  pageStart + 1,
                  pageEnd,
                  filteredServers.length,
                )
          }
        >
          <MetaPill>
            <Server className="h-3.5 w-3.5" />
            {serversCopy.allServers}
          </MetaPill>
        </TableSummaryBar>

        <div className="grid gap-3 px-3 pb-3 lg:hidden">
          {pagedServers.length === 0 ? (
            <div className="px-2 py-12 text-center text-sm text-[var(--muted)]">
              {serversCopy.emptyState}
            </div>
          ) : null}
          {pagedServers.map((server) => (
            <ServerMobileCard
              canManage={canManageInventory}
              canManageProfiles={userRole === "admin"}
              domainCount={domainCountByServerId.get(server.id) ?? 0}
              key={server.id}
              locale={locale}
              server={server}
            />
          ))}
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <table className="min-w-[1120px] w-full border-collapse">
            <thead className="bg-[var(--table-head)]">
              <tr className="border-b border-[var(--line)] text-left text-[0.72rem] uppercase tracking-[0.14em] text-[var(--muted)]">
                {SERVER_TABLE_COLUMNS.map((column) => (
                  <th
                    className={`${column.width} px-4 py-3 font-medium md:px-5`}
                    key={column.key}
                  >
                    {serversCopy.tableColumns[
                      column.key as keyof typeof serversCopy.tableColumns
                    ]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedServers.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-12 text-center text-sm text-[var(--muted)] md:px-5"
                    colSpan={8}
                  >
                    {serversCopy.emptyState}
                  </td>
                </tr>
              ) : null}
              {pagedServers.map((server) => (
                <ServerInventoryRow
                  canManage={canManageInventory}
                  canManageProfiles={userRole === "admin"}
                  domainCount={domainCountByServerId.get(server.id) ?? 0}
                  key={server.id}
                  locale={locale}
                  server={server}
                />
              ))}
            </tbody>
          </table>
        </div>

        <TablePagination
          currentPage={currentPage}
          hiddenFields={[
            { name: "q", value: params.q ?? "" },
            { name: "provider", value: selectedProvider },
            { name: "environment", value: selectedEnvironment },
            { name: "pageSize", value: String(pageSize) },
          ]}
          jumpLabel={commonCopy.jumpToPage}
          jumpSubmitLabel={commonCopy.go}
          inputId="servers-page"
          nextHref={buildServersPageHref({
            q: params.q,
            provider: selectedProvider,
            environment: selectedEnvironment,
            page: Math.min(totalPages, currentPage + 1),
            pageSize,
          })}
          nextLabel={commonCopy.next}
          pageHref={(page) =>
            buildServersPageHref({
              q: params.q,
              provider: selectedProvider,
              environment: selectedEnvironment,
              page,
              pageSize,
            })
          }
          prevHref={buildServersPageHref({
            q: params.q,
            provider: selectedProvider,
            environment: selectedEnvironment,
            page: Math.max(1, currentPage - 1),
            pageSize,
          })}
          prevLabel={commonCopy.prev}
          totalPages={totalPages}
          visiblePages={visiblePages}
        />
      </SurfaceCard>
    </PageContainer>
  );
}
