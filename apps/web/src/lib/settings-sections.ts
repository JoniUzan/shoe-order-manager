/** The settings dialog's sections — shared by the client (hash) and the server. */
export const SETTINGS_SECTIONS = ["general", "account", "business"] as const;

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];
