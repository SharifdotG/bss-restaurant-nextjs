import { Baloo_Da_2, Google_Sans_Flex } from "next/font/google";

export const googleSans = Google_Sans_Flex({
  subsets: ["latin"],
  axes: ["opsz"],
  // No metric overrides exist for this family yet, so skip the generated fallback.
  adjustFontFallback: false,
  variable: "--font-google-sans",
  display: "swap",
});

// Picks up Bangla glyphs after Google Sans in the stack; only fetched when Bangla text shows up.
export const baloo = Baloo_Da_2({
  subsets: ["bengali"],
  variable: "--font-baloo",
  display: "swap",
  preload: false,
});
