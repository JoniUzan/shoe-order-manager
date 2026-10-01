import type { ReactNode } from "react";

import { ThemeSync } from "@/components/settings/theme-sync";
import { requireUser } from "@/lib/session";

/**
 * Full-screen forms in steps (`StepFlow`): behind login like `(app)`, but
 * without the sidebar, so the form has the whole screen and leaves by its
 * own "Cancel".
 */
export default async function FlowLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireUser(locale);

  return (
    <>
      {children}
      <ThemeSync theme={user.theme} />
    </>
  );
}
