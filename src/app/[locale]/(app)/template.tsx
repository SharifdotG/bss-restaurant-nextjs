// Mounts afresh on every page change, so the page area fades in while the shell stays put.
// Opacity only: a transform here would trap the fixed bars some pages pin to the screen.
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="flex min-w-0 flex-1 animate-appear flex-col">{children}</div>;
}
