import type { ReactNode } from "react";
import { EditServerDialog } from "@/components/crud-dialogs";
import { Globe, MapPin, Server as ServerIcon, UserRound } from "lucide-react";
import {
  getEnvironmentLabel,
  getServerProviderLabel,
} from "@/lib/display-labels";
import type { Server } from "@/lib/schema";
import type { Locale } from "@/lib/i18n";
import { SERVERS_COPY, getCopy } from "@/lib/ui-copy";

export function ServerInventoryRow({
  canManage = true,
  canManageProfiles = true,
  domainCount,
  locale,
  server,
}: {
  canManage?: boolean;
  canManageProfiles?: boolean;
  domainCount: number;
  locale: Locale;
  server: Server;
}) {
  const copy = getCopy(locale);
  const serversCopy = SERVERS_COPY[locale];

  return (
    <tr className="border-b border-[var(--line)] align-top transition hover:bg-[var(--surface-hover)]">
      <td className="px-4 py-4 md:px-5">
        <div className="space-y-1">
          <div className="font-semibold text-[var(--text)]">{server.name}</div>
          <div className="font-[var(--font-geist-mono)] text-xs text-[var(--muted)]">
            {server.ipAddress}
          </div>
        </div>
      </td>
      <td className="px-4 py-4 text-sm text-[var(--text)] md:px-5">{server.profileName}</td>
      <td className="px-4 py-4 md:px-5">
        <span className="inline-flex rounded-full border border-[var(--line)] bg-[var(--surface-control)] px-2.5 py-1 text-xs font-medium text-[var(--text)]">
          {getServerProviderLabel(locale, server.provider)}
        </span>
      </td>
      <td className="px-4 py-4 md:px-5">
        <span className="inline-flex rounded-full border border-[var(--line)] bg-[var(--surface-control)] px-2.5 py-1 text-xs font-medium text-[var(--text)]">
          {getEnvironmentLabel(locale, server.environment)}
        </span>
      </td>
      <td className="px-4 py-4 text-sm text-[var(--text)] md:px-5">
        {server.region ?? copy.common.none}
      </td>
      <td className="px-4 py-4 md:px-5">
        <span className="inline-flex rounded-full border border-[var(--success-border)] bg-[var(--success-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--success-text)]">
          {domainCount} {serversCopy.domainCountSuffix}
        </span>
      </td>
      <td className="px-4 py-4 text-sm leading-6 text-[var(--muted)] md:px-5">
        <div
          className="max-w-[30ch] whitespace-normal break-words text-sm leading-5 line-clamp-3"
          title={server.note ?? ""}
        >
          {server.note ?? copy.common.none}
        </div>
      </td>
      <td className="px-4 py-4 md:px-5">
        {canManage ? (
          <EditServerDialog
            canManageProfiles={canManageProfiles}
            domainCount={domainCount}
            locale={locale}
            server={server}
          />
        ) : (
          <span className="text-sm text-[var(--muted)]">{copy.common.none}</span>
        )}
      </td>
    </tr>
  );
}

export function ServerSnapshotRow({
  domainCount,
  locale,
  server,
}: {
  domainCount: number;
  locale: Locale;
  server: Server;
}) {
  const copy = getCopy(locale);
  const serversCopy = SERVERS_COPY[locale];

  return (
    <tr className="border-b border-[var(--line)] transition hover:bg-[var(--surface-hover)]">
      <td className="px-4 py-4 md:px-5">
        <div className="space-y-1">
          <div className="font-semibold text-[var(--text)]">{server.name}</div>
          <div className="font-[var(--font-geist-mono)] text-xs text-[var(--muted)]">
            {server.ipAddress}
          </div>
        </div>
      </td>
      <td className="px-4 py-4 text-sm text-[var(--text)] md:px-5">{server.profileName}</td>
      <td className="px-4 py-4 text-sm text-[var(--text)] md:px-5">
        {getServerProviderLabel(locale, server.provider)}
      </td>
      <td className="px-4 py-4 text-sm text-[var(--text)] md:px-5">
        {server.region ?? copy.common.none}
      </td>
      <td className="px-4 py-4 md:px-5">
        <span className="inline-flex rounded-full border border-[var(--success-border)] bg-[var(--success-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--success-text)]">
          {domainCount} {serversCopy.domainCountSuffix}
        </span>
      </td>
    </tr>
  );
}

