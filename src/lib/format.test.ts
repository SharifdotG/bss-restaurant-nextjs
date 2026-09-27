import { describe, expect, it } from "vitest";
import {
  businessDate,
  dhakaDateTime,
  formatDate,
  formatDateTime,
  formatDay,
  formatPercent,
  formatRelative,
  formatTime,
  shortOrderNumber,
  toLatinDigits,
} from "./format";

// 13:45 UTC is 7:45 PM in Dhaka.
const evening = "2026-10-11T13:45:00Z";

describe("dates in Dhaka time", () => {
  it("formats times on a 12-hour clock", () => {
    expect(formatTime(evening, "en")).toBe("7:45 PM");
    expect(formatTime(evening, "bn")).toBe("৭:৪৫ PM");
  });

  it("formats dates and both together", () => {
    expect(formatDate(evening, "en")).toBe("Oct 11, 2026");
    expect(formatDateTime(evening, "en")).toBe("Oct 11, 7:45 PM");
  });

  it("keeps date-only values on their day", () => {
    expect(formatDay("2026-10-11", "en")).toBe("Oct 11, 2026");
  });

  it("rolls the business date over at Dhaka midnight, not UTC", () => {
    expect(businessDate("2026-10-11T17:59:00Z")).toBe("2026-10-11");
    expect(businessDate("2026-10-11T18:00:00Z")).toBe("2026-10-12");
  });

  it("sends wall-clock times with the Dhaka offset", () => {
    expect(dhakaDateTime("2026-10-11", "19:30")).toBe("2026-10-11T19:30:00+06:00");
  });
});

describe("formatRelative", () => {
  const now = Date.parse(evening);

  it("rounds to the nearest sensible unit", () => {
    expect(formatRelative(now - 10_000, "en", now)).toBe("now");
    expect(formatRelative(now - 5 * 60_000, "en", now)).toBe("5 minutes ago");
    expect(formatRelative(now - 3 * 3_600_000, "en", now)).toBe("3 hours ago");
  });

  it("falls back to the date after a day", () => {
    expect(formatRelative(now - 2 * 86_400_000, "en", now)).toBe("Oct 9, 7:45 PM");
  });
});

describe("numbers", () => {
  it("reads Bangla digits", () => {
    expect(toLatinDigits("৳১২৫০.৫০")).toBe("৳1250.50");
  });

  it("formats the API's 0-100 percentages", () => {
    expect(formatPercent(7.5, "en")).toBe("7.5%");
    expect(formatPercent(15, "bn")).toBe("১৫%");
  });

  it("shortens order numbers to the daily counter", () => {
    expect(shortOrderNumber("261011-0022")).toBe("22");
    expect(shortOrderNumber("261011-0100")).toBe("100");
  });
});
