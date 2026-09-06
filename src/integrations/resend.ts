import "server-only";
import { Resend } from "resend";
import { emailMode } from "@/lib/modes";

/**
 * Se manda e-mail de verdade é decisão explícita, não consequência de a chave
 * existir por acaso. Antes o modo era inferido: sem `RESEND_API_KEY`, o convite
 * era criado e o e-mail simplesmente não saía — e uma chave revogada tinha o
 * mesmo efeito de nenhuma chave, sem distinção nem aviso.
 *
 * `resend_not_configured` é erro de configuração: nenhuma tentativa futura vai
 * corrigi-lo, então o worker o manda direto para revisão em vez de repetir.
 */
/**
 * Só estes melhoram sozinhos. "Domínio não verificado" chega como
 * `validation_error` e não vai mudar de opinião na décima tentativa — antes,
 * como todo erro do provedor era tratado como passageiro, ele repetia oito
 * vezes com espera crescente enquanto ninguém era avisado.
 */
const TRANSIENT = new Set([
  "rate_limit_exceeded",
  "internal_server_error",
  "application_error",
]);

function failDelivery(error: {
  name: string;
  message: string;
  statusCode: number | null;
}): never {
  const status = error.statusCode ?? 0;
  const transient =
    TRANSIENT.has(error.name) || status === 429 || status >= 500;
  // O nome do provedor viaja junto do código para chegar inteiro em
  // `durable_jobs.last_error_code` e na tela de logs.
  throw new Error(
    `${transient ? "resend_provider_error" : "resend_rejected"}:${error.name}`,
  );
}

function credentials() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) throw new Error("resend_not_configured");
  return { apiKey, from };
}

export async function sendInvitationEmail(input: {
  email: string;
  invitationUrl: string;
  idempotencyKey: string;
}) {
  // No simulador o convite continua valendo — quem convidou entrega o link à
  // mão. Devolver "enviado" aqui seria mentir para quem está olhando a tela.
  if (emailMode() === "simulator")
    return { sent: false as const, reason: "simulator" as const };
  const { apiKey, from } = credentials();
  const { error } = await new Resend(apiKey).emails.send(
    {
      from,
      to: [input.email],
      subject: "Seu convite para o Roomly",
      text: `Você recebeu acesso ao Roomly. Crie sua conta em: ${input.invitationUrl}\n\nO convite expira em 7 dias.`,
    },
    { idempotencyKey: `roomly-invitation/${input.idempotencyKey}` },
  );
  return error
    ? { sent: false as const, reason: "provider_error" as const }
    : { sent: true as const };
}

/**
 * Devolve se a mensagem saiu de fato. O worker grava a notificação conforme
 * essa resposta: no simulador ela fica `pending`, que é a verdade — existe e
 * nunca foi entregue —, em vez de `sent` com data de envio inventada.
 */
export async function sendBookingEmail(input: {
  email: string;
  subject: string;
  content: string;
  idempotencyKey: string;
}): Promise<{ delivered: boolean }> {
  if (emailMode() === "simulator") return { delivered: false };
  const { apiKey, from } = credentials();
  const { error } = await new Resend(apiKey).emails.send(
    { from, to: [input.email], subject: input.subject, text: input.content },
    { idempotencyKey: `roomly-booking/${input.idempotencyKey}` },
  );
  if (error) failDelivery(error);
  return { delivered: true };
}
