import type { ReactNode } from "react";
import { EditDomainDialog } from "@/components/crud-dialogs";
import { StatusBadge } from "@/components/status-badge";
import { Activity, Database, Globe, LayoutDashboard, Server, UserRound } from "lucide-react";
import {
  getHostTypeLabel,
  getPanelStatusLabel,
  getServiceStatusLabel,
} from "@/lib/display-labels";
import type { Locale } from "@/lib/i18n";
import type { DomainWithServer } from "@/lib/types";
import { getCopy } from "@/lib/ui-copy";

const compactBadgeClass =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold";
const stickyActionCellClass =
  "sticky right-0 z-[1] border-l border-[var(--line)] bg-[var(--surface)] shadow-[var(--sticky-shadow-soft)]";

export function DomainTableRow({
  canManage = true,
  canManageProfiles = true,
  domain,
  locale,
}: {
  canManage?: boolean;
  canManageProfiles?: boolean;
  domain: DomainWithServer;
  locale: Locale;
}) {
  const copy = getCopy(locale);

  return (
    <tr className="border-b border-[var(--line)] align-top transition hover:bg-[var(--surface-hover)]">
      <td className="px-4 py-4 md:px-5">
        <div className="space-y-1">
          <div className="whitespace-nowrap font-semibold text-[var(--text)]">
            {domain.server.name}
          </div>
          <div className="whitespace-nowrap font-[var(--font-geist-mono)] text-xs text-[var(--muted)]">
            {domain.server.ipAddress}
          </div>
          <div className="whitespace-nowrap text-xs text-[var(--muted)]">
            {domain.server.profileName}
          </div>
        </div>
      </td>
      <td className="px-4 py-4 md:px-5">
        <div className="space-y-1">
          <div className="font-semibold text-[var(--text)]">{domain.name}</div>
          <div className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
            {getHostTypeLabel(locale, domain.hostType)}
          </div>
        </div>
      </td>
      <td className="px-4 py-4 md:px-5">
        <StatusBadge className={compactBadgeClass} locale={locale} value={domain.status} />
      </td>
      <td className="px-4 py-4 md:px-5">
        <span className="inline-flex rounded-full border border-[var(--line)] bg-[var(--surface-control)] px-2.5 py-1 text-xs font-medium text-[var(--text)]">
          {getHostTypeLabel(locale, domain.hostType)}
        </span>
      </td>
      <td className="px-4 py-4 md:px-5">
        <span className="inline-flex rounded-full border border-[var(--line)] bg-[var(--surface-control)] px-2.5 py-1 text-xs font-medium text-[var(--text)]">
          {getPanelStatusLabel(locale, domain.panelStatus)}
        </span>
      </td>
      <td className="px-4 py-4 md:px-5">
        <span className="inline-flex rounded-full border border-[var(--line)] bg-[var(--surface-control)] px-2.5 py-1 text-xs font-medium text-[var(--text)]">
          {getServiceStatusLabel(locale, domain.s3Status)}
        </span>
      </td>
      <td className="px-4 py-4 text-sm text-[var(--text)] md:px-5">
        {domain.subdomainProvider ?? copy.common.none}
      </td>
      <td className="px-4 py-4 text-sm text-[var(--text)] md:px-5">
        {domain.ownerProfile ?? copy.common.none}
      </td>
      <td className="px-4 py-4 md:px-5">
        <StatusBadge
          className={compactBadgeClass}
          locale={locale}
          value={domain.postmanStatus}
        />
      </td>
      <td className="px-4 py-4 md:px-5">
        <StatusBadge
          className={compactBadgeClass}
          locale={locale}
          value={domain.uptimeStatus}
        />
      </td>
      <td className="px-4 py-4 text-sm leading-6 text-[var(--muted)] md:px-5">
        <div
          className="max-w-[30ch] min-w-[18ch] whitespace-normal break-words text-sm leading-5 line-clamp-3"
          title={domain.note ?? ""}
        >
          {domain.note ?? copy.common.none}
        </div>
      </td>
      <td className={`px-4 py-4 md:px-5 ${stickyActionCellClass}`}>
        {canManage ? (
          <EditDomainDialog
            canManageProfiles={canManageProfiles}
            domain={domain}
            locale={locale}
            serverName={domain.server.name}
          />
        ) : (
          <span className="text-sm text-[var(--muted)]">{copy.common.none}</span>
        )}
      </td>
    </tr>
  );
}

