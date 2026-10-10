"use client";

/* eslint-disable @next/next/no-img-element -- previews of the API's own WebP and of local files */
import { useEffect, useId, useRef, useState } from "react";
import { CircleNotchIcon, ImageIcon, TrashIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { CropDialog } from "@/components/crop-dialog";
import { Button } from "@/components/ui/button";
import { imageUrl } from "@/lib/api/images";
import type { ImageFolder } from "@/lib/api/schema";
import { useErrorText } from "@/lib/api/use-error-text";
import { ACCEPTED_IMAGES, checkImage, renderImage } from "@/lib/image-file";
import { useUploadImage } from "@/lib/use-upload";
import { cn } from "@/lib/utils";

export type ImageChange = { key: string | null; url: string | null };

type ImageFieldProps = {
  folder: ImageFolder;
  /** The photo on show: the saved one, or one just uploaded. */
  url: string | null | undefined;
  onChange: (change: ImageChange) => void;
  /** So the form can hold its Save button until the upload lands. */
  onUploading?: (uploading: boolean) => void;
  label: string;
  hint?: string;
  /** Square crop before upload; receipts skip it so nothing gets cut off. */
  crop?: boolean;
  /** Shown in the tile when there's no photo, like the dish's icon. */
  empty?: React.ReactNode;
  disabled?: boolean;
  className?: string;
};

/**
 * A photo tile you can drop a file on, with upload, replace and remove. The file goes to the
 * API straight away and the form only stores the returned key, which saves with the record.
 */
export function ImageField({
  folder,
  url,
  onChange,
  onUploading,
  label,
  hint,
  crop = true,
  empty,
  disabled,
  className,
}: ImageFieldProps) {
  const t = useTranslations("inputs.photo");
  const errorText = useErrorText();
  const upload = useUploadImage(folder);
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const [picked, setPicked] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const busy = upload.isPending;
  const shown = imageUrl(url);

  useEffect(() => () => void (picked && URL.revokeObjectURL(picked)), [picked]);

  const send = (photo: Blob) => {
    onUploading?.(true);
    upload.mutate(photo, {
      onSuccess: ({ key, url }) => onChange({ key, url }),
      onError: (error) => setProblem(errorText.message(error)),
      onSettled: () => onUploading?.(false),
    });
  };

  async function take(file: File | undefined) {
    if (!file || disabled || busy) return;
    setProblem(null);
    if (checkImage(file)) return setProblem(t("wrongType"));
    const src = URL.createObjectURL(file);
    if (crop) return setPicked(src);
    try {
      send(await renderImage(src));
    } catch {
      setProblem(t("unreadable"));
    } finally {
      URL.revokeObjectURL(src);
    }
  }

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => input.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          void take(event.dataTransfer.files[0]);
        }}
        aria-describedby={`${id}-hint`}
        aria-label={shown ? t("replace") : t("add")}
        className={cn(
          "relative grid size-28 shrink-0 place-items-center overflow-hidden rounded-xl text-muted-foreground transition-[background-color,border-color,box-shadow] duration-(--duration-fast) outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
          shown
            ? "bg-muted"
            : "border-2 border-dashed border-border bg-muted/40 hover:border-primary/40 hover:bg-primary-soft/40",
          over && "border-primary bg-primary-soft/60 ring-3 ring-ring/30",
        )}
      >
        {shown ? (
          <img src={shown} alt="" className="size-full object-cover" />
        ) : (
          (empty ?? <ImageIcon weight="duotone" className="size-8" />)
        )}
        {busy && (
          <span className="absolute inset-0 grid place-items-center bg-veil">
            <CircleNotchIcon className="size-6 animate-spin text-foreground" />
          </span>
        )}
      </button>

      <div className="grid min-w-0 gap-1.5">
        <p className="text-sm font-bold">{label}</p>
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {busy ? t("uploading") : (hint ?? t("hint"))}
        </p>
        <div className="flex flex-wrap gap-2 pt-0.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled || busy}
            onClick={() => input.current?.click()}
          >
            <UploadSimpleIcon />
            {shown ? t("replace") : t("add")}
          </Button>
          {shown && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={disabled || busy}
              onClick={() => onChange({ key: null, url: null })}
            >
              <TrashIcon />
              {t("remove")}
            </Button>
          )}
        </div>
        {problem && (
          <p role="alert" className="text-xs font-medium text-tone-red-text">
            {problem}
          </p>
        )}
      </div>

      <input
        ref={input}
        type="file"
        accept={ACCEPTED_IMAGES}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          void take(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <CropDialog
        src={picked}
        onCancel={() => setPicked(null)}
        onDone={(photo) => {
          setPicked(null);
          send(photo);
        }}
      />
    </div>
  );
}
