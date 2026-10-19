import { Button } from "@repo/ui/components/button";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Link } from "@/i18n/navigation";

/**
 * A list screen's header: its title, subtitle and "New …" button. Shared by
 * the page and its `loading.tsx`, which draws it for real (ADR 0012).
 */
export function ListHeader({
  title,
  subtitle,
  addHref,
  addLabel,
}: {
  title: string;
  subtitle: string;
  addHref: string;
  addLabel: string;
}) {
  return (
    <PageHeader
      title={title}
      subtitle={subtitle}
      action={
        <Button asChild>
          <Link href={addHref}>
            <Plus className="size-4" />
            {addLabel}
          </Link>
        </Button>
      }
    />
  );
}
