import type { Metadata } from "next";
import { ArrowRight, MailCheck } from "lucide-react";
import { Brand } from "@/components/brand";
import { SubmitButton } from "@/components/auth-fields";
import { requestPasswordReset } from "./actions";

export const metadata: Metadata = { title: "Recuperar senha" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ enviado?: string; erro?: string }>;
}) {
  const { enviado, erro } = await searchParams;
  return (
    <main
      id="conteudo"
      className="grid min-h-screen place-items-center bg-surface-page p-5"
    >
      <section className="w-full max-w-md rounded-lg border border-border-subtle bg-surface-raised p-6 sm:p-8">
        <Brand />
        {enviado ? (
          <div className="mt-8">
            <span className="grid size-11 place-items-center rounded-md bg-success-surface text-success-text">
              <MailCheck size={22} aria-hidden="true" />
            </span>
            <h1 className="mt-4 text-title2 font-bold">Verifique seu e-mail</h1>
            <p className="mt-2 text-subheadline leading-6 text-text-secondary">
              Se houver uma conta com esse endereço, enviamos um link para
              redefinir a senha. O link vale por tempo limitado. Confira também
              a caixa de spam.
            </p>
            <a
              href="/entrar"
              className="mt-6 inline-flex items-center gap-1 text-subheadline font-bold text-text-link hover:underline"
            >
              Voltar para o login
              <ArrowRight size={16} aria-hidden="true" />
            </a>
          </div>
        ) : (
          <>
            <h1 className="mt-8 text-title2 font-bold">Recuperar senha</h1>
            <p className="mt-2 text-subheadline leading-6 text-text-secondary">
              Informe o e-mail da sua conta. Enviaremos um link para você criar
              uma nova senha.
            </p>
            <form action={requestPasswordReset} className="mt-6 grid gap-4">
              <label className="text-subheadline font-bold">
                E-mail
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  placeholder="voce@empresa.com"
                  className="mt-2 h-11 w-full rounded-md border border-[var(--border-control)] px-3 font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text-link)]"
                />
              </label>
              {erro && (
                <p role="alert" className="text-subheadline text-danger-text">
                  Informe um e-mail válido.
                </p>
              )}
              <SubmitButton pendingLabel="Enviando...">
                Enviar link
                <ArrowRight size={17} />
              </SubmitButton>
            </form>
            <p className="mt-5 text-center text-subheadline text-text-secondary">
              Lembrou a senha?{" "}
              <a href="/entrar" className="font-bold text-text-link">
                Entrar
              </a>
            </p>
          </>
        )}
      </section>
    </main>
  );
}
