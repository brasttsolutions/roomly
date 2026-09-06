import { afterEach, describe, expect, it, vi } from "vitest";

const original = { ...process.env };
afterEach(() => {
  process.env = { ...original };
  vi.resetModules();
});

async function sonda() {
  vi.resetModules();
  const rota = await import("./route");
  return {
    dynamic: rota.dynamic,
    corpo: (await rota.GET().json()) as { integrations: string },
  };
}

describe("sonda de vivacidade", () => {
  it("responde o modo que está rodando, não o do build", async () => {
    // Publicado com `force-static`, o endereço repetia para sempre o modo do
    // momento em que a imagem foi construída. Dizia `simulator` com o app já
    // falando com o banco de verdade, e mandou o diagnóstico para o lado
    // errado enquanto alguém investigava.
    expect((await sonda()).dynamic).toBe("force-dynamic");

    process.env.ROOMLY_INTEGRATION_MODE = "supabase";
    expect((await sonda()).corpo.integrations).toBe("supabase");

    process.env.ROOMLY_INTEGRATION_MODE = "simulator";
    expect((await sonda()).corpo.integrations).toBe("simulator");
  });
});
