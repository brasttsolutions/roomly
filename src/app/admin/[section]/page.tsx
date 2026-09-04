import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { adminSections, type AdminSection } from "@/lib/admin-sections";
import { adminRows } from "@/lib/server/admin-data";
import { adminResourceOptions } from "@/lib/server/admin-data";
import {
  AdminCreateDialog,
  AdminEditDialog,
} from "@/components/admin/admin-create-dialog";
import type { AdminResource } from "@/lib/admin-sections";
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}): Promise<Metadata> {
  const { section } = await params;
  if (!(section in adminSections)) return { title: "Administração" };
  return { title: adminSections[section as AdminSection].title };
}
export function generateStaticParams() {
  return Object.keys(adminSections).map((section) => ({ section }));
}
export default async function SectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { section } = await params;
  const query = (await searchParams).q?.trim() ?? "";
  if (!(section in adminSections)) notFound();
  const data = adminSections[section as AdminSection];
  const allRows = await adminRows(section as AdminSection);
  const rows = query
    ? allRows.filter((row) =>
        row.cells.some((cell) =>
          cell
            .toLocaleLowerCase("pt-BR")
            .includes(query.toLocaleLowerCase("pt-BR")),
        ),
      )
    : allRows;
  const options = await adminResourceOptions();
  const creatable = ["unidades", "salas", "fechaduras", "clientes"].includes(
    section,
  );
  const editable = (["unidades", "salas", "fechaduras"] as string[]).includes(
    section,
  );
  return (
    <>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-[#176b4d]">OPERAÇÃO</p>
          <h1 className="mt-1 text-3xl font-bold">{data.title}</h1>
          <p className="mt-2 text-sm text-[#66736d]">{data.subtitle}</p>
        </div>
        {creatable ? (
          <AdminCreateDialog
            section={
              section as "unidades" | "salas" | "fechaduras" | "clientes"
            }
            label={data.action}
            locations={options.locations}
            rooms={options.rooms}
          />
        ) : null}
      </div>
      <section className="overflow-hidden rounded-lg border border-[#d9ded9] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e1e5e2] p-4">
          <form className="flex min-w-[280px] items-center rounded-md border border-[#d5dbd6]">
            <input
              aria-label={`Buscar em ${data.title}`}
              name="q"
              defaultValue={query}
              placeholder="Buscar"
              className="h-10 min-w-0 flex-1 px-3 text-sm"
            />
            <button
              type="submit"
              title="Buscar"
              className="grid size-10 place-items-center border-l border-[#d5dbd6]"
            >
              <Search size={17} />
            </button>
          </form>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-[#f4f6f3] text-[11px] uppercase text-[var(--text-secondary)]">
              <tr>
                {data.columns.map((column) => (
                  <th key={column} scope="col" className="px-5 py-3 font-bold">
                    {column}
                  </th>
                ))}
                {editable && (
                  <th scope="col" className="px-5 py-3 text-right font-bold">
                    Ações
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e4e7e4]">
              {rows.map((row, index) => (
                <tr key={index} className="hover:bg-[#f8f9f7]">
                  {row.cells.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className={
                        cellIndex === 0
                          ? "px-5 py-4 font-bold"
                          : "px-5 py-4 text-[#53605a]"
                      }
                    >
                      {cellIndex === row.cells.length - 1 ? (
                        <Status value={cell} />
                      ) : (
                        cell
                      )}
                    </td>
                  ))}
                  {editable && (
                    <td className="px-5 py-4 text-right">
                      {row.record && (
                        <AdminEditDialog
                          section={section as AdminResource}
                          record={row.record}
                          label={data.action}
                          locations={options.locations}
                          rooms={options.rooms}
                        />
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-[#e1e5e2] px-5 py-4 text-xs text-[var(--text-secondary)]">
          <span>{rows.length} registros</span>
          <span>Página 1 de 1</span>
        </div>
      </section>
    </>
  );
}
function Status({ value }: { value: string }) {
  const green = /Ativ|Aprov|Online|Sucesso|Pronto|Confirm/.test(value);
  const coral = /Revisar|Pendente|Atenção|Cancel|Reembols/.test(value);
  return (
    <Badge tone={green ? "green" : coral ? "coral" : "blue"}>{value}</Badge>
  );
}
