// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { installLocks, mockFetch, tokens } from "@/test/fakes";

const ME = "GET /api/v1/auth/me";
const REFRESH = "POST /api/session/refresh";
const SAVE = "POST /api/session";

// openapi-fetch grabs fetch when the client is created, so stub first, then import.
async function signedIn(routes: Parameters<typeof mockFetch>[0]) {
  const server = mockFetch({ [SAVE]: () => ({ status: 204 }), ...routes });
  vi.resetModules();
  const session = await import("@/lib/session/client");
  await session.signIn({ ...tokens("A"), refreshToken: "r1" });
  const client = await import("./client");
  return { server, session, ...client };
}

beforeEach(() => {
  localStorage.clear();
  installLocks();
});

describe("api client", () => {
  it("sends the access token", async () => {
    const { api, unwrap, server } = await signedIn({
      [ME]: () => ({ status: 200, body: tokens("A").user }),
    });

    const me = await unwrap(api.GET("/api/v1/auth/me"));

    expect(me.fullName).toBe("Nusrat Jahan");
    expect(server.calls.find((call) => call.route === ME)?.authorization).toBe("Bearer A");
  });

  it("refreshes an expired token and resends the request once", async () => {
    const { api, unwrap, server } = await signedIn({
      [ME]: (request) =>
        request.headers.get("authorization") === "Bearer A"
          ? { status: 401, body: { detail: "Access token has expired", code: "token_expired" } }
          : { status: 200, body: tokens("B").user },
      [REFRESH]: () => ({ status: 200, body: tokens("B") }),
    });

    await expect(unwrap(api.GET("/api/v1/auth/me"))).resolves.toMatchObject({ id: 2 });
    expect(
      server.calls.filter((call) => call.route === ME).map((call) => call.authorization),
    ).toEqual(["Bearer A", "Bearer B"]);
    expect(server.count(REFRESH)).toBe(1);
  });

  it("keeps the body when resending a POST", async () => {
    const bodies: unknown[] = [];
    let first = true;
    const { api, unwrap } = await signedIn({
      "POST /api/v1/orders/7/payments": async (request) => {
        bodies.push(await request.json());
        if (first) {
          first = false;
          return { status: 401, body: { detail: "", code: "token_expired" } };
        }
        return { status: 201, body: { id: 7 } };
      },
      [REFRESH]: () => ({ status: 200, body: tokens("B") }),
    });

    await unwrap(
      api.POST("/api/v1/orders/{order_id}/payments", {
        params: { path: { order_id: 7 } },
        body: { method: "cash", amount: 100, tendered: 500 },
      }),
    );
    expect(bodies).toEqual([
      { method: "cash", amount: 100, tendered: 500 },
      { method: "cash", amount: 100, tendered: 500 },
    ]);
  });

  it("ends the session when the refresh is refused too", async () => {
    const { api, unwrap, session } = await signedIn({
      [ME]: () => ({
        status: 401,
        body: { detail: "Invalid access token", code: "invalid_token" },
      }),
      [REFRESH]: () => ({ status: 401, body: { code: "invalid_refresh_token" } }),
    });

    await expect(unwrap(api.GET("/api/v1/auth/me"))).rejects.toMatchObject({
      status: 401,
      code: "invalid_token",
    });
    expect(session.getSession().status).toBe("anonymous");
  });

  it("doesn't try to refresh a failed sign-in", async () => {
    const server = mockFetch({
      "POST /api/v1/auth/login": () => ({
        status: 401,
        body: { detail: "Incorrect email or password", code: "invalid_credentials" },
      }),
    });
    vi.resetModules();
    const { api, unwrap } = await import("./client");

    await expect(
      unwrap(api.POST("/api/v1/auth/login", { body: { email: "a@b.co", password: "x" } })),
    ).rejects.toMatchObject({ code: "invalid_credentials" });
    expect(server.count(REFRESH)).toBe(0);
  });

  it("reports a dropped connection as a network error", async () => {
    const { api, unwrap } = await signedIn({ [ME]: () => new TypeError("Failed to fetch") });

    await expect(unwrap(api.GET("/api/v1/auth/me"))).rejects.toMatchObject({
      status: 0,
      code: "network",
    });
  });
});
