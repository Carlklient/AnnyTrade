import { annytradeFetch } from "./client";

export type PriceAlertDto = {
  id: string;
  symbol: string;
  condition: "PRICE_ABOVE" | "PRICE_BELOW" | "PCT_MOVE";
  targetValue: number;
  baselinePrice: number | null;
  status: string;
  cooldownSeconds: number;
  lastTriggeredAt: string | null;
  triggerCount: number;
  armed: boolean;
  notifyInApp: boolean;
  notifyEmail: boolean;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export const alertsClient = {
  list() {
    return annytradeFetch<{ alerts: PriceAlertDto[]; paper: true }>("/alerts", {
      method: "GET",
    });
  },

  create(input: {
    symbol: string;
    condition: PriceAlertDto["condition"];
    targetValue: number;
    cooldownSeconds?: number;
    notifyInApp?: boolean;
    notifyEmail?: boolean;
    note?: string | null;
  }) {
    return annytradeFetch<{ alert: PriceAlertDto; paper: true }>("/alerts", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  cancel(id: string) {
    return annytradeFetch<{ alert: PriceAlertDto; paper: true }>(
      `/alerts/${id}`,
      { method: "DELETE" },
    );
  },

  process() {
    return annytradeFetch<{
      checked: number;
      triggered: number;
      notifications: number;
      emails: number;
      paper: true;
    }>("/alerts/process", { method: "POST", body: JSON.stringify({}) });
  },
};
