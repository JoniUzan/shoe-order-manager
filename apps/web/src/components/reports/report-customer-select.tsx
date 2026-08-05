"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";

import { useRouter } from "@/i18n/navigation";

export function ReportCustomerSelect({
  customers,
  selected,
  placeholder,
}: {
  customers: { id: string; name: string }[];
  selected?: string;
  placeholder: string;
}) {
  const router = useRouter();

  return (
    <Select
      value={selected ?? ""}
      onValueChange={(v) => router.push(`/reports?tab=customers&customer=${v}`)}
    >
      <SelectTrigger className="max-w-xs">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {customers.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
