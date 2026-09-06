import { afterEach, describe, expect, it } from "vitest";
import { appBaseUrl, appBaseUrlIsPublic } from "./app-url";

const original = { ...process.env };
afterEach(() => {
  process.env = { ...original };
});

describe("endereço público do produto", () => {
  it("reconhece o que só abre nesta máquina", () => {
    for (const url of [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "https://localhost",
      "http://[::1]:3000",
    ]) {
      process.env.NEXT_PUBLIC_APP_URL = url;
      expect(appBaseUrlIsPublic()).toBe(false);
    }
  });

  it("aceita um endereço que serve para outra pessoa", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://roomly.brastt.com.br";
    expect(appBaseUrlIsPublic()).toBe(true);
  });

  // A barra sobrando viraria `//cadastro` no link do convite.
  it("tira a barra final", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://roomly.brastt.com.br/";
    expect(appBaseUrl()).toBe("https://roomly.brastt.com.br");
  });

  it("cai no local quando não há valor", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(appBaseUrl()).toBe("http://localhost:3000");
    expect(appBaseUrlIsPublic()).toBe(false);
  });
});
