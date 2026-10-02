import {
  BowlFoodIcon,
  CakeIcon,
  CoffeeIcon,
  CookingPotIcon,
  FireSimpleIcon,
  ForkKnifeIcon,
  HamburgerIcon,
  type Icon,
} from "@phosphor-icons/react";

// Menus are named by the restaurant, so the icon is a guess from the category's name.
export const DISH_ICONS = {
  drink: CoffeeIcon,
  dessert: CakeIcon,
  grill: FireSimpleIcon,
  curry: CookingPotIcon,
  rice: BowlFoodIcon,
  starter: HamburgerIcon,
  dish: ForkKnifeIcon,
} satisfies Record<string, Icon>;

const KINDS: [RegExp, keyof typeof DISH_ICONS][] = [
  [/drink|beverage|juice|tea|coffee|lassi|পানীয়/i, "drink"],
  [/dessert|sweet|mishti|মিষ্টি/i, "dessert"],
  [/grill|kebab|bbq|tandoor/i, "grill"],
  [/curr|bhuna|তরকারি/i, "curry"],
  [/rice|biryani|polao|khichuri|ভাত/i, "rice"],
  [/starter|snack|appetiser|appetizer|burger/i, "starter"],
];

export function dishKind(categoryName: string | undefined): keyof typeof DISH_ICONS {
  if (!categoryName) return "dish";
  return KINDS.find(([pattern]) => pattern.test(categoryName))?.[1] ?? "dish";
}

/** Stands in for a dish photo: a drawn icon for the kind of dish. */
export function DishIcon({ category, className }: { category?: string; className?: string }) {
  const Icon = DISH_ICONS[dishKind(category)];
  return <Icon weight="duotone" className={className} />;
}
