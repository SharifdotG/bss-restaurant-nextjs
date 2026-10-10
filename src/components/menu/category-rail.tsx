"use client";

/* eslint-disable @next/next/no-img-element -- category photos are the API's own WebP */
import { useState } from "react";
import { LazyMotion, Reorder, useDragControls } from "motion/react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  DotsSixVerticalIcon,
  DotsThreeIcon,
  EyeIcon,
  EyeSlashIcon,
  ForkKnifeIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { DishIcon } from "@/components/dish-icon";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { imageUrl } from "@/lib/api/images";
import type { CategoryOut } from "@/lib/api/schema";
import { moveId, reorderChanges } from "@/lib/menu";
import { useReorderCategories } from "@/lib/use-menu-actions";
import { useFormat } from "@/lib/use-format";
import { cn } from "@/lib/utils";

// Reorder renders full motion components, which the app-wide strict LazyMotion refuses.
const loadFeatures = () => import("@/lib/motion-features").then((module) => module.default);

export type CategoryAction = "edit" | "toggle" | "delete";
type Selected = number | "none" | null;

type CategoryRailProps = {
  categories: CategoryOut[];
  counts: Map<number | "none", number>;
  total: number;
  selected: Selected;
  onSelect: (category: Selected) => void;
  /** Managers only: drag, the row menu and adding. */
  editable: boolean;
  onAction: (category: CategoryOut, action: CategoryAction) => void;
  onAdd: () => void;
};

/** The categories down the side of the Menu page, in the order guests and the POS see them. */
export function CategoryRail(props: CategoryRailProps) {
  const { categories, counts, total, selected, onSelect, editable, onAdd } = props;
  const t = useTranslations("menu.categories");
  const format = useFormat();
  const reorder = useReorderCategories();
  const [dragging, setDragging] = useState<number[] | null>(null);
  const order = dragging ?? categories.map((category) => category.id);
  const byId = new Map(categories.map((category) => [category.id, category]));
  const loose = counts.get("none") ?? 0;

  const commit = (next: number[]) => {
    const changes = reorderChanges(categories, next);
    if (changes.length) reorder.mutate(changes);
    setDragging(null);
  };

  return (
    <nav aria-label={t("title")} className="flex flex-col gap-1 rounded-xl bg-card p-3 shadow-md">
      <header className="flex items-center justify-between px-2 pt-1 pb-2">
        <h2 className="text-sm font-bold">{t("title")}</h2>
        {editable && (
          <Button variant="ghost" size="icon-sm" onClick={onAdd} aria-label={t("add")}>
            <PlusIcon weight="bold" />
          </Button>
        )}
      </header>

      <RailRow
        selected={selected === null}
        onClick={() => onSelect(null)}
        thumb={
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary-soft text-primary-soft-foreground">
            <ForkKnifeIcon weight="duotone" className="size-4" />
          </span>
        }
        name={t("all")}
        count={format.number(total)}
      />

      <LazyMotion features={loadFeatures}>
        <Reorder.Group
          axis="y"
          values={order}
          onReorder={setDragging}
          className="flex flex-col gap-1"
        >
          {order.map((id, index) => {
            const category = byId.get(id);
            if (!category) return null;
            return (
              <CategoryItem
                key={id}
                category={category}
                count={format.number(counts.get(id) ?? 0)}
                selected={selected === id}
                first={index === 0}
                last={index === order.length - 1}
                editable={editable}
                onSelect={() => onSelect(id)}
                onDrop={() => dragging && commit(dragging)}
                onMove={(step) => commit(moveId(order, id, step))}
                onAction={(action) => props.onAction(category, action)}
              />
            );
          })}
        </Reorder.Group>
      </LazyMotion>

      {loose > 0 && (
        <RailRow
          selected={selected === "none"}
          onClick={() => onSelect("none")}
          thumb={<DishThumb />}
          name={t("none")}
          count={format.number(loose)}
          muted
        />
      )}

      {editable && categories.length === 0 && (
        <p className="px-2 py-3 text-sm text-muted-foreground">{t("empty")}</p>
      )}
    </nav>
  );
}

type CategoryItemProps = {
  category: CategoryOut;
  count: string;
  selected: boolean;
  first: boolean;
  last: boolean;
  editable: boolean;
  onSelect: () => void;
  onDrop: () => void;
  onMove: (step: -1 | 1) => void;
  onAction: (action: CategoryAction) => void;
};

