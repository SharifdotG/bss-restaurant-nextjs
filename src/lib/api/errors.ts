import type { Messages } from "next-intl";

// Every API error has this body. Some codes add their own keys next to these,
// e.g. `allowed` on invalid_status_change or `balanceDue` on overpayment.
export type ApiErrorBody = {
  detail: string;
  code: string;
  retryAfter?: number;
  errors?: FieldIssue[];
  [extra: string]: unknown;
};

// `field` is dotted with the body/query prefix removed: "items.0.quantity".
export type FieldIssue = { field: string; message: string; type: string };

export class ApiError extends Error {
  constructor(
    // 0 means the request never got an answer.
    readonly status: number,
    readonly body: ApiErrorBody,
    options?: ErrorOptions,
  ) {
    super(body.detail, options);
    this.name = "ApiError";
  }

  get code() {
    return this.body.code;
  }
}

export const isApiError = (value: unknown): value is ApiError => value instanceof ApiError;

export const networkError = (cause: unknown) =>
  new ApiError(0, { detail: "The request didn't reach the server", code: "network" }, { cause });

/** Builds an ApiError from a failed response whose body may or may not be ours. */
export function toApiError(status: number, body: unknown, statusText = "") {
  if (body && typeof body === "object" && "code" in body && "detail" in body) {
    return new ApiError(status, body as ApiErrorBody);
  }
  return new ApiError(status, { detail: statusText || `HTTP ${status}`, code: `http_${status}` });
}

// What a screen needs to explain an error; turned into words by useErrorText.
export type GenericProblem = keyof Messages["errors"]["generic"];

export type ErrorDescription = {
  code?: string;
  generic: GenericProblem;
  minutes?: number;
  amount?: number;
};

function genericFor(status: number): GenericProblem {
  if (status === 0) return "network";
  if (status === 401) return "session";
  if (status === 403) return "forbidden";
  if (status === 404) return "notFound";
  if (status === 409) return "conflict";
  if (status === 413) return "tooLarge";
  if (status === 400 || status === 422) return "invalid";
  if (status >= 500) return "server";
  return "unknown";
}

// Codes whose message names an amount, and which key of the body holds it.
const AMOUNT_KEYS: Record<string, string> = {
  overpayment: "balanceDue",
  payment_required: "balanceDue",
  refund_required: "amountPaid",
  refund_too_high: "refundable",
};

export function describeError(error: unknown): ErrorDescription {
  if (!isApiError(error)) return { generic: "unknown" };
  const { body, status } = error;
  const description: ErrorDescription = { code: body.code, generic: genericFor(status) };

  if (typeof body.retryAfter === "number") {
    description.minutes = Math.max(1, Math.ceil(body.retryAfter / 60));
  }
  const amount = body[AMOUNT_KEYS[body.code] ?? ""];
  if (typeof amount === "number") description.amount = amount;
  return description;
}

export type FieldProblem = keyof Messages["errors"]["fields"];

const FIELD_PROBLEMS: Record<string, FieldProblem> = {
  missing: "missing",
  string_too_short: "tooShort",
  too_short: "tooShort",
  string_too_long: "tooLong",
  too_long: "tooLong",
  greater_than: "tooSmall",
  greater_than_equal: "tooSmall",
  less_than: "tooLarge",
  less_than_equal: "tooLarge",
  int_parsing: "notNumber",
  int_type: "notNumber",
  float_parsing: "notNumber",
  float_type: "notNumber",
  decimal_parsing: "notNumber",
  decimal_max_places: "decimals",
};

export type FieldError = { field: string; problem: FieldProblem; message: string };

/** 422 issues keyed the way form libraries name fields ("items.0.quantity"). */
export function fieldErrors(error: unknown): FieldError[] {
  if (!isApiError(error) || !error.body.errors) return [];
  return error.body.errors.map((issue) => ({
    field: issue.field,
    problem: FIELD_PROBLEMS[issue.type] ?? "invalid",
    // Pydantic prefixes custom checks; the rest of its English is fine to show as is.
    message: issue.message.replace(/^Value error, /, ""),
  }));
}
