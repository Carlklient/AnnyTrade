import { getSql } from "../db/client";
import type { DbProfile } from "../domain/types";

export async function createProfile(input: {
  userId: string;
  displayName: string;
}): Promise<DbProfile> {
  const sql = getSql();
  const rows = await sql<DbProfile[]>`
    INSERT INTO annytrade.profiles (user_id, display_name)
    VALUES (${input.userId}, ${input.displayName})
    RETURNING *
  `;
  const profile = rows[0];
  if (!profile) throw new Error("Failed to create profile");
  return profile;
}

export async function getProfile(userId: string): Promise<DbProfile | null> {
  const sql = getSql();
  const rows = await sql<DbProfile[]>`
    SELECT * FROM annytrade.profiles WHERE user_id = ${userId} LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function updateProfile(
  userId: string,
  patch: Partial<{
    displayName: string;
    timezone: string;
    preferredCurrency: string;
    themePreference: "dark" | "light" | "system";
    defaultMarket: string;
    notifyOrders: boolean;
    notifySignals: boolean;
    notifySecurity: boolean;
    notifyMarketing: boolean;
    notifyPriceAlerts: boolean;
    notifyEmailAlerts: boolean;
  }>,
): Promise<DbProfile> {
  const sql = getSql();
  const current = await getProfile(userId);
  if (!current) throw new Error("Profile not found");

  const rows = await sql<DbProfile[]>`
    UPDATE annytrade.profiles SET
      display_name = ${patch.displayName ?? current.display_name},
      timezone = ${patch.timezone ?? current.timezone},
      preferred_currency = ${patch.preferredCurrency ?? current.preferred_currency},
      theme_preference = ${patch.themePreference ?? current.theme_preference},
      default_market = ${patch.defaultMarket ?? current.default_market},
      notify_orders = ${patch.notifyOrders ?? current.notify_orders},
      notify_signals = ${patch.notifySignals ?? current.notify_signals},
      notify_security = ${patch.notifySecurity ?? current.notify_security},
      notify_marketing = ${patch.notifyMarketing ?? current.notify_marketing},
      notify_price_alerts = ${patch.notifyPriceAlerts ?? current.notify_price_alerts ?? true},
      notify_email_alerts = ${patch.notifyEmailAlerts ?? current.notify_email_alerts ?? false},
      updated_at = NOW()
    WHERE user_id = ${userId}
    RETURNING *
  `;
  const profile = rows[0];
  if (!profile) throw new Error("Failed to update profile");
  return profile;
}
