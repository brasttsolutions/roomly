/**
 * Os três interruptores que decidem se o Roomly fala com o mundo real ou com um
 * simulador.
 *
 * Cada um era lido solto, comparado com o valor "ligado" e, em qualquer outro
 * caso, caía no simulador. Isso quer dizer que `ROOMLY_PAYMENT_MODE=mercado_pagoo`
 * não dava erro nenhum: subia, respondia, aceitava reserva — e cobrava com o
 * simulador. Um erro de digitação numa variável não pode ser a diferença entre
 * cobrar e fingir que cobrou, ainda mais em silêncio.
 *
 * Sem `server-only` de propósito: o proxy também precisa ler o modo.
 */
const MODES = {
  ROOMLY_INTEGRATION_MODE: ["simulator", "supabase"],
  ROOMLY_PAYMENT_MODE: ["simulator", "mercado_pago"],
  ROOMLY_ACCESS_MODE: ["simulator", "ttlock"],
} as const;

type ModeName = keyof typeof MODES;
type ModeOf<N extends ModeName> = (typeof MODES)[N][number];

/**
 * Ausente vale como simulador — é o padrão de quem acabou de clonar o
 * repositório. Preenchido com algo que não existe é erro, e erro estoura.
 */
export function readMode<N extends ModeName>(name: N): ModeOf<N> {
  const raw = process.env[name]?.trim();
  if (!raw) return "simulator" as ModeOf<N>;
  const allowed: readonly string[] = MODES[name];
  if (!allowed.includes(raw)) {
    throw new Error(
      `${name}="${raw}" não é um modo conhecido. Use ${allowed
        .map((mode) => `"${mode}"`)
        .join(" ou ")}.`,
    );
  }
  return raw as ModeOf<N>;
}

export type IntegrationMode = ModeOf<"ROOMLY_INTEGRATION_MODE">;
export type PaymentMode = ModeOf<"ROOMLY_PAYMENT_MODE">;
export type AccessMode = ModeOf<"ROOMLY_ACCESS_MODE">;

export const integrationMode = () => readMode("ROOMLY_INTEGRATION_MODE");
export const paymentMode = () => readMode("ROOMLY_PAYMENT_MODE");
export const accessMode = () => readMode("ROOMLY_ACCESS_MODE");
