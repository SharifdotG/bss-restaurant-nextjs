// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { installLocks, mockFetch, tokens } from "@/test/fakes";

const REFRESH = "POST /api/session/refresh";

// The session store keeps module state, so every test starts from a fresh import.
async function load() {
  vi.resetModules();
  return import("./client");
}

beforeEach(() => {
  localStorage.clear();
  installLocks();
});

describe("refresh", () => {
  it("rotates once when two tabs ask at the same moment", async () => {
    const server = mockFetch({ [REFRESH]: () => ({ status: 200, body: tokens("A") }) });
    const { refresh } = await load();

    // Same lock, same storage: the second caller finds the first one's token waiting.
    const [first, second] = await Promise.all([refresh(), refresh()]);

    expect(server.count(REFRESH)).toBe(1);
    expect(first?.accessToken).toBe("A");
    expect(second?.accessToken).toBe("A");
  });

  it("reuses a fresh token another tab left behind", async () => {
    const server = mockFetch({ [REFRESH]: () => ({ status: 200, body: tokens("B") }) });
    localStorage.setItem(
      "bss.session",
      JSON.stringify({
        accessToken: "A",
        expiresAt: Date.now() + 600_000,
        lifetime: 900_000,
        user: tokens("A").user,
      }),
    );
    const { refresh, getSession } = await load();

    expect((await refresh())?.accessToken).toBe("A");
    expect(server.count(REFRESH)).toBe(0);
    expect(getSession().status).toBe("authenticated");
  });

  it("rotates when the cached token is the one that was just rejected", async () => {
    const server = mockFetch({ [REFRESH]: () => ({ status: 200, body: tokens("B") }) });
    localStorage.setItem(
      "bss.session",
      JSON.stringify({
        accessToken: "A",
        expiresAt: Date.now() + 600_000,
        lifetime: 900_000,
        user: tokens("A").user,
      }),
    );
    const { refresh } = await load();

    expect((await refresh("A"))?.accessToken).toBe("B");
    expect(server.count(REFRESH)).toBe(1);
  });

  it("signs out everywhere when the refresh token is gone", async () => {
    mockFetch({ [REFRESH]: () => ({ status: 401, body: { code: "invalid_refresh_token" } }) });
    const { startSession, getSession } = await load();
    const otherTab = new BroadcastChannel("bss-session");
    const heard = new Promise((resolve) => (otherTab.onmessage = ({ data }) => resolve(data)));

    expect(await startSession()).toBeNull();
    expect(getSession().status).toBe("anonymous");
    expect(localStorage.getItem("bss.session")).toBeNull();
    expect(await heard).toEqual({ type: "signed-out" });
    otherTab.close();
  });

  it("keeps the session when the server is only unreachable", async () => {
    mockFetch({ [REFRESH]: () => new TypeError("Failed to fetch") });
    const { startSession, getSession } = await load();

    expect(await startSession()).toBeNull();
    expect(getSession().status).toBe("unavailable");
  });
});

describe("accessToken", () => {
  it("waits for the page's first refresh", async () => {
    mockFetch({ [REFRESH]: () => ({ status: 200, body: tokens("A") }) });
    const { accessToken, startSession } = await load();

    void startSession();
    expect(await accessToken()).toBe("A");
  });

  it("renews first when the token is about to run out", async () => {
    const issued = ["A", "B"];
    const server = mockFetch({
      [REFRESH]: () => ({ status: 200, body: tokens(issued.shift()!) }),
    });
    const { accessToken, startSession } = await load();
    await startSession();

    // A laptop waking up with 50 s left on a 15 minute token.
    vi.useFakeTimers({ toFake: ["Date"], now: Date.now() + 850_000 });
    try {
      expect(await accessToken()).toBe("B");
      expect(server.count(REFRESH)).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("has nothing to give on the sign-in page", async () => {
    mockFetch({});
    const { accessToken } = await load();
    expect(await accessToken()).toBeNull();
  });
});
