"use client";

/**
 * Risk / educational disclosure surface.
 * Does not claim regulatory approval or licensed advice.
 */
export function RiskDisclosure({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-[0.7rem] font-bold text-[var(--at-text)]">
        Educational only, not investment advice. Trading involves risk of loss.
        Signals do not guarantee outcomes. No SEC/FCA/FINRA approval is claimed.
      </p>
    );
  }

  return (
    <aside
      className="rounded-[8px] border px-3 py-2 text-[0.75rem] font-bold text-[var(--at-text)]"
      style={{
        borderColor: "var(--at-border)",
        background: "var(--at-bg-elevated)",
      }}
      role="note"
      aria-label="Risk disclosure"
    >
      <p className="font-medium text-[var(--at-text)]">Risk disclosure</p>
      <ul className="mt-1 list-inside list-disc space-y-0.5">
        <li>
          AnnyTrade is a product demonstration / trading platform under
          development.
        </li>
        <li>
          Paper and sandbox activity is not real money; Broker Live remains
          disabled.
        </li>
        <li>
          Analysis signals are rule based educational labels, not guarantees or
          advice.
        </li>
        <li>
          Past performance and simulated results do not predict future results.
        </li>
        <li>
          This software does not constitute SEC, FCA, FINRA, or other regulatory
          approval, membership, or licensing.
        </li>
      </ul>
    </aside>
  );
}
