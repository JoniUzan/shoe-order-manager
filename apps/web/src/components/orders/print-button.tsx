"use client";

import { Button } from "@repo/ui/components/button";
import { Printer } from "lucide-react";

export function PrintButton({ label }: { label: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => window.print()}
    >
      <Printer className="size-4" />
      {label}
    </Button>
  );
}
