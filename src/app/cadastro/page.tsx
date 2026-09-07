import type { Metadata } from "next";
import { Brand } from "@/components/brand";
import { PasswordField, SubmitButton } from "@/components/auth-fields";
import { internalPath, signInHref } from "@/lib/redirect";
import { signUp } from "./actions";

export const metadata: Metadata = { title: "Criar conta" };

/**
 * Uma frase por causa.
 *
 * Antes as quatro caíam em "Não foi possível validar o convite ou criar a
 * conta" — que falava de convite com quem nunca teve um, não dizia o que
 * corrigir, e escondia justamente o caso mais comum, o de esperar um minuto.
 */
const MOTIVOS: Record<string, string> = {
  "dados-invalidos":
    "Confira os campos: o nome precisa de pelo menos 2 letras e a senha, de 10 caracteres.",
  "aguarde-um-minuto":
    "Já enviamos um e-mail de confirmação há pouco. Espere um minuto antes de pedir outro — e olhe também a caixa de spam.",
  "convite-invalido":
    "Este convite não vale mais, ou foi enviado para outro e-mail. Peça um novo a quem administra o coworking.",
  "cadastro-falhou":
    "Não foi possível criar a conta agora. Tente de novo em alguns instantes.",
};

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
          <PasswordField
            label="Senha"
            name="password"
            autoComplete="new-password"
            minLength={10}
            requisito
          />
          {erro && (
            <p role="alert" className="text-subheadline leading-6 text-danger-text">
              {MOTIVOS[erro] ?? MOTIVOS["cadastro-falhou"]}
            </p>
          )}
          {/* Termos e privacidade à vista de quem cria a conta: o ato de criar
              é o aceite, então o link precisa estar aqui, não escondido. */}
          <p className="text-caption leading-5 text-text-secondary">
            Ao criar a conta, você concorda com os{" "}
            <a href="/termos" className="font-semibold text-text-link underline">
              Termos de Uso
            </a>{" "}
            e o{" "}
            <a
              href="/privacidade"
              className="font-semibold text-text-link underline"
            >
              Aviso de Privacidade
            </a>
            .
          </p>
          <SubmitButton pendingLabel="Criando conta...">Criar conta</SubmitButton>
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
