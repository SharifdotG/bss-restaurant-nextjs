import { useSyncExternalStore } from "react";
import type { UserOut as User } from "@/lib/api/schema";

// lifetime is the token's full life in ms, kept so freshness scales with it.
export type Session = { accessToken: string; expiresAt: number; lifetime: number; user: User };

export type SessionState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "unavailable" }
  | ({ status: "authenticated" } & Session);

const CACHE_KEY = "bss.session";
const LOCK_NAME = "bss-refresh";
const CHANNEL_NAME = "bss-session";

type Message =
  | { type: "refreshed"; session: Session }
  | { type: "signed-in"; session: Session }
  | { type: "signed-out" };

const LOADING: SessionState = { status: "loading" };
let state: SessionState = LOADING;
const listeners = new Set<() => void>();
let channel: BroadcastChannel | null = null;
let renewTimer: ReturnType<typeof setTimeout> | undefined;
let started: Promise<Session | null> | null = null;

function setState(next: SessionState) {
  state = next;
  listeners.forEach((listener) => listener());
}

export function subscribeSession(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSession() {
  return state;
}

export function useSession() {
  return useSyncExternalStore(subscribeSession, getSession, () => LOADING);
}

// The cache lets reloads and new tabs skip a rotation while the access token is still good.
function readCache(): Session | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function writeCache(session: Session | null) {
  try {
    if (session) localStorage.setItem(CACHE_KEY, JSON.stringify(session));
    else localStorage.removeItem(CACHE_KEY);
  } catch {
    // private mode or storage blocked; the in-memory session still works
  }
}

// Good for at least a quarter of its life (at most a minute) before anyone needs a new one.
const isFresh = (session: Session) =>
  session.expiresAt - Date.now() > Math.min(60_000, session.lifetime / 4);

const toSession = (data: { accessToken: string; expiresIn: number; user: User }): Session => ({
  accessToken: data.accessToken,
  user: data.user,
  expiresAt: Date.now() + data.expiresIn * 1000,
  lifetime: data.expiresIn * 1000,
});

function post(message: Message) {
  channel?.postMessage(message);
}

function adopt(session: Session) {
  setState({ status: "authenticated", ...session });
  scheduleRenewal(session);
}

function signOutLocally() {
  clearTimeout(renewTimer);
  writeCache(null);
  setState({ status: "anonymous" });
}

// Renew at about 80% of the token's life so requests rarely meet an expired one.
function scheduleRenewal(session: Session) {
  clearTimeout(renewTimer);
  const delay = session.expiresAt - Date.now() - session.lifetime * 0.2;
  // Passing our own token means "rotate unless another tab already did".
  renewTimer = setTimeout(() => void refresh(session.accessToken), Math.max(delay, 5_000));
}

async function rotate(): Promise<Session | "anonymous" | "unavailable"> {
  let response: Response;
  try {
    response = await fetch("/api/session/refresh", { method: "POST", cache: "no-store" });
  } catch {
    return "unavailable";
  }
  if (response.status === 401) return "anonymous";
  if (!response.ok) return "unavailable";

  const data = (await response.json()) as { accessToken: string; expiresIn: number; user: User };
  return toSession(data);
}

/**
 * Get a usable access token, rotating the refresh token only when no tab has a fresh one.
 * Every rotation runs under one Web Lock: the API revokes the whole session if a refresh
 * token is used twice, so two tabs must never rotate at the same moment.
 * Pass the token being replaced (one that failed, or is due for renewal) so a cached copy
 * of that same token isn't picked up again.
 */
export async function refresh(rejected?: string): Promise<Session | null> {
  const run = async () => {
    const cached = readCache();
    if (cached && isFresh(cached) && cached.accessToken !== rejected) {
      adopt(cached);
      return cached;
    }

    const result = await rotate();
    if (result === "anonymous") {
      signOutLocally();
      post({ type: "signed-out" });
      return null;
    }
    if (result === "unavailable") {
      if (state.status === "loading") setState({ status: "unavailable" });
      return null;
    }

    writeCache(result);
    adopt(result);
    post({ type: "refreshed", session: result });
    return result;
  };

  return navigator.locks ? navigator.locks.request(LOCK_NAME, run) : run();
}

/**
 * The access token for the next request: waits while the page is still starting the session,
 * and renews first if it's about to run out (a laptop waking up, a throttled background tab).
 */
export async function accessToken(): Promise<string | null> {
  if (state.status === "loading" && started) await started;
  if (state.status !== "authenticated") return null;
  if (isFresh(state)) return state.accessToken;
  const renewed = await refresh(state.accessToken);
  return renewed?.accessToken ?? null;
}

/** Called once per page load from the app shell; later calls share the first result. */
export function startSession() {
  started ??= boot();
  return started;
}

function boot() {
  if (!channel && "BroadcastChannel" in window) {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = ({ data }: MessageEvent<Message>) => {
      if (data.type === "signed-out") {
        signOutLocally();
      } else if (state.status === "authenticated" && state.user.id !== data.session.user.id) {
        // Someone else signed in on this browser; start clean rather than mix their data with ours.
        window.location.reload();
      } else {
        adopt(data.session);
      }
    };
  }
  return refresh();
}

/** `remember: false` keeps the session only until the browser closes. */
export async function signIn(
  tokens: { accessToken: string; refreshToken: string; expiresIn: number; user: User },
  { remember = true } = {},
) {
  const response = await fetch("/api/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refreshToken: tokens.refreshToken, remember }),
  });
  if (!response.ok) throw new Error("session_not_saved");

  const session = toSession(tokens);
  writeCache(session);
  adopt(session);
  post({ type: "signed-in", session });
}

export async function signOut() {
  await fetch("/api/session", { method: "DELETE" }).catch(() => undefined);
  signOutLocally();
  post({ type: "signed-out" });
}
