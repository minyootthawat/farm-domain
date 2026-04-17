import { Shield, User, UserCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CreateUserDialog, EditUserDialog } from "@/components/crud-dialogs";
import {
  IntroBar,
  MetaPill,
  PageContainer,
  SurfaceCard,
} from "@/components/dashboard-shell";
import { isAuthEnabled } from "@/lib/auth-config";
import { getLocale } from "@/lib/i18n-server";
import { canManageUsers } from "@/lib/rbac";
import { listUsers } from "@/lib/store";
import { getCopy, USERS_COPY } from "@/lib/ui-copy";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  if (!isAuthEnabled()) {
    redirect("/");
  }

  const session = await auth();

  if (!canManageUsers(session)) {
    redirect("/");
  }

  const locale = await getLocale();
  const copy = getCopy(locale);
  const usersCopy = USERS_COPY[locale];
  const users = await listUsers();
  const activeUsers = users.filter((user) => user.isActive).length;
  const adminUsers = users.filter((user) => user.role === "admin" && user.isActive).length;

  return (
    <PageContainer>
      <IntroBar>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <MetaPill>
              <User className="h-3.5 w-3.5" />
              {users.length} {usersCopy.userUnit}
            </MetaPill>
            <MetaPill>
              <UserCheck className="h-3.5 w-3.5" />
              {activeUsers} {usersCopy.activeUsers}
            </MetaPill>
            <MetaPill>
              <Shield className="h-3.5 w-3.5" />
              {adminUsers} {usersCopy.adminUsers}
            </MetaPill>
          </div>
          <p className="max-w-[72ch] text-sm leading-6 text-[var(--muted)]">
            {usersCopy.introDescription}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CreateUserDialog locale={locale} />
        </div>
      </IntroBar>

      <SurfaceCard className="overflow-hidden">
        <div className="hidden overflow-x-auto lg:block">
          <table className="min-w-[920px] w-full border-collapse">
            <thead className="bg-[var(--table-head)]">
              <tr className="border-b border-[var(--line)] text-left text-[0.72rem] uppercase tracking-[0.14em] text-[var(--muted)]">
                <th className="px-4 py-3 font-medium md:px-5">{usersCopy.tableColumns.user}</th>
                <th className="px-4 py-3 font-medium md:px-5">{usersCopy.tableColumns.role}</th>
                <th className="px-4 py-3 font-medium md:px-5">{usersCopy.tableColumns.profile}</th>
                <th className="px-4 py-3 font-medium md:px-5">{usersCopy.tableColumns.status}</th>
                <th className="px-4 py-3 font-medium md:px-5">{usersCopy.tableColumns.updatedAt}</th>
                <th className="px-4 py-3 font-medium md:px-5">{usersCopy.tableColumns.action}</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td className="px-4 py-12 text-center text-sm text-[var(--muted)] md:px-5" colSpan={6}>
                    {usersCopy.emptyState}
                  </td>
                </tr>
              ) : null}
              {users.map((user) => (
                <tr className="border-b border-[var(--line)] align-top" key={user.id}>
                  <td className="px-4 py-4 md:px-5">
                    <div className="font-medium text-[var(--text)]">{user.name}</div>
                    <div className="text-sm text-[var(--muted)]">@{user.username}</div>
                    <div className="text-sm text-[var(--muted)]">{user.email}</div>
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--text)] md:px-5">
                    {copy.nav.roles[user.role]}
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--text)] md:px-5">
                    {user.profileName ?? copy.common.none}
                  </td>
                  <td className="px-4 py-4 text-sm md:px-5">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${user.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>
                      {user.isActive ? usersCopy.statusActive : usersCopy.statusInactive}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--muted)] md:px-5">
                    {new Date(user.updatedAt).toLocaleString(locale === "th" ? "th-TH" : "en-US")}
                  </td>
                  <td className="px-4 py-4 md:px-5">
                    <EditUserDialog locale={locale} user={user} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 px-3 py-3 lg:hidden">
          {users.length === 0 ? (
            <div className="px-2 py-12 text-center text-sm text-[var(--muted)]">
              {usersCopy.emptyState}
            </div>
          ) : null}
          {users.map((user) => (
            <div className="rounded-[24px] border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)]" key={user.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-semibold text-[var(--text)]">{user.name}</div>
                  <div className="text-sm text-[var(--muted)]">@{user.username}</div>
                  <div className="text-sm text-[var(--muted)]">{user.email}</div>
                </div>
                <EditUserDialog locale={locale} user={user} />
              </div>
              <div className="mt-4 grid gap-3 rounded-[20px] border border-[var(--line)] bg-[var(--surface-soft)] p-4 text-sm">
                <div>
                  <div className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">{usersCopy.tableColumns.role}</div>
                  <div className="mt-1 text-[var(--text)]">{copy.nav.roles[user.role]}</div>
                </div>
                <div>
                  <div className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">{usersCopy.tableColumns.profile}</div>
                  <div className="mt-1 text-[var(--text)]">{user.profileName ?? copy.common.none}</div>
                </div>
                <div>
                  <div className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">{usersCopy.tableColumns.status}</div>
                  <div className="mt-1 text-[var(--text)]">{user.isActive ? usersCopy.statusActive : usersCopy.statusInactive}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SurfaceCard>
    </PageContainer>
  );
}
