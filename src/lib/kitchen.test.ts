import { beforeEach, describe, expect, it } from "vitest";
import type { LiveOrder } from "@/lib/live/types";
import { kitchenBoard, prepByName, ticketClock, ticketLines } from "./kitchen";
import { forgetTickets, syncTickets } from "./kitchen-tickets";

const NOW = Date.parse("2026-10-11T15:05:00Z"); // 9:05 pm in Dhaka
const ago = (n: number) => new Date(NOW - n * 60_000).toISOString();

type Item = LiveOrder["items"][number];
const item = (foodName: string, quantity = 1, notes: string | null = null): Item => ({
  foodName,
  quantity,
  notes,
});

const order = (
  id: number,
  status: LiveOrder["status"],
  items: Item[] = [item("Borhani")],
  createdAt = ago(10),
  updatedAt = createdAt,
) => ({ id, status, items, createdAt, updatedAt }) as LiveOrder;

describe("kitchenBoard", () => {
  it("leaves pending, served and paid orders off the board", () => {
    const board = kitchenBoard(
      [order(1, "pending"), order(2, "confirmed"), order(3, "preparing"), order(4, "served")],
      new Map(),
    );
    expect(board.toCook.map((o) => o.id)).toEqual([2]);
    expect(board.cooking.map((o) => o.id)).toEqual([3]);
    expect(board.ready).toEqual([]);
  });

  it("shows a bump in its undo window in the column it's heading for", () => {
    const board = kitchenBoard([order(1, "confirmed")], new Map([[1, "preparing"]]));
    expect(board.toCook).toEqual([]);
    expect(board.cooking[0]).toMatchObject({ id: 1, status: "preparing" });
  });

  it("queues ready food by when it was plated", () => {
    const board = kitchenBoard(
      [order(1, "ready", [], ago(30), ago(2)), order(2, "ready", [], ago(20), ago(8))],
      new Map(),
    );
    expect(board.ready.map((o) => o.id)).toEqual([2, 1]);
  });
});

describe("ticketClock", () => {
  const prep = prepByName([
    { name: "Kacchi Biryani", preparationMinutes: 20 },
    { name: "Borhani", preparationMinutes: 2 },
    { name: "Fuchka", preparationMinutes: null },
  ]);

  it("paces a ticket by its slowest dish", () => {
    const biryani = [item("Kacchi Biryani"), item("Borhani")];
    expect(ticketClock(order(1, "preparing", biryani, ago(19)), prep, NOW).tone).toBe("slate");
    expect(ticketClock(order(1, "preparing", biryani, ago(20)), prep, NOW).tone).toBe("amber");
    expect(ticketClock(order(1, "preparing", biryani, ago(30)), prep, NOW)).toEqual({
      minutes: 30,
      tone: "red",
    });
  });

  it("falls back to 15 and 30 minutes without prep times", () => {
    const fuchka = [item("Fuchka")];
    expect(ticketClock(order(1, "confirmed", fuchka, ago(15)), prep, NOW).tone).toBe("amber");
    expect(ticketClock(order(1, "confirmed", fuchka, ago(29)), prep, NOW).tone).toBe("amber");
    expect(ticketClock(order(1, "confirmed", fuchka, ago(30)), prep, NOW).tone).toBe("red");
  });

  it("times ready food from when it was plated", () => {
    const ready = order(1, "ready", [item("Fuchka")], ago(40), ago(6));
    expect(ticketClock(ready, prep, NOW)).toEqual({ minutes: 6, tone: "amber" });
  });
});

describe("ticketLines", () => {
  it("merges the same dish and note, and marks what came after cooking started", () => {
    const items = [item("Borhani", 1), item("Kacchi Biryani", 2, "Less spicy"), item("Borhani", 2)];
    const lines = ticketLines(items, { "Borhani\u0000": 1, "Kacchi Biryani\u0000Less spicy": 2 });
    expect(lines).toEqual([
      expect.objectContaining({ foodName: "Borhani", quantity: 3, added: 2 }),
      expect.objectContaining({ foodName: "Kacchi Biryani", quantity: 2, added: 0 }),
    ]);
  });
});

describe("syncTickets", () => {
  beforeEach(() => forgetTickets());

  it("announces only tickets that arrive after the first look", () => {
    expect(syncTickets([order(1, "confirmed")]).fresh).toEqual([]);
    expect(syncTickets([order(1, "confirmed"), order(2, "confirmed")]).fresh).toEqual([2]);
  });

  it("flags food added to a ticket that's already cooking", () => {
    syncTickets([order(1, "preparing", [item("Borhani")])]);
    expect(syncTickets([order(1, "preparing", [item("Borhani")])]).added).toEqual([]);
    const news = syncTickets([order(1, "preparing", [item("Borhani"), item("Fuchka")])]);
    expect(news.added).toEqual([1]);
    // The same addition isn't news twice.
    expect(syncTickets([order(1, "preparing", [item("Borhani"), item("Fuchka")])]).added).toEqual(
      [],
    );
  });
});
