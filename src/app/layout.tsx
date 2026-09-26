import type { Metadata } from "next";
import { baloo, googleSans } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "BSS Restaurant",
  description: "Staff dashboard for orders, kitchen, billing and bookings.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${googleSans.variable} ${baloo.variable}`}>
      <body>{children}</body>
    </html>
  );
}
