import type { NextRequest, NextResponse } from "next/server";

// __Host- needs Secure, which plain-http localhost can't set, so dev gets the bare name.
const SECURE_NAME = "__Host-bss_session";
const DEV_NAME = "bss_session";
const MAX_AGE = 60 * 60 * 24 * 7; // the API's refresh token lifetime

const isSecure = (request: NextRequest) => request.nextUrl.protocol === "https:";

// "Keep me signed in" unticked: no max-age, so the browser drops the cookie when it closes.
// A leading "~" remembers that choice through every refresh.
const SESSION_ONLY = "~";

const readCookie = (request: NextRequest) =>
  request.cookies.get(isSecure(request) ? SECURE_NAME : DEV_NAME)?.value;

export function readRefreshToken(request: NextRequest) {
  const value = readCookie(request);
  return value?.startsWith(SESSION_ONLY) ? value.slice(SESSION_ONLY.length) : value;
}

/** False when the person asked not to stay signed in on this device. */
export const isRemembered = (request: NextRequest) =>
  !readCookie(request)?.startsWith(SESSION_ONLY);

export function hasSessionCookie(request: NextRequest) {
  return Boolean(readRefreshToken(request));
}

export function writeRefreshToken(
  request: NextRequest,
  response: NextResponse,
  token: string,
  remember = true,
) {
  const secure = isSecure(request);
  response.cookies.set(secure ? SECURE_NAME : DEV_NAME, remember ? token : SESSION_ONLY + token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: remember ? MAX_AGE : undefined,
  });
}

export function clearRefreshToken(request: NextRequest, response: NextResponse) {
  const secure = isSecure(request);
  response.cookies.set(secure ? SECURE_NAME : DEV_NAME, "", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

// The session routes only answer our own pages; a cross-site form or fetch is turned away.
export function isSameOrigin(request: NextRequest) {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return false;
  const origin = request.headers.get("origin");
  return origin !== null && origin === request.nextUrl.origin;
}
