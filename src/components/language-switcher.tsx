"use client";

import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { HeaderDropdown } from "@/components/header-dropdown";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n";

export function LanguageSwitcher({
  labels,
  locale,
}: {
  labels: {
    english: string;
    language: string;
    thai: string;
  };
  locale: Locale;
}) {
  const router = useRouter();
  const nextLocale = locale === "th" ? "en" : "th";
  const currentLabel = locale === "th" ? labels.thai : labels.english;
  const nextLabel = nextLocale === "th" ? labels.thai : labels.english;
  const currentFlag = locale === "th" ? "TH" : "EN";

  function setLocale(nextLocale: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <HeaderDropdown
      ariaLabel={`${labels.language}: ${currentLabel}. Next: ${nextLabel}`}
      icon={<Languages className="h-4 w-4" />}
      options={[
        { label: labels.thai, onSelect: () => setLocale("th"), selected: locale === "th" },
        { label: labels.english, onSelect: () => setLocale("en"), selected: locale === "en" },
      ]}
      triggerLabel={currentFlag}
    />
  );
}
