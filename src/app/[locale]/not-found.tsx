import { Suspense } from "react";
import { NotFoundScreen } from "@/components/shell/not-found-screen";

export default function NotFound() {
  return (
    <Suspense>
      <NotFoundScreen />
    </Suspense>
  );
}
