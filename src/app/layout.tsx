import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { auth } from "@/auth";
import { SessionProvider } from "@/components/session-provider";
import { AppNav } from "@/components/app-nav";
import { ToastProvider } from "@/components/toast-provider";
import { ThemeSync } from "@/components/theme-sync";
import { isAuthEnabled } from "@/lib/auth-config";
import { getLocale } from "@/lib/i18n-server";
import { getTheme } from "@/lib/theme-server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Farm Domain Manager",
  description: "MVP สำหรับจัดการข้อมูลโดเมนและเซิร์ฟเวอร์ภายในองค์กร",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const authEnabled = isAuthEnabled();
  const locale = await getLocale();
  const session = await auth();
  const theme = await getTheme();

  return (
    <html
      className={`${geistSans.variable} ${geistMono.variable}`}
      data-theme={theme}
      lang={locale}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        <SessionProvider authEnabled={authEnabled} session={session}>
          <ToastProvider>
            <ThemeSync theme={theme} />
            <div className="min-h-screen">
              <AppNav authEnabled={authEnabled} locale={locale} session={session} theme={theme} />
              <div className="min-w-0">{children}</div>
            </div>
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
