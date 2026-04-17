import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Globe,
  Radar,
  Server,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { auth } from "@/auth";
import {
  IntroBar,
  MetaPill,
  PageContainer,
  SurfaceCard,
} from "@/components/dashboard-shell";
import {
  ServerSnapshotCard,
  ServerSnapshotRow,
} from "@/components/server-table-row";
import {
  OVERVIEW_METRIC_DEFS,
  OVERVIEW_SNAPSHOT_COLUMNS,
} from "@/lib/dashboard-config";
import { getDashboardData } from "@/lib/dashboard";
import {
  getDomainCountByServerId,
  getIssueDomains,
  getOverviewMetrics,
  getRecentDomains,
} from "@/lib/dashboard-selectors";
import { getStatusLabel } from "@/lib/display-labels";
import { getLocale } from "@/lib/i18n-server";
import { getInventoryScopeProfile } from "@/lib/rbac";
import { OVERVIEW_COPY } from "@/lib/ui-copy";

export const dynamic = "force-dynamic";

const STATUS_ORDER = ["DF", "ACTIVE", "PENDING", "ISSUE"] as const;
const STATUS_TONE: Record<(typeof STATUS_ORDER)[number], string> = {
  ACTIVE: "bg-[var(--success-bg)] text-[var(--success-text)] border-[var(--success-border)]",
  DF: "bg-[var(--surface-soft)] text-[var(--text)] border-[var(--line)]",
  ISSUE: "bg-[var(--danger-bg)] text-[var(--danger-text)] border-[var(--danger-border)]",
  PENDING: "bg-[var(--warn-bg)] text-[var(--warn-text)] border-[var(--warn-border)]",
};

