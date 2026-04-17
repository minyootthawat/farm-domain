"use client";

import type { ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type HeaderDropdownOption = {
  label: string;
  onSelect: () => void;
  selected?: boolean;
};

export function HeaderDropdown({
  ariaLabel,
  icon,
  options,
  triggerLabel,
}: {
  ariaLabel: string;
  icon: ReactNode;
  options: HeaderDropdownOption[];
  triggerLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div className="relative" ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={ariaLabel}
        className="ui-hover-rise inline-flex h-11 items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 text-sm font-medium text-[var(--text)] shadow-[var(--shadow-soft)] transition hover:border-[var(--accent)]/30 hover:bg-[var(--surface-control-hover)]"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span className="inline-flex h-4 w-4 items-center justify-center text-[var(--muted)]">
          {icon}
        </span>
        <span className="font-[var(--font-geist-mono)] text-[0.78rem] font-semibold uppercase tracking-[0.12em]">
          {triggerLabel}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-[var(--muted)] transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-40 w-max min-w-full overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-1.5 shadow-[var(--shadow)]">
          <div className="grid gap-1">
            {options.map((option) => (
              <button
                className={`inline-flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${
                  option.selected
                    ? "border border-[var(--accent)]/20 bg-[var(--surface-control)] font-semibold text-[var(--text)]"
                    : "text-[var(--text)] hover:bg-[var(--surface-control)]"
                }`}
                key={option.label}
                onClick={() => {
                  option.onSelect();
                  setOpen(false);
                }}
                role="menuitem"
                type="button"
              >
                <span>{option.label}</span>
                {option.selected ? (
                  <Check className="h-4 w-4 text-[var(--accent-deep)]" />
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
