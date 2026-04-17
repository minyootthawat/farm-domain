"use client";

import { useEffect } from "react";
import type { Theme } from "@/lib/theme";

export function ThemeSync({ theme }: { theme: Theme }) {
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return null;
}
