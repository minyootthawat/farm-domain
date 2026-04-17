import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n";

export async function getLocale() {
  const cookieStore = await cookies();
  const rawLocale = cookieStore.get("farm-domain.locale")?.value;

  return rawLocale && isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
}
