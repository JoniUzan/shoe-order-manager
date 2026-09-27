import { prisma } from "@repo/db";

export const SETTINGS_TABS = ["profile"] as const;

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
    select: { name: true, email: true },
  });
  return {
    profile: { name: user.name ?? "", email: user.email },
  };
}

export type SettingsData = Awaited<ReturnType<typeof getSettings>>;
