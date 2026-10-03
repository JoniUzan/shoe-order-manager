"use client";

import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { Camera, ImageUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";

import { cropToSquareJpeg } from "@/components/catalog/crop-image";
import { roomy } from "@/components/step-form/roomy";

/**
 * The model's Product image as the form holds it: the stored one, a newly
 * picked one (already cropped, uploaded only when the model is saved), or
 * none.
 */
export type ProductImageValue =
  | { kind: "stored"; key: string; url: string }
  | { kind: "new"; blob: Blob; url: string }
  | null;

/**
 * Picks the Product image. The form owns the value, and revokes a picked
 * image's object URL when it is replaced (this field unmounts with its step).
 * On a computer, a square to click or drop a photo
 * on; on a phone, Camera and Gallery buttons. Once there is an image it
 * shows the cropped square with Replace and Remove.
 */
export function ProductImageField({
  value,
  onChange,
}: {
  value: ProductImageValue;
  onChange: (next: ProductImageValue) => void;
}) {
  const t = useTranslations("catalog");
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);

  async function take(file: File | undefined) {
    if (!file) return;
    setReading(true);
    try {
      const blob = await cropToSquareJpeg(file);
      onChange({ kind: "new", blob, url: URL.createObjectURL(blob) });
    } catch {
      toast.error(t("productImageUnreadable"));
    } finally {
      setReading(false);
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    void take(e.dataTransfer.files[0]);
  }

  const pick = () => galleryRef.current?.click();

  return (
    <div
      className="flex flex-col gap-2"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      {/* The files are read here, so the inputs never submit anything. */}
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          void take(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          void take(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {value ? (
        <div className="flex items-center gap-4 @xl:flex-col @xl:items-stretch @xl:gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- already a small square JPEG */}
          <img
            src={value.url}
            alt={t("productImage")}
            className={cn(
              "size-28 shrink-0 rounded-[1.25rem] border border-border bg-surface object-cover @xl:size-auto @xl:aspect-square @xl:w-full",
              dragging && "ring-2 ring-ring",
            )}
          />
          <div className="flex flex-1 flex-col gap-2 @xl:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={pick}
              disabled={reading}
              className={cn(roomy.button, roomy.raised, "@xl:flex-1")}
            >
              {t("productImageReplace")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onChange(null)}
              disabled={reading}
              className={cn(roomy.button, "@xl:flex-1")}
            >
              {t("productImageRemove")}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={pick}
            disabled={reading}
            className={cn(
              roomy.press,
              "hidden aspect-square w-full flex-col items-center justify-center gap-2.5 rounded-[1.25rem] px-4 text-center @xl:flex",
              "border-[1.5px] border-dashed border-foreground/20 bg-card hover:border-foreground/35",
              dragging && "border-foreground/50 bg-accent",
            )}
          >
            <ImageUp className="size-7" aria-hidden />
            <span className="text-[0.9375rem] font-medium">{t("productImageUpload")}</span>
            <span className="text-[0.8125rem] text-muted-foreground">
              {t("productImageDrop")}
            </span>
          </button>
          <span className="hidden text-[0.8125rem] text-muted-foreground @xl:block">
            {t("productImageHint")}
          </span>

          <div className="flex gap-2.5 @xl:hidden">
            {[
              { label: t("productImageCamera"), Icon: Camera, ref: cameraRef },
              { label: t("productImageGallery"), Icon: ImageUp, ref: galleryRef },
            ].map(({ label, Icon, ref }) => (
              <Button
                key={label}
                type="button"
                variant="outline"
                onClick={() => ref.current?.click()}
                disabled={reading}
                className={cn(
                  roomy.button,
                  roomy.raised,
                  "h-24 flex-1 flex-col gap-1.5 md:h-24",
                )}
              >
                <Icon className="size-6" aria-hidden />
                {label}
              </Button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
