import { describe, expect, it } from "vitest";
import { openingState } from "./hours";

// 8:54 pm on Sunday in Dhaka is 14:54 UTC.
const at = (dhaka: string) => new Date(`2026-10-11T${dhaka}:00+06:00`);

describe("openingState", () => {
  it("is open during the day and names the closing time", () => {
    expect(openingState(at("20:54"), "11:00:00", "23:00:00")).toEqual({
      open: true,
      until: "23:00:00",
    });
  });

  it("is closed before opening and after closing", () => {
    expect(openingState(at("09:30"), "11:00:00", "23:00:00")).toEqual({
      open: false,
      until: "11:00:00",
    });
    expect(openingState(at("23:00"), "11:00:00", "23:00:00").open).toBe(false);
  });

  it("handles hours that run past midnight", () => {
    expect(openingState(at("01:15"), "17:00:00", "02:00:00").open).toBe(true);
    expect(openingState(at("03:00"), "17:00:00", "02:00:00")).toEqual({
      open: false,
      until: "17:00:00",
    });
  });
});
