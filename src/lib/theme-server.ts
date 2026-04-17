import { cookies } from "next/headers";
import { DEFAULT_THEME, isTheme, THEME_COOKIE } from "@/lib/theme";

export async function getTheme() {
  const cookieStore = await cookies();
  const rawTheme = cookieStore.get(THEME_COOKIE)?.value;

  return rawTheme && isTheme(rawTheme) ? rawTheme : DEFAULT_THEME;
}
