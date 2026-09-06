/**
 * Tipografia dos documentos legais.
 *
 * Texto corrido longo tem exigências que os componentes de tela não cobrem:
 * medida de leitura curta, respiro entre parágrafos e uma tabela que rola
 * sozinha no celular em vez de empurrar a página para o lado. Fica aqui, junto
 * das duas páginas que precisam disso, em vez de virar mais um componente
 * genérico no Design System.
 */
export function Prosa({ children }: { children: React.ReactNode }) {
  return <div className="mt-8 space-y-10">{children}</div>;
}

export function Secao({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  const id = titulo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="text-title2 font-bold">
        {titulo}
      </h2>
      <div className="mt-3 space-y-4 text-body leading-7 text-text-secondary [&_a]:font-semibold [&_a]:text-text-link [&_a]:underline [&_li]:leading-7 [&_strong]:text-text-primary [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}

export function Tabela({
  cabecalho,
  linhas,
}: {
  cabecalho: readonly string[];
  linhas: ReadonlyArray<readonly string[]>;
}) {
  return (
    // A tabela rola dentro do próprio quadro. Sem isto, três colunas de texto
    // fazem a página inteira rolar para o lado no celular.
    <div className="overflow-x-auto rounded-lg border border-border-subtle">
      <table className="w-full min-w-[36rem] border-collapse text-left text-subheadline">
        <thead>
          <tr className="bg-surface-page">
            {cabecalho.map((celula) => (
              <th
                key={celula}
                scope="col"
                className="border-b border-border-subtle px-4 py-3 font-bold text-text-primary"
              >
                {celula}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) => (
            <tr key={linha[0]} className="border-b border-border-subtle last:border-0">
              {linha.map((celula, coluna) => (
                <td
                  key={celula}
                  className={
                    coluna === 0
                      ? "px-4 py-3 align-top font-semibold text-text-primary"
                      : "px-4 py-3 align-top leading-6"
                  }
                >
                  {celula}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
