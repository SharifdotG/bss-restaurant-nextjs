"use client";

import { useState } from "react";
import Cropper from "react-easy-crop";
import { CropIcon, MagnifyingGlassMinusIcon, MagnifyingGlassPlusIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTile,
  DialogTitle,
} from "@/components/ui/dialog";
import { renderImage, type Area } from "@/lib/image-file";

type CropDialogProps = {
  /** An object URL for the picked file; the dialog is open while it's set. */
  src: string | null;
  onCancel: () => void;
  onDone: (photo: Blob) => void;
};

/** A square crop so dish photos line up on the menu, the POS and the guest menu. */
export function CropDialog({ src, onCancel, onDone }: CropDialogProps) {
  const t = useTranslations("inputs.crop");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  async function done() {
    if (!src || !area) return;
    setBusy(true);
    try {
      onDone(await renderImage(src, area));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={src !== null} onOpenChange={(open) => !open && !busy && onCancel()}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTile icon={CropIcon} />
          <div className="min-w-0 pt-1.5 pr-8">
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription className="mt-1">{t("hint")}</DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody className="gap-4">
          <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
            {src && (
              <Cropper
                image={src}
                crop={crop}
                zoom={zoom}
                aspect={1}
                maxZoom={4}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, pixels) => setArea(pixels)}
                classes={{ cropAreaClassName: "rounded-md !border-2 !border-white/90" }}
              />
            )}
          </div>
          <label className="flex items-center gap-3 text-muted-foreground">
            <MagnifyingGlassMinusIcon className="size-4 shrink-0" aria-hidden />
            <span className="sr-only">{t("zoom")}</span>
            <input
              type="range"
              min={1}
              max={4}
              step={0.01}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="h-1.5 w-full cursor-pointer accent-primary"
            />
            <MagnifyingGlassPlusIcon className="size-4 shrink-0" aria-hidden />
          </label>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            {t("cancel")}
          </Button>
          <Button onClick={() => void done()} disabled={busy || !area}>
            <CropIcon />
            {t("use")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
