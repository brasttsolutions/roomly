import type { Metadata } from "next";
import { Brand } from "@/components/brand";
import { internalPath, signInHref } from "@/lib/redirect";
import { signUp } from "./actions";

export const metadata: Metadata = { title: "Criar conta" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    convite?: string;
    erro?: string;
    redirecionar?: string;
  }>;
}) {
  const { convite = "", erro, redirecionar } = await searchParams;
  const destination = internalPath(redirecionar);
  const voltandoParaReserva = destination.startsWith("/salas/");
  return (
    <main id="conteudo" className="grid min-h-screen place-items-center bg-surface-page p-5">
      <section className="w-full max-w-md rounded-lg border border-border-subtle bg-surface-raised p-6 sm:p-8">
        <Brand />
        <h1 className="mt-8 text-title2 font-bold">Criar conta</h1>
        <p className="mt-2 text-subheadline text-text-secondary">
          {convite
            ? "Use o mesmo e-mail que recebeu o convite."
            : voltandoParaReserva
              ? "Crie sua conta para concluir a reserva. O horário escolhido está guardado."
              : "Crie sua conta para reservar salas."}
        </p>
        <form action={signUp} className="mt-6 grid gap-4">
          <input type="hidden" name="invitation" value={convite} />
          <input type="hidden" name="redirecionar" value={destination} />
          <Field label="Nome" name="name" autoComplete="name" />
          <Field
            label="E-mail"
            name="email"
            type="email"
            autoComplete="email"
          />
          <Field
            label="Senha"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={10}
          />
          {erro && (
            <p role="alert" className="text-subheadline text-danger-text">
              Não foi possível validar o convite ou criar a conta.
            </p>
          )}
          <button className="h-11 rounded-md bg-action-primary text-subheadline font-bold text-text-on-accent">
            Criar conta
          </button>
        </form>
        {/* Metade de quem cai aqui já tem conta e só não lembrou. Sem esta
            saída, o caminho de volta era o botão do navegador. */}
        <p className="mt-5 text-center text-subheadline text-text-secondary">
          Já tem conta?{" "}
          <a href={signInHref(destination)} className="font-bold text-text-link">
            Entrar
          </a>
        </p>
      </section>
    </main>
  );
}

function Field({
  label,
  name,
  type = "text",
  autoComplete,
  minLength,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete: string;
  minLength?: number;
}) {
  return (
    <label className="text-subheadline font-bold">
      {label}
      <input
        required
        name={name}
        type={type}
        autoComplete={autoComplete}
        minLength={minLength}
        className="mt-2 h-11 w-full rounded-md border border-[var(--border-control)] px-3 font-normal"
      />
    </label>
  );
}
