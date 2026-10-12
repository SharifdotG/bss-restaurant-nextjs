import { expect, type Page } from "@playwright/test";

/** Signs in with a demo button, so no password is typed into the page. */
export async function signInAs(page: Page, role: "Manager" | "Waiter" | "Chef" | "Cashier") {
  await page.goto("/en/login");
  await page.getByRole("button", { name: role, exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 });
}
