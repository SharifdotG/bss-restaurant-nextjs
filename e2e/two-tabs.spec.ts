import { expect, test, type Page } from "@playwright/test";
import { signInAs } from "./sign-in";

// The API revokes the whole session if a refresh token is used twice, so two tabs waking
// up with a stale token must rotate it once between them and both stay signed in.
const staleToken = (page: Page) =>
  page.evaluate(() => {
    const session = JSON.parse(localStorage.getItem("bss.session") ?? "null");
    if (!session) throw new Error("no cached session");
    session.expiresAt = Date.now() + 1_000;
    localStorage.setItem("bss.session", JSON.stringify(session));
  });

test("two tabs share one token refresh and both stay signed in", async ({ context }) => {
  const first = await context.newPage();
  await signInAs(first, "Manager");
  const second = await context.newPage();
  await second.goto("/en/orders");
  await expect(second.getByRole("heading", { level: 1, name: "Orders" })).toBeVisible();

  const rotations: string[] = [];
  context.on("request", (request) => {
    if (request.url().endsWith("/api/session/refresh")) rotations.push(request.url());
  });

  await staleToken(first);
  await Promise.all([first.reload(), second.reload()]);

  await expect(first.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
  await expect(second.getByRole("heading", { level: 1, name: "Orders" })).toBeVisible();
  expect(rotations).toHaveLength(1);

  // The rotated cookie still works, so the session family wasn't revoked.
  const status = await first.evaluate(async () => {
    const response = await fetch("/api/session/refresh", { method: "POST" });
    return response.status;
  });
  expect(status).toBe(200);
});
