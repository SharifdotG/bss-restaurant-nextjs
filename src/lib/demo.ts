import type { UserRole } from "@/lib/api/schema";

// "Look around as…" sign-ins for the seeded demo accounts. Off unless both variables are set,
// and kept off in production until the API refuses changes to these accounts.
const password = process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? "";

export const DEMO_ENABLED = process.env.NEXT_PUBLIC_DEMO_LOGIN === "1" && password.length > 0;

export const DEMO_ROLES = ["manager", "waiter", "chef", "cashier"] as const satisfies UserRole[];
export type DemoRole = (typeof DEMO_ROLES)[number];

/** The seed's accounts are manager@example.com, waiter@example.com and so on. */
export const demoLogin = (role: DemoRole) => ({ email: `${role}@example.com`, password });
