import type { LocaleCode, ThemeCode } from "@repo/domain";

import { avatarOf } from "@/components/ui/orb";

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

type SettingsUser = {
  name: string | null;
  email: string;
  image: string | null;
  locale: string;
  theme: string;
  businessName: string | null;
  businessPhone: string | null;
  businessAddress: string | null;
  businessTaxId: string | null;
};

/** What the settings dialog shows, from the user `requireUser` returned. */
export function toSettingsData(user: SettingsUser) {
  return {
    name: user.name ?? "",
    email: user.email,
    avatar: avatarOf(user),
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

export type SettingsData = ReturnType<typeof toSettingsData>;
