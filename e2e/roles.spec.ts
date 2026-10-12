import { expect, test } from "@playwright/test";
import { signInAs } from "./sign-in";

const landings = [
  { role: "Manager", path: "/en/overview", title: "Overview" },
  { role: "Waiter", path: "/en/floor", title: "Floor" },
  { role: "Cashier", path: "/en/billing", title: "Billing" },
] as const;

for (const { role, path, title } of landings) {
  test(`${role} lands on ${title}`, async ({ page }) => {
    await signInAs(page, role);
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  });
}

// The kitchen opens behind its Start service card, which needs a tap for sound.
test("Chef lands on the kitchen, ready to start service", async ({ page }) => {
  await signInAs(page, "Chef");
  await expect(page).toHaveURL(/\/en\/kitchen$/);
  await expect(page.getByRole("dialog", { name: "Start service" })).toBeVisible();
});

// The API allows five sign-ins per account in five minutes, so this one uses the waiter.
test("signed-out visitors go to sign-in and come back after", async ({ page }) => {
  await page.goto("/en/orders");
  await expect(page).toHaveURL(/\/en\/login\?next=%2Forders/);
  await page.getByRole("button", { name: "Waiter", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/orders$/, { timeout: 20_000 });
});
