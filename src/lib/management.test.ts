import { describe, expect, it } from "vitest";
import type { CategoryOut, EmployeeOut, ExpenseOut, FoodOut, UserOut } from "@/lib/api/schema";
import { matchesExpense, monthRange, shiftMonth, spendByCategory } from "./expenses";
import { parsePercent } from "./money";
import { billTotals, settingsChanges, timeSteps } from "./settings";
import { discountProblem, finalPrice, matchesFood, moveId, reorderChanges } from "./menu";
import {
  accountActions,
  accountsOnly,
  generatePassword,
  grantableRoles,
  matchesEmployee,
  passwordProblem,
  signInState,
  tableRuns,
} from "./staff";

describe("finalPrice", () => {
  it("takes a percentage off, rounding half up to the paisa", () => {
    expect(finalPrice(320, "percentage", 15)).toBe(272);
    expect(finalPrice(99.99, "percentage", 12.5)).toBe(87.49);
    expect(finalPrice(0.05, "percentage", 50)).toBe(0.03);
  });

  it("takes a flat amount off and never goes below zero", () => {
    expect(finalPrice(250, "flat", 30.5)).toBe(219.5);
    expect(finalPrice(20, "flat", 25)).toBe(0);
  });

  it("leaves the price alone without a discount", () => {
    expect(finalPrice(180, "none", 40)).toBe(180);
  });
});

describe("discountProblem", () => {
  it("matches the API's two rules", () => {
    expect(discountProblem(200, "percentage", 101)).toBe("overHundred");
    expect(discountProblem(200, "percentage", 100)).toBeNull();
    expect(discountProblem(200, "flat", 200.01)).toBe("overPrice");
    expect(discountProblem(200, "flat", 200)).toBeNull();
    expect(discountProblem(200, "none", 999)).toBeNull();
  });
});

const food = (id: number, extra: Partial<FoodOut> = {}) =>
  ({
    id,
    name: `Dish ${id}`,
    description: null,
    category: { id: 1, name: "Curries" },
    isAvailable: true,
    isFeatured: false,
    hasDiscount: false,
    ...extra,
  }) as FoodOut;

describe("matchesFood", () => {
  const all = { category: null, search: "", show: "all" as const };

  it("filters by category, including dishes without one", () => {
    const loose = food(2, { category: null });
    expect(matchesFood(food(1), { ...all, category: 1 })).toBe(true);
    expect(matchesFood(food(1), { ...all, category: 2 })).toBe(false);
    expect(matchesFood(loose, { ...all, category: "none" })).toBe(true);
    expect(matchesFood(food(1), { ...all, category: "none" })).toBe(false);
  });

  it("filters by state and searches the description too", () => {
    expect(matchesFood(food(1, { isAvailable: false }), { ...all, show: "soldOut" })).toBe(true);
    expect(matchesFood(food(1), { ...all, show: "featured" })).toBe(false);
    expect(matchesFood(food(1, { hasDiscount: true }), { ...all, show: "discounted" })).toBe(true);
    const dal = food(3, { name: "Dal", description: "Yellow lentils with ghee" });
    expect(matchesFood(dal, { ...all, search: "LENTIL" })).toBe(true);
    expect(matchesFood(dal, { ...all, search: "fish" })).toBe(false);
  });
});

describe("category order", () => {
  const categories = [0, 1, 2, 3].map(
    (sortOrder) => ({ id: sortOrder + 10, sortOrder }) as CategoryOut,
  );

  it("only patches the categories that moved", () => {
    expect(reorderChanges(categories, [10, 12, 11, 13])).toEqual([
      { id: 12, sortOrder: 1 },
      { id: 11, sortOrder: 2 },
    ]);
    expect(reorderChanges(categories, [10, 11, 12, 13])).toEqual([]);
  });

  it("moves one step and stops at the ends", () => {
    expect(moveId([1, 2, 3], 3, -1)).toEqual([1, 3, 2]);
    expect(moveId([1, 2, 3], 1, -1)).toEqual([1, 2, 3]);
    expect(moveId([1, 2, 3], 3, 1)).toEqual([1, 2, 3]);
  });
});

const person = (id: number, extra: Partial<EmployeeOut> = {}) =>
  ({
    id,
    fullName: `Person ${id}`,
    designation: "Waiter",
    phone: null,
    email: null,
    isActive: true,
    account: null,
    ...extra,
  }) as EmployeeOut;

const account = (id: number, role: UserOut["role"], isActive = true) =>
  ({ id, email: `${id}@x.com`, role, isActive, lastLoginAt: null }) as EmployeeOut["account"];

describe("staff", () => {
  it("knows whether someone can sign in", () => {
    expect(signInState(person(1))).toBe("none");
    expect(signInState(person(1, { account: account(5, "waiter") }))).toBe("on");
    expect(signInState(person(1, { account: account(5, "waiter", false) }))).toBe("off");
  });

  it("finds logins with no staff record", () => {
    const users = [{ id: 5 }, { id: 9 }] as UserOut[];
    expect(accountsOnly(users, [person(1, { account: account(5, "chef") })])).toEqual([{ id: 9 }]);
  });

  it("only lets admins hand out manager and admin", () => {
    expect(grantableRoles("manager")).toEqual(["waiter", "chef", "cashier"]);
    expect(grantableRoles("admin")).toContain("manager");
  });

  it("filters current, left and people without a sign-in", () => {
    const query = { search: "", role: null, show: "current" as const };
    const left = person(2, { isActive: false });
    const chef = person(3, { account: account(7, "chef"), designation: "Head chef" });
    expect(matchesEmployee(left, query)).toBe(false);
    expect(matchesEmployee(left, { ...query, show: "left" })).toBe(true);
    expect(matchesEmployee(chef, { ...query, show: "noSignIn" })).toBe(false);
    expect(matchesEmployee(chef, { ...query, role: "chef" })).toBe(true);
    expect(matchesEmployee(chef, { ...query, role: "waiter" })).toBe(false);
    expect(matchesEmployee(chef, { ...query, search: "head" })).toBe(true);
  });
});

