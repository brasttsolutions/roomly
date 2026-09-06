import { afterEach, describe, expect, it, vi } from "vitest";

const original = { ...process.env };
afterEach(() => {
  process.env = { ...original };
  vi.resetModules();
});

/** O módulo guarda o provedor em memória, então cada caso precisa recarregá-lo. */
async function carregar() {
  vi.resetModules();
  return (await import("./payment-provider")).paymentProvider;
}

describe("provedor de pagamento", () => {
  it("recusa o simulador contra o banco de produção", async () => {
    // O deploy que esquece `ROOMLY_PAYMENT_MODE` confirmava reserva sem cobrar
    // ninguém. A trava de acesso já existia; a de dinheiro não.
    process.env.NODE_ENV = "production";
    process.env.ROOMLY_INTEGRATION_MODE = "supabase";
    delete process.env.ROOMLY_PAYMENT_MODE;
    const paymentProvider = await carregar();
    expect(paymentProvider).toThrow("payment_simulator_forbidden_in_production");
  });

  it("aceita o simulador fora de produção", async () => {
    process.env.NODE_ENV = "development";
    process.env.ROOMLY_INTEGRATION_MODE = "supabase";
    delete process.env.ROOMLY_PAYMENT_MODE;
    const paymentProvider = await carregar();
    expect(paymentProvider()).toBeDefined();
  });

  it("aceita o simulador em produção quando o banco também é simulado", async () => {
    process.env.NODE_ENV = "production";
    process.env.ROOMLY_INTEGRATION_MODE = "simulator";
    delete process.env.ROOMLY_PAYMENT_MODE;
    const paymentProvider = await carregar();
    expect(paymentProvider()).toBeDefined();
  });

  it("exige o token quando o modo é Mercado Pago", async () => {
    process.env.NODE_ENV = "production";
    process.env.ROOMLY_PAYMENT_MODE = "mercado_pago";
    delete process.env.MERCADO_PAGO_ACCESS_TOKEN;
    const paymentProvider = await carregar();
    expect(paymentProvider).toThrow("MERCADO_PAGO_ACCESS_TOKEN");
  });
});