function SectionHeading({
  action,
  description,
  icon,
  title,
}: {
  action?: React.ReactNode;
  description?: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-[var(--line)] px-4 py-4 sm:px-5 md:flex-row md:items-end md:justify-between md:px-6">
      <div className="space-y-1">
        <div className="inline-flex items-center gap-2 text-[0.7rem] font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
          {icon}
          {title}
        </div>
        {description ? <p className="text-sm text-[var(--muted)]">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

function MetricCard({
  label,
  meta,
  toneClassName,
  value,
}: {
  label: string;
  meta: string;
  toneClassName: string;
  value: number;
}) {
  return (
    <article className="ui-subpanel ui-hover-rise rounded-[18px] border border-[var(--line)] bg-[var(--surface-soft)] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <span className="text-sm font-medium text-[var(--muted)]">{label}</span>
        <span
          className={`rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em] ${toneClassName}`}
        >
          {meta}
        </span>
      </div>
      <div className="text-[clamp(2rem,4vw,3rem)] font-semibold leading-none text-[var(--text)]">
        {value}
      </div>
    </article>
  );
}

function DonutChart({
  items,
  totalLabel,
  total,
}: {
  items: Array<{
    color: string;
    label: string;
    rawLabel: string;
    toneClassName: string;
    value: number;
  }>;
  totalLabel: string;
  total: number;
}) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const segments = items.reduce<
    Array<{
      color: string;
      label: string;
      rawLabel: string;
      strokeDasharray: string;
      strokeDashoffset: number;
      value: number;
    }>
  >((accumulator, item) => {
    const previousOffset = accumulator.reduce((sum, segment) => {
      const [segmentLength] = segment.strokeDasharray.split(" ");
      return sum + Number(segmentLength);
    }, 0);
    const segmentLength = total === 0 ? 0 : (item.value / total) * circumference;

    accumulator.push({
      color: item.color,
      label: item.label,
      rawLabel: item.rawLabel,
      strokeDasharray: `${segmentLength} ${circumference - segmentLength}`,
      strokeDashoffset: -previousOffset,
      value: item.value,
    });

    return accumulator;
  }, []);

  return (
    <div className="grid gap-5 lg:grid-cols-[180px_1fr] lg:items-center">
      <div className="relative mx-auto h-[156px] w-[156px] sm:h-[180px] sm:w-[180px]">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            fill="none"
            r={radius}
            stroke="var(--surface-control)"
            strokeWidth="12"
          />
          {segments.map((segment) => (
            <circle
              cx="60"
              cy="60"
              fill="none"
              key={segment.rawLabel}
              r={radius}
              stroke={segment.color}
              strokeDasharray={segment.strokeDasharray}
              strokeDashoffset={segment.strokeDashoffset}
              strokeLinecap="round"
              strokeWidth="12"
            >
              <title>{`${segment.label}: ${segment.value}`}</title>
            </circle>
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="text-[2rem] font-semibold leading-none text-[var(--text)]">{total}</div>
          <div className="mt-2 text-[0.68rem] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
            {totalLabel}
          </div>
        </div>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div
            className="flex items-center justify-between gap-3 rounded-[16px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5"
            key={item.label}
          >
            <div className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text)]">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              {item.label}
            </div>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${item.toneClassName}`}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReadinessChart({
  items,
  readySuffix,
}: {
  items: Array<{ label: string; ready: number; total: number }>;
  readySuffix: string;
}) {
  return (
    <div className="space-y-4">
      {items.map((item) => {
        const percentage = item.total === 0 ? 0 : Math.round((item.ready / item.total) * 100);

        return (
          <div
            className="space-y-2"
            key={item.label}
            title={`${item.label}: ${item.ready}/${item.total} (${percentage}%)`}
          >
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-[var(--text)]">{item.label}</span>
              <span className="font-[var(--font-geist-mono)] text-xs text-[var(--muted)]">
                {item.ready}/{item.total}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-[var(--surface-control)]">
              <div
                className="h-full rounded-full [background:var(--surface-active)]"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
              {percentage}% {readySuffix}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ColumnChart({
  items,
}: {
  items: Array<{ label: string; value: number }>;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="space-y-4">
      <div className="h-36 rounded-[18px] border border-[var(--line)] bg-[var(--surface)] p-3 sm:h-44 sm:p-4">
        <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 300 150">
          {[0, 1, 2, 3].map((line) => (
            <line
              key={line}
              stroke="var(--line)"
              strokeDasharray="3 6"
              strokeWidth="1"
              x1="0"
              x2="300"
              y1={18 + line * 34}
              y2={18 + line * 34}
            />
          ))}
          {items.map((item, index) => {
            const barWidth = 34;
            const gap = 22;
            const x = 16 + index * (barWidth + gap);
            const height = max === 0 ? 0 : (item.value / max) * 108;
            const y = 132 - height;

            return (
              <g key={item.label}>
                <title>{`${item.label}: ${item.value}`}</title>
                <rect
                  fill="var(--surface-control)"
                  height="116"
                  rx="10"
                  width={barWidth}
                  x={x}
                  y="16"
                />
                <rect
                  fill="var(--accent)"
                  height={height}
                  rx="10"
                  width={barWidth}
                  x={x}
                  y={y}
                />
              </g>
            );
          })}
        </svg>
      </div>
      <div className="grid gap-2">
        {items.map((item) => (
          <div className="flex items-center justify-between gap-3 text-sm" key={item.label}>
            <span className="truncate font-medium text-[var(--text)]">{item.label}</span>
            <span className="font-[var(--font-geist-mono)] text-xs text-[var(--muted)]">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function OverviewPage() {
  const session = await auth();
  const userProfile = getInventoryScopeProfile(session);
  const locale = await getLocale();
  const overviewCopy = OVERVIEW_COPY[locale];
  const { servers, domains } = await getDashboardData(userProfile);
  const issueDomains = getIssueDomains(domains);
  const recentDomains = getRecentDomains(domains);
  const overviewMetrics = getOverviewMetrics(domains, servers);
  const domainCountByServerId = getDomainCountByServerId(domains);
  const statusChart = STATUS_ORDER.map((status) => ({
    color:
      status === "ACTIVE"
        ? "var(--success-text)"
        : status === "PENDING"
          ? "var(--warn)"
          : status === "ISSUE"
            ? "var(--danger)"
            : "var(--muted)",
    label: getStatusLabel(locale, status),
    rawLabel: status,
    toneClassName: STATUS_TONE[status],
    value: domains.filter((domain) => domain.status === status).length,
  }));
  const readinessChart = [
    {
      label: "S3",
      ready: domains.filter((domain) => domain.s3Status === "READY").length,
      total: domains.length,
    },
    {
      label: "Postman",
      ready: domains.filter((domain) => domain.postmanStatus === "READY").length,
      total: domains.length,
    },
    {
      label: "Uptime",
      ready: domains.filter((domain) => domain.uptimeStatus === "READY").length,
      total: domains.length,
    },
  ];
  const serverLoad = servers
    .map((server) => ({
      label: server.name,
      value: domainCountByServerId.get(server.id) ?? 0,
    }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 5);
  const totalIssues = issueDomains.length;

  return (
    <PageContainer>
      <IntroBar>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <MetaPill>
              <Sparkles className="h-3.5 w-3.5" />
              {overviewCopy.introLabel}
            </MetaPill>
            <MetaPill>
              <Globe className="h-3.5 w-3.5" />
              {domains.length} {overviewCopy.domainUnit}
            </MetaPill>
            <MetaPill>
              <Server className="h-3.5 w-3.5" />
              {servers.length} {overviewCopy.serverUnit}
            </MetaPill>
          </div>
          <p className="max-w-[72ch] text-sm leading-6 text-[var(--muted)]">
            {overviewCopy.introDescription}
          </p>
        </div>

      </IntroBar>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <SurfaceCard className="overflow-hidden">
          <SectionHeading
            description={overviewCopy.operationalPostureDescription}
            icon={<Radar className="h-3.5 w-3.5" />}
            title={overviewCopy.operationalPosture}
          />
          <div className="grid gap-4 p-4 sm:p-5 md:p-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {OVERVIEW_METRIC_DEFS.map((item) => (
                  <MetricCard
                    key={item.key}
                    label={overviewCopy.metrics[item.key]}
                    meta={
                      item.key === "missingMonitoring"
                        ? overviewCopy.coverage
                        : item.key === "pendingSetup"
                          ? overviewCopy.backlog
                          : item.key === "servers"
                            ? overviewCopy.infrastructure
                            : overviewCopy.inventory
                    }
                    toneClassName={
                      item.key === "missingMonitoring"
                        ? "bg-[var(--warn-bg)] text-[var(--warn-text)] border-[var(--warn-border)]"
                        : item.key === "pendingSetup"
                          ? "bg-[var(--danger-bg)] text-[var(--danger-text)] border-[var(--danger-border)]"
                          : "bg-[var(--surface)] text-[var(--muted)] border-[var(--line)]"
                    }
                    value={overviewMetrics[item.key]}
                  />
                ))}
              </div>

              <div className="ui-subpanel rounded-[18px] border border-[var(--line)] bg-[var(--surface-soft)] p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-[var(--text)]">
                      {overviewCopy.serviceReadiness}
                    </div>
                    <p className="text-sm text-[var(--muted)]">
                      {overviewCopy.serviceReadinessDescription}
                    </p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-[var(--accent-deep)]" />
                </div>
                <ReadinessChart
                  items={readinessChart}
                  readySuffix={overviewCopy.readySuffix}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="ui-subpanel rounded-[18px] border border-[var(--line)] bg-[var(--surface-soft)] p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-[var(--text)]">
                      {overviewCopy.statusMix}
                    </div>
                    <p className="text-sm text-[var(--muted)]">
                      {overviewCopy.statusMixDescription}
                    </p>
                  </div>
                  <Activity className="h-5 w-5 text-[var(--accent-deep)]" />
                </div>
                <DonutChart
                  items={statusChart}
                  total={domains.length}
                  totalLabel={overviewCopy.totalLabel}
                />
              </div>

              <div className="ui-subpanel rounded-[18px] border border-[var(--line)] bg-[var(--surface-soft)] p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-[var(--text)]">
                      {overviewCopy.serverLoad}
                    </div>
                    <p className="text-sm text-[var(--muted)]">
                      {overviewCopy.serverLoadDescription}
                    </p>
                  </div>
                  <Server className="h-5 w-5 text-[var(--accent-deep)]" />
                </div>
                <ColumnChart items={serverLoad} />
              </div>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard className="overflow-hidden">
          <SectionHeading
            description={overviewCopy.priorityDescription}
            icon={<AlertTriangle className="h-3.5 w-3.5" />}
            title={overviewCopy.priorityQueue}
          />
          <div className="grid gap-3 p-4 sm:p-5 md:p-6">
            <div className="ui-subpanel rounded-[18px] border border-[var(--line)] bg-[var(--surface-soft)] p-4">
              <div className="text-[2.25rem] font-semibold leading-none text-[var(--text)]">
                {totalIssues}
              </div>
              <div className="mt-2 text-sm text-[var(--muted)]">
                      {overviewCopy.issueDomainsCount}
              </div>
            </div>
            {issueDomains.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-[var(--line)] bg-[var(--surface-soft)] px-4 py-8 text-sm text-[var(--muted)]">
                {overviewCopy.noIssues}
              </div>
            ) : (
              issueDomains.map((domain) => (
                <Link
                  className="ui-subpanel ui-hover-rise flex flex-col gap-3 rounded-[18px] border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-4 hover:bg-[var(--surface-hover)] sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                  href="/domains?status=ISSUE"
                  key={domain.id}
                >
                  <div>
                    <strong className="text-base font-semibold text-[var(--text)]">
                      {domain.name}
                    </strong>
                    <p className="mt-1 text-sm text-[var(--muted)]">{domain.server.name}</p>
                  </div>
                  <div className="inline-flex items-center gap-2 self-start sm:self-auto">
                    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-1 text-sm font-semibold text-[var(--danger-text)]">
                      {getStatusLabel(locale, domain.status)}
                    </span>
                    <ArrowRight className="h-4 w-4 text-[var(--muted)]" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </SurfaceCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <SurfaceCard className="overflow-hidden">
          <SectionHeading
            description={overviewCopy.latestInventoryDescription}
            icon={<Globe className="h-3.5 w-3.5" />}
            title={overviewCopy.recentDomains}
          />
          <div className="grid gap-3 p-4 sm:p-5 md:p-6">
            {recentDomains.map((domain) => (
              <Link
                className="ui-subpanel ui-hover-rise flex flex-col gap-3 rounded-[18px] border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-4 hover:bg-[var(--surface-hover)] sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                href="/domains"
                key={domain.id}
              >
                <div>
                  <strong className="text-base font-semibold text-[var(--text)]">
                    {domain.name}
                  </strong>
                  <p className="mt-1 text-sm text-[var(--muted)]">{domain.server.name}</p>
                </div>
                <div className="inline-flex items-center gap-2 self-start sm:self-auto">
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${
                      STATUS_TONE[domain.status as keyof typeof STATUS_TONE] ??
                      "bg-[var(--neutral-badge)] text-[var(--text)] border-[var(--line)]"
                    }`}
                  >
                    {getStatusLabel(locale, domain.status)}
                  </span>
                  <ArrowRight className="h-4 w-4 text-[var(--muted)]" />
                </div>
              </Link>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard className="overflow-hidden">
          <SectionHeading
            action={
              <Link className="text-sm font-medium text-[var(--accent-deep)]" href="/servers">
                {overviewCopy.openFullInventory}
              </Link>
            }
            description={overviewCopy.serverSnapshotDescription}
            icon={<Server className="h-3.5 w-3.5" />}
            title={overviewCopy.serverSnapshot}
          />
          <div className="grid gap-3 p-4 sm:p-5 md:hidden">
            {servers.slice(0, 6).map((server) => (
              <ServerSnapshotCard
                domainCount={domainCountByServerId.get(server.id) ?? 0}
                key={server.id}
                locale={locale}
                server={server}
              />
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-[880px] w-full border-collapse">
              <thead className="bg-[var(--table-head)]">
                <tr className="border-b border-[var(--line)] text-left text-[0.72rem] uppercase tracking-[0.14em] text-[var(--muted)]">
                  {OVERVIEW_SNAPSHOT_COLUMNS.map((column) => (
                    <th
                      className={`${column.width} px-4 py-3 font-medium md:px-5`}
                      key={column.key}
                    >
                      {overviewCopy.snapshotColumns[
                        column.key as keyof typeof overviewCopy.snapshotColumns
                      ]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {servers.slice(0, 6).map((server) => (
                  <ServerSnapshotRow
                    domainCount={domainCountByServerId.get(server.id) ?? 0}
                    key={server.id}
                    locale={locale}
                    server={server}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </SurfaceCard>
      </section>
    </PageContainer>
  );
}
