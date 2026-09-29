import { NextRequest, NextResponse } from "next/server";
import { describe, expect, it } from "vitest";
import { isRemembered, readRefreshToken, writeRefreshToken } from "./cookie";

const request = (cookie?: string) =>
  new NextRequest("https://bss.example/api/session", {
    headers: cookie ? { cookie: `__Host-bss_session=${cookie}` } : {},
  });

function written(remember: boolean) {
  const response = new NextResponse(null);
  writeRefreshToken(request(), response, "abc", remember);
  return response.headers.get("set-cookie") ?? "";
}

describe("session cookie", () => {
  it("keeps a remembered session for a week", () => {
    expect(written(true)).toMatch(/__Host-bss_session=abc;.*Max-Age=604800/);
  });

  it("drops the max-age when the person didn't want to stay signed in", () => {
    const cookie = written(false);
    expect(cookie).toContain("__Host-bss_session=~abc");
    expect(cookie).not.toContain("Max-Age");
  });

  it("reads the token back without the marker, and remembers the choice", () => {
    expect(readRefreshToken(request("~abc"))).toBe("abc");
    expect(isRemembered(request("~abc"))).toBe(false);
    expect(readRefreshToken(request("abc"))).toBe("abc");
    expect(isRemembered(request("abc"))).toBe(true);
  });
});
