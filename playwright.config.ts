import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.ANNYTRADE_E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e/annytrade",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 90_000,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: process.env.ANNYTRADE_E2E_BASE_URL
    ? undefined
    : {
        command: "npm run start",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        env: {
          ...process.env,
          // Align CSRF Origin checks with Playwright baseURL / default env.app.url
          NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? baseURL,
          // Production `next start` uses Secure cookies; allow HTTP local E2E
          ANNYTRADE_COOKIE_INSECURE:
            process.env.ANNYTRADE_COOKIE_INSECURE ?? "1",
        },
      },
});
