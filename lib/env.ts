/**
 * Environment variable accessors.
 *
 * Integrations are prepared architecturally but not wired.
 * Values may be empty until `.env.local` is configured.
 * Do not throw at import time — only when a feature is used.
 */

function read(key: string): string | undefined {
  const value = process.env[key];
  return value && value.length > 0 ? value : undefined;
}

export const env = {
  app: {
    url: read("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000",
    environment: read("NEXT_PUBLIC_APP_ENV") ?? "development",
  },
  supabase: {
    url: read("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: read("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    serviceRoleKey: read("SUPABASE_SERVICE_ROLE_KEY"),
  },
  resend: {
    apiKey: read("RESEND_API_KEY"),
    fromEmail: read("RESEND_FROM_EMAIL"),
  },
  vercel: {
    isVercel: read("VERCEL") === "1",
    env: read("VERCEL_ENV"),
    url: read("VERCEL_URL"),
  },
  analytics: {
    gaMeasurementId: read("NEXT_PUBLIC_GA_MEASUREMENT_ID"),
    umamiWebsiteId: read("NEXT_PUBLIC_UMAMI_WEBSITE_ID"),
    umamiScriptUrl: read("NEXT_PUBLIC_UMAMI_SCRIPT_URL"),
  },
  openai: {
    apiKey: read("OPENAI_API_KEY"),
    orgId: read("OPENAI_ORG_ID"),
  },
  annytrade: {
    databaseUrl: read("ANNYTRADE_DATABASE_URL") ?? read("DATABASE_URL"),
    /** Public product URL when AnnyTrade is deployed as its own Vercel project. */
    publicUrl: read("NEXT_PUBLIC_ANNYTRADE_URL"),
    standalone: read("ANNYTRADE_STANDALONE") === "1",
  },
} as const;

export type Env = typeof env;
