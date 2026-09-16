import { createNotification } from "../repos/notifications";
import {
  listActivePriceAlerts,
  listActivePriceAlertsForUser,
  updateAlertTriggerState,
  type DbPriceAlert,
} from "../repos/alerts";
import { getProfile } from "../repos/profiles";
import { findUserById } from "../repos/users";
import { marketDataService } from "../market/service";
import { referenceLast } from "../trading/pricing";
import { env } from "@/lib/env";

export type AlertEvalResult = {
  checked: number;
  triggered: number;
  notifications: number;
  emails: number;
  errors: { alertId: string; message: string }[];
};

/**
 * Pure condition check for tests.
 * PRICE_ABOVE: last >= target
 * PRICE_BELOW: last <= target
 * PCT_MOVE: |last - baseline| / baseline * 100 >= target (target in percent)
 */
export function isAlertConditionMet(
  alert: Pick<DbPriceAlert, "condition" | "target_value" | "baseline_price">,
  last: number,
): boolean {
  const target = Number(alert.target_value);
  if (!Number.isFinite(last) || !Number.isFinite(target)) return false;
  if (alert.condition === "PRICE_ABOVE") return last >= target;
  if (alert.condition === "PRICE_BELOW") return last <= target;
  if (alert.condition === "PCT_MOVE") {
    const base =
      alert.baseline_price != null ? Number(alert.baseline_price) : null;
    if (base == null || base === 0) return false;
    const pct = (Math.abs(last - base) / Math.abs(base)) * 100;
    return pct >= target;
  }
  return false;
}

export function inCooldown(
  alert: Pick<DbPriceAlert, "last_triggered_at" | "cooldown_seconds">,
  now = new Date(),
): boolean {
  if (!alert.last_triggered_at) return false;
  const elapsed = now.getTime() - alert.last_triggered_at.getTime();
  return elapsed < alert.cooldown_seconds * 1000;
}

async function maybeSendEmail(input: {
  to: string;
  subject: string;
  text: string;
  enabled: boolean;
}): Promise<boolean> {
  if (!input.enabled) return false;
  const apiKey = env.resend.apiKey;
  const from = env.resend.fromEmail;
  if (!apiKey || !from) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject,
        text: input.text,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function evaluateAlertList(
  alerts: DbPriceAlert[],
): Promise<AlertEvalResult> {
  const result: AlertEvalResult = {
    checked: alerts.length,
    triggered: 0,
    notifications: 0,
    emails: 0,
    errors: [],
  };
  if (alerts.length === 0) return result;

  const symbols = [...new Set(alerts.map((a) => a.symbol))];
  let quotes: Awaited<ReturnType<typeof marketDataService.quotes>> = [];
  try {
    quotes = await marketDataService.quotes(symbols);
  } catch (err) {
    for (const a of alerts) {
      result.errors.push({
        alertId: a.id,
        message: err instanceof Error ? err.message : "Quote fetch failed",
      });
    }
    return result;
  }
  const qmap = new Map(quotes.map((q) => [q.symbol, q]));

  for (const alert of alerts) {
    try {
      const q = qmap.get(alert.symbol);
      const last = q ? referenceLast(q) : null;
      if (last == null) {
        result.errors.push({
          alertId: alert.id,
          message: `No mark for ${alert.symbol}`,
        });
        continue;
      }

      const met = isAlertConditionMet(alert, last);
      if (!met) {
        // Re-arm when condition clears (prevents spam on sustained breach)
        if (!alert.armed) {
          await updateAlertTriggerState({ id: alert.id, armed: true });
        }
        continue;
      }

      if (!alert.armed) continue;
      if (inCooldown(alert)) continue;

      const profile = await getProfile(alert.user_id);
      const allowInApp = profile?.notify_price_alerts !== false;
      const allowEmailPref = profile?.notify_email_alerts === true;

      await updateAlertTriggerState({
        id: alert.id,
        armed: false,
        triggered: true,
      });
      result.triggered += 1;

      const title = `Price alert, ${alert.symbol}`;
      const message = `${alert.condition.replaceAll("_", " ")} ${Number(alert.target_value)}, last ${last}`;

      if (alert.notify_in_app && allowInApp) {
        await createNotification({
          userId: alert.user_id,
          type: "price",
          title,
          message,
        });
        result.notifications += 1;
      }

      if (alert.notify_email && allowEmailPref) {
        const user = await findUserById(alert.user_id);
        if (user?.email) {
          const sent = await maybeSendEmail({
            to: user.email,
            subject: title,
            text: `${message}\n\nAnnyTrade paper desk alert, not financial advice.`,
            enabled: true,
          });
          if (sent) result.emails += 1;
        }
      }
    } catch (err) {
      result.errors.push({
        alertId: alert.id,
        message: err instanceof Error ? err.message : "Alert eval failed",
      });
    }
  }

  return result;
}

export async function evaluateAlertsForUser(
  userId: string,
): Promise<AlertEvalResult> {
  const alerts = await listActivePriceAlertsForUser(userId);
  return evaluateAlertList(alerts);
}

export async function evaluateAllActiveAlerts(): Promise<AlertEvalResult> {
  const alerts = await listActivePriceAlerts();
  return evaluateAlertList(alerts);
}
