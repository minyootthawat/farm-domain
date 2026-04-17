"use client";

import { Globe, LayoutDashboard, Menu, Server, Shield, User, X } from "lucide-react";
import type { Session } from "next-auth";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { HeaderDropdown } from "@/components/header-dropdown";
import type { Locale } from "@/lib/i18n";
import { normalizeUserRole } from "@/lib/rbac";
import type { Theme } from "@/lib/theme";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { getCopy } from "@/lib/ui-copy";

const PUBLIC_PATHS = ["/auth/signin"];

export function AppNav({
  authEnabled,
  locale,
  session,
  theme,
}: {
  authEnabled: boolean;
  locale: Locale;
  session: Session | null;
  theme: Theme;
}) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const copy = getCopy(locale);
  const userName = session?.user?.name ?? session?.user?.email ?? null;
  const userRole = normalizeUserRole(session?.user?.role);
  const userRoleLabel = copy.nav.roles[userRole];
  const userProfile = session?.user?.profileName ?? copy.common.none;
  const userInitials = userName ? userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "";

  if (PUBLIC_PATHS.includes(pathname)) {
    return null;
  }
  const navItems = [
    { href: "/", label: copy.nav.overview, icon: LayoutDashboard },
    { href: "/servers", label: copy.nav.servers, icon: Server },
    { href: "/domains", label: copy.nav.domains, icon: Globe },
    ...(authEnabled && (userRole === "admin" || pathname.startsWith("/users"))
      ? [{ href: "/users", label: copy.nav.users, icon: Shield }]
      : []),
  ];
  const isActivePath = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  const activeItem =
    navItems.find((item) => isActivePath(item.href)) ?? navItems[0];
  const ActiveIcon = activeItem.icon;

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--table-head)]/92 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1440px] min-w-0 flex-col gap-3 px-4 py-3 sm:px-5 lg:px-6">
        <div className="flex min-w-0 items-center justify-between gap-3 md:flex-row md:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <div className="ui-enter flex min-w-0 items-center gap-3">
              <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] text-[var(--accent-deep)] shadow-[var(--shadow-soft)]">
                <ActiveIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[0.66rem] font-medium uppercase tracking-[0.22em] text-[var(--accent-deep)]">
                  {copy.nav.appName}
                </p>
                <div className="truncate font-[var(--font-geist-mono)] text-base font-semibold text-[var(--text)]">
                  {activeItem.label}
                </div>
              </div>
            </div>

            <nav className="-mx-1 ui-enter ui-enter-delay-2 hidden min-w-0 items-center gap-2 overflow-visible px-1 md:flex">
              {navItems.map((item) => {
                const isActive = isActivePath(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    aria-current={isActive ? "page" : undefined}
                    className={`ui-hover-rise inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl border px-4 text-sm font-medium ${
                      isActive
                        ? "border-transparent [background:var(--surface-active)] text-[var(--on-accent)] shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
                        : "bg-[var(--surface-soft)] text-[var(--text)] shadow-[var(--shadow-soft)] border-[var(--line)] hover:border-[var(--accent)]/20 hover:bg-[var(--surface-control)]"
                    }`}
                    href={item.href}
                    key={item.href}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <button
            aria-expanded={isMobileMenuOpen}
            aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            className="ui-hover-rise inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] text-[var(--text)] shadow-[var(--shadow-soft)] md:hidden"
            onClick={() => setIsMobileMenuOpen((value) => !value)}
            type="button"
          >
            {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>

          <div className="ui-enter ui-enter-delay-1 hidden flex-wrap items-center gap-2 md:flex">
            <ThemeSwitcher
              labels={{
                dark: copy.nav.dark,
                light: copy.nav.light,
                theme: copy.nav.theme,
              }}
              theme={theme}
            />
            <LanguageSwitcher
              labels={{
                english: copy.nav.english,
                language: copy.nav.language,
                thai: copy.nav.thai,
              }}
              locale={locale}
            />
            {session?.user && authEnabled ? (
              <HeaderDropdown
                ariaLabel="User menu"
                icon={<User className="h-4 w-4" />}
                options={[
                  {
                    label: `${userName ?? "User"} • ${userRoleLabel} • ${userProfile}`,
                    onSelect: () => {},
                  },
                  {
                    label: "Sign out",
                    onSelect: () => signOut({ callbackUrl: "/auth/signin" }),
                  },
                ]}
                triggerLabel={userInitials}
              />
            ) : null}
          </div>
        </div>

        <div
          className={`overflow-visible transition-[max-height,opacity,transform] duration-300 ease-out md:hidden ${
            isMobileMenuOpen
              ? "max-h-[320px] opacity-100 translate-y-0"
              : "max-h-0 opacity-0 -translate-y-2"
          }`}
        >
          <div className="ui-panel rounded-[24px] border border-[var(--line)] bg-[var(--surface)] p-2 shadow-[var(--shadow)]">
            <div className="mb-2 flex items-center justify-between gap-2 border-b border-[var(--line)] px-2 pb-3">
              <p className="text-[0.68rem] font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
                {copy.nav.appName}
              </p>
              <div className="flex items-center gap-2">
                <ThemeSwitcher
                  labels={{
                    dark: copy.nav.dark,
                    light: copy.nav.light,
                    theme: copy.nav.theme,
                  }}
                  theme={theme}
                />
                <LanguageSwitcher
                  labels={{
                    english: copy.nav.english,
                    language: copy.nav.language,
                    thai: copy.nav.thai,
                  }}
                  locale={locale}
                />
              </div>
            </div>

            <nav className="grid gap-2">
              {navItems.map((item) => {
                const isActive = isActivePath(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    aria-current={isActive ? "page" : undefined}
                    className={`ui-hover-rise inline-flex h-12 items-center gap-3 rounded-2xl border px-4 text-sm font-medium ${
                      isActive
                        ? "border-transparent [background:var(--surface-active)] text-[var(--on-accent)] shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
                        : "border-[var(--line)] bg-[var(--surface-soft)] text-[var(--text)] shadow-[var(--shadow-soft)] hover:border-[var(--accent)]/20 hover:bg-[var(--surface-control)]"
                    }`}
                    href={item.href}
                    key={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
