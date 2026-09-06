import { afterEach, describe, expect, it, vi } from "vitest";

const original = { ...process.env };
afterEach(() => {
  process.env = { ...original };
  vi.resetModules();
});

async function faltando() {
  vi.resetModules();
  const { GET } = await import("./route");
  const body = (await (await GET()).json()) as { missing?: string[] };
  return body.missing ?? [];
}

describe("prontidão para produção", () => {
  it("dá um motivo só para o acesso, não dois contraditórios", async () => {
    // As duas linhas antigas cobriam os dois únicos modos possíveis, então
    // produção respondia 503 para sempre com mensagens que se alternavam.
    process.env.NODE_ENV = "production";
    process.env.ROOMLY_INTEGRATION_MODE = "supabase";
    delete process.env.ROOMLY_ACCESS_MODE;
    const motivos = await faltando();
    expect(
      motivos.filter((m) => m === "ttlock_physical_poc_not_approved"),
    ).toHaveLength(1);
    expect(motivos).not.toContain("production_access_provider");
  });

  it("recusa o modo ttlock enquanto a POC física não for feita", async () => {
    process.env.NODE_ENV = "development";
    process.env.ROOMLY_INTEGRATION_MODE = "supabase";
    process.env.ROOMLY_ACCESS_MODE = "ttlock";
    expect(await faltando()).toContain("ttlock_physical_poc_not_approved");
  });

  it("cobra provedor real de pagamento em produção", async () => {
    process.env.NODE_ENV = "production";
    process.env.ROOMLY_INTEGRATION_MODE = "supabase";
    delete process.env.ROOMLY_PAYMENT_MODE;
    expect(await faltando()).toContain("production_payment_provider");
  });

  it("não cobra provedor de pagamento fora de produção", async () => {
    process.env.NODE_ENV = "development";
    process.env.ROOMLY_INTEGRATION_MODE = "supabase";
    delete process.env.ROOMLY_PAYMENT_MODE;
    expect(await faltando()).not.toContain("production_payment_provider");
  });
});
