import { describe, expect, it } from "vitest";
import { changeDue, formatMoney, parseMoney, splitEvenly, toPaisa } from "./money";

describe("toPaisa", () => {
  it("keeps float noise out of sums", () => {
    expect(toPaisa(0.1) + toPaisa(0.2)).toBe(30);
    expect(toPaisa(654.68)).toBe(65468);
    expect(toPaisa(1.15)).toBe(115);
  });
});

describe("formatMoney", () => {
  it("puts the symbol first with lakh grouping", () => {
    expect(formatMoney(123456.5, "en")).toBe("৳1,23,456.50");
    expect(formatMoney(123456.5, "bn")).toBe("৳১,২৩,৪৫৬.৫০");
  });

  it("always shows two decimals", () => {
    expect(formatMoney(650, "en")).toBe("৳650.00");
    expect(formatMoney(0, "en")).toBe("৳0.00");
  });

  it("marks refunds with a minus sign and uses the restaurant's symbol", () => {
    expect(formatMoney(-50, "en")).toBe("−৳50.00");
    expect(formatMoney(12.5, "en", "Tk ")).toBe("Tk 12.50");
  });
});

describe("parseMoney", () => {
  it.each([
    ["1250", 125000],
    ["1,250.5", 125050],
    ["৳ 1250.05", 125005],
    ["১২৫০.৫০", 125050],
    ["1250.", 125000],
    [".5", 50],
    ["0", 0],
  ])("reads %s", (input, paisa) => {
    expect(parseMoney(input)).toBe(paisa);
  });

  it.each(["", " ", ".", "-5", "12.345", "1e3", "abc", "12..5"])("rejects %j", (input) => {
    expect(parseMoney(input)).toBeNull();
  });
});

describe("till maths", () => {
  it("never gives negative change", () => {
    expect(changeDue(100000, 65468)).toBe(34532);
    expect(changeDue(50000, 65468)).toBe(0);
  });

  it("splits a bill without losing a paisa", () => {
    const parts = splitEvenly(65468, 3);
    expect(parts).toEqual([21823, 21823, 21822]);
    expect(parts.reduce((sum, part) => sum + part, 0)).toBe(65468);
    expect(splitEvenly(1000, 0)).toEqual([1000]);
  });
});
