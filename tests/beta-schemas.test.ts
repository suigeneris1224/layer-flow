import { describe, expect, it } from "vitest";
import { addBetaTesterSchema } from "@/lib/validation/schemas";

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
