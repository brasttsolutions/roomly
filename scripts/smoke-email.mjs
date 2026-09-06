/**
 * Envia um e-mail de verdade com as credenciais do `.env.local`.
 *
 * É a única parte do caminho de e-mail que teste automatizado não cobre: os
 * testes de `src/integrations/resend.test.ts` simulam o cliente do Resend, então
 * provam a lógica — modo, credencial ausente, recusa definitiva, falha
 * passageira — mas nunca tocam a rede. Chave válida, remetente aceito e entrega
 * só se provam enviando.
 *
 *   node --env-file=.env.local scripts/smoke-email.mjs voce@exemplo.com
 *
 * Enquanto o remetente for `onboarding@resend.dev`, o Resend só entrega no
 * endereço da própria conta. Com um domínio verificado, qualquer destinatário
 * vale.
 */
import { Resend } from "resend";

/**
 * `process.exit` aqui aborta o node no Windows com o socket do provedor ainda
 * fechando — a mensagem que interessa some atrás de um erro do libuv. Definir o
 * código e deixar o node encerrar sozinho evita isso.
 */
function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

const to = process.argv[2];
const mode = process.env.ROOMLY_EMAIL_MODE?.trim() || "simulator";
const apiKey = process.env.RESEND_API_KEY;
const from = process.env.RESEND_FROM_EMAIL;

if (!to) {
  fail(
    "Informe o destinatário: node --env-file=.env.local scripts/smoke-email.mjs voce@exemplo.com",
  );
} else if (mode !== "resend") {
  fail(`ROOMLY_EMAIL_MODE="${mode}": nada seria enviado. Troque para "resend".`);
} else if (!apiKey || !from) {
  fail("RESEND_API_KEY e RESEND_FROM_EMAIL precisam estar preenchidos.");
} else {
  console.log(`remetente: ${from}`);
  console.log(`destino:   ${to}`);

  let result;
  try {
    result = await new Resend(apiKey).emails.send({
      from,
      to: [to],
      subject: "Roomly — teste de entrega",
      text: "Se esta mensagem chegou, a credencial do Resend e o remetente estão corretos.\n\nEnviado por scripts/smoke-email.mjs.",
    });
  } catch (cause) {
    fail(
      `\nFALHOU antes de chegar ao provedor: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }

  if (result?.error) {
    const { name, message } = result.error;
    fail(`\nFALHOU — ${name}: ${message}`);
    if (/not verified/i.test(message)) {
      console.error(
        "\nO remetente aponta para um domínio que o Resend não conhece.\n" +
          "Cadastre-o em https://resend.com/domains e publique os registros DNS que ele mostrar.\n" +
          "Para testar antes disso, use RESEND_FROM_EMAIL=onboarding@resend.dev.",
      );
    }
  } else if (result) {
    console.log(`\nACEITO pelo Resend. id=${result.data?.id}`);
    console.log("Confira a caixa de entrada — aceito não é o mesmo que entregue.");
  }
}
