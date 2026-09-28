"use client";

import type { LocaleCode, ThemeCode } from "@repo/domain";
import { Button } from "@repo/ui/components/button";
import { Dialog, DialogContent, DialogTitle } from "@repo/ui/components/dialog";
import { Drawer, DrawerContent, DrawerTitle } from "@repo/ui/components/drawer";
import { cn } from "@repo/ui/lib/utils";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Segmented } from "@/components/settings/segmented";
import { useIsPhone } from "@/components/settings/use-is-phone";
import { NoiseWash } from "@/components/ui/noise-wash";
import { finishOnboarding } from "@/lib/actions/onboarding";
import {
  updateBusiness,
  updateName,
  updatePreferences,
} from "@/lib/actions/settings";
import type { SettingsData } from "@/lib/settings-query";

import {
  clearWelcomeHash,
  parseWelcomeHash,
  showWelcomeStep,
  useWelcomeStep,
  welcomeUrlIn,
  WELCOME_STEPS,
  type WelcomeStep,
} from "./welcome-hash";
import {
  BusinessStep,
  LanguageStep,
  YoursStep,
  type BusinessValues,
} from "./welcome-steps";

/**
 * Onboarding: the welcome dialog a new User meets after Sign-up, mounted by
 * the app layout until `onboardedAt` is set. Three steps — Language, Make it
 * yours, Business — each saving as it goes through the same actions as the
 * Settings. It can't be dismissed: Finish, which needs a business name, is
 * the way out. The step is in the URL hash (`#welcome/yours`), so a reload or
 * a language change comes back to it.
 */
