import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountForm } from "@/components/account-forms";
import { SiteHeader } from "@/components/site-header";
import { accountView } from "@/lib/server/account";
import { roleLabel } from "@/lib/roles";

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
            Estes dados aparecem nas suas reservas e nas comunicações do Roomly.
          </p>
        </div>

        <section className="rounded-lg border border-[#d9ded9] bg-white p-6 sm:p-7">
          <h2 className="mb-5 text-lg font-bold">Dados pessoais</h2>
          <AccountForm name={identity.name} phone={account.phone} />
        </section>

        <section className="mt-6 rounded-lg border border-[#d9ded9] bg-white p-6 sm:p-7">
          <h2 className="mb-1 text-lg font-bold">Dados da conta</h2>
          <p className="mb-5 text-sm text-[#66736d]">
            Só um gestor da empresa altera estes campos.
          </p>
          <dl className="grid gap-4 sm:grid-cols-3">
            <Info label="E-mail" value={identity.email} />
            <Info label="Empresa" value={account.company} />
            <Info label="Papel" value={roleLabel(identity.role)} />
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
