"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { landingPath } from "@/lib/permissions";
import { useSession } from "@/lib/session/client";

/** The bare address opens each role's own workspace. */
export function LandingRedirect() {
  const session = useSession();
  const router = useRouter();
  const role = session.status === "authenticated" ? session.user.role : null;

  useEffect(() => {
    if (role) router.replace(landingPath(role));
  }, [role, router]);

  return null;
}
