import { prisma } from "@repo/db";
import type { LocaleCode, ThemeCode } from "@repo/domain";

export const SETTINGS_TABS = ["profile", "password", "preferences", "business"] as const;

export type SettingsTab = (typeof SETTINGS_TABS)[number];

export function parseSettingsTab(raw: string | string[] | undefined): SettingsTab {
  return (SETTINGS_TABS as readonly string[]).includes(raw as string)
    ? (raw as SettingsTab)
    : "profile";
}

/** Everything the settings panel shows, for the signed-in user. */
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
    profile: { name: user.name ?? "", email: user.email },
    preferences: {
      locale: user.locale as LocaleCode,
      theme: user.theme as ThemeCode,
    },
    business: {
      businessName: user.businessName ?? "",
      businessPhone: user.businessPhone ?? "",
      businessAddress: user.businessAddress ?? "",
      businessTaxId: user.businessTaxId ?? "",
    },
  };
}

export type SettingsData = Awaited<ReturnType<typeof getSettings>>;
