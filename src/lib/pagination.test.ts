import { describe, expect, it } from "vitest";
import { pageRange, pageWindow } from "./pagination";

describe("pageWindow", () => {
  it("lists every page when there are few", () => {
    expect(pageWindow(1, 1)).toEqual([1]);
    expect(pageWindow(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("keeps the ends and the neighbours of the current page", () => {
    expect(pageWindow(2, 12)).toEqual([1, 2, 3, 4, 5, "gap", 12]);
    expect(pageWindow(6, 12)).toEqual([1, "gap", 5, 6, 7, "gap", 12]);
    expect(pageWindow(11, 12)).toEqual([1, "gap", 8, 9, 10, 11, 12]);
  });
});

describe("pageRange", () => {
  it("numbers the rows on a page", () => {
    expect(pageRange(1, 10, 24)).toEqual({ from: 1, to: 10 });
    expect(pageRange(3, 10, 24)).toEqual({ from: 21, to: 24 });
    expect(pageRange(1, 10, 0)).toEqual({ from: 0, to: 0 });
  });
});
