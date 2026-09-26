import { useSyncExternalStore } from "react";
import { LIVE_URL } from "@/lib/api/config";
import { getSession, refresh, subscribeSession } from "@/lib/session/client";

export type LiveStatus = "idle" | "connecting" | "live" | "reconnecting" | "offline";
export type LiveEvent = { event: string; [key: string]: unknown };

// The server pings every 25 s; two missed pings means the connection is dead.
const SILENCE_MS = 60_000;
const CLOSE_AUTH = 4401;
const CLOSE_BAD_REQUEST = 4400;
const CLOSE_FORBIDDEN = 4403;

let status: LiveStatus = "idle";
const statusListeners = new Set<() => void>();
const eventListeners = new Set<(event: LiveEvent) => void>();

let socket: WebSocket | null = null;
let sentToken: string | null = null;
let attempts = 0;
let wanted = false;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let silenceTimer: ReturnType<typeof setTimeout> | undefined;
let unsubscribeSession: (() => void) | undefined;

function setStatus(next: LiveStatus) {
  if (status === next) return;
  status = next;
  statusListeners.forEach((listener) => listener());
}

export function useLiveStatus() {
  return useSyncExternalStore(
    (listener) => {
      statusListeners.add(listener);
      return () => statusListeners.delete(listener);
    },
    () => status,
    () => "idle" as const,
  );
}

export function onLiveEvent(listener: (event: LiveEvent) => void) {
  eventListeners.add(listener);
  return () => eventListeners.delete(listener);
}

function currentToken() {
  const session = getSession();
  return session.status === "authenticated" ? session.accessToken : null;
}

function resetSilenceTimer() {
  clearTimeout(silenceTimer);
  silenceTimer = setTimeout(() => socket?.close(), SILENCE_MS);
}

function scheduleReconnect() {
  if (!wanted) return;
  clearTimeout(retryTimer);
  setStatus(navigator.onLine ? "reconnecting" : "offline");
  // 1 s, 2 s, 4 s … capped at 30 s, with jitter so a restart doesn't get every tablet at once.
  const delay = Math.min(30_000, 1000 * 2 ** attempts) * (0.75 + Math.random() * 0.5);
  attempts += 1;
  retryTimer = setTimeout(open, delay);
}

function open() {
  const token = currentToken();
  if (!wanted || !token) return;

  socket?.close();
  setStatus(attempts === 0 ? "connecting" : "reconnecting");
  const ws = new WebSocket(LIVE_URL);
  socket = ws;

  ws.onopen = () => {
    sentToken = token;
    ws.send(JSON.stringify({ type: "auth", token }));
    resetSilenceTimer();
  };

  ws.onmessage = ({ data }) => {
    resetSilenceTimer();
    let message: LiveEvent;
    try {
      message = JSON.parse(data);
    } catch {
      return;
    }
    if (message.event === "authenticated") {
      attempts = 0;
      setStatus("live");
    }
    if (message.event !== "ping") eventListeners.forEach((listener) => listener(message));
  };

  ws.onclose = async ({ code, reason }) => {
    if (socket !== ws) return;
    socket = null;
    clearTimeout(silenceTimer);

    if (code === CLOSE_AUTH && reason === "token_expired") {
      // Get a fresh token, then come straight back.
      const renewed = await refresh(sentToken ?? undefined);
      if (renewed && wanted) open();
      else stopLive();
      return;
    }
    if (code === CLOSE_AUTH || code === CLOSE_BAD_REQUEST || code === CLOSE_FORBIDDEN) {
      // Retrying won't change the answer.
      stopLive();
      return;
    }
    scheduleReconnect();
  };
}

const onOnline = () => {
  if (wanted && !socket) {
    attempts = 0;
    open();
  }
};
const onOffline = () => wanted && setStatus("offline");
const onVisible = () => document.visibilityState === "visible" && onOnline();

export function startLive() {
  if (wanted) return;
  wanted = true;
  attempts = 0;
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  document.addEventListener("visibilitychange", onVisible);

  // A refreshed token re-authenticates the open socket instead of reconnecting.
  unsubscribeSession = subscribeSession(() => {
    const token = currentToken();
    if (!token) return stopLive();
    if (socket?.readyState === WebSocket.OPEN && token !== sentToken) {
      sentToken = token;
      socket.send(JSON.stringify({ type: "auth", token }));
    }
  });
  open();
}

export function stopLive() {
  wanted = false;
  clearTimeout(retryTimer);
  clearTimeout(silenceTimer);
  window.removeEventListener("online", onOnline);
  window.removeEventListener("offline", onOffline);
  document.removeEventListener("visibilitychange", onVisible);
  unsubscribeSession?.();
  const ws = socket;
  socket = null;
  ws?.close(1000);
  setStatus("idle");
}
