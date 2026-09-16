import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((v) => v.toLowerCase());

export const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(128)
  .regex(/[A-Za-z]/, "Password must include a letter")
  .regex(/[0-9]/, "Password must include a number");

export const displayNameSchema = z.string().trim().min(2).max(80);

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: displayNameSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const profilePatchSchema = z
  .object({
    displayName: displayNameSchema.optional(),
    timezone: z.string().trim().min(1).max(64).optional(),
    preferredCurrency: z.string().trim().min(3).max(8).optional(),
    themePreference: z.enum(["dark", "light", "system"]).optional(),
    defaultMarket: z
      .enum(["forex", "crypto", "stocks", "indices", "commodities", "etfs"])
      .optional(),
    notifyOrders: z.boolean().optional(),
    notifySignals: z.boolean().optional(),
    notifySecurity: z.boolean().optional(),
    notifyMarketing: z.boolean().optional(),
    notifyPriceAlerts: z.boolean().optional(),
    notifyEmailAlerts: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field is required",
  });

export const watchlistCreateSchema = z.object({
  name: z.string().trim().min(1).max(64),
});

export const watchlistPatchSchema = z.object({
  name: z.string().trim().min(1).max(64),
});

export const watchlistItemSchema = z.object({
  symbol: z
    .string()
    .trim()
    .min(1)
    .max(32)
    .regex(/^[A-Za-z0-9._/-]+$/, "Invalid symbol")
    .transform((s) => s.toUpperCase()),
});

export const passwordResetRequestSchema = z.object({
  email: emailSchema,
});

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(20).max(200),
  password: passwordSchema,
});

export const emailVerifySchema = z.object({
  token: z.string().min(20).max(200),
});

export const orderSideSchema = z.enum(["BUY", "SELL"]);
export const orderTypeSchema = z.enum([
  "MARKET",
  "LIMIT",
  "STOP",
  "STOP_LIMIT",
]);

export const orderCreateSchema = z
  .object({
    accountId: z.string().uuid().optional(),
    symbol: z
      .string()
      .trim()
      .min(1)
      .max(32)
      .regex(/^[A-Za-z0-9._/-]+$/, "Invalid symbol")
      .transform((s) => s.toUpperCase()),
    side: orderSideSchema,
    orderType: orderTypeSchema,
    quantity: z.number().finite().positive().max(1_000_000),
    limitPrice: z
      .number()
      .finite()
      .positive()
      .max(1_000_000_000)
      .nullable()
      .optional(),
    stopPrice: z
      .number()
      .finite()
      .positive()
      .max(1_000_000_000)
      .nullable()
      .optional(),
    idempotencyKey: z.string().trim().min(8).max(128).optional(),
  })
  .superRefine((v, ctx) => {
    if (
      v.orderType === "LIMIT" &&
      (v.limitPrice == null || v.limitPrice <= 0)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "limitPrice required for LIMIT",
        path: ["limitPrice"],
      });
    }
    if (v.orderType === "STOP" && (v.stopPrice == null || v.stopPrice <= 0)) {
      ctx.addIssue({
        code: "custom",
        message: "stopPrice required for STOP",
        path: ["stopPrice"],
      });
    }
    if (v.orderType === "STOP_LIMIT") {
      if (v.stopPrice == null || v.stopPrice <= 0) {
        ctx.addIssue({
          code: "custom",
          message: "stopPrice required for STOP_LIMIT",
          path: ["stopPrice"],
        });
      }
      if (v.limitPrice == null || v.limitPrice <= 0) {
        ctx.addIssue({
          code: "custom",
          message: "limitPrice required for STOP_LIMIT",
          path: ["limitPrice"],
        });
      }
    }
  });

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const alertCreateSchema = z.object({
  symbol: z
    .string()
    .trim()
    .min(1)
    .max(32)
    .regex(/^[A-Za-z0-9._/-]+$/, "Invalid symbol")
    .transform((s) => s.toUpperCase()),
  condition: z.enum(["PRICE_ABOVE", "PRICE_BELOW", "PCT_MOVE"]),
  targetValue: z.number().finite().positive().max(1_000_000_000),
  cooldownSeconds: z.number().int().min(60).max(86_400).optional(),
  notifyInApp: z.boolean().optional(),
  notifyEmail: z.boolean().optional(),
  note: z.string().trim().max(200).nullable().optional(),
});
