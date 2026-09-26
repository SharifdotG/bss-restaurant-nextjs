import createMiddleware from "next-intl/middleware";
import { hasLocale } from "next-intl";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { hasSessionCookie } from "@/lib/session/cookie";

const handleI18nRouting = createMiddleware(routing);
const PUBLIC_PATHS = ["/login"];

export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const [, first, ...rest] = pathname.split("/");

  // No locale in the URL: English unless they picked Bangla before. The browser language is ignored on purpose.
  if (!hasLocale(routing.locales, first)) {
    const saved = request.cookies.get("NEXT_LOCALE")?.value;
    const locale = hasLocale(routing.locales, saved) ? saved : routing.defaultLocale;
    const target = pathname === "/" ? `/${locale}` : `/${locale}${pathname}`;
    return NextResponse.redirect(new URL(target + search, request.url));
  }

  // Only checks that a session cookie exists; the page confirms it with a refresh.
  const path = `/${rest.join("/")}`;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
  const signedIn = hasSessionCookie(request);

  if (!signedIn && !isPublic) {
    const login = new URL(`/${first}/login`, request.url);
    if (path !== "/") login.searchParams.set("next", path + search);
    return NextResponse.redirect(login);
  }

  if (signedIn && isPublic) {
    return NextResponse.redirect(new URL(`/${first}`, request.url));
  }

  return handleI18nRouting(request);
}

export const config = {
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
