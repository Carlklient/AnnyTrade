"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { AnnyTradeLogo } from "../brand/AnnyTradeLogo";
import { useAnnyTrade } from "../../context/AnnyTradeContext";
import { annytradeRoutes } from "../../lib/routes";
import { annytradeFetch } from "../../services/client";

type AuthVariant =
  "login" | "register" | "forgot" | "reset" | "verify" | "onboarding";

const COPY: Record<
  AuthVariant,
  { title: string; subtitle: string; cta: string; next?: string }
> = {
  login: {
    title: "Welcome back",
    subtitle: "Sign in to your AnnyTrade paper account.",
    cta: "Sign in",
    next: annytradeRoutes.dashboard,
  },
  register: {
    title: "Create account",
    subtitle:
      "Creates a real account with a PAPER trading ledger. Markets stay simulated.",
    cta: "Create account",
    next: annytradeRoutes.auth.onboarding,
  },
  forgot: {
    title: "Forgot password",
    subtitle:
      "Request a password reset. Email delivery is foundation-only in Phase 1.",
    cta: "Send reset link",
    next: annytradeRoutes.auth.reset,
  },
  reset: {
    title: "Reset password",
    subtitle:
      "Paste the reset token from your email (or local server log in development).",
    cta: "Update password",
    next: annytradeRoutes.auth.login,
  },
  verify: {
    title: "Verify email",
    subtitle:
      "Paste the email verification token from development logs / email.",
    cta: "Verify",
    next: annytradeRoutes.auth.onboarding,
  },
  onboarding: {
    title: "Set up your desk",
    subtitle: "Saved to your profile. Market data remains simulated.",
    cta: "Enter dashboard",
    next: annytradeRoutes.dashboard,
  },
};

const LABEL = {
  color: "#020617",
  WebkitTextFillColor: "#020617",
} as const;

