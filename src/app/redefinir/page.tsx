import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { Brand } from "@/components/brand";
import { PasswordField, SubmitButton } from "@/components/auth-fields";
import { integrationMode } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { setNewPassword } from "./actions";

export const metadata: Metadata = { title: "Redefinir senha" };

const ERROS: Record<string, string> = {
  "senha-curta": "A senha precisa de pelo menos 10 caracteres.",
  "sessao-expirada":
    "Este link não vale mais — ele expira depois de usado ou após algum tempo. Peça um novo.",
  "nao-alterou":
    "Não foi possível alterar a senha. Se for igual à anterior, escolha uma diferente.",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const temSessao = await recoverySessionExists();

  return (
    <main
      id="conteudo"
      className="grid min-h-screen place-items-center bg-surface-page p-5"
    >
      <section className="w-full max-w-md rounded-lg border border-border-subtle bg-surface-raised p-6 sm:p-8">
        <Brand />
        <h1 className="mt-8 text-title2 font-bold">Criar nova senha</h1>

        {temSessao ? (
          <>
            <p className="mt-2 text-subheadline leading-6 text-text-secondary">
              Escolha uma senha nova para a sua conta.
            </p>
            <form action={setNewPassword} className="mt-6 grid gap-4">
              <PasswordField
                label="Nova senha"
                name="password"
                autoComplete="new-password"
                minLength={10}
                requisito
              />
              {erro && (
                <p role="alert" className="text-subheadline text-danger-text">
                  {ERROS[erro] ?? ERROS["nao-alterou"]}
                </p>
              )}
              <SubmitButton pendingLabel="Salvando...">
                Salvar nova senha
                <ArrowRight size={17} />
              </SubmitButton>
            </form>
          </>
        ) : (
          <>
            <p className="mt-2 text-subheadline leading-6 text-text-secondary">
              {ERROS[erro ?? "sessao-expirada"] ?? ERROS["sessao-expirada"]}
            </p>
            <a
              href="/recuperar"
              className="mt-6 inline-flex items-center gap-1 text-subheadline font-bold text-text-link hover:underline"
            >
              Pedir um novo link
              <ArrowRight size={16} aria-hidden="true" />
            </a>
          </>
        )}
      </section>
    </main>
  );
}

/** Há sessão de recuperação (o link do e-mail foi aberto e trocado por sessão)? */
async function recoverySessionExists() {
  if (integrationMode() === "simulator") return true;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user !== null;
}
