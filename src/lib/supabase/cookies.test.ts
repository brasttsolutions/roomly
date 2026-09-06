import { afterEach, describe, expect, it, vi } from "vitest";
import { hardenedCookie } from "./cookies";

afterEach(() => vi.unstubAllEnvs());

describe("cookie de sessão", () => {
  it("em produção fecha para JavaScript e exige HTTPS", () => {
    // O padrão do `@supabase/ssr` deixa o cookie legível por script, porque o
    // cliente de navegador dele precisa ler. Aqui ninguém usa esse cliente, e
    // sem `httpOnly` um único XSS leva a sessão de quem está logado.
    vi.stubEnv("NODE_ENV", "production");
    expect(hardenedCookie({ path: "/", sameSite: "lax" })).toEqual({
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      secure: true,
    });
  });

  it("fora de produção não mexe em nada", () => {
    // `secure` em HTTP quebraria o desenvolvimento fora de localhost.
    vi.stubEnv("NODE_ENV", "development");
    expect(hardenedCookie({ path: "/" })).toEqual({ path: "/" });
  });
});
