import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  MinusCircle,
} from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { getServiceStatusLabel, getStatusLabel } from "@/lib/display-labels";

function getStatusTone(value: string) {
  if (value === "ACTIVE" || value === "READY") {
    return "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-text)]";
  }

  if (value === "PENDING") {
    return "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-text)]";
  }

  if (value === "ISSUE" || value === "MISSING") {
    return "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)]";
  }

  return "border-[var(--line)] bg-[var(--surface-control)] text-[var(--text)]";
}

function getStatusIcon(value: string) {
  switch (value) {
    case "ACTIVE":
    case "READY":
      return <CheckCircle2 className="h-3.5 w-3.5" />;
    case "ISSUE":
    case "MISSING":
      return <AlertTriangle className="h-3.5 w-3.5" />;
    case "PENDING":
      return <Clock3 className="h-3.5 w-3.5" />;
    default:
      return <MinusCircle className="h-3.5 w-3.5" />;
  }
}

export function StatusBadge({
  className = "",
  locale,
  showIcon = true,
  value,
}: {
  className?: string;
  locale: Locale;
  showIcon?: boolean;
  value: string;
}) {
  const label =
    value === "READY" || value === "MISSING" || value === "NA"
      ? getServiceStatusLabel(locale, value)
      : getStatusLabel(locale, value);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusTone(value)} ${className}`}
    >
      {showIcon ? getStatusIcon(value) : null}
      {label}
    </span>
  );
}