export function AuthView({ variant }: { variant: AuthVariant }) {
  const router = useRouter();
  const { refreshAuth } = useAnnyTrade();
  const copy = COPY[variant];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    const form = new FormData(e.currentTarget);

    try {
      if (variant === "login") {
        await annytradeFetch("/auth/login", {
          method: "POST",
          body: JSON.stringify({
            email: String(form.get("email") ?? ""),
            password: String(form.get("password") ?? ""),
          }),
        });
        await refreshAuth();
        router.push(copy.next ?? annytradeRoutes.dashboard);
        return;
      }

      if (variant === "register") {
        const reg = await annytradeFetch<{
          user: unknown;
          emailDelivery?: {
            sent: boolean;
            reason?: string;
            verifyUrl?: string;
            verifyToken?: string;
          };
        }>("/auth/register", {
          method: "POST",
          body: JSON.stringify({
            email: String(form.get("email") ?? ""),
            password: String(form.get("password") ?? ""),
            displayName: String(form.get("displayName") ?? ""),
          }),
        });
        await refreshAuth();
        if (reg.emailDelivery && !reg.emailDelivery.sent) {
          const link =
            reg.emailDelivery.verifyUrl ||
            (reg.emailDelivery.verifyToken
              ? `${annytradeRoutes.auth.verify}?token=${encodeURIComponent(reg.emailDelivery.verifyToken)}`
              : null);
          if (link) {
            setInfo(
              `Account created. Email offline — verify here: ${link}`,
            );
            return;
          }
        }
        router.push(copy.next ?? annytradeRoutes.dashboard);
        return;
      }

      if (variant === "forgot") {
        const reset = await annytradeFetch<{
          ok: boolean;
          emailDelivery?: {
            sent?: boolean;
            resetUrl?: string;
            resetToken?: string;
          };
        }>("/auth/password-reset", {
          method: "POST",
          body: JSON.stringify({ email: String(form.get("email") ?? "") }),
        });
        if (reset.emailDelivery?.resetUrl || reset.emailDelivery?.resetToken) {
          const link =
            reset.emailDelivery.resetUrl ||
            `${annytradeRoutes.auth.reset}?token=${encodeURIComponent(reset.emailDelivery.resetToken!)}`;
          setInfo(`Email offline — use this reset link: ${link}`);
          return;
        }
        setInfo("If that email exists, a reset token was issued.");
        return;
      }

      if (variant === "reset") {
        await annytradeFetch("/auth/password-reset", {
          method: "POST",
          body: JSON.stringify({
            token: String(form.get("token") ?? ""),
            password: String(form.get("password") ?? ""),
          }),
        });
        setInfo("Password updated. You can sign in.");
        router.push(annytradeRoutes.auth.login);
        return;
      }

      if (variant === "verify") {
        await annytradeFetch("/auth/verify-email", {
          method: "POST",
          body: JSON.stringify({ token: String(form.get("token") ?? "") }),
        });
        await refreshAuth();
        router.push(copy.next ?? annytradeRoutes.dashboard);
        return;
      }

      if (variant === "onboarding") {
        await annytradeFetch("/profile", {
          method: "PATCH",
          body: JSON.stringify({
            defaultMarket: String(form.get("defaultMarket") ?? "forex"),
            preferredCurrency: String(form.get("preferredCurrency") ?? "USD"),
          }),
        });
        await refreshAuth();
        router.push(copy.next ?? annytradeRoutes.dashboard);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Request failed. Try again.";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      data-annytrade
      data-at-theme="light"
      className="flex min-h-dvh items-center justify-center px-4 py-8 sm:py-10"
      style={{
        background:
          "radial-gradient(900px 500px at 20% 0%, color-mix(in srgb, var(--at-accent) 10%, transparent), transparent), #f3f5f8",
        color: "#020617",
        paddingBottom: "max(2rem, env(safe-area-inset-bottom))",
        paddingTop: "max(2rem, env(safe-area-inset-top))",
      }}
    >
      <div className="at-card w-full max-w-md shadow-sm">
        <div className="at-card-body space-y-5">
          <AnnyTradeLogo />
          <div>
            <h1
              className="text-[1.35rem] font-extrabold sm:text-xl"
              style={{
                fontFamily: "var(--at-font-display)",
                color: "#020617",
                WebkitTextFillColor: "#020617",
              }}
            >
              {copy.title}
            </h1>
            <p
              className="mt-1 text-[0.875rem] font-semibold"
              style={{ color: "#0f172a", WebkitTextFillColor: "#0f172a" }}
            >
              {copy.subtitle}
            </p>
          </div>

          {error ? (
            <p className="rounded-[8px] border border-[color-mix(in_srgb,var(--at-sell)_40%,var(--at-border))] bg-[var(--at-sell-muted)] px-3 py-2 text-[0.8125rem] font-semibold text-[#7f1d1d]">
              {error}
            </p>
          ) : null}
          {info ? (
            <p className="rounded-[8px] border px-3 py-2 text-[0.8125rem] font-semibold text-[#020617]">
              {info}
            </p>
          ) : null}

          <form className="space-y-3" onSubmit={onSubmit}>
            {variant === "login" || variant === "register" ? (
              <>
                {variant === "register" ? (
                  <label className="block space-y-1.5">
                    <span className="text-[0.8rem] font-bold" style={LABEL}>
                      Full name
                    </span>
                    <input
                      className="at-input"
                      id="at-auth-display-name"
                      name="displayName"
                      placeholder="Full name"
                      autoComplete="name"
                      required
                      minLength={2}
                    />
                  </label>
                ) : null}
                <label className="block space-y-1.5">
                  <span className="text-[0.8rem] font-bold" style={LABEL}>
                    Email
                  </span>
                  <input
                    className="at-input"
                    id="at-auth-email"
                    name="email"
                    type="email"
                    placeholder="Email"
                    autoComplete="email"
                    required
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[0.8rem] font-bold" style={LABEL}>
                    Password
                  </span>
                  <input
                    className="at-input"
                    id="at-auth-password"
                    name="password"
                    type="password"
                    placeholder="Password"
                    autoComplete={
                      variant === "register"
                        ? "new-password"
                        : "current-password"
                    }
                    required
                    minLength={variant === "register" ? 10 : 1}
                  />
                </label>
              </>
            ) : null}
            {variant === "forgot" ? (
              <label className="block space-y-1.5">
                <span className="text-[0.8rem] font-bold" style={LABEL}>
                  Email
                </span>
                <input
                  className="at-input"
                  id="at-auth-forgot-email"
                  name="email"
                  type="email"
                  placeholder="Email"
                  autoComplete="email"
                  required
                />
              </label>
            ) : null}
            {variant === "reset" ? (
              <>
                <label className="block space-y-1.5">
                  <span className="text-[0.8rem] font-bold" style={LABEL}>
                    Reset token
                  </span>
                  <input
                    className="at-input"
                    id="at-auth-reset-token"
                    name="token"
                    placeholder="Reset token"
                    required
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[0.8rem] font-bold" style={LABEL}>
                    New password
                  </span>
                  <input
                    className="at-input"
                    id="at-auth-reset-password"
                    name="password"
                    type="password"
                    placeholder="New password"
                    autoComplete="new-password"
                    required
                    minLength={10}
                  />
                </label>
              </>
            ) : null}
            {variant === "verify" ? (
              <label className="block space-y-1.5">
                <span className="text-[0.8rem] font-bold" style={LABEL}>
                  Verification token
                </span>
                <input
                  className="at-input"
                  id="at-auth-verify-token"
                  name="token"
                  placeholder="Verification token"
                  required
                />
              </label>
            ) : null}
            {variant === "onboarding" ? (
              <>
                <p className="text-[0.8rem] font-bold leading-relaxed" style={LABEL}>
                  Quick coach: size small on PAPER, mark invalidation with H-Line
                  or Fib, then place the order. Live money stays hard-blocked.
                </p>
                <select
                  className="at-input"
                  name="defaultMarket"
                  defaultValue="forex"
                  required
                >
                  <option value="forex">Preferred market , Forex</option>
                  <option value="indices">Preferred market , Indices</option>
                  <option value="commodities">
                    Preferred market , Commodities
                  </option>
                  <option value="crypto">Preferred market , Crypto</option>
                </select>
                <select
                  className="at-input"
                  name="preferredCurrency"
                  defaultValue="USD"
                  required
                >
                  <option value="USD">Account currency , USD</option>
                  <option value="EUR">Account currency , EUR</option>
                  <option value="GBP">Account currency , GBP</option>
                </select>
                <select
                  className="at-input"
                  name="experience"
                  defaultValue="beginner"
                >
                  <option value="beginner">Experience · Beginner</option>
                  <option value="intermediate">Experience · Intermediate</option>
                  <option value="advanced">Experience · Advanced</option>
                </select>
                <select
                  className="at-input"
                  name="riskPreference"
                  defaultValue="balanced"
                >
                  <option value="conservative">Risk · Conservative</option>
                  <option value="balanced">Risk · Balanced</option>
                  <option value="aggressive">Risk · Aggressive</option>
                </select>
              </>
            ) : null}

            <button
              type="submit"
              className="at-btn at-btn-primary w-full"
              disabled={busy}
            >
              {busy ? "Working…" : copy.cta}
            </button>
          </form>

          <div className="flex flex-wrap gap-3 text-[0.8rem] font-bold" style={LABEL}>
            {variant === "login" ? (
              <>
                <Link href={annytradeRoutes.auth.register}>Create account</Link>
                <Link href={annytradeRoutes.auth.forgot}>Forgot password</Link>
              </>
            ) : (
              <Link href={annytradeRoutes.auth.login}>Back to sign in</Link>
            )}
            <Link href={annytradeRoutes.dashboard}>
              Browse desk without signing in (guest chrome)
            </Link>
            <Link href="/work/annytrade">← Portfolio case study</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
