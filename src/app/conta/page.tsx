import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";
import { AccountForm, PasswordForm } from "@/components/account-forms";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { signOutEverywhere } from "@/app/entrar/actions";
import { accountView } from "@/lib/server/account";
import { roleLabel } from "@/lib/roles";
import { BOOKING_TIME_ZONE } from "@/lib/utils";

export const metadata: Metadata = { title: "Editar conta" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const account = await accountView();
  if (!account) redirect("/entrar");
  const { identity } = account;
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-10">
        <div className="mb-7">
          <p className="text-sm font-bold text-[#176b4d]">SUA CONTA</p>
          <h1 className="mt-1 text-3xl font-bold">Editar conta</h1>
          <p className="mt-2 text-sm text-[#66736d]">
            Dados pessoais, segurança e sessões ativas.
          </p>
        </div>

        <section className="rounded-lg border border-[#d9ded9] bg-white p-6 sm:p-7">
          <h2 className="mb-5 text-lg font-bold">Dados pessoais</h2>
          <AccountForm name={identity.name} phone={account.phone} />
        </section>

        <section className="mt-6 rounded-lg border border-[#d9ded9] bg-white p-6 sm:p-7">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <ShieldCheck size={19} className="text-[#176b4d]" />
            Segurança
          </h2>
          <p className="mb-5 mt-1 text-sm text-[#66736d]">
            Use ao menos 10 caracteres. Ao trocar a senha, as sessões abertas em
            outros dispositivos continuam válidas — encerre-as abaixo se
            precisar.
          </p>
          <PasswordForm />
        </section>

        <section className="mt-6 rounded-lg border border-[#d9ded9] bg-white p-6 sm:p-7">
          <h2 className="text-lg font-bold">Sessões</h2>
          <p className="mb-5 mt-1 text-sm text-[#66736d]">
            Encerra o acesso em todos os aparelhos, inclusive neste. Use se
            perdeu um dispositivo ou suspeita que alguém tem sua senha.
          </p>
          <form action={signOutEverywhere}>
            <Button type="submit" variant="secondary">
              <LogOut size={17} />
              Sair de todos os dispositivos
            </Button>
          </form>
        </section>

        <section className="mt-6 rounded-lg border border-[#d9ded9] bg-white p-6 sm:p-7">
          <h2 className="mb-1 text-lg font-bold">Dados da conta</h2>
          <p className="mb-5 text-sm text-[#66736d]">
            Só um gestor da empresa altera estes campos.
          </p>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Info label="E-mail" value={identity.email} />
            <Info label="Empresa" value={account.company} />
            <Info label="Papel" value={roleLabel(identity.role)} />
            <Info label="Fuso das reservas" value={BOOKING_TIME_ZONE} />
          </dl>
        </section>
      </main>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase text-[#7b8680]">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold">{value}</dd>
    </div>
  );
}
