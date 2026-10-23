import { DirectionProvider } from "@repo/ui/components/direction-provider";
import { Toaster } from "@repo/ui/components/sonner";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { Rubik } from "next/font/google";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ThemeProvider } from "@/components/theme-provider";
import { routing } from "@/i18n/routing";
import "../globals.css";

const rubik = Rubik({
  subsets: ["latin", "hebrew"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Shoe Orders",
  description: "Order management for a wholesale shoe business",
  icons: { icon: "/favicon.ico" },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  const dir = locale === "he" ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${rubik.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-background text-foreground">
        <NextIntlClientProvider>
          {/* Radix reads direction from its own context and defaults to ltr —
              it does not inherit <html dir>. Without this, primitives rendered
              in a portal (popovers, command lists, selects) lay out LTR inside
              an RTL page: the scrollbar lands on the wrong edge and arrow keys
              run backwards. */}
          <DirectionProvider dir={dir}>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
              <Toaster
                position={dir === "rtl" ? "bottom-left" : "bottom-right"}
                // Over the phone's tab bar and quick-action button, not on them.
                mobileOffset={{ bottom: "10.75rem" }}
              />
            </ThemeProvider>
          </DirectionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
