import { describe, expect, it } from "vitest";
import { credentialState } from "./credential";

const FROM = "2026-09-10T16:55:00.000Z";
const UNTIL = "2026-09-10T18:05:00.000Z";
const at = (iso: string) => new Date(iso);

const state = (
  status: Parameters<typeof credentialState>[0]["status"],
  now: string,
) => credentialState({ status, validFrom: FROM, validUntil: UNTIL, now: at(now) });

describe("estado da credencial", () => {
  it("fica fechada antes da janela", () => {
    expect(state("active", "2026-09-10T16:00:00.000Z")).toBe("locked");
  });

  it("abre dentro da janela", () => {
    expect(state("active", "2026-09-10T17:30:00.000Z")).toBe("active");
  });

  it("expira ao fim da janela", () => {
    expect(state("active", "2026-09-10T18:05:00.000Z")).toBe("expired");
  });

  it("respeita o status expirado mesmo dentro da janela", () => {
    expect(state("expired", "2026-09-10T17:30:00.000Z")).toBe("expired");
  });

  it("mostra a revogação acima de qualquer horário", () => {
    expect(state("revoked", "2026-09-10T17:30:00.000Z")).toBe("revoked");
    expect(state("revoked", "2026-09-10T16:00:00.000Z")).toBe("revoked");
  });

  it("trata revisão manual como falha para quem está na porta", () => {
    expect(state("manual_review", "2026-09-10T17:30:00.000Z")).toBe("failed");
    expect(state("failed", "2026-09-10T17:30:00.000Z")).toBe("failed");
  });

  it("tolera a provisão pendente até a janela começar", () => {
    expect(state("pending", "2026-09-10T16:50:00.000Z")).toBe("locked");
    expect(state("pending", "2026-09-10T16:57:00.000Z")).toBe("locked");
  });

  it("chama de falha a provisão que não terminou depois da folga", () => {
    // A pessoa está na porta às 17:01 e o código não existe. Isso é falha.
    expect(state("pending", "2026-09-10T17:01:00.000Z")).toBe("failed");
  });

  it("não inventa estado quando não há credencial", () => {
    expect(
      credentialState({
        status: null,
        validFrom: null,
        validUntil: null,
        now: at("2026-09-10T17:30:00.000Z"),
      }),
    ).toBe("absent");
  });
});
