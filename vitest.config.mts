import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    // The session tests import fresh modules per test, and the first cold import can take a
    // few seconds while a build or dev server is busy.
    testTimeout: 15_000,
  },
});
