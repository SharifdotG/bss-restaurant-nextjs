"use client";

import { useState } from "react";
import {
  ArrowsClockwiseIcon,
  CloudSlashIcon,
  EyeSlashIcon,
  ForkKnifeIcon,
  FunnelSimpleIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PlusIcon,
  StackPlusIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/empty-state";
import { PageFrame } from "@/components/shell/page-frame";
import { Button } from "@/components/ui/button";
import { IconInput } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { allCategoriesQuery, foodsQuery } from "@/lib/api/queries";
import type { CategoryOut, FoodOut } from "@/lib/api/schema";
import { useErrorText } from "@/lib/api/use-error-text";
import { countByCategory, matchesFood, MENU_SHOWS } from "@/lib/menu";
import { can } from "@/lib/permissions";
import { useSession } from "@/lib/session/client";
import { useSaveCategory, useSaveFood } from "@/lib/use-menu-actions";
import { useShellLayout } from "@/lib/use-shell-layout";
import { cn } from "@/lib/utils";
import { CategoryChips, CategoryRail, type CategoryAction } from "./category-rail";
import { CategorySheet, type CategorySheetStart } from "./category-sheet";
import { DishRows, DishTable, type DishAction } from "./dish-list";
import { DishSheet, type DishSheetStart } from "./dish-sheet";
import { DeleteCategoryDialog, DeleteDishDialog } from "./menu-dialogs";
import { useMenuUrl } from "./use-menu-url";

type Dialog = { kind: "category"; category: CategoryOut } | { kind: "dish"; food: FoodOut };

/** Dishes by category: managers edit everything, chefs flip sold out, the floor reads it. */
export function MenuPage() {
  const t = useTranslations("menu");
  const errorText = useErrorText();
  const session = useSession();
  const layout = useShellLayout();
  const url = useMenuUrl();
  const foods = useQuery(foodsQuery);
  const categoriesQuery = useQuery(allCategoriesQuery);
  const saveFood = useSaveFood();
  const saveCategory = useSaveCategory();
  const [dishSheet, setDishSheet] = useState<DishSheetStart>(null);
  const [categorySheet, setCategorySheet] = useState<CategorySheetStart>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  if (session.status !== "authenticated") return null;

  const role = session.user.role;
  const editable = can(role, "menu.edit");
  const canSellOut = can(role, "menu.soldOut");
  const phone = layout === "phone";
  const withRail = layout === "rail" || layout === "full";

  const all = foods.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const counts = countByCategory(all);
  const picked =
    typeof url.category === "number" ? categories.find((c) => c.id === url.category) : undefined;
  const filter = { category: url.category, search: url.search, show: url.show };
  const shown = all.filter((food) => matchesFood(food, filter));
  const filtered = Boolean(url.search) || url.show !== "all";
  const soldOut = all.filter((food) => !food.isAvailable).length;

  const onDish = (food: FoodOut, action: DishAction) => {
    if (action === "edit") setDishSheet({ food });
    else if (action === "delete") setDialog({ kind: "dish", food });
    else saveFood.mutate({ id: food.id, body: { isFeatured: !food.isFeatured } });
  };

  const onCategory = (category: CategoryOut, action: CategoryAction) => {
    if (action === "edit") setCategorySheet({ category });
    else if (action === "delete") setDialog({ kind: "category", category });
    else saveCategory.mutate({ id: category.id, body: { isActive: !category.isActive } });
  };

  const newDish = () =>
    setDishSheet({ categoryId: typeof url.category === "number" ? url.category : null });

  const listProps = {
    foods: shown,
    showCategory: url.category === null,
    besideRail: withRail,
    editable,
    canSellOut,
    onAction: onDish,
  };

  let body: React.ReactNode;
  if (foods.isError && !foods.data) {
    body = (
      <EmptyState
        icon={CloudSlashIcon}
        tone="slate"
        title={t("failed")}
        action={
          <Button variant="outline" onClick={() => void foods.refetch()}>
            <ArrowsClockwiseIcon />
            {t("retry")}
          </Button>
        }
      >
        {errorText.message(foods.error)}
      </EmptyState>
    );
  } else if (!foods.data) {
    body = (
      <div aria-busy className="grid gap-2 p-4">
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    );
  } else if (all.length === 0) {
    body = (
      <EmptyState
        icon={ForkKnifeIcon}
        title={t("emptyTitle")}
        action={
          editable && (
            <Button onClick={newDish}>
              <PlusIcon weight="bold" />
              {t("newDish")}
            </Button>
          )
        }
      >
        {editable ? t("empty") : t("emptyReadOnly")}
      </EmptyState>
    );
  } else if (shown.length === 0) {
    body = (
      <EmptyState
        icon={FunnelSimpleIcon}
        tone="slate"
        title={filtered ? t("noMatch") : t("emptyCategory")}
        action={
          filtered ? (
            <Button
              variant="outline"
              onClick={() => {
                url.setSearch("");
                url.setShow("all");
              }}
            >
              {t("clearFilters")}
            </Button>
          ) : (
            editable && (
              <Button onClick={newDish}>
                <PlusIcon weight="bold" />
                {t("newDish")}
              </Button>
            )
          )
        }
      />
    );
  } else {
    body = phone ? <DishRows {...listProps} /> : <DishTable {...listProps} />;
  }

  return (
    <PageFrame
      page="menu"
      meta={
        foods.data &&
        [
          t("meta", { n: all.length, categories: categories.length }),
          soldOut > 0 && t("metaSoldOut", { n: soldOut }),
        ]
          .filter(Boolean)
          .join(" · ")
      }
      actions={
        editable && (
          <>
            <Button variant="outline" onClick={() => setCategorySheet({})}>
              <StackPlusIcon />
              <span className="hidden sm:inline">{t("newCategory")}</span>
              <span className="sr-only sm:hidden">{t("newCategory")}</span>
            </Button>
            <Button onClick={newDish}>
              <PlusIcon weight="bold" />
              {t("newDish")}
            </Button>
          </>
        )
      }
    >
      <div className={cn("grid items-start gap-6", withRail && "grid-cols-[17rem_minmax(0,1fr)]")}>
        {withRail && (
          <div className="sticky top-20">
            <CategoryRail
              categories={categories}
              counts={counts}
              total={all.length}
              selected={url.category}
              onSelect={url.setCategory}
              editable={editable}
              onAction={onCategory}
              onAdd={() => setCategorySheet({})}
            />
          </div>
        )}

        <div className="grid min-w-0 gap-4">
          {!withRail && categories.length > 0 && (
            <CategoryChips
              categories={categories}
              counts={counts}
              total={all.length}
              selected={url.category}
              onSelect={url.setCategory}
            />
          )}

          <section className="min-w-0 overflow-hidden rounded-xl bg-card shadow-md">
            {picked && (
              <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 md:px-6">
                <div className="min-w-0">
                  <h2 className="flex items-center gap-2 text-md font-bold">
                    {picked.name}
                    {!picked.isActive && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                        <EyeSlashIcon weight="duotone" className="size-4" />
                        {t("categories.hiddenBadge")}
                      </span>
                    )}
                  </h2>
                  {picked.description && (
                    <p className="mt-0.5 text-sm text-pretty text-muted-foreground">
                      {picked.description}
                    </p>
                  )}
                </div>
                {editable && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCategorySheet({ category: picked })}
                  >
                    <PencilSimpleIcon />
                    {t("categories.edit")}
                  </Button>
                )}
              </header>
            )}

            <div className="flex flex-wrap items-center gap-2.5 p-4 md:px-5">
              <div className="w-full sm:w-72">
                <IconInput
                  icon={MagnifyingGlassIcon}
                  type="search"
                  value={url.search}
                  onChange={(event) => url.setSearch(event.target.value)}
                  placeholder={t("search")}
                  aria-label={t("search")}
                  className="w-full"
                />
              </div>
              <div className="-mx-4 [scrollbar-width:none] overflow-x-auto px-4 sm:mx-0 sm:ml-auto sm:px-0">
                <Segmented
                  aria-label={t("showLabel")}
                  value={url.show}
                  onValueChange={url.setShow}
                  options={MENU_SHOWS.map((show) => ({ value: show, label: t(`show.${show}`) }))}
                />
              </div>
            </div>

            <div className="border-t border-border">{body}</div>
          </section>
        </div>
      </div>

      <DishSheet
        start={dishSheet}
        categories={categories}
        onClose={() => setDishSheet(null)}
        onDelete={(food) => {
          setDishSheet(null);
          setDialog({ kind: "dish", food });
        }}
      />
      <CategorySheet
        start={categorySheet}
        nextPosition={categories.length}
        onClose={() => setCategorySheet(null)}
      />
      {dialog?.kind === "dish" && (
        <DeleteDishDialog food={dialog.food} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === "category" && (
        <DeleteCategoryDialog
          category={dialog.category}
          onClose={(deleted) => {
            if (deleted && url.category === dialog.category.id) url.setCategory(null);
            setDialog(null);
          }}
        />
      )}
    </PageFrame>
  );
}
