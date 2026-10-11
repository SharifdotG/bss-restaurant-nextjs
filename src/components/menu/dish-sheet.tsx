"use client";

import { useState } from "react";
import { CheckIcon, StarIcon, TrashIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { DishIcon } from "@/components/dish-icon";
import { ImageField, type ImageChange } from "@/components/image-field";
import { AffixInput } from "@/components/ui/affix-input";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { CategoryOut, DiscountType, FoodOut } from "@/lib/api/schema";
import { describeError } from "@/lib/api/errors";
import { useErrorText } from "@/lib/api/use-error-text";
import { amountText } from "@/lib/billing";
import { toLatinDigits } from "@/lib/format";
import { discountProblem, finalPrice } from "@/lib/menu";
import { parseMoney, parsePercent, toPaisa, toTaka } from "@/lib/money";
import { useFormat } from "@/lib/use-format";
import { useSaveFood } from "@/lib/use-menu-actions";

/** null closed; a new dish can start in the category being looked at. */
export type DishSheetStart = { food?: FoodOut; categoryId?: number | null } | null;

type DishSheetProps = {
  start: DishSheetStart;
  categories: CategoryOut[];
  onClose: () => void;
  onDelete: (food: FoodOut) => void;
};

export function DishSheet({ start, categories, onClose, onDelete }: DishSheetProps) {
  const t = useTranslations("menu.dishSheet");
  const food = start?.food;

  return (
    <Sheet open={start !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[min(520px,100vw)]">
        <SheetHeader>
          <SheetTitle>{food ? t("editTitle", { name: food.name }) : t("newTitle")}</SheetTitle>
          <SheetDescription>{food ? t("editSub") : t("newSub")}</SheetDescription>
        </SheetHeader>
        {start && (
          <DishForm
            key={food?.id ?? "new"}
            food={food}
            startCategory={start.categoryId ?? null}
            categories={categories}
            onClose={onClose}
            onDelete={onDelete}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

type DishFormProps = {
  food?: FoodOut;
  startCategory: number | null;
  categories: CategoryOut[];
  onClose: () => void;
  onDelete: (food: FoodOut) => void;
};

const parseMinutes = (text: string) => {
  const value = toLatinDigits(text).trim();
  if (!value) return null;
  return /^\d{1,3}$/.test(value) ? Number(value) : Number.NaN;
};

function DishForm({ food, startCategory, categories, onClose, onDelete }: DishFormProps) {
  const t = useTranslations("menu.dishSheet");
  const format = useFormat();
  const errorText = useErrorText();
  const save = useSaveFood();
  const [name, setName] = useState(food?.name ?? "");
  const [description, setDescription] = useState(food?.description ?? "");
  const [category, setCategory] = useState(food ? (food.category?.id ?? null) : startCategory);
  const [price, setPrice] = useState(food ? amountText(toPaisa(food.price)) : "");
  const [discountType, setDiscountType] = useState<DiscountType>(food?.discountType ?? "none");
  const [discount, setDiscount] = useState(
    food && food.discountType !== "none"
      ? food.discountType === "flat"
        ? amountText(toPaisa(food.discountValue))
        : String(food.discountValue)
      : "",
  );
  const [prep, setPrep] = useState(food?.preparationMinutes ? String(food.preparationMinutes) : "");
  const [featured, setFeatured] = useState(food?.isFeatured ?? false);
  const [available, setAvailable] = useState(food?.isAvailable ?? true);
  const [photo, setPhoto] = useState<ImageChange>();
  const [uploading, setUploading] = useState(false);
  const [tried, setTried] = useState(false);

  const pricePaisa = parseMoney(price);
  const priceTaka = pricePaisa === null ? null : toTaka(pricePaisa);
  const discountValue =
    discountType === "none"
      ? 0
      : discountType === "percentage"
        ? parsePercent(discount)
        : (() => {
            const paisa = parseMoney(discount);
            return paisa === null ? null : toTaka(paisa);
          })();
  const minutes = parseMinutes(prep);

  const apiFields = save.isError ? errorText.fields(save.error) : {};
  const apiCode = save.isError ? describeError(save.error).code : undefined;

  const problems = {
    name: !name.trim()
      ? t("errors.name")
      : apiCode === "food_exists"
        ? errorText.message(save.error)
        : apiFields.name,
    price: priceTaka === null ? t("errors.price") : apiFields.price,
    discount:
      discountType === "none"
        ? undefined
        : discountValue === null || discountValue <= 0
          ? t("errors.discount")
          : priceTaka !== null && discountProblem(priceTaka, discountType, discountValue)
            ? t(`errors.${discountProblem(priceTaka, discountType, discountValue)!}`)
            : apiCode === "invalid_discount"
              ? errorText.message(save.error)
              : apiFields.discountValue,
    prep:
      minutes !== null && (Number.isNaN(minutes) || minutes < 1 || minutes > 300)
        ? t("errors.prep")
        : apiFields.preparationMinutes,
  };
  const invalid = Object.values(problems).some(Boolean);
  const show = (problem: string | undefined) => (tried || save.isError) && problem;

  const guestsPay =
    priceTaka !== null && discountValue !== null && !problems.discount
      ? finalPrice(priceTaka, discountType, discountValue)
      : null;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setTried(true);
    if (invalid || priceTaka === null) return;
    const body = {
      name: name.trim(),
      description: description.trim() || null,
      categoryId: category,
      price: priceTaka,
      discountType,
      discountValue: discountType === "none" ? 0 : discountValue!,
      preparationMinutes: minutes,
      isFeatured: featured,
      isAvailable: available,
      ...(photo && { imageKey: photo.key }),
    };
    save.mutate(food ? { id: food.id, body } : { body }, { onSuccess: onClose });
  };

  const categoryName = categories.find((c) => c.id === category)?.name;
  // Errors the fields above don't already show.
  const general =
    save.isError &&
    apiCode !== "food_exists" &&
    apiCode !== "invalid_discount" &&
    Object.keys(apiFields).length === 0;

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
      <SheetBody className="grid content-start gap-5">
        <ImageField
          folder="foods"
          url={photo ? photo.url : food?.imageUrl}
          onChange={setPhoto}
          onUploading={setUploading}
          label={t("photo")}
          hint={t("photoHint")}
          empty={<DishIcon category={categoryName} className="size-9" />}
          disabled={save.isPending}
        />

        <Field data-invalid={Boolean(show(problems.name))}>
          <FieldLabel htmlFor="dish-name">{t("name")}</FieldLabel>
          <Input
            id="dish-name"
            value={name}
            maxLength={200}
            autoComplete="off"
            placeholder={t("namePlaceholder")}
            onChange={(event) => setName(event.target.value)}
          />
          {show(problems.name) && <FieldError>{problems.name}</FieldError>}
        </Field>

        <Field>
          <FieldLabel htmlFor="dish-description">{t("description")}</FieldLabel>
          <Textarea
            id="dish-description"
            value={description}
            maxLength={2000}
            rows={3}
            placeholder={t("descriptionPlaceholder")}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel id="dish-category">{t("category")}</FieldLabel>
            <Select
              value={category === null ? "" : String(category)}
              onValueChange={(next) => setCategory(next ? Number(next) : null)}
              items={[
                { value: "", label: t("noCategory") },
                ...categories.map((c) => ({ value: String(c.id), label: c.name })),
              ]}
            >
              <SelectTrigger aria-labelledby="dish-category" className="w-full">
                <SelectValue className="flex-1 text-left" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t("noCategory")}</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field data-invalid={Boolean(show(problems.prep))}>
            <FieldLabel htmlFor="dish-prep">{t("prep")}</FieldLabel>
            <AffixInput
              id="dish-prep"
              inputMode="numeric"
              value={prep}
              suffix={t("minutes")}
              placeholder="15"
              onChange={(event) => setPrep(event.target.value)}
            />
            {show(problems.prep) ? (
              <FieldError>{problems.prep}</FieldError>
            ) : (
              <FieldDescription>{t("prepHint")}</FieldDescription>
            )}
          </Field>
        </div>

        <fieldset className="grid gap-4 rounded-lg border border-border p-4">
          <legend className="sr-only">{t("pricing")}</legend>
          <Field data-invalid={Boolean(show(problems.price))}>
            <FieldLabel htmlFor="dish-price">{t("price")}</FieldLabel>
            <AffixInput
              id="dish-price"
              value={price}
              prefix={format.symbol}
              placeholder="250"
              onChange={(event) => setPrice(event.target.value)}
              className="text-md font-bold"
            />
            {show(problems.price) && <FieldError>{problems.price}</FieldError>}
          </Field>

          <Field data-invalid={Boolean(show(problems.discount))}>
            <FieldLabel id="dish-discount">{t("discount")}</FieldLabel>
            <div className="flex flex-wrap items-start gap-3">
              <Segmented
                aria-label={t("discount")}
                value={discountType}
                onValueChange={(next) => {
                  setDiscountType(next);
                  setDiscount("");
                }}
                options={[
                  { value: "none", label: t("discountNone") },
                  { value: "percentage", label: t("discountPercent") },
                  { value: "flat", label: t("discountFlat") },
                ]}
              />
              {discountType !== "none" && (
                <div className="w-32">
                  <AffixInput
                    aria-labelledby="dish-discount"
                    value={discount}
                    prefix={discountType === "flat" ? format.symbol : undefined}
                    suffix={discountType === "percentage" ? "%" : undefined}
                    placeholder={discountType === "flat" ? "50" : "10"}
                    onChange={(event) => setDiscount(event.target.value)}
                  />
                </div>
              )}
            </div>
            {show(problems.discount) && <FieldError>{problems.discount}</FieldError>}
          </Field>

          {guestsPay !== null && (
            <p className="flex flex-wrap items-baseline justify-between gap-2 border-t border-border pt-3 text-sm">
              <span className="text-muted-foreground">{t("guestsPay")}</span>
              <span className="flex items-baseline gap-2 tabular-nums">
                {guestsPay < priceTaka! && (
                  <span className="text-xs text-muted-foreground line-through">
                    {format.money(priceTaka!)}
                  </span>
                )}
                <span className="text-md font-bold">{format.money(guestsPay)}</span>
              </span>
            </p>
          )}
        </fieldset>

        <div className="grid gap-3">
          <SwitchRow
            title={t("available")}
            hint={t("availableHint")}
            checked={available}
            onChange={setAvailable}
          />
          <SwitchRow
            title={
              <span className="flex items-center gap-1.5">
                <StarIcon weight="fill" className="size-4 text-brand" />
                {t("featured")}
              </span>
            }
            hint={t("featuredHint")}
            checked={featured}
            onChange={setFeatured}
          />
        </div>
      </SheetBody>

      <SheetFooter className="flex-wrap items-center justify-end">
        {food && (
          <Button
            type="button"
            variant="ghost"
            className="mr-auto text-tone-red-text hover:bg-tone-red-subtle"
            onClick={() => onDelete(food)}
            disabled={save.isPending}
          >
            <TrashIcon />
            {t("delete")}
          </Button>
        )}
        {general && (
          <p role="alert" className="w-full text-sm font-medium text-tone-red-text">
            {errorText.message(save.error)}
          </p>
        )}
        <Button type="button" variant="outline" onClick={onClose} disabled={save.isPending}>
          {t("cancel")}
        </Button>
        <Button type="submit" disabled={save.isPending || uploading}>
          <CheckIcon weight="bold" />
          {save.isPending ? t("saving") : food ? t("save") : t("create")}
        </Button>
      </SheetFooter>
    </form>
  );
}
