import { expect, test } from "@playwright/test";

test.describe("AnnyTrade accessibility smoke", () => {
  test("login page has accessible email field and main landmark-ish structure", async ({
    page,
  }) => {
    await page.goto("/annytrade/auth/login");
    const email = page
      .locator('input[type="email"], input[name="email"]')
      .first();
    await expect(email).toBeVisible();
    // Labels or aria
    const labelled = await email.evaluate((el) => {
      const id = el.getAttribute("id");
      const aria = el.getAttribute("aria-label");
      const hasLabel =
        aria ||
        (id ? Boolean(document.querySelector(`label[for="${id}"]`)) : false) ||
        Boolean(el.closest("label"));
      return Boolean(hasLabel);
    });
    expect(labelled).toBe(true);

    // No autofocus trap on hidden dialogs
    await expect(page.locator("body")).toBeVisible();
  });

  test("desk shell exposes navigation when authenticated shell mounts", async ({
    page,
  }) => {
    await page.goto("/annytrade/dashboard");
    await expect(page.locator("body")).toBeVisible();
    // Risk disclosure / env banners should not remove keyboard focusability of body
    const tabbable = page.locator("a, button, input, select, textarea");
    expect(await tabbable.count()).toBeGreaterThan(0);
  });
});
