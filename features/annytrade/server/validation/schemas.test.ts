import { describe, expect, it } from "vitest";

import { registerSchema, loginSchema } from "./schemas";

describe("validation schemas", () => {
  it("accepts strong passwords", () => {
    const parsed = registerSchema.parse({
      email: "user@example.com",
      password: "SecurePass99",
      displayName: "User Name",
    });
    expect(parsed.email).toBe("user@example.com");
  });

  it("rejects weak passwords", () => {
    expect(() =>
      registerSchema.parse({
        email: "user@example.com",
        password: "short",
        displayName: "User",
      }),
    ).toThrow();
  });

  it("normalizes login email", () => {
    const parsed = loginSchema.parse({
      email: "  User@Example.COM ",
      password: "anything1",
    });
    expect(parsed.email).toBe("user@example.com");
  });
});
