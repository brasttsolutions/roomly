/**
 * Envia um e-mail de verdade com as credenciais do `.env.local`.
 *
 * É a única parte do caminho de e-mail que teste automatizado não cobre: os
 * testes de `src/integrations/resend.test.ts` simulam o cliente do Resend, então
 * provam a lógica — modo, credencial ausente, falha do provedor — mas nunca
 * tocam a rede. Chave válida, remetente aceito e entrega só se provam enviando.
 *
 *   node --env-file=.env.local scripts/smoke-email.mjs voce@exemplo.com
 *
 * Com `onboarding@resend.dev` como remetente, o Resend só entrega no endereço
 * da própria conta. Depois de verificar um domínio, qualquer destinatário vale.
 */
import { Resend } from "resend";

const to = process.argv[2];
if (!to) {
  console.error("Informe o destinatário: node --env-file=.env.local scripts/smoke-email.mjs voce@exemplo.com");
  process.exit(1);
}

const mode = process.env.ROOMLY_EMAIL_MODE?.trim() || "simulator";
if (mode !== "resend") {
  console.error(`ROOMLY_EMAIL_MODE="${mode}": nada seria enviado. Troque para "resend".`);
  process.exit(1);
}

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.RESEND_FROM_EMAIL;
if (!apiKey || !from) {
  console.error("RESEND_API_KEY e RESEND_FROM_EMAIL precisam estar preenchidos.");
  process.exit(1);
}

console.log(`remetente: ${from}`);
console.log(`destino:   ${to}`);

const { data, error } = await new Resend(apiKey).emails.send({
  from,
  to: [to],
  subject: "Roomly — teste de entrega",
  text: "Se esta mensagem chegou, a credencial do Resend e o remetente estão corretos.\n\nEnviado por scripts/smoke-email.mjs.",
});

if (error) {
  console.error(`\nFALHOU — ${error.name ?? "erro"}: ${error.message ?? String(error)}`);
  process.exit(1);
}
console.log(`\nACEITO pelo Resend. id=${data?.id}`);
console.log("Confira a caixa de entrada — aceito não é o mesmo que entregue.");
