// The real document lives in [locale]/layout.tsx so <html lang> follows the language.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return children;
}