export function OnboardingHost({ data }: { data: SettingsData }) {
  const t = useTranslations("onboarding");
  const tTheme = useTranslations("theme");
  const tApp = useTranslations("app");
  const hashStep = useWelcomeStep();
  const phone = useIsPhone();
  const { setTheme } = useTheme();

  const [finished, setFinished] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState(data.name);
  const savedName = useRef(data.name.trim());
  const [avatar, setAvatar] = useState(data.avatar);
  const [theme, setThemeValue] = useState(data.theme);
  const [business, setBusiness] = useState<BusinessValues>({
    businessName: data.business.businessName ?? "",
    businessPhone: data.business.businessPhone ?? "",
    businessAddress: data.business.businessAddress ?? "",
    businessTaxId: data.business.businessTaxId ?? "",
  });
  const savedBusiness = useRef(business);
  const [nameMissing, setNameMissing] = useState(false);
  const businessNameRef = useRef<HTMLInputElement>(null);
  const themeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Arriving without a step (straight from Sign-up, or the hash was cleared)
  // starts at the first one. Read from `location`, not `hashStep`, which is
  // still the server's `null` during hydration.
  useEffect(() => {
    if (!finished && !parseWelcomeHash(window.location.hash)) {
      showWelcomeStep("language");
    }
  }, [hashStep, finished]);

  useEffect(() => () => clearTimeout(themeTimer.current), []);

  const step: WelcomeStep = hashStep ?? "language";
  const index = WELCOME_STEPS.indexOf(step);
  const open = hashStep !== null && !finished;

  async function pickLocale(next: LocaleCode) {
    if (next === data.locale) return;
    setSwitching(true);
    const res = await updatePreferences({ locale: next });
    if (!res.ok) {
      setSwitching(false);
      toast.error(t("errorGeneric"));
      return;
    }
    // A full load, as in the Settings: the whole page changes language and
    // direction. Same page, same step.
    window.location.assign(welcomeUrlIn(next, "language"));
  }

  async function saveName() {
    const next = name.trim();
    // The name is optional here; an emptied field keeps the one from Sign-up.
    if (!next || next === savedName.current) return;
    const res = await updateName({ name: next });
    if (res.ok) savedName.current = next;
    else toast.error(t("errorGeneric"));
  }

  async function pickTheme(next: ThemeCode) {
    setThemeValue(next);
    // Let the picker's pill finish sliding before the page changes theme
    // (the same wait as the Settings' theme picker).
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    clearTimeout(themeTimer.current);
    themeTimer.current = setTimeout(() => setTheme(next), reduced ? 0 : 200);
    const res = await updatePreferences({ theme: next });
    if (!res.ok) toast.error(t("errorGeneric"));
  }

  async function saveBusinessField(key: keyof BusinessValues) {
    const value = business[key].trim();
    if (value === savedBusiness.current[key].trim()) return;
    const res = await updateBusiness({ [key]: value });
    if (res.ok) savedBusiness.current = { ...savedBusiness.current, [key]: value };
    else toast.error(t("errorGeneric"));
  }

  async function next() {
    if (step !== "business") {
      showWelcomeStep(WELCOME_STEPS[index + 1]!);
      return;
    }
    if (!business.businessName.trim()) {
      setNameMissing(true);
      businessNameRef.current?.focus();
      return;
    }
    setPending(true);
    const res = await finishOnboarding(business);
    if (!res.ok) {
      setPending(false);
      toast.error(t("errorGeneric"));
      return;
    }
    // Close, and let the layout's revalidation drop the dialog for good.
    setFinished(true);
    clearWelcomeHash();
  }

  function back() {
    if (index > 0) showWelcomeStep(WELCOME_STEPS[index - 1]!);
  }

  const titles: Record<WelcomeStep, [string, string]> = {
    language: [t("languageTitle"), t("languageSubtitle")],
    yours: [t("yoursTitle"), t("yoursSubtitle")],
    business: [t("businessTitle"), t("businessSubtitle")],
  };
  const [title, subtitle] = titles[step];

  const themePicker = (
    <Segmented<ThemeCode>
      name="welcome-theme"
      label={t("themeLabel")}
      value={theme}
      onChange={pickTheme}
      labelled
      className={phone ? "flex w-full" : undefined}
      options={[
        { value: "system", label: tTheme("system"), icon: <Monitor /> },
        { value: "light", label: tTheme("light"), icon: <Sun /> },
        { value: "dark", label: tTheme("dark"), icon: <Moon /> },
      ]}
    />
  );

  const nextButton = (
    <Button
      onClick={next}
      disabled={pending || switching}
      className={cn("rounded-[14px] px-6 text-[15px]", phone ? "h-12 flex-1" : "h-11")}
    >
      {step === "business" ? t("finish") : t("continue")}
    </Button>
  );
  const backButton = (
    <Button
      variant="secondary"
      onClick={back}
      className={cn("rounded-[14px] px-5 text-[15px]", phone ? "h-12" : "h-11")}
    >
      {t("back")}
    </Button>
  );

  const content = (
    <>
      <NoiseWash />

      {/* Header: the app, and where you are. */}
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-between",
          phone ? "px-5 pt-2.5 pb-1" : "px-8 pt-6",
        )}
      >
        <span className="text-[15px] font-medium tracking-tight">
          {tApp("name")}
        </span>
        <div className="flex items-center gap-2.5">
          <span className="text-[13px] text-muted-foreground tabular-nums">
            {t("stepOf", { step: index + 1, total: WELCOME_STEPS.length })}
          </span>
          <div className="flex gap-1" aria-hidden>
            {WELCOME_STEPS.map((s, i) => (
              <div
                key={s}
                className={cn(
                  "h-1 w-5 rounded-full transition-colors duration-300",
                  i <= index ? "bg-primary" : "bg-border",
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div
        className={cn(
          "relative flex min-h-0 flex-1 flex-col items-center overflow-y-auto",
          phone ? "justify-start gap-6 px-4 pt-6" : "justify-center gap-10 px-8",
        )}
      >
        <div className="flex flex-col items-center gap-2.5 text-center">
          <h1
            className={cn(
              "leading-[1.05] font-light",
              phone ? "text-[34px] tracking-[-0.8px]" : "text-[60px] tracking-[-1.6px]",
            )}
          >
            {title}
          </h1>
          <p className={cn("text-muted-foreground", phone ? "text-[15px]" : "text-[17px]")}>
            {subtitle}
          </p>
        </div>

        {step === "language" && (
          <LanguageStep
            value={data.locale}
            onPick={pickLocale}
            disabled={switching}
            phone={phone}
          />
        )}
        {step === "yours" && (
          <YoursStep
            name={name}
            onNameChange={setName}
            onNameBlur={saveName}
            avatar={avatar}
            onAvatarChange={setAvatar}
            phone={phone}
          />
        )}
        {step === "business" && (
          <BusinessStep
            values={business}
            onChange={(key, value) => setBusiness((b) => ({ ...b, [key]: value }))}
            onBlur={saveBusinessField}
            nameMissing={nameMissing}
            nameRef={businessNameRef}
            phone={phone}
          />
        )}
      </div>

      {/* Footer */}
      {phone ? (
        <div className="relative flex shrink-0 flex-col gap-3.5 px-4 pt-3 pb-7">
          {step === "yours" && themePicker}
          <div className="flex gap-2.5">
            {index > 0 && backButton}
            {nextButton}
          </div>
        </div>
      ) : (
        <div className="relative grid shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center px-7 pt-5 pb-6">
          <div className={cn("justify-self-start", index === 0 && "invisible")}>
            {backButton}
          </div>
          <div className="justify-self-center">{step === "yours" && themePicker}</div>
          <div className="justify-self-end">{nextButton}</div>
        </div>
      )}
    </>
  );

  if (phone) {
    return (
      <Drawer open={open} dismissible={false}>
        <DrawerContent
          aria-describedby={undefined}
          className="mt-0 h-[calc(100dvh-2.75rem)] max-h-none overflow-hidden rounded-t-[28px] bg-background data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-none data-[vaul-drawer-direction=bottom]:rounded-t-[28px]"
        >
          <DrawerTitle className="sr-only">{title}</DrawerTitle>
          <Frame>{content}</Frame>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        // Not dismissible: Escape and clicks outside do nothing.
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement).focus();
        }}
        className="inset-5 flex w-auto max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-[28px] bg-background p-0 sm:max-w-none"
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <Frame>{content}</Frame>
      </DialogContent>
    </Dialog>
  );
}

function Frame({ children }: { children: ReactNode }) {
  return <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>;
}
