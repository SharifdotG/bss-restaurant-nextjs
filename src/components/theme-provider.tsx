"use client";

import { usePathname } from "next/navigation";
import { ThemeProvider as NextThemesProvider } from "next-themes";

// The theme script only has to run from the server HTML. When the layout re-renders on
// the client (switching language), React 19 warns about any executable <script>, so the
// client copy gets an inert type.
const scriptProps =
  typeof window === "undefined" ? undefined : ({ type: "application/json" } as const);

// The kitchen is always dark: glare off a bright screen next to the stove is hard to read.
const ALWAYS_DARK = /^\/[a-z]{2}\/kitchen(\/|$)/;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      forcedTheme={ALWAYS_DARK.test(pathname) ? "dark" : undefined}
      scriptProps={scriptProps}
    >
      {children}
    </NextThemesProvider>
  );
}
