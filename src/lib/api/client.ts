import createClient, { type Middleware } from "openapi-fetch";
import { accessToken, refresh } from "@/lib/session/client";
import { API_ORIGIN } from "./config";
import { networkError, toApiError } from "./errors";
import type { paths } from "./schema";

// A request body can only be read once, so each signed request keeps a copy to resend.
const sent = new Map<string, Request>();

const auth: Middleware = {
  async onRequest({ request, id }) {
    const token = await accessToken();
    if (!token) return;
    request.headers.set("authorization", `Bearer ${token}`);
    sent.set(id, request.clone());
    return request;
  },

  async onResponse({ response, id }) {
    const original = sent.get(id);
    sent.delete(id);
    if (response.status !== 401 || !original) return;

    // Usually an expired token. If the refresh fails too, the session is over and the
    // session store has already signed this tab out.
    const rejected = original.headers.get("authorization")?.replace("Bearer ", "");
    const renewed = await refresh(rejected);
    if (!renewed) return;

    original.headers.set("authorization", `Bearer ${renewed.accessToken}`);
    return fetch(original);
  },

  onError({ error, id }) {
    sent.delete(id);
    // Leave aborts alone so cancelled queries stay cancelled.
    if (error instanceof TypeError) return networkError(error);
  },
};

export const api = createClient<paths>({ baseUrl: API_ORIGIN });
api.use(auth);

type Result<T> = { data?: T; error?: unknown; response: Response };

/**
 * Returns the data or throws an ApiError, which is what TanStack Query expects.
 *
 *   const order = await unwrap(api.GET("/api/v1/orders/{order_id}", { params }));
 */
export async function unwrap<T>(request: Promise<Result<T>>): Promise<T> {
  const { data, error, response } = await request;
  if (!response.ok) throw toApiError(response.status, error, response.statusText);
  return data as T;
}
