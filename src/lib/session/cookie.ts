import type { NextRequest, NextResponse } from "next/server";

// __Host- needs Secure, which plain-http localhost can't set, so dev gets the bare name.
const SECURE_NAME = "__Host-bss_session";
const DEV_NAME = "bss_session";
const MAX_AGE = 60 * 60 * 24 * 7; // the API's refresh token lifetime

const isSecure = (request: NextRequest) => request.nextUrl.protocol === "https:";

export function readRefreshToken(request: NextRequest) {
  return request.cookies.get(isSecure(request) ? SECURE_NAME : DEV_NAME)?.value;
}

export function hasSessionCookie(request: NextRequest) {
  return Boolean(readRefreshToken(request));
}

export function writeRefreshToken(request: NextRequest, response: NextResponse, token: string) {
  const secure = isSecure(request);
  response.cookies.set(secure ? SECURE_NAME : DEV_NAME, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
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
