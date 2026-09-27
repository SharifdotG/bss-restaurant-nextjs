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
