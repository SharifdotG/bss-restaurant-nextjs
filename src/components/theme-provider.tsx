"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// The theme script only has to run from the server HTML. When the layout re-renders on
// the client (switching language), React 19 warns about any executable <script>, so the
// client copy gets an inert type.
const scriptProps =
  typeof window === "undefined" ? undefined : ({ type: "application/json" } as const);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      scriptProps={scriptProps}
    >
      {children}
    </NextThemesProvider>
  );
}
