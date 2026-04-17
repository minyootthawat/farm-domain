import type { ReactNode } from "react";

export function TableToolbar({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="border-b border-[var(--line)] px-4 py-4 sm:px-5 md:px-6">
      {children}
    </div>
  );
}

export function SearchField({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <label className="flex h-11 min-w-0 items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-control)] px-3 transition hover:border-[var(--accent)]/30 hover:bg-[var(--surface-control-hover)]">
      {children}
    </label>
  );
}
