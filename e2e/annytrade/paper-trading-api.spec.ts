import { expect, test } from "@playwright/test";

/**
 * API-assisted paper desk flow against the running app (staging or local).
 * Covers register → login → watchlist/markets → paper buy/sell → cancel → positions → logout.
 */
test.describe("AnnyTrade paper trading E2E (API + routes)", () => {
  test("register, paper orders, cancel, positions, logout", async ({
    page,
    request,
    baseURL,
  }) => {
    const email = `e2e_paper_${Date.now()}@example.com`;
    const password = "Password12!";
    const origin = baseURL ?? "http://localhost:3000";

    const register = await request.post(
      `${origin}/api/annytrade/auth/register`,
      {
        data: {
          email,
          password,
          displayName: "E2E Paper",
        },
        headers: { Origin: origin, "Content-Type": "application/json" },
      },
    );
    expect(register.status(), await register.text()).toBe(201);
    const regJson = (await register.json()) as {
      ok?: boolean;
      data?: { user?: { id: string } };
    };
    expect(regJson.data?.user?.id).toBeTruthy();

    const me = await request.get(`${origin}/api/annytrade/auth/me`);
    expect(me.ok()).toBeTruthy();

    const accounts = await request.get(`${origin}/api/annytrade/accounts`);
    expect(accounts.ok()).toBeTruthy();
    const accountsJson = (await accounts.json()) as {
      data?: { accounts?: Array<{ id: string }> };
    };
    const accountId = accountsJson.data?.accounts?.[0]?.id;
    expect(accountId).toBeTruthy();

    const watchlists = await request.get(`${origin}/api/annytrade/watchlists`);
    expect(watchlists.ok()).toBeTruthy();

    const search = await request.get(
      `${origin}/api/annytrade/markets/search?q=AAPL`,
    );
    expect(search.ok()).toBeTruthy();

    const buyKey = `e2e-buy-${Date.now()}`;
    const buy = await request.post(`${origin}/api/annytrade/orders`, {
      data: {
        accountId,
        symbol: "AAPL",
        side: "BUY",
        orderType: "MARKET",
        quantity: 1,
        idempotencyKey: buyKey,
      },
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
        "Idempotency-Key": buyKey,
      },
    });
    expect([200, 201].includes(buy.status()), await buy.text()).toBeTruthy();
    const buyJson = (await buy.json()) as {
      data?: { order?: { id: string; status: string } };
    };
    expect(buyJson.data?.order?.id).toBeTruthy();

    const limitKey = `e2e-limit-${Date.now()}`;
    const limit = await request.post(`${origin}/api/annytrade/orders`, {
      data: {
        accountId,
        symbol: "AAPL",
        side: "BUY",
        orderType: "LIMIT",
        quantity: 1,
        limitPrice: 1,
        idempotencyKey: limitKey,
      },
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
      },
    });
    expect(
      [200, 201].includes(limit.status()),
      await limit.text(),
    ).toBeTruthy();
    const limitJson = (await limit.json()) as {
      data?: { order?: { id: string; status: string } };
    };
    const openOrderId = limitJson.data?.order?.id;
    expect(openOrderId).toBeTruthy();

    if (openOrderId && limitJson.data?.order?.status !== "FILLED") {
      const cancel = await request.post(
        `${origin}/api/annytrade/orders/${openOrderId}/cancel`,
        {
          headers: { Origin: origin },
        },
      );
      expect(cancel.ok(), await cancel.text()).toBeTruthy();
    }

    const sellKey = `e2e-sell-${Date.now()}`;
    const sell = await request.post(`${origin}/api/annytrade/orders`, {
      data: {
        accountId,
        symbol: "AAPL",
        side: "SELL",
        orderType: "MARKET",
        quantity: 1,
        idempotencyKey: sellKey,
      },
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
      },
    });
    expect([200, 201, 400, 409, 422].includes(sell.status())).toBeTruthy();

    const positions = await request.get(`${origin}/api/annytrade/positions`);
    expect(positions.ok()).toBeTruthy();

    const analytics = await request.get(
      `${origin}/api/annytrade/portfolio/analytics`,
    );
    expect(analytics.ok()).toBeTruthy();

    const alerts = await request.get(`${origin}/api/annytrade/alerts`);
    expect(alerts.ok()).toBeTruthy();

    await page.goto("/annytrade/trade/AAPL");
    await expect(page.locator("body")).toBeVisible();
    await page.goto("/annytrade/portfolio");
    await expect(page.locator("body")).toBeVisible();
    await page.goto("/annytrade/analytics");
    await expect(page.locator("body")).toBeVisible();
    await page.goto("/annytrade/account");
    await expect(page.locator("body")).toBeVisible();

    const logout = await request.post(`${origin}/api/annytrade/auth/logout`, {
      headers: { Origin: origin },
    });
    expect(logout.ok()).toBeTruthy();

    const meAfter = await request.get(`${origin}/api/annytrade/auth/me`);
    expect(meAfter.ok()).toBeTruthy();
    const meJson = (await meAfter.json()) as {
      data?: { authenticated?: boolean; user?: unknown };
    };
    expect(meJson.data?.authenticated).toBe(false);
    expect(meJson.data?.user).toBeNull();
  });
});
