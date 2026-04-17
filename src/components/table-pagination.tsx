import Link from "next/link";
import type { ReactNode } from "react";

const actionButtonClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-control)] px-4 text-sm font-medium text-[var(--text)] transition hover:border-[var(--accent)]/30 hover:bg-[var(--surface-control-hover)]";
const inputClass =
  "h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--surface-control)] px-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--line)]";

export function TableSummaryBar({
  children,
  summary,
}: {
  children?: ReactNode;
  summary: string;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-[var(--line)] px-4 py-3 text-sm text-[var(--muted)] md:flex-row md:items-center md:justify-between md:px-6">
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      <p>{summary}</p>
    </div>
  );
}

export function TablePagination({
  currentPage,
  hiddenFields,
  inputId = "page",
  jumpLabel,
  jumpSubmitLabel,
  nextHref,
  nextLabel,
  pageHref,
  prevHref,
  prevLabel,
  totalPages,
  visiblePages,
}: {
  currentPage: number;
  hiddenFields: Array<{ name: string; value: string }>;
  inputId?: string;
  jumpLabel: string;
  jumpSubmitLabel: string;
  nextHref: string;
  nextLabel: string;
  pageHref: (page: number) => string;
  prevHref: string;
  prevLabel: string;
  totalPages: number;
  visiblePages: number[];
}) {
  return (
    <div className="flex flex-col gap-4 border-t border-[var(--line)] px-4 py-4 sm:px-5 md:px-6 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex flex-wrap items-center gap-2 max-sm:justify-between">
        <Link
          aria-disabled={currentPage === 1}
          className={`${actionButtonClass} min-w-[86px] ${currentPage === 1 ? "pointer-events-none opacity-45" : ""}`}
          href={prevHref}
        >
          {prevLabel}
        </Link>
        <div className="flex flex-1 flex-wrap items-center gap-2 max-sm:justify-center">
          {visiblePages.map((page, index) => {
            const previousPage = visiblePages[index - 1];
            const shouldShowGap =
              previousPage !== undefined && page - previousPage > 1;

            return (
              <div className="flex items-center gap-2" key={page}>
                {shouldShowGap ? (
                  <span className="px-1 text-sm text-[var(--muted)]">...</span>
                ) : null}
                <Link
                  aria-current={currentPage === page ? "page" : undefined}
                  className={`inline-flex h-11 min-w-[44px] items-center justify-center rounded-xl border px-4 text-sm font-medium transition ${
                    currentPage === page
                      ? "border-transparent [background:var(--surface-active)] text-[var(--on-accent)]"
                      : "border-[var(--line)] bg-[var(--surface-control)] text-[var(--text)] hover:bg-[var(--surface-control-hover)]"
                  }`}
                  href={pageHref(page)}
                >
                  {page}
                </Link>
              </div>
            );
          })}
        </div>
        <Link
          aria-disabled={currentPage === totalPages}
          className={`${actionButtonClass} min-w-[86px] ${currentPage === totalPages ? "pointer-events-none opacity-45" : ""}`}
          href={nextHref}
        >
          {nextLabel}
        </Link>
      </div>

      <form
        className="flex flex-col gap-2 rounded-[18px] border border-[var(--line)] bg-[var(--surface-soft)] p-3 sm:ml-auto sm:min-w-[260px] sm:flex-row sm:items-center sm:justify-end sm:gap-3"
        method="get"
      >
        {hiddenFields.map((field) => (
          <input key={field.name} name={field.name} type="hidden" value={field.value} />
        ))}
        <label
          className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted)]"
          htmlFor={inputId}
        >
          {jumpLabel}
        </label>
        <div className="flex items-center gap-2 max-sm:w-full">
          <input
            className={`${inputClass} w-[88px] text-center max-sm:flex-1 sm:w-[96px]`}
            defaultValue={String(currentPage)}
            id={inputId}
            max={totalPages}
            min={1}
            name="page"
            type="number"
          />
          <button className={`${actionButtonClass} min-w-[72px] max-sm:flex-1`} type="submit">
            {jumpSubmitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
