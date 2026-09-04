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
    <main id="conteudo" className="grid min-h-screen bg-white lg:grid-cols-[1fr_.9fr]">
      <section className="flex min-h-[640px] flex-col justify-between p-6 sm:p-10 lg:p-14">
        <Brand />
        <div className="mx-auto w-full max-w-md">
          <p className="text-sm font-bold text-[#176b4d]">BEM-VINDO DE VOLTA</p>
          <h1 className="mt-2 text-3xl font-bold">Entre na sua conta</h1>
          <p className="mt-2 text-sm leading-6 text-[#66736d]">
            Acompanhe suas reservas e acesse suas salas.
          </p>
          <form action={signIn} className="mt-7 space-y-4">
            <label className="block text-sm font-bold">
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
            <label className="block text-sm font-bold">
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
              <p role="alert" className="text-sm font-semibold text-[#a84331]">
                E-mail ou senha inválidos.
              </p>
            )}
            <button
              type="submit"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#176b4d] text-sm font-bold text-white"
            >
              Entrar
              <ArrowRight size={17} />
            </button>
          </form>
          <p className="mt-5 text-center text-sm text-[#66736d]">
            Ainda não tem conta?{" "}
            <a href="/cadastro" className="font-bold text-[#176b4d]">
              Cadastre-se
            </a>
          </p>
        </div>
        <p className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <ShieldCheck size={15} />
          Seus dados são protegidos.
        </p>
      </section>
      <aside className="relative hidden overflow-hidden bg-[#17211d] lg:block">
        <div className="absolute inset-0 bg-[url('/rooms/executiva.png')] bg-cover bg-center opacity-70" />
        <div className="absolute inset-0 bg-[#17211d]/35" />
        <blockquote className="absolute bottom-14 left-12 right-12 text-white">
          <p className="max-w-xl text-2xl font-semibold leading-9">
            “Reservar uma sala agora leva menos tempo do que preparar o café.”
          </p>
          <footer className="mt-4 text-sm text-white/70">
            Marina Costa · Norte Labs
          </footer>
        </blockquote>
      </aside>
    </main>
  );
}
