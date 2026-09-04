# 01 — Fundamentos

## 1. Cor

### 1.1. A decisão que define o sistema

O coral `#FB5131` é vivo demais para carregar texto branco: o contraste é
**3,32:1**, abaixo dos 4,5:1 que a WCAG 2.2 AA exige para texto normal. Havia
dois caminhos.

| Caminho | Consequência |
| --- | --- |
| Escurecer o coral até o branco passar | `#D22400` passa (5,26:1), mas vira vermelho-tijolo e a marca perde o brilho que a define |
| **Manter o coral e trocar o rótulo para navy** | **4,70:1 — passa**, o coral continua exatamente o da marca, e o par coral+navy vira assinatura visual |

O sistema adota o segundo. **O botão primário do Roomly é coral com texto
navy.** Não é um acidente de acessibilidade: é o que impede o produto de parecer
mais um SaaS de botão azul com texto branco.

A consequência prática é uma regra rígida:

> Texto branco sobre `action-primary` é proibido. Se o rótulo precisa ser
> branco, o fundo não é o coral da marca.

### 1.2. Paleta primária

Rampas de 11 degraus geradas em OKLab — distância perceptual uniforme, sem os
meios sujos que a interpolação em sRGB produz.

**Coral** — ação e acento de marca. A cor da decisão de reservar.

| Degrau | Hex | Uso |
| --- | --- | --- |
| 50 | `#FFF1EB` | Superfície de destaque, fundo de banner promocional |
| 100 | `#FFE0D6` | Preenchimento de seleção suave |
| 200 | `#FFC5B4` | Borda de elemento selecionado |
| 300 | `#FFA189` | Estado pressionado do botão primário (7,96:1 com navy) |
| 400 | `#FF765A` | Estado hover do botão primário (5,94:1) · acento sobre navy |
| **500** | **`#FB5131`** | **Ação primária. A cor da marca.** (4,70:1 com navy) |
| 600 | `#D22400` | Só ícone ou traço fino sobre branco. **Nunca com rótulo navy** |
| 700–950 | `#AC0000`…`#420000` | Reservado. Colide com a rampa de erro — evite |

> Os degraus 700+ do coral são vermelhos escuros e conflitam visualmente com
> `danger`. Existem para completar a rampa, não para serem usados.

**Navy** — tinta, estrutura e o chrome do administrativo.

| Degrau | Hex | Uso |
| --- | --- | --- |
| 50 | `#F4F7FF` | **Superfície da página.** O fundo padrão do produto |
| 100 | `#E6EDFD` | Superfície rebaixada, linha zebrada de tabela |
| 200 | `#D0DBF6` | Divisor sobre superfície azulada |
| 300 | `#B4C4EC` | Texto secundário **sobre navy-900** (8,95:1) |
| 400–600 | `#95A8DA`…`#5D71A8` | Ícone decorativo, gráfico, ilustração |
| 700 | `#445687` | **Link** sobre branco (7,18:1) |
| 800 | `#2F3E68` | Superfície elevada dentro do chrome escuro |
| **900** | **`#172243`** | **Texto primário e chrome do `/admin`** (15,60:1) |
| 950 | `#0E1630` | Sombra profunda, fundo de modal em tema escuro |

**Slate** — neutros com viés azul herdado do navy. Cinza puro ao lado do navy
parece sujo; estes não.

| Degrau | Hex | Uso |
| --- | --- | --- |
| 50–100 | `#F6F7FC` `#E9EDF5` | Fundo de campo desabilitado, skeleton |
| 200 | `#D6DBE9` | **Borda decorativa** — divisor, borda de card |
| 300 | `#BDC4D9` | Borda decorativa mais firme |
| 400 | `#9FA9C3` | Ícone decorativo, placeholder |
| 500 | `#828DAB` | **Borda de controle** — o piso para input e checkbox (3,31:1) |
| 600 | `#5A6480` | **Texto secundário** — o piso para qualquer texto (5,88:1) |
| 700–950 | `#4F5872`…`#131825` | Texto de apoio com mais peso |

> **Duas linhas que não se cruzam.** Texto nunca abaixo de `slate-600`. Borda de
> componente interativo nunca abaixo de `slate-500`. Tudo mais claro que isso é
> decorativo e não pode ser a única forma de identificar um controle.

### 1.3. Cores semânticas

Cada estado tem três tokens: superfície, texto e borda. Sempre use o trio — a
cor sozinha nunca é o único sinal (WCAG 1.4.1).

