import { describe, expect, it } from "vitest";
import { ApiError, describeError, fieldErrors, networkError, toApiError } from "./errors";

const apiError = (status: number, body: Record<string, unknown>) =>
  new ApiError(status, { detail: "", code: "", ...body });

describe("toApiError", () => {
  it("keeps the API's body", () => {
    const error = toApiError(409, { detail: "Only ৳120 is left to pay", code: "overpayment" });
    expect(error.code).toBe("overpayment");
    expect(error.message).toBe("Only ৳120 is left to pay");
  });

  it("names bodies it doesn't recognise by status", () => {
    expect(toApiError(502, "<html>Bad gateway</html>", "Bad Gateway").code).toBe("http_502");
  });
});

describe("describeError", () => {
  it.each([
    [0, "network"],
    [401, "session"],
    [403, "forbidden"],
    [404, "notFound"],
    [409, "conflict"],
    [413, "tooLarge"],
    [422, "invalid"],
    [503, "server"],
    [418, "unknown"],
  ])("falls back to a generic message for %i", (status, generic) => {
    expect(describeError(apiError(status, { code: "x" })).generic).toBe(generic);
  });

  it("treats a dropped request as a network problem", () => {
    expect(describeError(networkError(new TypeError("Failed to fetch")))).toEqual({
      code: "network",
      generic: "network",
    });
  });

  it("turns retryAfter into whole minutes", () => {
    expect(describeError(apiError(429, { code: "rate_limited", retryAfter: 61 })).minutes).toBe(2);
    expect(describeError(apiError(429, { code: "rate_limited", retryAfter: 5 })).minutes).toBe(1);
  });

  it("picks the amount each money error talks about", () => {
    expect(describeError(apiError(409, { code: "overpayment", balanceDue: 120.5 })).amount).toBe(
      120.5,
    );
    expect(describeError(apiError(409, { code: "refund_too_high", refundable: 80 })).amount).toBe(
      80,
    );
    expect(describeError(apiError(409, { code: "order_closed" })).amount).toBeUndefined();
  });

  it("handles things that aren't API errors", () => {
    expect(describeError(new Error("boom"))).toEqual({ generic: "unknown" });
  });
});

describe("fieldErrors", () => {
  it("maps pydantic issues onto form field names", () => {
    const error = apiError(422, {
      code: "validation_error",
      errors: [
        {
          field: "items.0.quantity",
          message: "Input should be greater than 0",
          type: "greater_than",
        },
        { field: "body", message: "Value error, Dine in orders need a table", type: "value_error" },
      ],
    });
    expect(fieldErrors(error)).toEqual([
      { field: "items.0.quantity", problem: "tooSmall", message: "Input should be greater than 0" },
      { field: "body", problem: "invalid", message: "Dine in orders need a table" },
    ]);
  });

  it("is empty for other errors", () => {
    expect(fieldErrors(apiError(409, { code: "conflict" }))).toEqual([]);
  });
});
