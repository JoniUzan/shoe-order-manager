"use client";

import type { SettingsData, SettingsSection } from "@/lib/settings-query";

import { SettingsShell } from "./settings-shell";
import { useIsPhone } from "./use-is-phone";

/** `/settings` loaded directly (a reload, a shared link): in the page itself. */
export function SettingsPage({
  section,
  data,
}: {
  section: SettingsSection | null;
  data: SettingsData;
}) {
  const phone = useIsPhone();

  if (phone) {
    return (
      <div className="-mx-4 -mt-4 flex flex-col">
        <SettingsShell section={section} data={data} phone />
      </div>
    );
  }
  return (
    <div className="flex h-[calc(100dvh-9rem)] min-h-[560px] overflow-hidden rounded-2xl border">
      <SettingsShell section={section} data={data} phone={false} />
    </div>
  );
}
