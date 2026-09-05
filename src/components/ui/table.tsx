import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Números vão à direita, com `tabular-nums`. */
  numeric?: boolean;
  /** A coluna que titula o card no mobile. Exatamente uma por tabela. */
  primary?: boolean;
};

/**
 * Tabela no desktop, lista de cards no telefone. Tabela com rolagem horizontal
 * é o pior padrão possível em tela pequena: some metade dos dados e ninguém
 * descobre que existe mais à direita.
 */
export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  action,
  actionHeader = "Ações",
  empty,
  className,
}: {
  /** Descreve a tabela para quem usa leitor de tela. */
  caption: string;
  columns: ReadonlyArray<Column<T>>;
  rows: readonly T[];
  rowKey: (row: T) => string;
  /** Ação por linha. Vai à direita no desktop e ao pé do card no mobile — se
   *  fosse mais uma coluna, sumiria justamente onde a tabela vira lista. */
  action?: (row: T) => ReactNode;
  actionHeader?: string;
  empty?: ReactNode;
  className?: string;
}) {
  if (rows.length === 0 && empty) return <>{empty}</>;
  const primary = columns.find((column) => column.primary) ?? columns[0];
  const rest = columns.filter((column) => column !== primary);

  return (
    <div className={className}>
      <table className="hidden w-full text-left md:table">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-surface-page text-caption uppercase text-text-secondary">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  "px-5 py-3 font-bold",
                  column.numeric && "text-right",
                )}
              >
                {column.header}
              </th>
            ))}
            {action && (
              <th scope="col" className="px-5 py-3 text-right font-bold">
                {actionHeader}
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle text-subheadline">
          {rows.map((row) => (
            <tr key={rowKey(row)} className="hover:bg-surface-page">
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    "h-14 px-5 py-4",
                    column === primary
                      ? "font-bold"
                      : "text-text-secondary",
                    column.numeric && "text-right tabular-nums",
                  )}
                >
                  {column.cell(row)}
                </td>
              ))}
              {action && (
                <td className="h-14 px-5 py-4 text-right">{action(row)}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="divide-y divide-border-subtle md:hidden">
        {rows.map((row) => (
          <li key={rowKey(row)} className="p-4">
            <p className="font-bold">{primary.cell(row)}</p>
            <dl className="mt-2 grid gap-1 text-caption">
              {rest.map((column) => (
                <div key={column.key} className="flex justify-between gap-3">
                  <dt className="text-text-secondary">{column.header}</dt>
                  <dd className={cn(column.numeric && "tabular-nums")}>
                    {column.cell(row)}
                  </dd>
                </div>
              ))}
            </dl>
            {action && <div className="mt-3">{action(row)}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}
