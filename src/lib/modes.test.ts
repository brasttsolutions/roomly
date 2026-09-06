import { afterEach, describe, expect, it } from "vitest";
import {
  accessMode,
  emailMode,
  integrationMode,
  paymentMode,
  readMode,
} from "./modes";

const original = { ...process.env };
afterEach(() => {
  process.env = { ...original };
});

describe("modos de integração", () => {
  it("trata ausente e vazio como simulador", () => {
    delete process.env.ROOMLY_PAYMENT_MODE;
    expect(paymentMode()).toBe("simulator");
    process.env.ROOMLY_PAYMENT_MODE = "   ";
    expect(paymentMode()).toBe("simulator");
  });

  it("aceita os modos reais de cada interruptor", () => {
    process.env.ROOMLY_PAYMENT_MODE = "mercado_pago";
    process.env.ROOMLY_ACCESS_MODE = "ttlock";
    process.env.ROOMLY_INTEGRATION_MODE = "supabase";
    process.env.ROOMLY_EMAIL_MODE = "resend";
    expect(paymentMode()).toBe("mercado_pago");
    expect(accessMode()).toBe("ttlock");
    expect(integrationMode()).toBe("supabase");
    expect(emailMode()).toBe("resend");
  });

  // O motivo de tudo isto: `simulador` era o valor real do `.env.local`, e o
  // produto subia cobrando com o simulador sem dizer nada.
  it("recusa um valor parecido em vez de cair no simulador calado", () => {
    process.env.ROOMLY_PAYMENT_MODE = "simulador";
    expect(() => paymentMode()).toThrow(/simulador/);
    process.env.ROOMLY_PAYMENT_MODE = "mercado_pagoo";
    expect(() => paymentMode()).toThrow(/mercado_pagoo/);
  });

  it("diz qual variável está errada e o que ela aceita", () => {
    process.env.ROOMLY_INTEGRATION_MODE = "supabse";
    expect(() => integrationMode()).toThrow(
      /ROOMLY_INTEGRATION_MODE.*"simulator" ou "supabase"/,
    );
  });

  it("não inventa modo para uma variável desconhecida do produto", () => {
    process.env.ROOMLY_ACCESS_MODE = "supabase";
    expect(() => readMode("ROOMLY_ACCESS_MODE")).toThrow(/ttlock/);
  });
});
