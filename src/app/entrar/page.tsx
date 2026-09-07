import type { Metadata } from "next";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";
import { signIn } from "./actions";

export const metadata: Metadata = { title: "Entrar" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const error = (await searchParams).erro;
  return (
    <main id="conteudo" className="grid min-h-screen grid-cols-1 bg-surface-raised lg:grid-cols-[1fr_.9fr]">
      <section className="flex min-h-[640px] flex-col justify-between p-6 sm:p-10 lg:p-14">
        <Brand />
        <div className="mx-auto w-full max-w-md">
          <p className="text-subheadline font-bold text-text-link">BEM-VINDO DE VOLTA</p>
          <h1 className="mt-2 text-title1 font-bold">Entre na sua conta</h1>
          <p className="mt-2 text-subheadline leading-6 text-text-secondary">
            Acompanhe suas reservas e acesse suas salas.
          </p>
          <form action={signIn} className="mt-7 space-y-4">
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
            <label className="block text-subheadline font-bold">
              Senha
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                minLength={8}
                required
                placeholder="••••••••"
                className="mt-2 h-11 w-full rounded-md border border-[var(--border-control)] px-3 font-normal"
              />
            </label>
            {error && (
              <p role="alert" className="text-subheadline font-semibold text-danger-text">
                E-mail ou senha inválidos.
              </p>
            )}
            <button
              type="submit"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-action-primary text-subheadline font-bold text-text-on-accent"
            >
              Entrar
              <ArrowRight size={17} />
            </button>
          </form>
          <p className="mt-5 text-center text-subheadline text-text-secondary">
            Ainda não tem conta?{" "}
            <a href="/cadastro" className="font-bold text-text-link">
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
