import { notFound } from "next/navigation";

// Anything no route claims ends up in [locale]/not-found.tsx, inside the locale layout.
export default function CatchAll() {
  notFound();
}