function CategoryItem({ category, editable, onDrop, onMove, onAction, ...row }: CategoryItemProps) {
  const t = useTranslations("menu.categories");
  const controls = useDragControls();
  const hidden = !category.isActive;

  return (
    <Reorder.Item
      value={category.id}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDrop}
      className="relative rounded-lg bg-card"
      whileDrag={{ scale: 1.03 }}
    >
      <RailRow
        selected={row.selected}
        onClick={row.onSelect}
        muted={hidden}
        thumb={<DishThumb src={category.imageUrl} category={category.name} />}
        name={category.name}
        badge={
          hidden && (
            <EyeSlashIcon
              weight="duotone"
              className="size-4 shrink-0 text-muted-foreground"
              aria-label={t("hiddenBadge")}
            />
          )
        }
        count={row.count}
        start={
          editable && (
            <button
              type="button"
              aria-label={t("drag", { name: category.name })}
              onPointerDown={(event) => controls.start(event)}
              className="grid h-8 w-5 shrink-0 cursor-grab touch-none place-items-center rounded-sm text-muted-foreground opacity-60 outline-none group-hover/row:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/40 active:cursor-grabbing"
            >
              <DotsSixVerticalIcon weight="bold" className="size-4" />
            </button>
          )
        }
        end={
          editable && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 text-muted-foreground"
                    aria-label={t("menu", { name: category.name })}
                  />
                }
              >
                <DotsThreeIcon weight="bold" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-48">
                <DropdownMenuItem onClick={() => onAction("edit")}>
                  <PencilSimpleIcon />
                  {t("edit")}
                </DropdownMenuItem>
                <DropdownMenuItem disabled={row.first} onClick={() => onMove(-1)}>
                  <ArrowUpIcon />
                  {t("moveUp")}
                </DropdownMenuItem>
                <DropdownMenuItem disabled={row.last} onClick={() => onMove(1)}>
                  <ArrowDownIcon />
                  {t("moveDown")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAction("toggle")}>
                  {hidden ? <EyeIcon /> : <EyeSlashIcon />}
                  {hidden ? t("show") : t("hide")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => onAction("delete")}>
                  <TrashIcon />
                  {t("delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        }
      />
    </Reorder.Item>
  );
}

type RailRowProps = {
  selected: boolean;
  onClick: () => void;
  thumb: React.ReactNode;
  name: string;
  count: string;
  badge?: React.ReactNode;
  muted?: boolean;
  start?: React.ReactNode;
  end?: React.ReactNode;
};

function RailRow({
  selected,
  onClick,
  thumb,
  name,
  count,
  badge,
  muted,
  start,
  end,
}: RailRowProps) {
  return (
    <div
      className={cn(
        "group/row flex items-center gap-1 rounded-lg pr-1 transition-colors duration-(--duration-fast)",
        start ? "pl-0.5" : "pl-2",
        selected ? "bg-primary-soft text-primary-soft-foreground" : "hover:bg-muted",
      )}
    >
      {start}
      <button
        type="button"
        aria-current={selected || undefined}
        onClick={onClick}
        className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-md py-1.5 pr-1 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
      >
        {thumb}
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-sm font-medium",
            muted && !selected && "text-muted-foreground",
          )}
        >
          {name}
        </span>
        {badge}
        <span
          className={cn("text-xs tabular-nums", selected ? "font-bold" : "text-muted-foreground")}
        >
          {count}
        </span>
      </button>
      {end}
    </div>
  );
}

function DishThumb({ src, category }: { src?: string | null; category?: string }) {
  const url = imageUrl(src);
  return (
    <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-md bg-muted text-muted-foreground">
      {url ? (
        <img src={url} alt="" loading="lazy" className="size-full object-cover" />
      ) : (
        <DishIcon category={category} className="size-4" />
      )}
    </span>
  );
}

/** Phones and tablets: the same categories as a row of chips above the dishes. */
export function CategoryChips({
  categories,
  counts,
  total,
  selected,
  onSelect,
}: Pick<CategoryRailProps, "categories" | "counts" | "total" | "selected" | "onSelect">) {
  const t = useTranslations("menu.categories");
  const format = useFormat();
  const loose = counts.get("none") ?? 0;

  return (
    <div
      role="group"
      aria-label={t("title")}
      className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1 md:-mx-6 md:px-6"
    >
      <Chip pressed={selected === null} onClick={() => onSelect(null)}>
        {t("all")} <Count>{format.number(total)}</Count>
      </Chip>
      {categories.map((category) => (
        <Chip
          key={category.id}
          pressed={selected === category.id}
          onClick={() => onSelect(category.id)}
          className={cn(!category.isActive && "border-dashed")}
        >
          {!category.isActive && <EyeSlashIcon weight="duotone" />}
          {category.name} <Count>{format.number(counts.get(category.id) ?? 0)}</Count>
        </Chip>
      ))}
      {loose > 0 && (
        <Chip pressed={selected === "none"} onClick={() => onSelect("none")}>
          {t("none")} <Count>{format.number(loose)}</Count>
        </Chip>
      )}
    </div>
  );
}

const Count = ({ children }: { children: React.ReactNode }) => (
  <span className="text-xs tabular-nums opacity-70">{children}</span>
);
