import type { Metadata } from "next";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";
import { PasswordField, SubmitButton } from "@/components/auth-fields";
import { internalPath, signUpHref } from "@/lib/redirect";
import { MensagemDeEntrada } from "./mensagem";
import { signIn } from "./actions";

export const metadata: Metadata = { title: "Entrar" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    erro?: string;
    cadastro?: string;
    redirecionar?: string;
  }>;
}) {
  const { erro: error, cadastro, redirecionar } = await searchParams;
  const destination = internalPath(redirecionar);
  // Quem chegou aqui do meio de uma reserva precisa saber que volta para ela.
  const voltandoParaReserva = destination.startsWith("/salas/");
  return (
    <main id="conteudo" className="grid min-h-screen grid-cols-1 bg-surface-raised lg:grid-cols-[1fr_.9fr]">
      <section className="flex min-h-[640px] flex-col justify-between p-6 sm:p-10 lg:p-14">
        <Brand />
        <div className="mx-auto w-full max-w-md">
          <p className="text-subheadline font-bold text-text-link">BEM-VINDO DE VOLTA</p>
          <h1 className="mt-2 text-title1 font-bold">Entre na sua conta</h1>
          <p className="mt-2 text-subheadline leading-6 text-text-secondary">
            {voltandoParaReserva
              ? "Entre para concluir sua reserva. O horário escolhido está guardado."
              : "Acompanhe suas reservas e acesse suas salas."}
          </p>
          {/* O cadastro terminou pedindo confirmação por e-mail e mandou a
              pessoa para cá. Sem esta linha, a tela de login aparecia do nada e
              parecia que o cadastro tinha falhado. */}
          {cadastro === "confirme-email" && (
            <p
              role="status"
              className="mt-4 rounded-md border border-border-subtle bg-surface-page p-3 text-subheadline leading-6 text-text-secondary"
            >
              Conta criada. Confirme o endereço pelo link que enviamos por
              e-mail e entre aqui em seguida.
            </p>
          )}
          <form action={signIn} className="mt-7 space-y-4">
            <input type="hidden" name="redirecionar" value={destination} />
            <label className="block text-subheadline font-bold">
              E-mail
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                placeholder="voce@empresa.com"
                className="mt-2 h-11 w-full rounded-md border border-[var(--border-control)] px-3 font-normal"
              />
            </label>
            <PasswordField
              label="Senha"
              name="password"
              autoComplete="current-password"
              minLength={8}
            />
            <div className="text-right">
              <a
                href="/recuperar"
                className="text-caption font-semibold text-text-link hover:underline"
              >
                Esqueci minha senha
              </a>
            </div>
            <MensagemDeEntrada erro={error} />
            <SubmitButton pendingLabel="Entrando...">
              Entrar
              <ArrowRight size={17} />
            </SubmitButton>
          </form>
          <p className="mt-5 text-center text-subheadline text-text-secondary">
            Ainda não tem conta?{" "}
            <a href={signUpHref(destination)} className="font-bold text-text-link">
              Cadastre-se
            </a>
          </p>
        </div>
        <p className="flex items-center gap-2 text-caption text-[var(--text-secondary)]">
          <ShieldCheck size={15} />
          Seus dados são protegidos.
        </p>
      </section>
      <aside className="relative hidden overflow-hidden bg-surface-inverse lg:block">
        <div className="absolute inset-0 bg-[url('/rooms/executiva.png')] bg-cover bg-center opacity-70" />
        <div className="absolute inset-0 bg-surface-inverse/35" />
        <blockquote className="absolute bottom-14 left-12 right-12 text-white">
          <p className="max-w-xl text-title2 font-semibold leading-9">
            “Reservar uma sala agora leva menos tempo do que preparar o café.”
          </p>
          <footer className="mt-4 text-subheadline text-white/70">
            Marina Costa · Norte Labs
          </footer>
        </blockquote>
      </aside>
    </main>
  );
}
