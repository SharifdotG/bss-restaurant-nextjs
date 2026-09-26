import { API_BASE } from "./config";
import type { ApiErrorBody } from "./types";
import { getSession, refresh } from "@/lib/session/client";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiErrorBody,
  ) {
    super(body.detail);
  }
  get code() {
    return this.body.code;
  }
}

async function toError(response: Response) {
  const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
  return new ApiError(
    response.status,
    body ?? { detail: response.statusText, code: `http_${response.status}` },
  );
}

/**
 * Authenticated JSON request. An expired access token is refreshed and the request
 * retried once; any other 401 means the session is gone.
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const send = (token?: string) => {
    const headers = new Headers(init.headers);
    if (token) headers.set("authorization", `Bearer ${token}`);
    if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
    return fetch(`${API_BASE}${path}`, { ...init, headers });
  };

  const current = getSession();
  const token = current.status === "authenticated" ? current.accessToken : undefined;
  let response = await send(token);

  if (response.status === 401) {
    const error = await toError(response);
    if (error.code !== "token_expired") throw error;
    const renewed = await refresh(token);
    if (!renewed) throw error;
    response = await send(renewed.accessToken);
  }

  if (!response.ok) throw await toError(response);
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

/** Unauthenticated request, for login and the public endpoints. */
export async function publicFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init.headers },
  });
  if (!response.ok) throw await toError(response);
  return (await response.json()) as T;
}
