"use client";

import { Dialog, DialogContent, DialogTitle } from "@repo/ui/components/dialog";
import { Drawer, DrawerContent, DrawerTitle } from "@repo/ui/components/drawer";
import { useTranslations } from "next-intl";
import { useState } from "react";

import type { SettingsData } from "@/lib/settings-query";

import { closeSettings, parseSettingsHash, useLocationHash } from "./settings-hash";
import { SettingsShell } from "./settings-shell";
import { useIsPhone } from "./use-is-phone";

/**
 * The settings dialog, mounted once in the app layout and opened by the URL
 * hash (`#settings/account`) over whatever page is showing: a near-full-screen
 * dialog on a computer, a drawer that rises almost to the top on a phone.
 * Because it never navigates, the page underneath (its header, its sidebar
 * highlight, its scroll) stays exactly as it was.
 */
export function SettingsHost({ data }: { data: SettingsData }) {
  const t = useTranslations("settings");
  const hash = parseSettingsHash(useLocationHash());
  const phone = useIsPhone();

  // While it animates closed the hash is already gone; keep showing the
  // section it was on rather than snapping to the default.
  const [shown, setShown] = useState(hash.open ? hash.section : null);
  if (hash.open && hash.section !== shown) setShown(hash.section);
  const section = hash.open ? hash.section : shown;

  const onOpenChange = (open: boolean) => {
    if (!open) closeSettings();
  };

  if (phone) {
    return (
      <Drawer open={hash.open} onOpenChange={onOpenChange}>
        <DrawerContent
          aria-describedby={undefined}
          className="mt-0 h-[calc(100dvh-1.75rem)] max-h-none rounded-t-[20px] bg-accent data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-none data-[vaul-drawer-direction=bottom]:rounded-t-[20px] dark:bg-background"
        >
          <DrawerTitle className="sr-only">{t("title")}</DrawerTitle>
          <SettingsShell section={section} data={data} phone onClose={closeSettings} />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={hash.open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        // Focus the dialog itself rather than its first control, so opening
        // it doesn't ring the close button (Tab still starts from here).
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement).focus();
        }}
        className="inset-10 flex w-auto max-w-none translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-none"
      >
        <DialogTitle className="sr-only">{t("title")}</DialogTitle>
        <SettingsShell section={section} data={data} phone={false} onClose={closeSettings} />
      </DialogContent>
    </Dialog>
  );
}
