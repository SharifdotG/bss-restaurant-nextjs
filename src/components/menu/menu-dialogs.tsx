"use client";

import { EyeSlashIcon, ProhibitIcon, TrashIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTile,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CategoryOut, FoodOut } from "@/lib/api/schema";
import { describeError } from "@/lib/api/errors";
import { useErrorText } from "@/lib/api/use-error-text";
import {
  useDeleteCategory,
  useDeleteFood,
  useSaveCategory,
  useSetAvailability,
} from "@/lib/use-menu-actions";

/**
 * A category only deletes once it's empty. With dishes still in it, hiding it from guests is
 * usually what was meant, so that's offered instead.
 */
export function DeleteCategoryDialog({
  category,
  onClose,
}: {
  category: CategoryOut;
  onClose: (deleted?: boolean) => void;
}) {
  const t = useTranslations("menu.deleteCategory");
  const errorText = useErrorText();
  const remove = useDeleteCategory();
  const hide = useSaveCategory();
  const raced = remove.isError && describeError(remove.error).code === "category_not_empty";
  const full = category.foodCount > 0 || raced;
  const busy = remove.isPending || hide.isPending;
  const failed = remove.isError && !raced ? remove.error : hide.error;

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTile icon={full ? EyeSlashIcon : TrashIcon} tone={full ? "amber" : "red"} />
          <div className="min-w-0 pt-1.5 pr-8">
            <DialogTitle>
              {full
                ? t("fullTitle", { name: category.name, n: category.foodCount })
                : t("title", { name: category.name })}
            </DialogTitle>
          </div>
        </DialogHeader>
        <DialogBody>
          <DialogDescription>
            {full ? t(category.isActive ? "fullBody" : "fullBodyHidden") : t("body")}
          </DialogDescription>
          {failed && (
            <p role="alert" className="text-sm font-medium text-tone-red-text">
              {errorText.message(failed)}
            </p>
          )}
        </DialogBody>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={busy} />}>
            {t("keep")}
          </DialogClose>
          {full ? (
            category.isActive && (
              <Button
                disabled={busy}
                onClick={() =>
                  hide.mutate(
                    { id: category.id, body: { isActive: false } },
                    { onSuccess: () => onClose() },
                  )
                }
              >
                <EyeSlashIcon />
                {t("hide")}
              </Button>
            )
          ) : (
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => remove.mutate(category, { onSuccess: () => onClose(true) })}
            >
              <TrashIcon />
              {remove.isPending ? t("working") : t("confirm")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Deleting is always allowed, but a dish that's only out tonight should be marked sold out. */
export function DeleteDishDialog({ food, onClose }: { food: FoodOut; onClose: () => void }) {
  const t = useTranslations("menu.deleteDish");
  const errorText = useErrorText();
  const remove = useDeleteFood();
  const soldOut = useSetAvailability();
  const busy = remove.isPending || soldOut.isPending;

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTile icon={TrashIcon} tone="red" />
          <div className="min-w-0 pt-1.5 pr-8">
            <DialogTitle>{t("title", { name: food.name })}</DialogTitle>
          </div>
        </DialogHeader>
        <DialogBody>
          <DialogDescription>
            {t(food.isAvailable ? "body" : "bodySoldOut", { name: food.name })}
          </DialogDescription>
          {remove.isError && (
            <p role="alert" className="text-sm font-medium text-tone-red-text">
              {errorText.message(remove.error)}
            </p>
          )}
        </DialogBody>
        <DialogFooter className="flex-wrap">
          <DialogClose render={<Button variant="outline" disabled={busy} />}>
            {t("keep")}
          </DialogClose>
          {food.isAvailable && (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => soldOut.mutate({ food, available: false }, { onSuccess: onClose })}
            >
              <ProhibitIcon />
              {t("soldOut")}
            </Button>
          )}
          <Button
            variant="destructive"
            disabled={busy}
            onClick={() => remove.mutate(food, { onSuccess: onClose })}
          >
            <TrashIcon />
            {remove.isPending ? t("working") : t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
