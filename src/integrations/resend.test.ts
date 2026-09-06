import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.hoisted(() => vi.fn());
vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
  },
}));

const { sendBookingEmail, sendInvitationEmail } = await import("./resend");

const original = { ...process.env };
beforeEach(() => {
  vi.clearAllMocks();
  send.mockResolvedValue({ error: null });
});
afterEach(() => {
  process.env = { ...original };
});

function realProvider() {
  process.env.ROOMLY_EMAIL_MODE = "resend";
  process.env.RESEND_API_KEY = "re_test";
  process.env.RESEND_FROM_EMAIL = "roomly@example.test";
}

const booking = {
  email: "cliente@example.test",
  subject: "Reserva confirmada",
  content: "corpo",
  idempotencyKey: "dedupe-1",
};

describe("provedor de e-mail", () => {
  it("no simulador não chama o provedor e não afirma entrega", async () => {
    process.env.ROOMLY_EMAIL_MODE = "simulator";
    await expect(sendBookingEmail(booking)).resolves.toEqual({
      delivered: false,
    });
    const invitation = await sendInvitationEmail({
      email: "novo@example.test",
      invitationUrl: "https://roomly.test/cadastro?convite=abc",
      idempotencyKey: "dedupe-2",
    });
    expect(invitation).toEqual({ sent: false, reason: "simulator" });
    expect(send).not.toHaveBeenCalled();
  });

  // O ponto do modo explícito: pedir envio real sem credencial é erro de
  // configuração, não uma degradação silenciosa para o simulador.
  it("estoura quando o modo é real e falta credencial", async () => {
    process.env.ROOMLY_EMAIL_MODE = "resend";
    delete process.env.RESEND_API_KEY;
    process.env.RESEND_FROM_EMAIL = "roomly@example.test";
    await expect(sendBookingEmail(booking)).rejects.toThrow(
      "resend_not_configured",
    );

    process.env.RESEND_API_KEY = "re_test";
    delete process.env.RESEND_FROM_EMAIL;
    await expect(sendBookingEmail(booking)).rejects.toThrow(
      "resend_not_configured",
    );
    expect(send).not.toHaveBeenCalled();
  });

  it("entrega e informa o envio quando está configurado", async () => {
    realProvider();
    await expect(sendBookingEmail(booking)).resolves.toEqual({
      delivered: true,
    });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "roomly@example.test",
        to: ["cliente@example.test"],
      }),
      { idempotencyKey: "roomly-booking/dedupe-1" },
    );
  });

  it("distingue falha do provedor de ausência de configuração", async () => {
    realProvider();
    send.mockResolvedValue({ error: { message: "domain not verified" } });
    await expect(sendBookingEmail(booking)).rejects.toThrow(
      "resend_provider_error",
    );
  });
});
