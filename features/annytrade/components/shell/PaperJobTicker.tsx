"use client";

import { useEffect } from "react";

import { useAnnyTrade } from "../../context/AnnyTradeContext";
import { annytradeFetch } from "../../services/client";
import { paperTradingClient } from "../../services/paper-client";

/**
 * Keeps paper resting orders + price alerts moving while the desk is open.
 * Complements server cron (Render keep-alive / Vercel daily).
 */
export function PaperJobTicker() {
  const { auth } = useAnnyTrade();

  useEffect(() => {
    if (!auth.authenticated) return;

    let cancelled = false;

    async function tick() {
      if (cancelled || document.visibilityState === "hidden") return;
      try {
        await paperTradingClient.processOrders();
      } catch {
        /* ignore */
      }
      try {
        await annytradeFetch("/alerts/process", {
          method: "POST",
          body: "{}",
        });
      } catch {
        /* ignore */
      }
    }

    void tick();
    const id = window.setInterval(() => void tick(), 20_000);
    const onVis = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [auth.authenticated]);

  return null;
}
