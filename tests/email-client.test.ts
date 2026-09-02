import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendEmail } from "@/lib/email/client";

const INPUT = {
  to: { email: "owner@example.com" },
  subject: "Test",
  htmlContent: "<p>hi</p>",
  textContent: "hi",
};

describe("sendEmail", () => {
  const originalProvider = process.env.EMAIL_PROVIDER;
  const originalKey = process.env.BREVO_API_KEY;

  afterEach(() => {
    process.env.EMAIL_PROVIDER = originalProvider;
    process.env.BREVO_API_KEY = originalKey;
    vi.unstubAllGlobals();
  });

  it("never calls fetch when the provider is mock", async () => {
    process.env.EMAIL_PROVIDER = "mock";
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await sendEmail(INPUT);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true });
  });

  it("never calls fetch when the provider is unset (defaults to mock)", async () => {
    delete process.env.EMAIL_PROVIDER;
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await sendEmail(INPUT);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true });
  });

  it("posts to Brevo and reports success on a 2xx response", async () => {
    process.env.EMAIL_PROVIDER = "brevo";
    process.env.BREVO_API_KEY = "test-key";
    const fetchSpy = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", fetchSpy);

    const result = await sendEmail(INPUT);

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.brevo.com/v3/smtp/email",
      expect.objectContaining({ method: "POST" })
    );
    expect(result).toEqual({ ok: true });
  });

  it("reports failure without throwing on a non-2xx response", async () => {
    process.env.EMAIL_PROVIDER = "brevo";
    process.env.BREVO_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("bad request", { status: 400 }))
    );

    const result = await sendEmail(INPUT);

    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("reports failure without throwing when fetch itself rejects", async () => {
    process.env.EMAIL_PROVIDER = "brevo";
    process.env.BREVO_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await expect(sendEmail(INPUT)).resolves.toEqual(expect.objectContaining({ ok: false }));
  });
});
