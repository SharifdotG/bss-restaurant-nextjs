import { describe, expect, it } from "vitest";
import type { LiveOrder } from "@/lib/live/types";
import {
  amountText,
  billQueue,
  pressKey,
  quickCash,
  refundProblem,
  shares,
  tillChange,
  tillProblem,
  type PadKey,
  type TillInput,
} from "./billing";

const order = (
  id: number,
  status: LiveOrder["status"],
  total: number,
  balanceDue = total,
  minutesAgo = 10,
) =>
  ({
    id,
    status,
    total,
    balanceDue,
    createdAt: new Date(Date.parse("2026-10-12T14:00:00Z") - minutesAgo * 60_000).toISOString(),
  }) as LiveOrder;

describe("billQueue", () => {
  it("puts served and part-paid bills first, oldest at the top", () => {
    const queue = billQueue([
      order(1, "served", 500, 500, 5),
      order(2, "preparing", 800, 300, 20),
      order(3, "served", 200, 200, 30),
    ]);
    expect(queue.waiting.map((o) => o.id)).toEqual([3, 2, 1]);
    expect(queue.kitchen).toEqual([]);
  });

  it("lets food still cooking be paid early, and keeps paid-but-not-served orders in view", () => {
    const queue = billQueue([
      order(1, "confirmed", 400),
      order(2, "ready", 600, 0),
      order(3, "preparing", 900),
    ]);
    expect(queue.kitchen.map((o) => o.id)).toEqual([1, 3]);
    expect(queue.prepaid.map((o) => o.id)).toEqual([2]);
  });

  it("leaves out orders nobody accepted yet and closed ones", () => {
    const queue = billQueue([order(1, "pending", 300), order(2, "cancelled", 300, 0)]);
    expect(queue).toEqual({ waiting: [], kitchen: [], prepaid: [] });
  });
});

describe("quickCash", () => {
  it("offers the exact amount, then the next round notes", () => {
    expect(quickCash(58_025)).toEqual([58_025, 60_000, 100_000]);
  });

  it("goes one note up when the bill is already round", () => {
    expect(quickCash(60_000)).toEqual([60_000, 70_000, 100_000]);
    expect(quickCash(100_000)).toEqual([100_000, 110_000, 150_000, 200_000]);
  });

  it("has nothing to offer on a settled bill", () => {
    expect(quickCash(0)).toEqual([]);
  });
});

describe("shares", () => {
  it("splits to the paisa, the first payer covering the odd one", () => {
    expect(shares(100_001, 3)).toEqual([33_334, 33_334, 33_333]);
  });
});

describe("till", () => {
  const cash = (amount: number | null, tendered: number | null): TillInput => ({
    method: "cash",
    amount,
    tendered,
    reference: "",
  });

  it("works out change on cash only", () => {
    expect(tillChange(cash(58_025, 100_000))).toBe(41_975);
    expect(tillChange({ ...cash(58_025, null), method: "card" })).toBe(0);
  });

  it("says why a payment can't go through, in the same order as the API checks", () => {
    expect(tillProblem(cash(null, null), 50_000)).toBe("noAmount");
    expect(tillProblem(cash(60_000, null), 50_000)).toBe("tooMuch");
    expect(tillProblem(cash(50_000, 20_000), 50_000)).toBe("notEnoughCash");
    expect(
      tillProblem({ method: "mobile", amount: 100, tendered: null, reference: " " }, 500),
    ).toBe("needsReference");
    expect(tillProblem(cash(50_000, 50_000), 50_000)).toBeNull();
  });
});

describe("pressKey", () => {
  const type = (keys: PadKey[]) => keys.reduce(pressKey, "");

  it("builds an amount the way a calculator does", () => {
    expect(type(["5", "0", "0"])).toBe("500");
    expect(type([".", "5"])).toBe("0.5");
    expect(type(["0", "7"])).toBe("7");
  });

  it("stops at two decimal places and a single point", () => {
    expect(type(["1", ".", "2", "5", "9", "."])).toBe("1.25");
  });

  it("deletes and clears", () => {
    expect(type(["1", "2", "back"])).toBe("1");
    expect(type(["1", "2", "clear"])).toBe("");
  });
});

describe("amountText", () => {
  it("drops .00 and leaves empty for nothing", () => {
    expect(amountText(40_635)).toBe("406.35");
    expect(amountText(50_000)).toBe("500");
    expect(amountText(5_050)).toBe("50.50");
    expect(amountText(0)).toBe("");
  });
});

describe("refundProblem", () => {
  it("wants an amount within what was paid, and a reason", () => {
    expect(refundProblem(null, 1000, "cold")).toBe("noAmount");
    expect(refundProblem(1200, 1000, "cold")).toBe("tooMuch");
    expect(refundProblem(500, 1000, " a ")).toBe("needsReason");
    expect(refundProblem(1000, 1000, "Cold rezala")).toBeNull();
  });
});
