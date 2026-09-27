import { prisma } from "@repo/db";
import type { LocaleCode, ThemeCode } from "@repo/domain";

import { SETTINGS_SECTIONS, type SettingsSection } from "./settings-sections";

export { SETTINGS_SECTIONS, type SettingsSection };

/**
 * The old `/settings/<section>` address → its section (`null` for bare
 * `/settings`); anything else → `undefined` (404).
 */
export function parseSettingsSection(
  segments: string[] | undefined,
): SettingsSection | null | undefined {
  if (!segments || segments.length === 0) return null;
  if (segments.length > 1) return undefined;
  return (SETTINGS_SECTIONS as readonly string[]).includes(segments[0]!)
    ? (segments[0] as SettingsSection)
    : undefined;
}

/** Everything the settings show, for the signed-in user. */
export async function getSettings(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      locale: true,
      theme: true,
      businessName: true,
      businessPhone: true,
      businessAddress: true,
      businessTaxId: true,
    },
  });
  return {
    name: user.name ?? "",
    email: user.email,
    locale: user.locale as LocaleCode,
    theme: user.theme as ThemeCode,
    business: {
      businessName: user.businessName ?? "",
      businessPhone: user.businessPhone ?? "",
      businessAddress: user.businessAddress ?? "",
      businessTaxId: user.businessTaxId ?? "",
    },
  };
}

export type SettingsData = Awaited<ReturnType<typeof getSettings>>;
