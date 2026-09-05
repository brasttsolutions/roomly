import type { Metadata } from "next";
import { Brand } from "@/components/brand";
import { signUp } from "./actions";

export const metadata: Metadata = { title: "Criar conta" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ convite?: string; erro?: string }>;
}) {
  const { convite = "", erro } = await searchParams;
  return (
    <main id="conteudo" className="grid min-h-screen place-items-center bg-surface-page p-5">
      <section className="w-full max-w-md rounded-lg border border-border-subtle bg-surface-raised p-6 sm:p-8">
        <Brand />
        <h1 className="mt-8 text-2xl font-bold">Criar conta</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Use o mesmo e-mail que recebeu o convite.
        </p>
        <form action={signUp} className="mt-6 grid gap-4">
          <input type="hidden" name="invitation" value={convite} />
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
            <p role="alert" className="text-sm text-danger-text">
              Não foi possível validar o convite ou criar a conta.
            </p>
          )}
          <button className="h-11 rounded-md bg-action-primary text-sm font-bold text-text-on-accent">
            Criar conta
          </button>
        </form>
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
    <label className="text-sm font-bold">
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
