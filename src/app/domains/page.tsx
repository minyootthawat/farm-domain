import {
  Activity,
  AlertTriangle,
  Filter,
  Globe,
  Search,
  Server,
} from "lucide-react";
import Link from "next/link";
import { auth } from "@/auth";
import { CreateDomainDialog, ImportDomainsDialog } from "@/components/crud-dialogs";
import { DomainMobileCard, DomainTableRow } from "@/components/domain-table-row";
import {
  IntroBar,
  MetaPill,
  PageContainer,
  SurfaceCard,
} from "@/components/dashboard-shell";
import { TablePagination, TableSummaryBar } from "@/components/table-pagination";
import { SearchField, TableToolbar } from "@/components/table-toolbar";
import {
  DOMAIN_MONITORING_OPTIONS,
  DOMAIN_TABLE_COLUMNS,
  PAGE_SIZE_OPTIONS,
} from "@/lib/dashboard-config";
import { getStatusLabel } from "@/lib/display-labels";
import {
  buildPageHref,
  filterDomains,
  getDashboardData,
  getPagination,
  getVisiblePages,
  type DomainSearchParams,
} from "@/lib/dashboard";
import { getDomainSummary } from "@/lib/dashboard-selectors";
import { getLocale } from "@/lib/i18n-server";
import { canWriteInventory, getInventoryScopeProfile, getSessionUserRole } from "@/lib/rbac";
import { DOMAIN_STATUSES } from "@/lib/schema";
import { COMMON_UI_COPY, DOMAINS_COPY, getCopy } from "@/lib/ui-copy";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<DomainSearchParams>;
};

const inputClass =
  "h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--surface-control)] px-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)]";
const actionButtonClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-control)] px-4 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--surface-control-hover)]";
const stickyActionHeaderClass =
  "sticky right-0 z-20 border-l border-[var(--line)] bg-[var(--table-head)] shadow-[var(--sticky-shadow)] backdrop-blur";

