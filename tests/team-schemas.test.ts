import { describe, expect, it } from "vitest";
import { inviteMemberSchema, updateMemberRoleSchema } from "@/lib/validation/schemas";

/**
 * Invite and role schemas.
 *
 * The regression that matters most: neither schema may accept OWNER. A farm has
 * exactly one owner, set by app.claim_farm_ownership() when the farm is
 * created, and farm_invitations carries a CHECK that refuses the role outright.
 * A schema that let it through would turn a product rule into a database error
 * the farmer cannot act on.
 */

const MEMBER = "6c2f4a5e-0f7a-4a1c-9a4a-0f8b7f3d1e22";

describe("inviteMemberSchema", () => {
  it("accepts a manager invite", () => {
    const result = inviteMemberSchema.safeParse({
      email: "ana@example.com",
      role: "MANAGER",
    });
    expect(result.success).toBe(true);
  });

  it("rejects OWNER", () => {
    const result = inviteMemberSchema.safeParse({
      email: "ana@example.com",
      role: "OWNER",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a role that is not a role at all", () => {
    const result = inviteMemberSchema.safeParse({
      email: "ana@example.com",
      role: "ADMIN",
    });
    expect(result.success).toBe(false);
  });

  it("lower-cases the email to match the pending-invite index", () => {
    // farm_invitations_pending_key is on (farm_id, lower(email)); if the schema
    // let case through, "Ana@" and "ana@" could both sit pending.
    const result = inviteMemberSchema.safeParse({
      email: "  Ana@Example.COM  ",
      role: "WORKER",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("ana@example.com");
  });

  it("rejects something that is not an email", () => {
    const result = inviteMemberSchema.safeParse({ email: "ana", role: "WORKER" });
    expect(result.success).toBe(false);
  });

  it("rejects a blank email", () => {
    const result = inviteMemberSchema.safeParse({ email: "   ", role: "WORKER" });
    expect(result.success).toBe(false);
  });
});

describe("updateMemberRoleSchema", () => {
  it("accepts a demotion to worker", () => {
    const result = updateMemberRoleSchema.safeParse({
      memberId: MEMBER,
      role: "WORKER",
    });
    expect(result.success).toBe(true);
  });

  it("rejects promotion to OWNER", () => {
    const result = updateMemberRoleSchema.safeParse({
      memberId: MEMBER,
      role: "OWNER",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-uuid member", () => {
    const result = updateMemberRoleSchema.safeParse({
      memberId: "member-1",
      role: "WORKER",
    });
    expect(result.success).toBe(false);
  });
});
