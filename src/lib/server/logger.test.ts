import { afterEach, describe, expect, it, vi } from "vitest";
import { logEvent } from "./logger";

function capturar(executar: () => void) {
  const linhas: string[] = [];
  const spy = vi
    .spyOn(console, "error")
    .mockImplementation((linha) => linhas.push(String(linha)));
  executar();
  spy.mockRestore();
  return JSON.parse(linhas[0]) as Record<string, unknown>;
}

afterEach(() => vi.restoreAllMocks());

describe("log estruturado", () => {
  it("apaga segredo, token e código de acesso", () => {
    const registro = capturar(() =>
      logEvent("error", "teste", {
        password: "p",
        apiSecret: "s",
        accessToken: "t",
        authorization: "Bearer x",
        cardToken: "c",
        accessCode: "1234",
        code: "5678",
      }),
    );
    for (const chave of [
      "password",
      "apiSecret",
      "accessToken",
      "authorization",
      "cardToken",
      "accessCode",
      "code",
    ])
      expect(registro[chave]).toBe("[redacted]");
  });

  it("preserva o código do erro, que é o motivo da linha existir", () => {
    // `code` como pedaço de qualquer nome apagava isto, e toda falha de job
    // virava uma linha que não dizia o que falhou.
    const registro = capturar(() =>
      logEvent("error", "job.failed", {
        jobId: "job_1",
        kind: "notification.send",
        errorCode: "resend_rejected:validation_error",
      }),
    );
    expect(registro.errorCode).toBe("resend_rejected:validation_error");
    expect(registro.kind).toBe("notification.send");
  });
});
