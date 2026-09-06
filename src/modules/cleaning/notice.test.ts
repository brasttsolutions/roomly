import { describe, expect, it } from "vitest";
import {
  cleaningNoticeFields,
  cleaningNoticeOffset,
  type NoticeWhen,
} from "./notice";

describe("momento do aviso de limpeza", () => {
  it("guarda antes como negativo e depois como positivo", () => {
    expect(
      cleaningNoticeOffset({
        cleaningNoticeMinutes: 30,
        cleaningNoticeWhen: "antes",
      }),
    ).toBe(-30);
    expect(
      cleaningNoticeOffset({
        cleaningNoticeMinutes: 15,
        cleaningNoticeWhen: "depois",
      }),
    ).toBe(15);
  });

  it("ignora os minutos quando a escolha é o fim da reunião", () => {
    expect(
      cleaningNoticeOffset({
        cleaningNoticeMinutes: 45,
        cleaningNoticeWhen: "fim",
      }),
    ).toBe(0);
  });

  // Quem digita "-30" e escolhe "antes" quer trinta antes. Sem o `abs`, o sinal
  // do campo cancelaria o da direção e o aviso sairia depois.
  it("tira o sinal do número: a direção é quem manda", () => {
    expect(
      cleaningNoticeOffset({
        cleaningNoticeMinutes: -30,
        cleaningNoticeWhen: "antes",
      }),
    ).toBe(-30);
  });

  it("volta para o formulário do jeito que entrou", () => {
    for (const [minutes, when] of [
      [30, "antes"],
      [0, "fim"],
      [20, "depois"],
    ] as Array<[number, NoticeWhen]>) {
      const stored = cleaningNoticeOffset({
        cleaningNoticeMinutes: minutes,
        cleaningNoticeWhen: when,
      });
      expect(cleaningNoticeFields(stored)).toEqual({
        cleaningNoticeMinutes: minutes,
        cleaningNoticeWhen: when,
      });
    }
  });
});
