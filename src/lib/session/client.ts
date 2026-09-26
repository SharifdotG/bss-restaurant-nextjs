import { useSyncExternalStore } from "react";
import type { User } from "@/lib/api/types";

export type Session = { accessToken: string; expiresAt: number; user: User };

export type SessionState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "unavailable" }
  | ({ status: "authenticated" } & Session);

const CACHE_KEY = "bss.session";
const LOCK_NAME = "bss-refresh";
const CHANNEL_NAME = "bss-session";
// A cached token with less than this left is treated as stale and rotated.
const MIN_REMAINING_MS = 60_000;

type Message =
  | { type: "refreshed"; session: Session }
  | { type: "signed-in"; session: Session }
  | { type: "signed-out" };

const LOADING: SessionState = { status: "loading" };
let state: SessionState = LOADING;
const listeners = new Set<() => void>();
let channel: BroadcastChannel | null = null;
let renewTimer: ReturnType<typeof setTimeout> | undefined;

function setState(next: SessionState) {
  state = next;
  listeners.forEach((listener) => listener());
}

export function subscribeSession(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
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

const isFresh = (session: Session | null): session is Session =>
  session !== null && session.expiresAt - Date.now() > MIN_REMAINING_MS;

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
  const lifetime = session.expiresAt - Date.now();
  renewTimer = setTimeout(() => void refresh(), Math.max(lifetime * 0.8, 5_000));
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
  return {
    accessToken: data.accessToken,
    user: data.user,
    expiresAt: Date.now() + data.expiresIn * 1000,
  };
}

/**
 * Get a usable access token, rotating the refresh token only when no tab has a fresh one.
 * Every rotation runs under one Web Lock: the API revokes the whole session if a refresh
 * token is used twice, so two tabs must never rotate at the same moment.
 * Pass the token that just failed so a cached copy of that same token isn't reused.
 */
export async function refresh(rejected?: string): Promise<Session | null> {
  const run = async () => {
    const cached = readCache();
    if (isFresh(cached) && cached.accessToken !== rejected) {
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

/** Called once per page load from the app shell. */
export function startSession() {
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

export async function signIn(tokens: {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}) {
  const response = await fetch("/api/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refreshToken: tokens.refreshToken }),
  });
  if (!response.ok) throw new Error("session_not_saved");

  const session: Session = {
    accessToken: tokens.accessToken,
    user: tokens.user,
    expiresAt: Date.now() + tokens.expiresIn * 1000,
  };
  writeCache(session);
  adopt(session);
  post({ type: "signed-in", session });
}

export async function signOut() {
  await fetch("/api/session", { method: "DELETE" }).catch(() => undefined);
  signOutLocally();
  post({ type: "signed-out" });
}
