import { NextResponse, type NextRequest } from "next/server";
import { API_BASE } from "@/lib/api/config";
import type { TokenOut } from "@/lib/api/schema";
import {
  clearRefreshToken,
  isRemembered,
  isSameOrigin,
  readRefreshToken,
  writeRefreshToken,
} from "@/lib/session/cookie";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ code: "forbidden" }, { status: 403 });

  const token = readRefreshToken(request);
  if (!token) return NextResponse.json({ code: "no_session" }, { status: 401 });

  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        // The API keeps the user agent per token; pass the browser's along instead of ours.
        "user-agent": request.headers.get("user-agent") ?? "",
      },
      body: JSON.stringify({ refreshToken: token }),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    return NextResponse.json({ code: "upstream_unavailable" }, { status: 503 });
  }

  if (upstream.status === 401) {
    // Expired, revoked or reused: the session is gone, so drop the cookie too.
    const response = NextResponse.json({ code: "invalid_refresh_token" }, { status: 401 });
    clearRefreshToken(request, response);
    return response;
  }

  if (!upstream.ok) {
    // Rate limits and outages keep the cookie; the browser can try again.
    return NextResponse.json({ code: "upstream_unavailable" }, { status: 503 });
  }

  const data = (await upstream.json()) as TokenOut;
  const response = NextResponse.json(
    { accessToken: data.accessToken, expiresIn: data.expiresIn, user: data.user },
    { headers: { "cache-control": "no-store" } },
  );
  writeRefreshToken(request, response, data.refreshToken, isRemembered(request));
  return response;
}
