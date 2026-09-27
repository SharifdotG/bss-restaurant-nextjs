import { vi } from "vitest";

/** Web Locks that queue per name, like the browser's (happy-dom has none). */
export function installLocks() {
  const queues = new Map<string, Promise<unknown>>();
  const locks = {
    request<T>(name: string, task: () => Promise<T>) {
      const run = (queues.get(name) ?? Promise.resolve()).then(task);
      queues.set(
        name,
        run.catch(() => undefined),
      );
      return run;
    },
  };
  Object.defineProperty(navigator, "locks", { value: locks, configurable: true });
}

type Reply = { status: number; body?: unknown } | Error;
type Route = (request: Request) => Reply | Promise<Reply>;

/**
 * Replaces fetch with routes keyed by "METHOD path". Each call is recorded with the
 * Authorization header it carried, so tests can see which token went out.
 */
export function mockFetch(routes: Record<string, Route>) {
  const calls: { route: string; authorization: string | null }[] = [];

  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request =
      input instanceof Request
        ? new Request(input, init)
        : new Request(new URL(String(input), "http://localhost:3000"), init);
    const route = `${request.method} ${new URL(request.url).pathname}`;
    calls.push({ route, authorization: request.headers.get("authorization") });

    const handler = routes[route];
    if (!handler) throw new Error(`No route for ${route}`);
    const reply = await handler(request);
    if (reply instanceof Error) throw reply;
    return new Response(reply.body === undefined ? null : JSON.stringify(reply.body), {
      status: reply.status,
      headers: { "content-type": "application/json" },
    });
  });

  vi.stubGlobal("fetch", fetch);
  return { fetch, calls, count: (route: string) => calls.filter((c) => c.route === route).length };
}

export const user = {
  id: 2,
  email: "manager@example.com",
  firstName: "Nusrat",
  lastName: "Jahan",
  fullName: "Nusrat Jahan",
  phone: null,
  role: "manager" as const,
  isActive: true,
  lastLoginAt: null,
  createdAt: "2026-10-01T00:00:00Z",
};

export const tokens = (accessToken: string, expiresIn = 900) => ({
  accessToken,
  expiresIn,
  user,
});
