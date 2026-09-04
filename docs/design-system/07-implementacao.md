# 07 — Implementação

Stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4.

---

## 1. Como os tokens entram no código

```
scripts/design-tokens.mjs          ← fonte da verdade (valores + contratos)
        │  node scripts/build-tokens.mjs
        ├──► design-tokens.json     ← handoff para Figma/Style Dictionary
        └──► src/styles/tokens.css  ← variáveis CSS consumidas pelo app
                     │
                     └──► src/app/globals.css  (@import + mapeamento @theme)
                                   │
                                   └──► componentes usam classes Tailwind
```

Nenhum arquivo gerado é editado à mão. Alterar uma cor significa editar
`scripts/design-tokens.mjs`, rodar o gerador e deixar o teste confirmar que os
21 contratos de contraste continuam válidos.

### Mapeamento para o Tailwind 4

O Tailwind 4 lê tokens do bloco `@theme`. O `globals.css` passa a ser:

```css
@import "tailwindcss";
@import "../styles/tokens.css";

@theme inline {
  --color-surface-page: var(--surface-page);
  --color-surface-raised: var(--surface-raised);
  --color-text-primary: var(--text-primary);
  --color-text-secondary: var(--text-secondary);
  --color-action-primary: var(--action-primary);
  --color-border-control: var(--border-control);
  /* … um por token semântico */

  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}
```

A partir daí, `bg-surface-raised`, `text-text-secondary` e
`border-border-control` existem como classes utilitárias — e um hex solto em
componente vira exceção visível na revisão.

**Intenção de design**: o mapeamento é `inline` de propósito. Assim o valor
resolvido vai para o CSS final e o tema escuro pode redefinir apenas as
variáveis de origem, sem recompilar utilitário.

---

## 2. Correção obrigatória antes de tudo

O `globals.css` atual carrega Geist e em seguida a anula:

```css
body {
  font-family: Arial, Helvetica, sans-serif;  /* ← sobrescreve a Geist */
}
```

Todo o produto renderiza em Arial hoje. A linha some, e a família passa a vir do
token. É a mudança de maior efeito visual por menor esforço em todo este
documento.

---

## 3. Arquitetura de componentes

```
src/components/
├ ui/                     primitivos sem regra de negócio
│  ├ button.tsx           6 variantes, 3 tamanhos
│  ├ badge.tsx            tons semânticos
│  ├ field.tsx            rótulo + controle + erro + descrição
│  ├ dialog.tsx           foco preso, Escape, retorno de foco
│  ├ alert.tsx            inline, com papel correto por severidade
│  ├ skeleton.tsx
│  └ empty-state.tsx
├ booking/                domínio de reserva
│  ├ room-card.tsx
│  ├ availability-calendar.tsx
│  ├ time-slot-picker.tsx
│  ├ booking-summary.tsx
│  ├ booking-status.tsx
│  ├ access-credential-card.tsx
│  ├ extend-booking.tsx
│  └ room-amenities.tsx
└ admin/
   └ cleaning-status.tsx
```

**Estado.** Componentes de UI são sem estado. O estado de reserva vive no
servidor (o hold está no banco, não na memória do cliente) e chega por props. O
único estado local legítimo é de interface: diálogo aberto, foto selecionada na
galeria, passo do checkout.

**Intenção de design**: manter o estado de reserva fora do cliente é o que
sustenta o princípio "dinheiro e porta exigem certeza". Um seletor de horário
com estado otimista mostraria como livre um bloco que outra pessoa acabou de
tomar.

---

## 4. Exemplo de referência: Button

```tsx
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** primary só uma vez por tela. destructive exige confirmação antes. */
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "link" | "icon";
  /** md é o padrão e cumpre o alvo de 44px da WCAG 2.5.8. */
  size?: "sm" | "md" | "lg" | "icon";
  /** Trava a largura e anuncia aria-busy enquanto processa. */
  loading?: boolean;
};

export function Button({
  className, variant = "primary", size = "md", loading, children, ...props
}: Props) {
  return (
    <button
      aria-busy={loading || undefined}
      disabled={props.disabled || loading}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-semibold",
        "transition-colors duration-[--duration-instant] ease-[--ease-standard]",
        // Foco em navy funciona sobre branco (14,55:1) e sobre coral (4,70:1).
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--focus-ring]",
        "disabled:opacity-50 disabled:cursor-not-allowed",

        // O primário CLAREIA ao interagir: escurecer o coral derrubaria o
        // contraste com o rótulo navy de 4,70 para 2,97 e reprovaria em AA.
        variant === "primary" &&
          "bg-[--action-primary] text-[--text-on-accent] hover:bg-[--action-primary-hover] active:bg-[--action-primary-active]",
        variant === "secondary" &&
          "border border-[--border-control] bg-[--surface-raised] text-[--text-primary] hover:bg-[--surface-page]",
        variant === "ghost" && "text-[--text-primary] hover:bg-[--surface-page]",
        variant === "destructive" &&
          "bg-[--danger-action] text-[--text-inverse] hover:brightness-90",
        variant === "link" && "text-[--text-link] underline-offset-4 hover:underline",

        size === "sm" && "h-9 px-3 text-[13px]",
        size === "md" && "h-11 px-4 text-[15px]",
        size === "lg" && "h-13 px-6 text-base",
        size === "icon" && "size-11 rounded-full p-0",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
```

