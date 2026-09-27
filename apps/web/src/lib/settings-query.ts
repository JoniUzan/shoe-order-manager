import { prisma } from "@repo/db";
import type { LocaleCode, ThemeCode } from "@repo/domain";

export const SETTINGS_SECTIONS = ["general", "account", "business"] as const;

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

/**
 * `/settings` → `null` (the section menu on a phone, General on a computer);
 * `/settings/<section>` → that section; anything else → `undefined` (404).
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
