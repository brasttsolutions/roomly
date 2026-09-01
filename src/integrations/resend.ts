import "server-only";
import { Resend } from "resend";

export async function sendInvitationEmail(input: {
  email: string;
  invitationUrl: string;
  idempotencyKey: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from)
    return { sent: false as const, reason: "not_configured" };
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send(
    {
      from,
      to: [input.email],
      subject: "Seu convite para o Roomly",
      text: `Você recebeu acesso ao Roomly. Crie sua conta em: ${input.invitationUrl}\n\nO convite expira em 7 dias.`,
    },
    { idempotencyKey: `roomly-invitation/${input.idempotencyKey}` },
  );
  return error
    ? { sent: false as const, reason: "provider_error" }
    : { sent: true as const };
}

export async function sendBookingEmail(input: {
  email: string;
  subject: string;
  content: string;
  idempotencyKey: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) throw new Error("resend_not_configured");
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send(
    { from, to: [input.email], subject: input.subject, text: input.content },
    { idempotencyKey: `roomly-booking/${input.idempotencyKey}` },
  );
  if (error) throw new Error("resend_provider_error");
}
