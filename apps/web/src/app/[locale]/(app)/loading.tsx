import { LoaderCircle } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}
