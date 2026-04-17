import type { ReactNode } from "react";
import Link from "next/link";

export function PageContainer({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main
      className={`mx-auto flex w-full max-w-[1440px] min-w-0 flex-col gap-4 px-4 py-3 sm:px-5 sm:py-5 lg:px-6 lg:py-6 ${className}`}
    >
      {children}
    </main>
  );
}

export function SurfaceCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`ui-panel ui-enter rounded-[20px] border border-[var(--line)] bg-[var(--surface)] ${className}`}
    >
      {children}
    </section>
  );
}

export function IntroBar({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`ui-panel ui-enter ui-enter-delay-1 flex flex-col gap-4 rounded-[20px] border border-[var(--line)] bg-[var(--surface-hero)] px-4 py-4 backdrop-blur sm:px-5 md:flex-row md:items-center md:justify-between md:px-6 ${className}`}
    >
      {children}
    </section>
  );
}

export function MetaPill({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] ${className}`}
    >
      {children}
    </span>
  );
}

export function SubtleActionLink({
  children,
  className = "",
  href,
}: {
  children: ReactNode;
  className?: string;
  href: string;
}) {
  return (
    <Link
      className={`ui-hover-rise ui-subpanel inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-control)] px-4 text-sm font-medium text-[var(--text)] hover:border-[var(--accent)]/30 hover:bg-[var(--surface-control-hover)] ${className}`}
      href={href}
    >
      {children}
    </Link>
  );
}
