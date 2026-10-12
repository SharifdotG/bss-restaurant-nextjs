import { defineConfig, devices } from "@playwright/test";

// Runs against a production build (`pnpm build` first) and the local API with the demo seed.
// Uses the Edge already on the machine, so there's no browser download.
export default defineConfig({
  testDir: "e2e",
  // One sign-in at a time: the API rate-limits logins per address.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    channel: "msedge",
    trace: "retain-on-failure",
  },
  projects: [{ name: "edge", use: { ...devices["Desktop Edge"], channel: "msedge" } }],
  webServer: {
    command: "pnpm start",
    url: "http://localhost:3000/en/login",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