| Estado | Superfície | Texto | Contraste | Significado no Roomly |
| --- | --- | --- | --- | --- |
| Sucesso | `#EDFCF4` | `#006D42` | 6,07:1 | Reserva confirmada · pagamento aprovado · sala limpa |
| Alerta | `#FFF4EB` | `#732100` | 9,96:1 | Hold expirando · bateria baixa na fechadura · limpeza atrasada |
| Erro | `#FFF0F0` | `#C2103A` | 5,53:1 | Pagamento recusado · reserva expirada · falha ao liberar acesso |
| Info | `#EEF8FF` | `#1953B0` | 6,71:1 | Pagamento em processamento · aguardando webhook |
| Acento | `#FFF1EB` | `#172243` | 14,14:1 | Destaque de marca, promoção, "novo" |

O erro é **crimson** (`#C2103A`), não vermelho-alaranjado, justamente para não
ser confundido com o coral da marca a um relance.

### 1.4. Tema escuro

A camada semântica já está estruturada para receber o tema escuro sem tocar em
componente: eles referenciam `--surface-page`, não `--color-navy-50`. Quando o
tema entrar, a troca acontece em um bloco só, e o mesmo teste de contraste
passa a validar os dois conjuntos.

Mapeamento previsto: `surface-page` → `navy-950`, `surface-raised` → `navy-900`,
`text-primary` → `navy-50`, `action-primary` mantém `coral-500` mas o rótulo
migra para `navy-950`.

---

## 2. Tipografia

**Geist Sans** para interface, **Geist Mono** para códigos de acesso e
identificadores. Já estão no projeto — hoje sobrescritas por `Arial` no
`globals.css`, o que o plano de implementação corrige.

Geist tem numerais tabulares, o que importa mais aqui do que parece: horários
em coluna (`14:00`, `15:00`) e preços em tabela precisam alinhar pelo dígito.

### Escala

| Papel | Desktop | Mobile | Entrelinha | Tracking | Peso | Uso |
| --- | --- | --- | --- | --- | --- | --- |
| Display | 56px | 40px | 60/44px | −0.02em | 700 | Herói da landing, só uma vez por página |
| Headline | 40px | 30px | 46/36px | −0.02em | 700 | Título de seção da landing |
| Title 1 | 30px | 24px | 38/31px | −0.01em | 700 | Nome da sala, título de página |
| Title 2 | 24px | 20px | 31/27px | −0.01em | 700 | Título de card grande, valor total |
| Title 3 | 20px | 18px | 27/25px | 0 | 600 | Cabeçalho de seção, nome em card |
| Body | 16px | 16px | 25px | 0 | 400 | Corpo, descrição de sala |
| Callout | 15px | 15px | 23px | 0 | 500 | Rótulo de botão, item de menu |
| Subheadline | 14px | 14px | 21px | 0 | 600 | Cabeçalho de tabela, rótulo de campo |
| Footnote | 13px | 13px | 19px | +0.01em | 400 | Texto auxiliar, política de cancelamento |
| Caption | 12px | 12px | 17px | +0.02em | 500 | Timestamp, metadado, badge |

**Regras de legibilidade**

- Corpo nunca abaixo de **16px**, em nenhum breakpoint. Um teste garante isso.
- Entrelinha do corpo em **1,5** ou mais (WCAG 1.4.12).
- Texto nunca em caixa alta acima de 3 palavras — em português, com acentuação,
  caixa alta prejudica a leitura mais do que em inglês.
- Largura de leitura entre **45 e 75 caracteres**. Na descrição da sala isso dá
  `max-width: 65ch`.
- Nada abaixo de 12px. Metadado que não cabe em 12px não deveria estar na tela.

**Numerais.** Horários, preços, contadores e códigos usam
`font-variant-numeric: tabular-nums`. Sem isso, um contador regressivo de hold
"pula" a cada segundo.

---

## 3. Grid e breakpoints

| Nome | Largura | Colunas | Margem | Calha | Conteúdo máx. |
| --- | --- | --- | --- | --- | --- |
| Mobile | 375px | 4 | 16px | 16px | fluido |
| Tablet | 768px | 8 | 24px | 20px | fluido |
| Laptop | 1024px | 12 | 32px | 24px | 1200px |
| Desktop | 1440px | 12 | 40px | 24px | 1440px |
| Wide | 1920px+ | 12 | auto | 24px | 1440px centralizado |

**Como o catálogo se comporta**

