import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { notifyCleaningAutomation } from "./n8n";

describe("n8n cleaning integration", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.N8N_WEBHOOK_URL;
    delete process.env.N8N_WEBHOOK_SECRET;
  });

  it("signs a deterministic payload and forwards its idempotency key", async () => {
    process.env.N8N_WEBHOOK_URL = "https://n8n.example.test/cleaning";
    process.env.N8N_WEBHOOK_SECRET = "test-secret";
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await notifyCleaningAutomation({
      bookingId: "booking-1",
      companyId: "company-1",
      roomId: "room-1",
      scheduledAt: "2026-09-01T18:00:00.000Z",
      idempotencyKey: "cleaning.request:booking-1",
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = String(init.body);
    expect(url).toBe("https://n8n.example.test/cleaning");
    expect((init.headers as Record<string, string>)["idempotency-key"]).toBe(
      "cleaning.request:booking-1",
    );
    expect((init.headers as Record<string, string>)["x-roomly-signature"]).toBe(
      createHmac("sha256", "test-secret").update(body).digest("hex"),
    );
  });

  it("fails closed when the integration is not configured", async () => {
    await expect(
      notifyCleaningAutomation({
        bookingId: "booking-1",
        companyId: "company-1",
        roomId: "room-1",
        scheduledAt: "2026-09-01T18:00:00.000Z",
        idempotencyKey: "job-1",
      }),
    ).rejects.toThrow("n8n_not_configured");
  });
});