describe("accountActions", () => {
  const manager = { id: 1, role: "manager" as const };

  it("offers a sign-in to people without one", () => {
    expect(accountActions(manager, person(2))).toEqual(["account", "left"]);
  });

  it("lets managers run floor sign-ins but not other managers'", () => {
    expect(accountActions(manager, person(2, { account: account(9, "waiter") }))).toEqual([
      "password",
      "role",
      "signInOff",
      "left",
    ]);
    expect(accountActions(manager, person(2, { account: account(9, "manager") }))).toEqual([]);
    expect(accountActions(manager, person(2, { account: account(9, "manager", false) }))).toEqual([
      "left",
    ]);
    expect(
      accountActions({ id: 1, role: "admin" }, person(2, { account: account(9, "manager") })),
    ).toContain("role");
  });

  it("leaves your own record and people who left alone", () => {
    expect(accountActions(manager, person(2, { account: account(1, "manager") }))).toEqual([]);
    expect(accountActions(manager, person(2, { isActive: false }))).toEqual([]);
  });
});

describe("passwords", () => {
  it("generates something the API accepts and a person can read", () => {
    for (let i = 0; i < 50; i++) {
      const password = generatePassword();
      expect(passwordProblem(password)).toBeNull();
      expect(password).toMatch(/^[A-Z][a-z]{3}-[a-z]{4}-[2-9]{2}$/);
    }
    expect(generatePassword(() => Array(10).fill(0))).toBe("Baba-baba-22");
  });

  it("checks the API's password rule", () => {
    expect(passwordProblem("abc1")).toBe("short");
    expect(passwordProblem("abcdefgh")).toBe("mix");
    expect(passwordProblem("12345678")).toBe("mix");
    expect(passwordProblem("kitchen42")).toBeNull();
    expect(passwordProblem(`a1${"x".repeat(127)}`)).toBe("long");
  });
});

describe("expense months", () => {
  it("moves across years", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });

  it("stops this month at today and covers past months whole", () => {
    expect(monthRange("2026-10", "2026-10-13")).toEqual({ from: "2026-10-01", to: "2026-10-13" });
    expect(monthRange("2026-02", "2026-10-13")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
  });

  const expense = (amount: number, category: ExpenseOut["category"], extra = {}) =>
    ({ amount, category, title: "Gas", paidTo: null, notes: null, ...extra }) as ExpenseOut;

  it("adds up per category without float drift", () => {
    const { total, categories } = spendByCategory([
      expense(0.1, "supplies"),
      expense(0.2, "supplies"),
      expense(60000, "rent"),
    ]);
    expect(total).toBe(60000.3);
    expect(categories.map((c) => [c.category, c.amount, c.count])).toEqual([
      ["rent", 60000, 1],
      ["supplies", 0.3, 2],
    ]);
  });

  it("filters by category and searches who was paid", () => {
    const gas = expense(900, "utilities", { paidTo: "Titas Gas" });
    expect(matchesExpense(gas, { categories: ["utilities"], search: "titas" })).toBe(true);
    expect(matchesExpense(gas, { categories: ["rent"], search: "" })).toBe(false);
  });
});

describe("settings", () => {
  it("adds service charge on the food and VAT on both, like the API", () => {
    expect(billTotals(1000, 5, 7.5)).toEqual({ service: 50, vat: 78.75, total: 1128.75 });
    expect(billTotals(333.33, 0, 15)).toEqual({ service: 0, vat: 50, total: 383.33 });
  });

  it("steps through the day", () => {
    const steps = timeSteps(30);
    expect(steps).toHaveLength(48);
    expect(steps.slice(0, 3)).toEqual(["00:00", "00:30", "01:00"]);
    expect(steps.at(-1)).toBe("23:30");
  });

  it("sends only the fields that changed", () => {
    const saved = {
      name: "Shorshe",
      address: null,
      vatPercent: 7.5,
      opensAt: "11:00:00",
      acceptsQrOrders: true,
    } as unknown as Parameters<typeof settingsChanges>[0];
    expect(
      settingsChanges(saved, {
        name: "Shorshe",
        address: null,
        vatPercent: 10,
        opensAt: "11:00",
        acceptsQrOrders: false,
      }),
    ).toEqual({ vatPercent: 10, acceptsQrOrders: false });
  });

  it("reads percentages with up to two decimals in either digits", () => {
    expect(parsePercent("7.5")).toBe(7.5);
    expect(parsePercent("১৫")).toBe(15);
    expect(parsePercent("7.555")).toBeNull();
    expect(parsePercent("")).toBeNull();
  });
});

describe("tableRuns", () => {
  it("folds back-to-back tables into ranges", () => {
    expect(tableRuns(["T3", "T1", "T2", "R1", "R2", "R3", "T7"])).toBe("R1–R3, T1–T3, T7");
    expect(tableRuns(["T1"])).toBe("T1");
    expect(tableRuns(["T1", "T3"])).toBe("T1, T3");
    expect(tableRuns(["Patio", "T1", "T2"])).toBe("Patio, T1–T2");
  });
});