export function ServerSnapshotCard({
  domainCount,
  locale,
  server,
}: {
  domainCount: number;
  locale: Locale;
  server: Server;
}) {
  const copy = getCopy(locale);
  const serversCopy = SERVERS_COPY[locale];

  return (
    <article className="rounded-[20px] border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]">
      <div className="space-y-1">
        <div className="truncate text-base font-semibold text-[var(--text)]">{server.name}</div>
        <div className="font-[var(--font-geist-mono)] text-xs text-[var(--muted)]">
          {server.ipAddress}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <FieldBlock
          icon={<UserRound className="h-3.5 w-3.5" />}
          label={serversCopy.tableColumns.profile}
          value={server.profileName}
        />
        <FieldBlock
          icon={<ServerIcon className="h-3.5 w-3.5" />}
          label={serversCopy.tableColumns.provider}
          value={getServerProviderLabel(locale, server.provider)}
        />
        <FieldBlock
          icon={<MapPin className="h-3.5 w-3.5" />}
          label={serversCopy.tableColumns.region}
          value={server.region ?? copy.common.none}
        />
      </div>

      <div className="mt-3">
        <span className="inline-flex rounded-full border border-[var(--success-border)] bg-[var(--success-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--success-text)]">
          {domainCount} {serversCopy.domainCountSuffix}
        </span>
      </div>
    </article>
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

export function ServerMobileCard({
  canManage = true,
  canManageProfiles = true,
  domainCount,
  locale,
  server,
}: {
  canManage?: boolean;
  canManageProfiles?: boolean;
  domainCount: number;
  locale: Locale;
  server: Server;
}) {
  const copy = getCopy(locale);
  const serversCopy = SERVERS_COPY[locale];

  return (
    <article className="rounded-[20px] border border-[var(--line)] bg-[var(--surface)] p-3 sm:p-4 shadow-[var(--shadow)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="truncate text-base font-semibold text-[var(--text)]">{server.name}</div>
          <div className="font-[var(--font-geist-mono)] text-xs text-[var(--muted)]">
            {server.ipAddress}
          </div>
        </div>
        {canManage ? (
          <EditServerDialog
            canManageProfiles={canManageProfiles}
            domainCount={domainCount}
            locale={locale}
            server={server}
          />
        ) : null}
      </div>

      <div className="mt-3 grid gap-2.5 sm:mt-4 sm:gap-3 sm:grid-cols-2">
        <FieldBlock
          icon={<UserRound className="h-3.5 w-3.5" />}
          label={serversCopy.tableColumns.profile}
          value={server.profileName}
        />
        <FieldBlock
          icon={<ServerIcon className="h-3.5 w-3.5" />}
          label={serversCopy.tableColumns.provider}
          value={getServerProviderLabel(locale, server.provider)}
        />
        <FieldBlock
          icon={<Globe className="h-3.5 w-3.5" />}
          label={serversCopy.tableColumns.environment}
          value={getEnvironmentLabel(locale, server.environment)}
        />
        <FieldBlock
          icon={<MapPin className="h-3.5 w-3.5" />}
          label={serversCopy.tableColumns.region}
          value={server.region ?? copy.common.none}
        />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2 sm:mt-3">
        <span className="inline-flex rounded-full border border-[var(--success-border)] bg-[var(--success-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--success-text)]">
          {domainCount} {serversCopy.domainCountSuffix}
        </span>
      </div>

      <div className="mt-2.5 rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] p-2.5 sm:mt-3 sm:p-3">
        <div className="mb-1.5 text-[0.68rem] font-medium uppercase tracking-[0.12em] text-[var(--muted)] sm:mb-2">
          {serversCopy.tableColumns.note}
        </div>
        <div className="text-sm leading-6 text-[var(--muted)] line-clamp-4">
          {server.note ?? copy.common.none}
        </div>
      </div>
    </article>
  );
}
