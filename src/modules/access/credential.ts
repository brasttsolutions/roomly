/**
 * Estado da credencial de acesso, derivado do que o banco guarda: o status da
 * provisão e a janela de validade. Nada aqui inventa código — o produto nunca
 * armazena o código completo, só a impressão digital mascarada devolvida pela
 * fechadura.
 */

/** `public.access_status` do banco. */
export type AccessStatus =
  | "pending"
  | "active"
  | "expired"
  | "revoked"
  | "failed"
  | "manual_review";

export type CredentialState =
  | "locked"
  | "active"
  | "expired"
  | "revoked"
  | "failed"
  | "absent";

export type CredentialInput = Readonly<{
  status: AccessStatus | null;
  /** ISO. Início da janela em que a fechadura aceita o código. */
  validFrom: string | null;
  validUntil: string | null;
  now: Date;
}>;

/**
 * Tolerância antes de chamar de falha uma provisão que ainda não terminou. O
 * job roda em segundos; cinco minutos é folga para uma fila lenta, não para um
 * erro silencioso.
 */
const PROVISION_GRACE_MS = 5 * 60_000;

export function credentialState(input: CredentialInput): CredentialState {
  const { status, validFrom, validUntil, now } = input;
  if (!status || !validFrom || !validUntil) return "absent";
  if (status === "revoked") return "revoked";
  if (status === "failed" || status === "manual_review") return "failed";

  const from = Date.parse(validFrom);
  const until = Date.parse(validUntil);
  const time = now.getTime();

  if (time >= until) return "expired";
  if (status === "expired") return "expired";
  if (time < from) return "locked";
  // Passou da hora de abrir e a provisão não concluiu: o cliente pagou e a
  // porta não vai abrir. Esconder isso é o pior resultado possível do produto.
  if (status === "pending")
    return time > from + PROVISION_GRACE_MS ? "failed" : "locked";
  return "active";
}
