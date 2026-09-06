export type NoticeWhen = "antes" | "fim" | "depois";

/**
 * A tela pergunta minutos e direção; o banco guarda um inteiro com sinal.
 *
 * Negativo avisa antes de a reunião acabar, zero no fim, positivo depois. Um
 * campo só porque dois permitiriam gravar "-30 minutos depois" — combinação sem
 * sentido que nenhuma validação de formulário pega depois de salva.
 */
export function cleaningNoticeOffset(input: {
  cleaningNoticeMinutes: number;
  cleaningNoticeWhen: NoticeWhen;
}): number {
  if (input.cleaningNoticeWhen === "fim") return 0;
  // O sinal vem da direção escolhida, nunca do número digitado: quem escreve
  // "-30" e escolhe "antes" quer trinta minutos antes, não trinta depois.
  const magnitude = Math.abs(Math.trunc(input.cleaningNoticeMinutes));
  return input.cleaningNoticeWhen === "antes" ? -magnitude : magnitude;
}

/** O caminho de volta, para o formulário reabrir com o que foi salvo. */
export function cleaningNoticeFields(offsetMinutes: number): {
  cleaningNoticeMinutes: number;
  cleaningNoticeWhen: NoticeWhen;
} {
  if (offsetMinutes === 0)
    return { cleaningNoticeMinutes: 0, cleaningNoticeWhen: "fim" };
  return {
    cleaningNoticeMinutes: Math.abs(offsetMinutes),
    cleaningNoticeWhen: offsetMinutes < 0 ? "antes" : "depois",
  };
}
