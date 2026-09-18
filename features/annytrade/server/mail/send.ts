import { env } from "@/lib/env";

const RESEND_ONBOARDING_FROM = "AnnyTrade <onboarding@resend.dev>";

export function resolveResendFrom(): string | null {
  if (!env.resend.apiKey) return null;
  const from = env.resend.fromEmail?.trim();
  return from && from.length > 0 ? from : RESEND_ONBOARDING_FROM;
}

export async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = env.resend.apiKey;
  const from = resolveResendFrom();
  if (!apiKey || !from) {
    console.info("[annytrade] email skipped (Resend not configured)", {
      to: input.to,
      subject: input.subject,
    });
    return { sent: false, reason: "resend_not_configured" };
  }
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
        html:
          input.html ??
          `<pre style="font-family:sans-serif;white-space:pre-wrap">${input.text}</pre>`,
      }),
    });
    if (!res.ok) {
      return { sent: false, reason: `http_${res.status}` };
    }
    return { sent: true };
  } catch {
    return { sent: false, reason: "network_error" };
  }
}

export function appPublicUrl(): string {
  return (
    env.annytrade.publicUrl?.replace(/\/$/, "") ||
    env.app.url.replace(/\/$/, "") ||
    "https://annytrade.onrender.com"
  );
}

/** Paper-desk fallback: return auth links in API when Resend cannot send. */
export function mailFallbackExposeEnabled(): boolean {
  const v = process.env.ANNYTRADE_MAIL_FALLBACK_EXPOSE?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export function resendConfigured(): boolean {
  return Boolean(env.resend.apiKey);
}