function FieldBlock({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] p-2.5 sm:p-3">
      <div className="mb-1.5 inline-flex items-center gap-2 text-[0.68rem] font-medium uppercase tracking-[0.12em] text-[var(--muted)] sm:mb-2">
        {icon}
        {label}
      </div>
      <div className="text-sm text-[var(--text)]">{value}</div>
    </div>
  );
}

export function DomainMobileCard({
  canManage = true,
  canManageProfiles = true,
  domain,
  locale,
}: {
  canManage?: boolean;
  canManageProfiles?: boolean;
  domain: DomainWithServer;
  locale: Locale;
}) {
  const copy = getCopy(locale);

  return (
    <article className="rounded-[20px] border border-[var(--line)] bg-[var(--surface)] p-3 sm:p-4 shadow-[var(--shadow)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="truncate text-base font-semibold text-[var(--text)]">{domain.name}</div>
          <div className="inline-flex flex-wrap items-center gap-2">
            <StatusBadge className={compactBadgeClass} locale={locale} value={domain.status} />
            <span className="inline-flex rounded-full border border-[var(--line)] bg-[var(--surface-control)] px-2.5 py-1 text-xs font-medium text-[var(--text)]">
              {getHostTypeLabel(locale, domain.hostType)}
            </span>
          </div>
        </div>
        {canManage ? (
          <EditDomainDialog
            canManageProfiles={canManageProfiles}
            domain={domain}
            locale={locale}
            serverName={domain.server.name}
          />
        ) : null}
      </div>

      <div className="mt-3 grid gap-2.5 sm:mt-4 sm:gap-3 sm:grid-cols-2">
        <FieldBlock
          icon={<Server className="h-3.5 w-3.5" />}
          label={copy.domains.tableColumns.server}
          value={
            <div className="space-y-1">
              <div className="font-medium text-[var(--text)]">{domain.server.name}</div>
              <div className="font-[var(--font-geist-mono)] text-xs text-[var(--muted)]">
                {domain.server.ipAddress}
              </div>
              <div className="text-xs text-[var(--muted)]">{domain.server.profileName}</div>
            </div>
          }
        />
        <FieldBlock
          icon={<LayoutDashboard className="h-3.5 w-3.5" />}
          label={copy.domains.tableColumns.panel}
          value={getPanelStatusLabel(locale, domain.panelStatus)}
        />
        <FieldBlock
          icon={<Database className="h-3.5 w-3.5" />}
          label={copy.domains.tableColumns.s3}
          value={getServiceStatusLabel(locale, domain.s3Status)}
        />
        <FieldBlock
          icon={<UserRound className="h-3.5 w-3.5" />}
          label={copy.domains.tableColumns.profile}
          value={domain.ownerProfile ?? copy.common.none}
        />
        <FieldBlock
          icon={<Globe className="h-3.5 w-3.5" />}
          label={copy.domains.tableColumns.subdomain}
          value={domain.subdomainProvider ?? copy.common.none}
        />
        <FieldBlock
          icon={<Activity className="h-3.5 w-3.5" />}
          label={copy.domains.tableColumns.postman}
          value={<StatusBadge className={compactBadgeClass} locale={locale} value={domain.postmanStatus} />}
        />
        <FieldBlock
          icon={<Activity className="h-3.5 w-3.5" />}
          label={copy.domains.tableColumns.uptime}
          value={<StatusBadge className={compactBadgeClass} locale={locale} value={domain.uptimeStatus} />}
        />
      </div>

      <div className="mt-2.5 rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] p-2.5 sm:mt-3 sm:p-3">
        <div className="mb-1.5 text-[0.68rem] font-medium uppercase tracking-[0.12em] text-[var(--muted)] sm:mb-2">
          {copy.domains.tableColumns.note}
        </div>
        <div className="text-sm leading-6 text-[var(--muted)] line-clamp-4">
          {domain.note ?? copy.common.none}
        </div>
      </div>
    </article>
  );
}
