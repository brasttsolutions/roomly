import { describe, expect, it } from "vitest";
import { internalPath, signInHref, signUpHref } from "./redirect";

describe("internalPath", () => {
  it("mantém um caminho do próprio site", () => {
    expect(internalPath("/salas/sala-executiva?dia=2026-09-10")).toBe(
      "/salas/sala-executiva?dia=2026-09-10",
    );
  });

  it("recusa endereço absoluto para outro site", () => {
    expect(internalPath("https://sitefalso.example/entrar")).toBe(
      "/minhas-reservas",
    );
  });

  it("recusa caminho relativo ao protocolo, que troca de domínio", () => {
    expect(internalPath("//sitefalso.example")).toBe("/minhas-reservas");
    expect(internalPath("/\\sitefalso.example")).toBe("/minhas-reservas");
  });

  it("recusa caractere de controle, que parte o cabeçalho da resposta", () => {
    expect(internalPath("/salas\r\nLocation: https://sitefalso.example")).toBe(
      "/minhas-reservas",
    );
  });

  it("recusa o que não é texto", () => {
    expect(internalPath(null)).toBe("/minhas-reservas");
    expect(internalPath(undefined)).toBe("/minhas-reservas");
    expect(internalPath(42)).toBe("/minhas-reservas");
  });

  it("aceita outro destino padrão quando o chamador informa", () => {
    expect(internalPath("", "/")).toBe("/");
  });
});

describe("links de autenticação", () => {
  it("carregam o destino codificado", () => {
    const destino = "/salas/sala-executiva?dia=2026-09-10&hora=09:00";
    expect(signInHref(destino)).toBe(
      "/entrar?redirecionar=%2Fsalas%2Fsala-executiva%3Fdia%3D2026-09-10%26hora%3D09%3A00",
    );
    expect(signUpHref(destino)).toBe(
      "/cadastro?redirecionar=%2Fsalas%2Fsala-executiva%3Fdia%3D2026-09-10%26hora%3D09%3A00",
    );
  });
});
