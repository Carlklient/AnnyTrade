/**
 * Compliance / jurisdictional readiness checklist placeholders.
 * Do NOT fabricate approvals — all items default incomplete / not_assessed.
 */

export type ComplianceItemStatus =
  "not_assessed" | "pending" | "complete" | "blocked" | "not_applicable";

export type ComplianceChecklistItem = {
  id: string;
  category: string;
  title: string;
  description: string;
  status: ComplianceItemStatus;
  /** Never auto-set to complete without human operator. */
  requiresHumanSignOff: true;
  signedOffAt: null;
  signedOffBy: null;
};

export function getComplianceReadinessChecklist(): ComplianceChecklistItem[] {
  const base = (
    id: string,
    category: string,
    title: string,
    description: string,
  ): ComplianceChecklistItem => ({
    id,
    category,
    title,
    description,
    status: "not_assessed",
    requiresHumanSignOff: true,
    signedOffAt: null,
    signedOffBy: null,
  });

  return [
    base(
      "jurisdiction",
      "legal",
      "Jurisdiction assessment",
      "Confirm target user jurisdictions and broker eligibility. Placeholder — not approved.",
    ),
    base(
      "broker_agreement",
      "legal",
      "Broker live account agreement",
      "Executed broker live-trading agreement and API terms. Placeholder — not approved.",
    ),
    base(
      "kyc_aml",
      "compliance",
      "KYC / AML posture",
      "Confirm KYC/AML is handled by the licensed broker; AnnyTrade does not custody funds. Placeholder.",
    ),
    base(
      "disclosures",
      "compliance",
      "Risk disclosures",
      "Customer-facing live trading risk disclosures. Placeholder — not approved.",
    ),
    base(
      "ops_runbook",
      "operations",
      "Incident / kill-switch runbook",
      "On-call procedures for broker outage and emergency kill switch. Placeholder.",
    ),
    base(
      "recon_sla",
      "operations",
      "Reconciliation SLA",
      "Documented reconcile cadence and mismatch escalation. Placeholder.",
    ),
    base(
      "no_custody",
      "architecture",
      "No customer fund custody",
      "Confirm AnnyTrade does not build deposit/custody rails — broker holds funds.",
    ),
    base(
      "no_crypto_custody",
      "architecture",
      "No arbitrary crypto custody",
      "Confirm no AnnyTrade-operated crypto wallet custody.",
    ),
  ];
}

export function complianceSummary() {
  const items = getComplianceReadinessChecklist();
  return {
    approvedForLive: false as const,
    fabricatedApproval: false as const,
    incompleteCount: items.length,
    items,
    notice:
      "No compliance item is auto-approved. Human operator sign-off required before live trading.",
  };
}
