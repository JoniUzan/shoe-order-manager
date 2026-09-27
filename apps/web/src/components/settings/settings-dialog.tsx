"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@repo/ui/components/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@repo/ui/components/drawer";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import type { SettingsData, SettingsSection } from "@/lib/settings-query";

import { SettingsShell } from "./settings-shell";
import { useIsPhone } from "./use-is-phone";

/**
 * `/settings` opened from inside the app, over the page it was opened from:
 * a near-full-screen dialog on a computer, a drawer that rises almost to the
 * top on a phone. Closing goes back to that page.
 */
export function SettingsDialog({
  section,
  data,
}: {
  section: SettingsSection | null;
  data: SettingsData;
}) {
  const t = useTranslations("settings");
  const router = useRouter();
  const phone = useIsPhone();
  const close = () => router.back();

  if (phone) {
    return (
      <Drawer open onOpenChange={(open) => !open && close()}>
        <DrawerContent
          aria-describedby={undefined}
          className="mt-0 h-[calc(100dvh-1.75rem)] max-h-none rounded-t-[20px] bg-accent data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-none data-[vaul-drawer-direction=bottom]:rounded-t-[20px] dark:bg-background"
        >
          <DrawerTitle className="sr-only">{t("title")}</DrawerTitle>
          <SettingsShell section={section} data={data} phone onClose={close} />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        // Focus the dialog itself rather than its first control, so opening
        // it doesn't ring the close button (Tab still starts from here).
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement).focus();
        }}
        className="top-10 right-10 bottom-10 left-10 flex w-auto max-w-none translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-none"
      >
        <DialogTitle className="sr-only">{t("title")}</DialogTitle>
        <SettingsShell section={section} data={data} phone={false} onClose={close} />
      </DialogContent>
    </Dialog>
  );
}
