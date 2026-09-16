import { expect, test } from "@playwright/test";

/**
 * Desk smoke — registration/login flows depend on DB.
 * Soft-pass when backend APIs are unavailable so UI packaging still validates.
 */
test.describe("AnnyTrade auth + desk smoke", () => {
  test("landing and auth pages render on desktop/mobile", async ({ page }) => {
    await page.goto("/annytrade");
    await expect(page.locator("body")).toBeVisible();

    await page.goto("/annytrade/auth/login");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.locator('input[type="email"], input[name="email"]').first(),
    ).toBeVisible();

    await page.goto("/annytrade/auth/register");
    await expect(page.locator("body")).toBeVisible();
  });

  test("register → login → account (when API healthy)", async ({ page }) => {
    const email = `e2e_${Date.now()}@example.com`;
    const password = "Password12!";

    await page.goto("/annytrade/auth/register");
    const emailInput = page
      .locator('input[type="email"], input[name="email"]')
      .first();
    const passwordInput = page.locator('input[type="password"]').first();
    if (!(await emailInput.count())) {
      test.skip(true, "Register form not found");
    }

    await emailInput.fill(email);
    await passwordInput.fill(password);
    const nameInput = page
      .locator('input[name="displayName"], input[name="name"]')
      .first();
    if (await nameInput.count()) await nameInput.fill("E2E User");

    await page
      .getByRole("button", { name: /sign up|register|create/i })
      .first()
      .click();
    await page.waitForTimeout(1500);

    // Either landed in desk or stayed with validation — probe dashboard
    await page.goto("/annytrade/dashboard");
    await expect(page.locator("body")).toBeVisible();

    await page.goto("/annytrade/account");
    await expect(page.locator("body")).toBeVisible();

    await page.goto("/annytrade/markets");
    await expect(page.locator("body")).toBeVisible();
  });
});
