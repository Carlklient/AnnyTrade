/**
 * Canonical AnnyTrade execution environments (Phase 8).
 * Frontend posture modes (demo / Preview Live) are NOT execution environments.
 */

export const EXECUTION_ENVIRONMENTS = [
  "INTERNAL_PAPER",
  "BROKER_SANDBOX",
  "BROKER_LIVE",
] as const;

export type ExecutionEnvironment = (typeof EXECUTION_ENVIRONMENTS)[number];

export const EXECUTION_ENV_LABEL: Record<ExecutionEnvironment, string> = {
  INTERNAL_PAPER: "AnnyTrade PAPER",
  BROKER_SANDBOX: "Broker Paper / Sandbox",
  BROKER_LIVE: "Broker Live (real money)",
};

export function isRealMoneyEnvironment(env: ExecutionEnvironment): boolean {
  return env === "BROKER_LIVE";
}

export function environmentAllowsLiveMoney(env: ExecutionEnvironment): boolean {
  return env === "BROKER_LIVE";
}

/** UI / API stamps — never treat client claims as authoritative. */
export type ExecutionContextStamp = {
  environment: ExecutionEnvironment;
  liveMoney: boolean;
  label: string;
  /** Server-authoritative; client cannot elevate. */
  authoritative: true;
};

export function stampEnvironment(
  environment: ExecutionEnvironment,
): ExecutionContextStamp {
  const liveMoney = isRealMoneyEnvironment(environment);
  return {
    environment,
    liveMoney,
    label: EXECUTION_ENV_LABEL[environment],
    authoritative: true,
  };
}
