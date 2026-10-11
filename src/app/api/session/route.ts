import { NextResponse, type NextRequest } from "next/server";
import { API_BASE } from "@/lib/api/config";
import {
  clearRefreshToken,
  isRemembered,
  isSameOrigin,
  readRefreshToken,
  writeRefreshToken,
} from "@/lib/session/cookie";

const forbidden = () => NextResponse.json({ code: "forbidden" }, { status: 403 });

// Login happens browser → API; the page hands the refresh token over once so it can live in an httpOnly cookie.
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return forbidden();

  const body = await request.json().catch(() => null);
  const token = body?.refreshToken;
  if (typeof token !== "string" || token.length === 0 || token.length > 255) {
    return NextResponse.json({ code: "bad_request" }, { status: 400 });
  }

  // "keep" is for a new token on the same device (a password change): stay as remembered as before.
  const remember = body?.remember === "keep" ? isRemembered(request) : body?.remember !== false;
  const response = new NextResponse(null, { status: 204 });
  writeRefreshToken(request, response, token, remember);
  return response;
}

export async function DELETE(request: NextRequest) {
  if (!isSameOrigin(request)) return forbidden();

  const token = readRefreshToken(request);
  if (token) {
    // Revokes the token family on the API; the cookie goes either way.
    await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken: token }),
      signal: AbortSignal.timeout(8000),
    }).catch(() => undefined);
  }

  const response = new NextResponse(null, { status: 204 });
  clearRefreshToken(request, response);
  return response;
}
