import { describe, expect, it } from "vitest";
import type { OrderItemOut, StatusEventOut } from "@/lib/api/schema";
import { draftChanged, draftPayload, stepEvents, stepStates, toDraft } from "./order-detail";

const event = (
  fromStatus: StatusEventOut["fromStatus"],
  toStatus: StatusEventOut["toStatus"],
  at: string,
) => ({ fromStatus, toStatus, createdAt: at, changedBy: null, note: null }) as StatusEventOut;

const history = [
  event(null, "pending", "2026-10-11T14:35:00Z"),
  event("pending", "confirmed", "2026-10-11T14:36:00Z"),
  event("confirmed", "preparing", "2026-10-11T14:41:00Z"),
];

describe("steps", () => {
  it("marks what's done, where the order is, and what's left", () => {
    expect(stepStates("preparing", history)).toEqual({
      pending: "done",
      confirmed: "done",
      preparing: "current",
      ready: "todo",
      served: "todo",
      paid: "todo",
    });
  });

  it("treats paid as done all the way", () => {
    expect(Object.values(stepStates("paid", history)).every((state) => state === "done")).toBe(
      true,
    );
  });

  it("stops a cancelled order where it was cancelled", () => {
    const cancelled = [...history, event("preparing", "cancelled", "2026-10-11T14:50:00Z")];
    const states = stepStates("cancelled", cancelled);
    expect(states.preparing).toBe("done");
    expect(states.ready).toBe("todo");
  });

  it("keeps the latest time a step was reached", () => {
    const events = stepEvents([...history, event("pending", "confirmed", "2026-10-11T14:38:00Z")]);
    expect(events.confirmed?.createdAt).toBe("2026-10-11T14:38:00Z");
  });
});

describe("item drafts", () => {
  const items = [
    { id: 1, foodId: 10, foodName: "Kacchi Biryani", quantity: 2, notes: "Less spicy" },
    { id: 2, foodId: 11, foodName: "Borhani", quantity: 2, notes: null },
  ] as OrderItemOut[];

  it("sees no change until a quantity moves", () => {
    const draft = toDraft(items);
    expect(draftChanged(draft, items)).toBe(false);
    draft[1].quantity = 3;
    expect(draftChanged(draft, items)).toBe(true);
  });

  it("drops removed lines from the payload and keeps notes", () => {
    const draft = toDraft(items);
    draft[1].quantity = 0;
    expect(draftChanged(draft, items)).toBe(true);
    expect(draftPayload(draft)).toEqual([{ foodId: 10, quantity: 2, notes: "Less spicy" }]);
  });
});
