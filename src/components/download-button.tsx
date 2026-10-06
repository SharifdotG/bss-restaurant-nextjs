"use client";

import { DownloadSimpleIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useErrorText } from "@/lib/api/use-error-text";

/** The CSVs need the bearer token, so they're fetched and saved from a blob URL. */
function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement("a"), { href: url, download: filename });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type DownloadButtonProps = {
  label: string;
  /** The API doesn't expose Content-Disposition, so the file is named here. */
  fetchFile: () => Promise<{ blob: Blob; filename: string }>;
  variant?: "outline" | "ghost";
  size?: "default" | "sm";
  className?: string;
};

export function DownloadButton({
  label,
  fetchFile,
  variant = "outline",
  size = "default",
  className,
}: DownloadButtonProps) {
  const t = useTranslations("common.download");
  const errorText = useErrorText();
  const download = useMutation({
    mutationFn: async () => {
      const { blob, filename } = await fetchFile();
      saveBlob(blob, filename);
    },
    onError: (error) => toast.error(t("failed"), { description: errorText.message(error) }),
  });

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      disabled={download.isPending}
      onClick={() => download.mutate()}
    >
      <DownloadSimpleIcon />
      {download.isPending ? t("working") : label}
    </Button>
  );
}

/** "orders-2026-10-11.csv", or "orders-2026-10-01-to-2026-10-11.csv" for a range. */
export const csvName = (name: string, from: string, to: string) =>
  `${name}-${from === to ? from : `${from}-to-${to}`}.csv`;
