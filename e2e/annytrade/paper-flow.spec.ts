import { expect, test } from "@playwright/test";

test.describe("AnnyTrade paper flow surfaces", () => {
  test("markets, trade, portfolio, signals, alerts, notifications routes load", async ({
    page,
  }) => {
    const paths = [
      "/annytrade/markets",
      "/annytrade/trade/AAPL",
      "/annytrade/portfolio",
      "/annytrade/analytics",
      "/annytrade/signals",
      "/annytrade/notifications",
      "/annytrade/wallet",
      "/annytrade/calendar",
      "/annytrade/news",
      "/annytrade/account",
    ];
    for (const path of paths) {
      const res = await page.goto(path);
      expect(
        res?.ok() || res?.status() === 200 || res?.status() === 304,
      ).toBeTruthy();
      await expect(page.locator("body")).toBeVisible();
    }
  });
});
