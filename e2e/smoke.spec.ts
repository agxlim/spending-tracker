import { expect, test, type Page } from "@playwright/test";

// Local Supabase captures auth emails in Mailpit instead of sending them.
const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

async function magicLinkFor(email: string): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const search = await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
    const { messages } = (await search.json()) as { messages: { ID: string }[] };
    if (messages.length > 0) {
      const message = (await (await fetch(`${MAILPIT_URL}/api/v1/message/${messages[0].ID}`)).json()) as { Text: string };
      const link = message.Text.match(/https?:\/\/\S+\/auth\/v1\/verify\S+/)?.[0];
      if (link) return link;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No magic link email for ${email}`);
}

const safeToSpend = (page: Page) => page.locator("#safe-heading + p");
const todayLine = (page: Page) => page.locator("#safe-heading + p + p");

test("sign up, set a budget, add spending and see safe-to-spend change", async ({ page }) => {
  const email = `smoke-${Date.now()}@example.com`;

  // Sign up with a magic link
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("status")).toContainText(email);
  await page.goto(await magicLinkFor(email));

  // Onboarding: set a budget (timezone is detected from the browser)
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByLabel("Timezone")).toHaveValue("America/New_York");
  await page.getByLabel("Monthly budget").fill("3100");
  await page.getByRole("button", { name: "Start tracking" }).click();

  // Dashboard
  await expect(page).toHaveURL(/\/$/);
  await expect(safeToSpend(page)).toHaveText(/^\$[\d,]+\.\d{2}$/);
  await expect(todayLine(page)).toHaveText("Nothing spent yet today");
  const before = await safeToSpend(page).textContent();

  // Regular spending today reduces what's left today
  await page.getByRole("button", { name: "Add spending" }).click();
  await page.getByLabel("Amount").fill("20");
  await page.getByLabel("Merchant or note").fill("Coffee and bagel");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(todayLine(page)).toContainText("$20.00 spent");

  // A one-off is reserved from the whole month, so the headline drops at once
  await page.getByRole("button", { name: "Add spending" }).click();
  await page.getByLabel("Amount").fill("600");
  await page.getByLabel("Merchant or note").fill("Flight");
  await page.getByLabel("One-off").check();
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(safeToSpend(page)).not.toHaveText(before!);
  await expect(page.getByText("Includes $600.00 of one-offs")).toBeVisible();

  // Both were saved: they survive a reload and appear in the list
  const after = await safeToSpend(page).textContent();
  await page.reload();
  await expect(safeToSpend(page)).toHaveText(after!);
  await page.getByRole("link", { name: "Transactions" }).click();
  await expect(page.getByText("Coffee and bagel")).toBeVisible();
  await expect(page.getByText("Flight")).toBeVisible();
});
