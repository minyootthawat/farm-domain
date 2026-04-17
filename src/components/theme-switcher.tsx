"use client";

import { MoonStar, SunMedium } from "lucide-react";
import { useRouter } from "next/navigation";
import { HeaderDropdown } from "@/components/header-dropdown";
import { THEME_COOKIE, type Theme } from "@/lib/theme";

export function ThemeSwitcher({
  labels,
  theme,
}: {
  labels: {
    dark: string;
    light: string;
    theme: string;
  };
  theme: Theme;
}) {
  const router = useRouter();

  function setTheme(nextTheme: Theme) {
    document.cookie = `${THEME_COOKIE}=${nextTheme}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.dataset.theme = nextTheme;
    router.refresh();
  }

  return (
    <HeaderDropdown
      ariaLabel={labels.theme}
      icon={theme === "dark" ? <MoonStar className="h-4 w-4" /> : <SunMedium className="h-4 w-4" />}
      options={[
        { label: labels.light, onSelect: () => setTheme("light"), selected: theme === "light" },
        { label: labels.dark, onSelect: () => setTheme("dark"), selected: theme === "dark" },
      ]}
      triggerLabel={theme === "dark" ? labels.dark : labels.light}
    />
  );
}
