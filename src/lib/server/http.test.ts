import { describe, expect, it } from "vitest";
import { clientAddress, rateLimit } from "./http";

/** Monta uma Request só com o cabeçalho de proxy que nos interessa. */
function req(xff?: string) {
  return new Request("https://roomly.app/api/x", {
    headers: xff ? { "x-forwarded-for": xff } : {},
  });
}

describe("clientAddress", () => {
  it("usa o IP acrescentado pela infraestrutura (o último), não o que o cliente injeta", () => {
    // O proxy confiável acrescenta o IP real à direita. Tudo à esquerda é
    // conselho do cliente.
    expect(clientAddress(req("1.2.3.4, 200.0.0.9"))).toBe("200.0.0.9");
  });

  it("rotação do valor injetado não muda a chave", () => {
    // O atacante troca o elemento da esquerda a cada requisição; a borda
    // acrescenta sempre o mesmo IP real. A chave tem que ficar estável.
    const a = clientAddress(req("10.0.0.1, 200.0.0.9"));
    const b = clientAddress(req("10.0.0.2, 200.0.0.9"));
    const c = clientAddress(req("qualquer-lixo, 200.0.0.9"));
    expect(new Set([a, b, c]).size).toBe(1);
    expect(a).toBe("200.0.0.9");
  });

  it("sem cabeçalho, cai num rótulo fixo", () => {
    expect(clientAddress(req())).toBe("local");
  });
});

describe("rateLimit", () => {
  it("barra ao atingir o limite dentro da janela", () => {
    const chave = `teste-${Math.random()}`;
    for (let i = 0; i < 3; i++) expect(rateLimit(chave, 3)).toBe(true);
    expect(rateLimit(chave, 3)).toBe(false);
  });
});
