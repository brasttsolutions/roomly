/**
 * Estado da ação de limpeza. Vive fora do arquivo `"use server"` porque um
 * módulo de server action só pode exportar funções assíncronas — a constante
 * de repouso e as mensagens são dados, e o Next recusa exportá-los de lá.
 */
export type CleaningActionState = {
  ok: boolean;
  /** O que acabou de acontecer, para o aviso dizer sem adivinhar. */
  message?: string;
  error?: string;
};

/** Referência estável: é ela que distingue "ainda não agi" de "agi e deu certo". */
export const CLEANING_IDLE: CleaningActionState = { ok: true };

export const CLEANING_DONE: Record<string, string> = {
  assign: "Limpeza atribuída a você.",
  start: "Limpeza iniciada.",
  complete: "Limpeza concluída.",
};
