import { expect, test, type Browser, type Page } from "@playwright/test";
import { signInAs } from "./sign-in";

// One order through a whole service: the waiter sends it, the chef cooks it, the waiter
// serves it, and the cashier splits the bill between cash and card and sees the day's count move.
test.describe.configure({ timeout: 180_000 });

type Role = Parameters<typeof signInAs>[1];

async function open(browser: Browser, role: Role) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signInAs(page, role);
  return page;
}

const statusChange = (page: Page, orderId: string) =>
  page.waitForResponse(
    (response) =>
      response.url().endsWith(`/orders/${orderId}/status`) &&
      response.request().method() === "POST",
    { timeout: 20_000 },
  );

const paidBills = async (page: Page) => {
  await page.goto("/en/overview");
  const card = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: "Average bill" }) });
  const note = await card.getByText(/bills? paid|No bills paid yet/).textContent();
  return Number(note?.match(/\d+/)?.[0] ?? 0);
};

// The till shows lakh grouping with two decimals, e.g. ৳1,23,456.50.
const taka = (paisa: number) =>
  `৳${(paisa / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

test("an order goes from the floor through the kitchen to the till", async ({ browser }) => {
  const cashier = await open(browser, "Cashier");
  const paidBefore = await paidBills(cashier);

  // Waiter: two dishes for a free table, straight to the kitchen.
  const waiter = await open(browser, "Waiter");
  await waiter.goto("/en/orders/new");
  await waiter.getByRole("button", { name: "Add Kacchi Biryani" }).click();
  await waiter.getByRole("button", { name: "Add Borhani" }).click();
  // Daily order numbers can repeat across days, so a note marks this one on every screen.
  const note = `Test run ${Date.now().toString(36)}`;
  await waiter.getByRole("button", { name: "Add note" }).first().click();
  await waiter.getByRole("textbox", { name: "Note for Kacchi Biryani" }).fill(note);
  await waiter.keyboard.press("Enter");
  await waiter.getByRole("combobox", { name: "Table" }).click();
  await waiter.getByRole("option", { name: /Free/ }).first().click();
  await waiter.getByRole("button", { name: "Send to kitchen" }).click();

  await expect(waiter).toHaveURL(/\/en\/orders\/\d+$/, { timeout: 20_000 });
  const orderId = waiter.url().split("/").pop()!;
  const heading = waiter.getByRole("heading", { level: 1, name: /^Order \d+$/ });
  await expect(heading).toBeVisible();
  const orderName = (await heading.textContent())!.trim();
  const meta = await waiter.getByText(/Dine-in at /).textContent();
  const table = meta!.match(/Dine-in at (\S+)/)![1];

  // Chef: the ticket arrives live, goes on the stove and comes off ready.
  const chef = await open(browser, "Chef");
  await chef.getByRole("button", { name: "Start service" }).click();
  const ticket = chef
    .getByRole("article", { name: orderName, exact: true })
    .filter({ hasText: note });
  await expect(ticket).toBeVisible({ timeout: 20_000 });

  // Bumps wait out a 5 second undo window before they reach the API.
  const cooking = statusChange(chef, orderId);
  await ticket.getByRole("button", { name: "Start" }).click();
  expect((await cooking).ok()).toBe(true);
  const ready = statusChange(chef, orderId);
  await ticket.getByRole("button", { name: "Ready" }).click();
  expect((await ready).ok()).toBe(true);

  // Waiter: the order page picks up the change by itself.
  const served = statusChange(waiter, orderId);
  await waiter.getByRole("button", { name: "Mark served" }).click({ timeout: 20_000 });
  expect((await served).ok()).toBe(true);

  // Cashier: half in cash with change back, the rest on a card.
  await cashier.goto("/en/billing");
  await cashier
    .getByRole("button")
    .filter({ hasText: new RegExp(`${orderName}(?!\\d)`) })
    .filter({ hasText: table })
    .click();
  await cashier.getByRole("button", { name: "Split what's left 2 ways" }).click();
  await cashier.getByRole("button", { name: "Cash", exact: true }).click();

  const share = Math.round(
    Number(await cashier.getByRole("textbox", { name: "Paying" }).inputValue()) * 100,
  );
  const cash = (Math.floor(share / 50_000) + 1) * 50_000;
  await cashier.getByRole("textbox", { name: "Cash received" }).fill(String(cash / 100));
  await expect(cashier.getByText(taka(cash - share), { exact: true })).toBeVisible();
  await cashier.getByRole("button", { name: `Take ${taka(share)}` }).click();
  await expect(cashier.getByText(`Give back ${taka(cash - share)}.`)).toBeVisible();

  await cashier.getByRole("button", { name: "Card", exact: true }).click();
  await cashier.getByRole("button", { name: /^Take ৳/ }).click();
  await expect(cashier.getByRole("heading", { name: "Paid in full" })).toBeVisible({
    timeout: 20_000,
  });

  // The receipt comes from the API and opens in a preview first, nothing prints by itself.
  await cashier.locator("#main").getByRole("button", { name: "Print receipt" }).click();
  const receipt = cashier.getByRole("dialog", { name: `Receipt · ${orderName}` });
  await expect(receipt).toBeVisible();
  const paper = receipt.frameLocator("iframe");
  await expect(paper.getByRole("cell", { name: "Cash", exact: true })).toBeVisible({
    timeout: 20_000,
  });
  await expect(paper.getByRole("cell", { name: "Card", exact: true })).toBeVisible();
  await cashier.keyboard.press("Escape");

  // Overview: one more bill paid today.
  await expect.poll(() => paidBills(cashier), { timeout: 20_000 }).toBe(paidBefore + 1);
});
