import { describe, expect, it } from "vitest";
import { addBetaTesterSchema, setBetaMaxTestersSchema } from "@/lib/validation/schemas";

describe("addBetaTesterSchema", () => {
  it("accepts a plain email", () => {
    const result = addBetaTesterSchema.safeParse({ email: "farmer@example.com" });
    expect(result.success).toBe(true);
  });

  it("trims and lower-cases the email to match beta_testers.email's primary key", () => {
    const result = addBetaTesterSchema.safeParse({ email: "  Farmer@Example.COM  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("farmer@example.com");
  });

  it("rejects something that is not an email", () => {
    const result = addBetaTesterSchema.safeParse({ email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects a blank email", () => {
    const result = addBetaTesterSchema.safeParse({ email: "   " });
    expect(result.success).toBe(false);
  });

  it("rejects an email over 255 characters", () => {
    const longEmail = `${"a".repeat(250)}@example.com`;
    const result = addBetaTesterSchema.safeParse({ email: longEmail });
    expect(result.success).toBe(false);
  });
});

describe("setBetaMaxTestersSchema", () => {
  it("accepts a form-string value, coerced to a number", () => {
    const result = setBetaMaxTestersSchema.safeParse({ maxTesters: "10" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.maxTesters).toBe(10);
  });

  it("rejects zero or negative", () => {
    expect(setBetaMaxTestersSchema.safeParse({ maxTesters: "0" }).success).toBe(false);
    expect(setBetaMaxTestersSchema.safeParse({ maxTesters: "-1" }).success).toBe(false);
  });

  it("rejects over 100", () => {
    expect(setBetaMaxTestersSchema.safeParse({ maxTesters: "101" }).success).toBe(false);
  });

  it("rejects a non-numeric value", () => {
    expect(setBetaMaxTestersSchema.safeParse({ maxTesters: "many" }).success).toBe(false);
  });
});