**Do**

- Uma ação primária por tela.
- Rótulo com o objeto da ação: "Pagar R$ 180,00", não "Confirmar".
- `loading` em vez de desabilitar durante o envio — a largura fica travada e a
  página não pula.

**Don't**

- Não troque `text-on-accent` por branco no primário. Reprova em AA.
- Não escureça o primário no hover.
- Não desabilite por formulário inválido sem mostrar o motivo ao lado.

---

## 5. Plano de migração

Sete etapas, cada uma verificável e independentemente reversível.

| # | Etapa | Arquivos | Risco |
| --- | --- | --- | --- |
| 1 | Tokens no `globals.css` + remover o `font-family: Arial` | `globals.css` | Baixo |
| 2 | Correções de acessibilidade: foco, skip link, títulos, `prefers-reduced-motion` | `layout.tsx`, `globals.css`, 7 `page.tsx` | Baixo |
| 3 | Primitivos `ui/` reescritos sobre tokens | `button`, `badge` + novos | Baixo |
| 4 | Re-skin: substituir os hex verdes pelos tokens | 24 arquivos | **Médio** |
| 5 | Componentes de reserva novos | `booking/` | Médio |
| 6 | Chrome do `/admin` em navy | `admin-*` | Médio |
| 7 | Tema escuro | `tokens.css` | Baixo |

A etapa 4 é a de maior risco: são 24 arquivos com 40 ocorrências de `#176b4d` e
mais 13 cinzas distintos. Ela é mecânica, mas toca todas as telas, e por isso
depende dos 16 testes de navegador existentes para confirmar que nada quebrou.

**Ordem recomendada**: 1 e 2 primeiro. Juntas elas corrigem seis falhas de WCAG e
fazem o produto inteiro mudar de aparência (Arial → Geist) com pouquíssimo
código.

---

## 6. Ativos e desempenho

**Imagens.** As três fotos em `public/rooms/` têm 2,2–2,4 MB cada. O
`next/image` já entrega WebP de 17–45 KB, então o usuário não paga por isso —
mas o repositório e a primeira otimização pagam. Recomprimir para WebP de
~200 KB na origem é ganho direto.

Toda foto de sala usa `next/image` com `sizes` explícito. A primeira do catálogo
leva `priority`; as demais ficam com carregamento tardio.

**Fontes.** `next/font/google` já faz o autohospedagem e injeta
`font-display: swap`. Nada muda além de deixar a Geist realmente ser aplicada.

**Ícones.** `lucide-react` importado por ícone — a árvore é sacudida no build.
Nunca `import * as Icons`.

**Divisão de código.** O `MercadoPagoCard` já é dinâmico com `ssr: false`, o que
está correto: o SDK do provedor não deve entrar no pacote inicial. O mesmo vale
para o `AvailabilityCalendar`, que só é necessário na página da sala.

---

## 7. Testes

**Tokens** — `src/lib/design-tokens.test.ts`, 27 asserções: os 21 contrastes
obrigatórios, monotonicidade das rampas, corpo nunca abaixo de 16px, entrelinha
mínima de 1,5, alvo de 44px.

**Componentes** — os 16 testes Playwright existentes cobrem catálogo, reserva,
cancelamento, painel, cabeçalho e edição. Ao migrar, eles são a rede de
segurança: se um seletor quebrar, a mudança visual foi longe demais.

**A acrescentar**

```ts
test("o foco é visível sobre o botão primário", async ({ page }) => {
  await page.goto("/salas/sala-executiva");
  await page.getByTestId("continue-booking").focus();
  const contorno = await page
    .getByTestId("continue-booking")
    .evaluate((el) => getComputedStyle(el).outlineColor);
  expect(contorno).not.toBe("rgba(0, 0, 0, 0)");
});

test("cada página tem título próprio", async ({ page }) => {
  for (const [rota, titulo] of [
    ["/", /Salas no seu tempo/],
    ["/entrar", /Entrar/],
    ["/minhas-reservas", /Minhas reservas/],
  ]) {
    await page.goto(rota as string);
    await expect(page).toHaveTitle(titulo as RegExp);
  }
});
```

**axe-core** vale a pena adicionar em `@axe-core/playwright`: uma varredura por
tela pega regressões estruturais que nenhum teste de seletor detecta.

---

## 8. Versionamento

`design-tokens.json` carrega a versão do sistema. Mudança de valor de token é
**minor**; remoção ou renomeação de token semântico é **major**, porque quebra
componente. Adição é **patch**.

Toda alteração de token passa pelo gerador, e o gerador falha se o contraste
regride — o que torna impossível publicar uma versão que reprove em AA sem
alterar deliberadamente o contrato no mesmo commit.