| Breakpoint | Colunas de Room Card |
| --- | --- |
| < 640px | 1 |
| 640–1023px | 2 |
| 1024–1439px | 3 |
| ≥ 1440px | 3, com card mais largo — não 4 |

Quatro colunas espremem a foto da sala a ponto de ela não comunicar mais o
espaço. Preferimos card maior a mais cards.

**Layout de duas colunas** (página da sala, checkout): conteúdo fluido +
trilho fixo de 400px com `position: sticky`. Abaixo de 1024px o trilho desce
para o fim do fluxo, e o resumo vira uma barra fixa no rodapé.

**Área segura.** Em iOS com notch, a barra de ação inferior soma
`env(safe-area-inset-bottom)`. O código de acesso em tela cheia respeita
`env(safe-area-inset-top)`.

---

## 4. Espaçamento

Base 8px. O 2px e o 4px existem só para ajuste óptico de ícone e borda.

| Token | Valor | Onde usar |
| --- | --- | --- |
| `space-1` | 2px | Deslocamento óptico de ícone |
| `space-2` | 4px | Ícone e rótulo dentro de um badge |
| `space-3` | 8px | Ícone e texto em botão · itens de uma lista densa |
| `space-4` | 12px | Padding vertical de campo · gap entre chips |
| `space-5` | 16px | **Padding padrão de card e de tela no mobile** |
| `space-6` | 24px | **Gap entre cards · padding de card no desktop** |
| `space-7` | 32px | Separação entre blocos dentro de uma seção |
| `space-8` | 48px | **Separação entre seções de página** |
| `space-9` | 64px | Respiro antes e depois de uma seção de destaque |
| `space-10` | 96px | Espaço vertical de seção da landing no desktop |
| `space-11` | 128px | Herói da landing |

**Regra da proximidade.** O espaço entre um rótulo e seu campo (`space-3`) é
sempre menor que o espaço entre dois campos (`space-5`). Quando isso se inverte,
o formulário fica ilegível mesmo com todas as cores certas.

---

## 5. Raio e elevação

| Token | Valor | Uso |
| --- | --- | --- |
| `radius-sm` | 6px | Badge, chip, checkbox |
| `radius-md` | 10px | **Botão, campo, seletor de horário** |
| `radius-lg` | 14px | **Card, modal, diálogo** |
| `radius-xl` | 20px | Foto de sala, card de credencial |
| `radius-full` | 9999px | Avatar, indicador de status, botão-ícone circular |

Sombras tingidas de navy — sombra cinza sobre superfície azulada parece fumaça.

| Token | Uso |
| --- | --- |
| `shadow-sm` | Card em repouso |
| `shadow-md` | Card em hover · dropdown |
| `shadow-lg` | Modal · popover · barra de ação fixa |
| `shadow-xl` | Credencial de acesso em destaque |
| `shadow-focus` | Anel de foco: 2px branco + 2px navy |

Elevação nunca é o único sinal de interatividade — quem usa alto contraste ou
força cores não enxerga sombra.

---

## 6. Movimento

| Token | Duração | Uso |
| --- | --- | --- |
| `duration-instant` | 80ms | Mudança de cor em hover |
| `duration-fast` | 140ms | Aparecimento de tooltip, troca de estado de botão |
| `duration-base` | 200ms | **Padrão**: abrir dropdown, expandir seção |
| `duration-slow` | 320ms | Modal, gaveta lateral |
| `duration-deliberate` | 480ms | Revelação do código de acesso |

Curvas: `ease-standard` para a maioria, `ease-decelerate` para entrada,
`ease-accelerate` para saída, `ease-spring` só na confirmação de reserva — o
único momento do produto que merece celebração.

**Movimento reduzido.** Sob `prefers-reduced-motion: reduce`, toda transição cai
para 1ms e nenhuma animação se repete. O contador de hold continua atualizando o
número, mas para de pulsar.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 7. Alvos de toque

| Token | Valor | Uso |
| --- | --- | --- |
| `target-minimum` | 44px | Piso absoluto — WCAG 2.2 §2.5.8 e HIG |
| `target-comfortable` | 48px | Ação primária, seletor de horário no mobile |
| `target-compact` | 36px | Só em densidade alta do `/admin`, com 8px de folga entre alvos |

O seletor de horário é o caso mais crítico: são muitos alvos lado a lado, e
errar o horário custa dinheiro ao usuário. No mobile ele nunca desce de 48px.
