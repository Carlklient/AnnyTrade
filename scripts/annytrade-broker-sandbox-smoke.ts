/**
 * Optional real Alpaca Paper smoke test — NOT part of ordinary CI.
 *
 * Usage:
 *   ANNYTRADE_BROKER_API_KEY_ID=... \
 *   ANNYTRADE_BROKER_API_SECRET_KEY=... \
 *   npm run annytrade:test:broker-sandbox
 *
 * Exits 0 on success. Exits 2 if credentials missing (expected without secrets).
 */
import { createAlpacaPaperBrokerProvider } from "../features/annytrade/server/broker/providers/alpaca-paper";
import { envBrokerCredentials } from "../features/annytrade/server/broker/factory";

async function main() {
  const creds = envBrokerCredentials();
  if (!creds) {
    console.log(
      JSON.stringify({
        ok: false,
        code: "BROKER_SANDBOX_CREDENTIALS_REQUIRED",
        message:
          "Set ANNYTRADE_BROKER_API_KEY_ID and ANNYTRADE_BROKER_API_SECRET_KEY for Alpaca Paper",
      }),
    );
    process.exit(2);
  }

  const provider = createAlpacaPaperBrokerProvider();
  const account = await provider.connect(creds);
  if (account.liveMoney !== false || account.environment !== "SANDBOX") {
    throw new Error("Refusing non-sandbox account");
  }
  const positions = await provider.getPositions(creds);
  const orders = await provider.listOrders(creds, { status: "open", limit: 5 });
  console.log(
    JSON.stringify({
      ok: true,
      environment: account.environment,
      liveMoney: account.liveMoney,
      label: account.label,
      cash: account.cash,
      buyingPower: account.buyingPower,
      positions: positions.length,
      openOrders: orders.length,
      provider: provider.meta.providerId,
    }),
  );
}

main().catch((err) => {
  console.error(
    JSON.stringify({
      ok: false,
      error: err instanceof Error ? err.message : "smoke failed",
    }),
  );
  process.exit(1);
});
