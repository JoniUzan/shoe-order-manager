"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { GlassCard } from "@repo/ui/components/glass-card";
import { cn } from "@repo/ui/lib/utils";
import { Package, Plus, ReceiptText, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Link, usePathname } from "@/i18n/navigation";

/** A form's own page: the button would cover its bottom bar and add nothing. */
const FORM_PAGE = /\/(new|edit)$/;
/** A Customer's page, whose new Order starts with that Customer. */
const CUSTOMER_PAGE = /^\/customers\/(c[a-z0-9]{16,})$/;

/**
 * The floating button for the three things you start from anywhere: a new
 * Order, Customer or Shoe model. On every page but the forms, at every size,
 * in the corner at the end of the reading line.
 */
export function QuickActions() {
  const t = useTranslations("quickActions");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (FORM_PAGE.test(pathname)) return null;
  const customerId = CUSTOMER_PAGE.exec(pathname)?.[1];

  const actions = [
    {
      href: customerId ? `/orders/new?customer=${customerId}` : "/orders/new",
      label: t("newOrder"),
      Icon: ReceiptText,
    },
    { href: "/customers/new", label: t("newCustomer"), Icon: UserPlus },
    { href: "/catalog/new", label: t("newShoeModel"), Icon: Package },
  ];

  return (
    <>
      {/* On a phone the menu takes the screen's attention, so the rest dims. */}
      <div
        aria-hidden
        className={cn(
          "fixed inset-0 z-40 bg-black/35 transition-opacity duration-200 md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={t("label")}
            className="fixed end-4 bottom-6 z-40 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_24px_rgb(0_0_0/0.22)] outline-none transition-[scale] duration-150 ease-(--ease-out-quint) focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-95 md:end-6"
          >
            <Plus
              aria-hidden
              className={cn(
                "size-6 transition-transform duration-200 ease-(--ease-out-quint)",
                open && "rotate-45",
              )}
              strokeWidth={2.2}
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          align="end"
          sideOffset={12}
          className="overflow-visible border-0 bg-transparent p-0 shadow-none"
        >
          <GlassCard className="flex min-w-56 flex-col gap-0.5 rounded-[20px] p-1.5">
            {actions.map(({ href, label, Icon }) => (
              <DropdownMenuItem
                key={label}
                asChild
                className="h-13 gap-3 rounded-[14px] px-3.5 text-[15px] font-medium md:h-11"
              >
                <Link href={href}>
                  <Icon aria-hidden className="size-5" />
                  {label}
                </Link>
              </DropdownMenuItem>
            ))}
          </GlassCard>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