export default async function DomainsPage({ searchParams }: PageProps) {
  const session = await auth();
  const userProfile = getInventoryScopeProfile(session);
  const canManageInventory = canWriteInventory(session);
  const userRole = getSessionUserRole(session);
  const locale = await getLocale();
  const commonCopy = COMMON_UI_COPY[locale];
  const domainsCopy = DOMAINS_COPY[locale];
  const copy = getCopy(locale);
  const params = (await searchParams) ?? {};
  const { servers, domains } = await getDashboardData(userProfile);
  const {
    filteredDomains,
    selectedMonitoring,
    selectedServer,
    selectedStatus,
  } = filterDomains(domains, params);
  const { currentPage, pageEnd, pageSize, pageStart, totalPages } = getPagination(
    params,
    filteredDomains.length,
  );
  const pagedDomains = filteredDomains.slice(pageStart, pageStart + pageSize);
  const visiblePages = getVisiblePages(currentPage, totalPages);
  const { issueCount, missingMonitoring, records } = getDomainSummary(filteredDomains);

  return (
    <PageContainer>
      <IntroBar>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <MetaPill>
              <Globe className="h-3.5 w-3.5" />
              {domainsCopy.workspace}
            </MetaPill>
            <MetaPill>
              <Filter className="h-3.5 w-3.5" />
              {filteredDomains.length} {domainsCopy.recordsSuffix}
            </MetaPill>
            <MetaPill>
              <AlertTriangle className="h-3.5 w-3.5" />
              {missingMonitoring} {domainsCopy.missingMonitoringSuffix}
            </MetaPill>
          </div>
          <p className="max-w-[72ch] text-sm leading-6 text-[var(--muted)]">
            {domainsCopy.introDescription}
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
          {canManageInventory ? (
            <CreateDomainDialog
              canManageProfiles={userRole === "admin"}
              locale={locale}
              servers={servers}
            />
          ) : null}
          {canManageInventory ? (
            <ImportDomainsDialog
              canManageProfiles={userRole === "admin"}
              locale={locale}
              servers={servers}
            />
          ) : null}
          <Link className={actionButtonClass} href="/api/export/templates/domains">
            <Globe className="h-4 w-4" />
            {commonCopy.template}
          </Link>
          <Link className={actionButtonClass} href="/api/export/domains">
            <Globe className="h-4 w-4" />
            {commonCopy.export}
          </Link>
        </div>
      </IntroBar>

      <SurfaceCard className="overflow-hidden">
        <TableToolbar>
          <form
            className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,1.6fr)_repeat(4,minmax(0,0.8fr))_auto_auto]"
            method="get"
          >
            <SearchField>
              <Search className="h-4 w-4 text-[var(--muted)]" />
              <input
                className="w-full border-0 bg-transparent text-sm text-[var(--text)] outline-none"
                defaultValue={params.q ?? ""}
                name="q"
                placeholder={domainsCopy.searchPlaceholder}
              />
            </SearchField>
            <select className={inputClass} defaultValue={selectedServer} name="server">
              <option value="">{domainsCopy.allServers}</option>
              {servers.map((server) => (
                <option key={server.id} value={server.id}>
                  {server.name}
                </option>
              ))}
            </select>
            <select className={inputClass} defaultValue={selectedStatus} name="status">
              <option value="">{domainsCopy.allStatuses}</option>
              {DOMAIN_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {getStatusLabel(locale, status)}
                </option>
              ))}
            </select>
            <select className={inputClass} defaultValue={selectedMonitoring} name="monitoring">
              {DOMAIN_MONITORING_OPTIONS.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.value === ""
                    ? domainsCopy.allMonitoring
                    : option.value === "READY"
                      ? domainsCopy.monitoringReady
                      : domainsCopy.monitoringMissing}
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
            <div className="flex flex-col gap-3 sm:flex-row xl:contents">
              <button
                className="ui-hover-rise inline-flex h-11 items-center justify-center rounded-xl [background:var(--surface-active)] px-4 text-sm font-semibold text-[var(--on-accent)]"
                type="submit"
              >
                {commonCopy.apply}
              </button>
              <Link className={actionButtonClass} href="/domains">
                {commonCopy.reset}
              </Link>
            </div>
          </form>
        </TableToolbar>

        <TableSummaryBar
          summary={
            records === 0
              ? commonCopy.showingZero
              : commonCopy.showingRange(pageStart + 1, pageEnd, records)
          }
        >
          <MetaPill>
            <Server className="h-3.5 w-3.5" />
            {servers.length} {domainsCopy.serverUnit}
          </MetaPill>
          <MetaPill>
            <Activity className="h-3.5 w-3.5" />
            {issueCount} {domainsCopy.issueStatesSuffix}
          </MetaPill>
        </TableSummaryBar>

        <div className="grid gap-3 px-3 pb-3 lg:hidden">
          {pagedDomains.length === 0 ? (
            <div className="px-2 py-12 text-center text-sm text-[var(--muted)]">
              {domainsCopy.emptyState}
            </div>
          ) : null}
          {pagedDomains.map((domain) => (
            <DomainMobileCard
              canManage={canManageInventory}
              canManageProfiles={userRole === "admin"}
              domain={domain}
              key={domain.id}
              locale={locale}
            />
          ))}
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <table className="min-w-[1520px] w-full border-collapse">
            <thead className="sticky top-0 z-10 bg-[var(--table-head)] backdrop-blur">
              <tr className="border-b border-[var(--line)] text-left text-[0.72rem] uppercase tracking-[0.14em] text-[var(--muted)]">
                {DOMAIN_TABLE_COLUMNS.map(({ icon: Icon, key, width }) => (
                  <th
                    className={`px-4 py-3 font-medium md:px-5 ${width} ${key === "action" ? stickyActionHeaderClass : ""}`}
                    key={key}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5" />
                      {domainsCopy.tableColumns[key as keyof typeof domainsCopy.tableColumns]}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedDomains.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-12 text-center text-sm text-[var(--muted)] md:px-5"
                    colSpan={12}
                  >
                    {domainsCopy.emptyState}
                  </td>
                </tr>
              ) : null}
              {pagedDomains.map((domain) => (
                <DomainTableRow
                  canManage={canManageInventory}
                  canManageProfiles={userRole === "admin"}
                  domain={domain}
                  key={domain.id}
                  locale={locale}
                />
              ))}
            </tbody>
          </table>
        </div>

        <TablePagination
          currentPage={currentPage}
          hiddenFields={[
            { name: "q", value: params.q ?? "" },
            { name: "server", value: selectedServer },
            { name: "status", value: selectedStatus },
            { name: "monitoring", value: selectedMonitoring },
            { name: "pageSize", value: String(pageSize) },
          ]}
          jumpLabel={commonCopy.jumpToPage}
          jumpSubmitLabel={commonCopy.go}
          nextHref={buildPageHref({
            q: params.q,
            server: selectedServer,
            status: selectedStatus,
            monitoring: selectedMonitoring,
            page: Math.min(totalPages, currentPage + 1),
            pageSize,
          })}
          nextLabel={commonCopy.next}
          pageHref={(page) =>
            buildPageHref({
              q: params.q,
              server: selectedServer,
              status: selectedStatus,
              monitoring: selectedMonitoring,
              page,
              pageSize,
            })
          }
          prevHref={buildPageHref({
            q: params.q,
            server: selectedServer,
            status: selectedStatus,
            monitoring: selectedMonitoring,
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
