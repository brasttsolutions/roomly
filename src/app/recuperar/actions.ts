"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { appBaseUrl } from "@/lib/app-url";
import { integrationMode } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/server/logger";

const schema = z.object({ email: z.email().max(254) });

/**
 * Pede o e-mail de redefinição de senha.
 *
 * A resposta é sempre a mesma, exista ou não a conta: dizer "esse e-mail não
 * tem cadastro" entregaria a lista de clientes a quem sondasse o formulário. O
 * link chega só para quem tem conta; para os demais, nada acontece — e a tela
 * diz isso sem revelar qual é o caso.
 */
export async function requestPasswordReset(formData: FormData) {
  const parsed = schema.safeParse({ email: formData.get("email") });
  // E-mail malformado é a única coisa que vale corrigir na hora.
  if (!parsed.success) redirect("/recuperar?erro=email-invalido");
  if (integrationMode() === "simulator") redirect("/recuperar?enviado=1");

  const supabase = await createSupabaseServerClient();
  // O link volta pela rota de confirmação, que troca o código por uma sessão de
  // recuperação e leva a pessoa para a tela de nova senha.
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${appBaseUrl()}/auth/confirmar?proximo=${encodeURIComponent(
        "/redefinir",
      )}`,
    },
  );
  if (error) {
    // O limite de e-mails do Supabase é o erro esperado aqui; qualquer outro
    // vira log, nunca mensagem que diferencie conta existente de inexistente.
    logEvent("warn", "password_reset.request_failed", {
      errorCode: error.code,
      status: error.status,
    });
  }
  redirect("/recuperar?enviado=1");
}
