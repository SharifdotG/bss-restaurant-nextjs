import { describe, expect, it } from "vitest";
import {
  addToCart,
  cartTotals,
  draftProblem,
  EMPTY_DRAFT,
  percentOf,
  quantities,
  setLineNote,
  setLineQuantity,
} from "./pos";

const rates = { serviceChargePercent: 5, vatPercent: 7.5 };
// Kacchi Biryani, Shorshe Ilish (৳550 with ৳50 off), Firni, Mineral Water
const prices = new Map([
  [1, 420],
  [2, 500],
  [3, 100],
  [4, 30],
]);

describe("cart lines", () => {
  it("keeps one line per dish and note", () => {
    let lines = addToCart([], 1);
    lines = addToCart(lines, 1);
    lines = addToCart(lines, 1, "Less spicy");
    expect(lines).toEqual([
      { foodId: 1, quantity: 2, notes: null },
      { foodId: 1, quantity: 1, notes: "Less spicy" },
    ]);
    expect(quantities(lines).get(1)).toBe(3);
  });

  it("takes a line out at zero and caps at the API's limit", () => {
    const lines = [{ foodId: 1, quantity: 2, notes: null }];
    expect(setLineQuantity(lines, 0, 0)).toEqual([]);
    expect(setLineQuantity(lines, 0, 250)[0].quantity).toBe(100);
  });

  it("folds a line into its twin when their notes end up the same", () => {
    const lines = [
      { foodId: 1, quantity: 2, notes: "Less spicy" },
      { foodId: 1, quantity: 1, notes: null },
    ];
    expect(setLineNote(lines, 1, " Less spicy ")).toEqual([
      { foodId: 1, quantity: 3, notes: "Less spicy" },
    ]);
    expect(setLineNote(lines, 1, "Extra raita")[1].notes).toBe("Extra raita");
  });
});

describe("totals", () => {
  it("matches the API to the paisa for dine-in", () => {
    const lines = [1, 2, 3, 4].map((foodId) => ({ foodId, quantity: 1, notes: null }));
    expect(cartTotals(lines, prices, "dine_in", rates)).toEqual({
      items: 4,
      food: 105_000,
      service: 5_250,
      vat: 8_269,
      total: 118_519,
    });
  });

  it("skips the service charge for takeaway", () => {
    const lines = [{ foodId: 1, quantity: 1, notes: null }];
    expect(cartTotals(lines, prices, "takeaway", rates)).toMatchObject({
      service: 0,
      vat: 3_150,
      total: 45_150,
    });
  });

  it("rounds half up like the API", () => {
    expect(percentOf(150, 7.5)).toBe(11); // 11.25
    expect(percentOf(100, 7.5)).toBe(8); // 7.5
    expect(percentOf(1, 50)).toBe(1); // 0.5
  });
});

describe("draftProblem", () => {
  it("needs a dish, and a table for dine-in", () => {
    expect(draftProblem(EMPTY_DRAFT)).toBe("empty");
    const lines = [{ foodId: 1, quantity: 1, notes: null }];
    expect(draftProblem({ ...EMPTY_DRAFT, lines })).toBe("table");
    expect(draftProblem({ ...EMPTY_DRAFT, lines, orderType: "takeaway" })).toBeNull();
    expect(draftProblem({ ...EMPTY_DRAFT, lines, tableId: 3 })).toBeNull();
  });
});
