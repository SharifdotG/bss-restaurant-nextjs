"use client";

import { useState } from "react";
import { CheckIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { DishIcon } from "@/components/dish-icon";
import { ImageField } from "@/components/image-field";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SwitchRow } from "@/components/ui/switch-row";
import { Textarea } from "@/components/ui/textarea";
import type { CategoryOut } from "@/lib/api/schema";
import { describeError } from "@/lib/api/errors";
import { useErrorText } from "@/lib/api/use-error-text";
import { useSaveCategory } from "@/lib/use-menu-actions";

/** null closed; an empty object for a new category. */
export type CategorySheetStart = { category?: CategoryOut } | null;

type CategorySheetProps = { start: CategorySheetStart; nextPosition: number; onClose: () => void };

export function CategorySheet({ start, nextPosition, onClose }: CategorySheetProps) {
  const t = useTranslations("menu.categorySheet");
  const category = start?.category;

  return (
    <Sheet open={start !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[min(440px,100vw)]">
        <SheetHeader>
          <SheetTitle>
            {category ? t("editTitle", { name: category.name }) : t("newTitle")}
          </SheetTitle>
          <SheetDescription>{category ? t("editSub") : t("newSub")}</SheetDescription>
        </SheetHeader>
        {start && (
          <CategoryForm
            key={category?.id ?? "new"}
            category={category}
            nextPosition={nextPosition}
            onClose={onClose}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

type CategoryFormProps = { category?: CategoryOut; nextPosition: number; onClose: () => void };

function CategoryForm({ category, nextPosition, onClose }: CategoryFormProps) {
  const t = useTranslations("menu.categorySheet");
  const errorText = useErrorText();
  const save = useSaveCategory();
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [active, setActive] = useState(category?.isActive ?? true);
  // undefined keeps the saved photo; null removes it.
  const [photo, setPhoto] = useState<{ key: string | null; url: string | null }>();
  const [uploading, setUploading] = useState(false);
  const [tried, setTried] = useState(false);

  const apiFields = save.isError ? errorText.fields(save.error) : {};
  const taken = save.isError && describeError(save.error).code === "category_exists";
  const nameProblem = !name.trim()
    ? t("errors.name")
    : taken
      ? errorText.message(save.error)
      : apiFields.name;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setTried(true);
    if (!name.trim()) return;
    const body = {
      name: name.trim(),
      description: description.trim() || null,
      isActive: active,
      ...(photo && { imageKey: photo.key }),
    };
    save.mutate(
      category ? { id: category.id, body } : { body: { ...body, sortOrder: nextPosition } },
      { onSuccess: onClose },
    );
  };

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
      <SheetBody className="grid content-start gap-5">
        <ImageField
          folder="categories"
          url={photo ? photo.url : category?.imageUrl}
          onChange={setPhoto}
          onUploading={setUploading}
          label={t("photo")}
          hint={t("photoHint")}
          empty={<DishIcon category={name} className="size-8" />}
          disabled={save.isPending}
        />

        <Field data-invalid={Boolean((tried || taken) && nameProblem)}>
          <FieldLabel htmlFor="category-name">{t("name")}</FieldLabel>
          <Input
            id="category-name"
            value={name}
            maxLength={100}
            autoComplete="off"
            placeholder={t("namePlaceholder")}
            onChange={(event) => setName(event.target.value)}
          />
          {(tried || taken) && nameProblem && <FieldError>{nameProblem}</FieldError>}
        </Field>

        <Field>
          <FieldLabel htmlFor="category-description">{t("description")}</FieldLabel>
          <Textarea
            id="category-description"
            value={description}
            maxLength={500}
            rows={3}
            placeholder={t("descriptionPlaceholder")}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>

        <SwitchRow
          title={t("active")}
          hint={t("activeHint")}
          checked={active}
          onChange={setActive}
        />
      </SheetBody>

      <SheetFooter className="flex-wrap items-center justify-end">
        {save.isError && !taken && Object.keys(apiFields).length === 0 && (
          <p role="alert" className="mr-auto text-sm font-medium text-tone-red-text">
            {errorText.message(save.error)}
          </p>
        )}
        <Button type="button" variant="outline" onClick={onClose} disabled={save.isPending}>
          {t("cancel")}
        </Button>
        <Button type="submit" disabled={save.isPending || uploading}>
          <CheckIcon weight="bold" />
          {save.isPending ? t("saving") : category ? t("save") : t("create")}
        </Button>
      </SheetFooter>
    </form>
  );
}
