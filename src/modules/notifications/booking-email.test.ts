import { describe, expect, it } from "vitest";
import { formatMoney } from "@/lib/utils";
import { renderBookingConfirmed, type BookingEmailData } from "./booking-email";

const base: BookingEmailData = {
  customerName: "Marina Alves Pereira",
  roomName: "Sala Executiva",
  unitName: "Ágora Tech Park",
  address: "Perini Business Park",
  startAt: "2026-10-01T17:00:00.000Z",
  endAt: "2026-10-01T19:00:00.000Z",
  totalCents: 24000,
  bookingUrl: "https://roomly.example/minhas-reservas/abc",
  accessNote: "O código aparece na sua reserva pouco antes do horário.",
};

describe("e-mail de reserva confirmada", () => {
  it("põe sala, dia e hora no assunto, que é o que se lê na lista", () => {
    expect(renderBookingConfirmed(base).subject).toBe(
      "Reserva confirmada · Sala Executiva, 01/10 às 14:00",
    );
  });

  it("trata o cliente pelo primeiro nome", () => {
    expect(renderBookingConfirmed(base).text).toContain("Marina, sua reserva");
  });

  // O horário é o do fuso das reservas, não o do servidor: 17:00Z é 14:00 em
  // São Paulo, e errar isso manda a pessoa três horas atrasada.
  it("mostra o horário no fuso das reservas", () => {
    const { text } = renderBookingConfirmed(base);
    expect(text).toContain("Horário: 14:00 às 16:00");
    expect(text).toContain("Data: Quinta-feira, 01 de outubro de 2026");
  });

  it("leva a reserva inteira no texto puro, não só um link", () => {
    const { text } = renderBookingConfirmed(base);
    // O valor vem de `formatMoney`, e não de uma cópia do formato aqui: o
    // produto mostra `R$ 240`, sem centavos, e o teste não deve discordar dele.
    for (const trecho of [
      "Sala Executiva",
      "Ágora Tech Park",
      formatMoney(24000),
      "14:00 às 16:00",
    ]) {
      expect(text).toContain(trecho);
    }
  });

  it("omite o botão quando não há endereço público", () => {
    const { html, text } = renderBookingConfirmed({ ...base, bookingUrl: null });
    expect(html).not.toContain("Ver minha reserva");
    expect(text).not.toContain("Detalhes da reserva");
  });

  it("escapa o que veio do cadastro antes de virar HTML", () => {
    const { html } = renderBookingConfirmed({
      ...base,
      roomName: 'Sala <script>alert("x")</script>',
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("aguenta unidade sem endereço", () => {
    const { text } = renderBookingConfirmed({
      ...base,
      unitName: "Centro",
      address: null,
    });
    expect(text).toContain("Local: Centro");
  });
});
