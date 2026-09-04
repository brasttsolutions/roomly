# 02 — Componentes

34 componentes. Cada um traz anatomia, estados, quando **não** usar,
acessibilidade e medidas prontas para código.

Convenção comum a todos:

- **Foco**: `outline: 2px solid var(--focus-ring); outline-offset: 2px`. Nunca
  removido, nunca só uma mudança de cor de fundo.
- **Desabilitado**: `opacity: .5` mais `cursor: not-allowed`. O contraste cai,
  então um controle desabilitado nunca carrega informação que só existe nele.
- **Carregando**: o controle mantém a largura de repouso para a página não pular.

---

## Navegação

### 1. Header (cliente)

**Anatomia** — marca · navegação · [botão do painel] · menu da conta ou "Entrar".

Altura 64px, `position: sticky`, `backdrop-filter: blur(12px)` sobre
`rgba(255,255,255,.95)`, borda inferior `border-subtle`.

| Estado | Comportamento |
| --- | --- |
| Deslogado | Botão "Entrar" com borda `border-control` |
| Logado | Nome da pessoa, avatar/ícone, chevron |
| Gestor | Ganha o botão "Área administrativa" em `action-primary` |

**Acessibilidade**: `<header>` + `<nav aria-label="Navegação principal">`. O
menu da conta é `aria-haspopup="menu"` + `aria-expanded`, fecha com `Escape`,
devolve o foco ao gatilho.

**Não use** para navegação de mais de 5 itens — vire uma barra secundária.

### 2. Sidebar (administração)

Largura 248px, fundo `surface-inverse` (navy-900), texto branco.

| Estado | Especificação |
| --- | --- |
| Item padrão | `navy-300`, 8,95:1 |
| Item hover | Fundo `navy-800` |
| Item ativo | Texto `coral-400` (5,94:1) + barra de 3px `action-primary` à esquerda |
| Grupo | Rótulo em Caption, `navy-400`, `letter-spacing: .08em` |

Abaixo de 1024px vira gaveta com overlay `rgba(14,22,48,.55)`, foco preso
dentro, `Escape` fecha.

**Acessibilidade**: `<nav aria-label="Administração">`, item ativo com
`aria-current="page"`. A barra coral **e** o `aria-current` — cor sozinha não
identifica o item ativo.

### 3. Tab bar

Abas horizontais com indicador de 2px `action-primary` embaixo. Alvo mínimo
44px. Papel `tablist`/`tab`/`tabpanel`, setas navegam, `Home`/`End` pulam para
as pontas.

**Não use** para mais de 6 abas nem para passos de um fluxo — passo é Stepper.

### 4. Breadcrumbs

`<nav aria-label="Trilha">` com `<ol>`. Separador `/` em `slate-400` com
`aria-hidden`. Último item sem link e com `aria-current="page"`. No mobile,
mostra só o pai imediato com "‹ Voltar".

### 5. Stepper

Passos do checkout: Horário → Dados → Pagamento → Confirmação.

| Estado | Visual |
| --- | --- |
| Concluído | Círculo `action-primary` com check navy |
| Atual | Círculo com borda 2px `action-primary`, número navy, rótulo em peso 600 |
| Futuro | Círculo `slate-300`, número `slate-600` |

**Acessibilidade**: `<ol>` com `aria-current="step"` no atual. Cada passo
anuncia "Passo 2 de 4: Pagamento" para leitor de tela.

---

## Entrada

### 6. Button

Seis variantes. **Altura 44px** (`md`), 36px (`sm`), 52px (`lg`).

| Variante | Repouso | Hover | Pressionado | Uso |
| --- | --- | --- | --- | --- |
| **Primary** | `action-primary` + rótulo navy | `coral-400` | `coral-300` | Uma por tela. "Reservar", "Pagar" |
| **Secondary** | Branco, borda `border-control`, texto navy | Fundo `navy-50` | Fundo `navy-100` | "Cancelar", "Voltar" |
| **Ghost** | Sem fundo, texto navy | Fundo `navy-50` | Fundo `navy-100` | Ação terciária em tabela |
| **Destructive** | `danger-action` + rótulo **branco** | `danger-700` | `danger-800` | "Cancelar reserva", "Revogar acesso" |
| **Link** | Texto `text-link`, sublinhado no hover | — | — | Ação inline no texto |
| **Icon** | Quadrado 44px, `radius-full` | Fundo `navy-50` | — | Fechar, mais opções |

O primário **clareia** ao interagir, e por isso o contraste *sobe* de 4,70 para
7,96. É o inverso da convenção de escurecer no hover, e é deliberado: escurecer
o coral derruba o contraste com o rótulo navy.

**Estados de exceção**

- *Carregando*: spinner de 16px substitui o ícone, rótulo vira "Processando…",
  `aria-busy="true"`, largura travada.
- *Desabilitado*: só quando a ação é impossível. Se for possível mas inválida,
  deixe habilitado e explique o erro ao submeter — botão morto sem explicação é
  a maior fonte de abandono em checkout.

**Não use** dois primários lado a lado. Se as duas ações têm o mesmo peso,
nenhuma é primária.

### 7. Text field

Altura 44px, padding `space-4`, borda 1px `border-control`, `radius-md`.

| Estado | Especificação |
| --- | --- |
| Repouso | Borda `border-control` (3,31:1) |
| Foco | Borda `action-primary` + `outline` 2px navy com 2px de offset |
| Erro | Borda `danger-border`, ícone de alerta, mensagem abaixo |
| Desabilitado | Fundo `slate-50`, texto `slate-600` |
| Somente leitura | Sem borda, fundo transparente |

Rótulo **sempre visível** acima do campo — placeholder não é rótulo. Erro em
`danger-text` + ícone, ligado por `aria-describedby`, campo com
`aria-invalid="true"`.

### 8. Textarea · 9. Select · 10. Combobox

Mesmas medidas e estados do campo de texto. O Select nativo é preferido no
mobile. O Combobox segue o padrão APG: `role="combobox"`, `aria-expanded`,
`aria-controls`, setas navegam, `Enter` seleciona, `Escape` fecha.

### 11. Checkbox · 12. Radio

Caixa de 20px, alvo clicável de 44px incluindo o rótulo. Borda
`border-control`; marcado usa `action-primary` com o check em navy. Radio
agrupado em `<fieldset>` com `<legend>`.

### 13. Toggle

Trilho 44×24px, botão 20px. Desligado `slate-400`, ligado `action-primary`.
`role="switch"` + `aria-checked`. Sempre com rótulo textual do que ele controla
— o estado ligado/desligado nunca depende só da cor.

### 14. Slider

Só usado no filtro de capacidade e faixa de preço. Trilho 4px, alvo 24px, alvo
tocável 44px. `role="slider"` com `aria-valuemin/max/now/text`. Setas ajustam de
1, `PageUp`/`PageDown` de 10.

### 15. Date picker

Ver **Availability Calendar** — no Roomly a data nunca é escolhida sem
disponibilidade à vista.

### 16. Search field

Campo com ícone de lupa à esquerda e botão de limpar à direita quando há texto.
`role="searchbox"`. Resultados anunciados por região `aria-live="polite"`:
"12 salas encontradas".

---

## Feedback

### 17. Alert (inline)

Bloco com borda esquerda de 3px, superfície e texto do estado, ícone de 20px.
`role="status"` para info e sucesso, `role="alert"` para erro. Fica no fluxo,
perto do que causou a mensagem.

### 18. Toast

Canto inferior direito no desktop, topo no mobile. Máximo 3 empilhados.
Sucesso some em 5s; erro **não some sozinho**. `aria-live="polite"`,
`aria-live="assertive"` para erro. Pausa o temporizador com foco ou hover.

**Não use** toast para erro de formulário — o erro pertence ao campo.

### 19. Modal

Máximo 560px, `radius-lg`, `shadow-lg`, overlay `rgba(14,22,48,.55)`.
`role="dialog"` + `aria-modal="true"` + `aria-labelledby`. Foco preso, `Escape`
fecha, foco volta ao gatilho. No mobile vira folha inferior com alça de
arraste.

**Não use** modal para conteúdo longo ou para confirmar ação de baixo risco.

### 20. Drawer

Painel lateral de 400px para filtros e detalhes no `/admin`. Mesmas regras de
foco do modal.

### 21. Progress bar

Trilho 4px `slate-200`, preenchimento `action-primary`.
`role="progressbar"` com `aria-valuenow`. Indeterminado usa animação de 1,5s
que respeita `prefers-reduced-motion`.

### 22. Skeleton

Blocos `slate-100` com brilho de 1,6s. Reproduz a **forma real** do conteúdo —
skeleton genérico causa mais salto de layout do que evita. `aria-hidden="true"`
com um `aria-live` anunciando "Carregando salas".

### 23. Empty state

Ícone de 48px `slate-400`, título em Title 3, uma linha de explicação, uma ação.
Sempre diz **por que** está vazio e **o que fazer**. "Nenhuma sala encontrada
para 12 pessoas — tente reduzir a capacidade" e não "Sem resultados".

### 24. Tooltip

Só complementa, nunca carrega informação essencial. Aparece após 400ms,
some imediatamente. `aria-describedby`. Não existe no toque — no mobile, a
informação vai para o corpo da tela.

---

## Exibição de dados

### 25. Card

`surface-raised`, `radius-lg`, `shadow-sm`, borda `border-subtle`. Padding
`space-5` no mobile, `space-6` no desktop. Se clicável: `shadow-md` no hover,
translação de −2px, e a **área inteira** é o alvo.

### 26. Table

Cabeçalho `subheadline` em `slate-600` sobre `navy-50`, sticky. Linhas com 56px
de altura e divisor `border-subtle`. Números alinhados à direita com
`tabular-nums`. No mobile vira lista de cards — tabela com rolagem horizontal é
o pior padrão possível em telefone.

`<caption>` descreve a tabela, `<th scope>` em todos os cabeçalhos, ordenação
com `aria-sort`.

### 27. List

Itens de 56px com ícone opcional, título, apoio e ação. Divisor entre itens, não
ao redor.

### 28. Stat

Rótulo em Caption maiúsculo `slate-600`, valor em Title 1 `tabular-nums`,
variação com seta e cor semântica **mais o sinal** (`+12%`, `−3%`) — a seta e o
sinal existem para quem não distingue verde de vermelho.

### 29. Badge

Altura 24px, `radius-sm`, Caption em peso 600. Superfície e texto do par
semântico. Sempre com texto — badge que é só um ponto colorido não comunica.

### 30. Avatar

`radius-full` em 24/32/40/48px. Sem foto, iniciais sobre `navy-700` com texto
branco. `alt` com o nome, ou `aria-hidden` quando o nome já está ao lado.

---

## Componentes do Roomly

### 31. Room Card

O componente mais importante do produto: é onde a decisão de reservar começa.

**Anatomia**

```
┌─────────────────────────────┐
│ [foto 16:9]        [badge]  │  badge = status, canto superior direito
├─────────────────────────────┤
│ Sala Executiva              │  Title 3
│ Ágora Tech Park · 2º andar  │  Footnote, slate-600
│ Perini Business Park, SC    │  Footnote, slate-600
│                             │
│ [8 pessoas] [TV] [Câmera]   │  Room Amenities, máx. 3 + "+2"
│                             │
│ Hoje: 14:00 · 15:00 · 16:00 │  próximos horários livres
│                             │
│ R$ 120 /hora    [Reservar]  │  Title 2 + Button primary
└─────────────────────────────┘
```

A linha de horários livres é o que separa este card de um card de e-commerce.
Ela responde "posso usar hoje?" sem exigir clique.

| Estado | Tratamento |
| --- | --- |
| Disponível | Badge sucesso "Livre agora" ou os próximos horários |
| Sem horário hoje | Badge neutro "Próximo: amanhã 09:00", botão vira "Ver agenda" |
| **Indisponível** | Foto com 60% de opacidade, badge alerta "Sem disponibilidade", botão desabilitado com motivo |
| **Em manutenção** | Badge alerta "Em manutenção", botão desabilitado, tooltip com a previsão |
| Carregando | Skeleton com a mesma proporção 16:9 e três linhas |

**Acessibilidade**: `<article>` com `<h3>` no nome. O link envolve o nome, não o
card inteiro — assim o leitor de tela anuncia "Sala Executiva, link" e não
despeja o card todo. Preço tem `aria-label="120 reais por hora"` porque
`R$ 120 /hora` é lido de forma estranha.

### 32. Availability Calendar

**Anatomia**: cabeçalho com mês e navegação · sete colunas de dia · células com
indicador de densidade.

Densidade por célula, com três sinais simultâneos:

| Ocupação | Cor | Texto | Padrão |
| --- | --- | --- | --- |
| Livre | `success-surface` | "8 livres" | — |
| Parcial | `warning-surface` | "3 livres" | — |
| Cheio | `slate-100` | "Lotado" | hachura diagonal |
| Fechado | transparente | "—" | — |

A hachura existe para daltonismo: o estado nunca depende só da cor.

**Teclado**: setas movem por dia, `PageUp`/`PageDown` por mês, `Home`/`End` para
início e fim da semana, `Enter` seleciona. `role="grid"` com
`aria-selected`, e cada célula com `aria-label` completo: "12 de setembro,
quinta-feira, 3 horários livres".

**Não use** para escolher só a data quando a sala tem um único horário — nesse
caso mostre o horário direto.

### 33. Time Slot Picker

Grade de blocos. **48px de altura no mobile**, `radius-md`.

| Estado | Visual | Interação |
| --- | --- | --- |
| Disponível | Borda `border-control`, texto navy | Clicável |
| Selecionado | `action-primary`, texto navy, borda 2px `coral-600` | Clicável |
| Intervalo | `coral-100`, entre início e fim | — |
| **Ocupado** | Fundo `slate-100`, texto `slate-600` riscado | `aria-disabled` + motivo |
| **Limpeza** | `warning-surface`, ícone de vassoura | Não selecionável |
| **Passado** | Opacidade 40% | Não selecionável |

Cada bloco indisponível carrega o motivo em `aria-label`: "14:00, indisponível,
reservado". Isso é a diferença entre um usuário que entende e um que insiste.

Seleção de intervalo: primeiro clique marca o início, segundo o fim. Um terceiro
clique reinicia. Se o intervalo cruzar um bloco ocupado, o segundo clique é
recusado com mensagem inline — não silenciosamente.

`role="group"` com `aria-label="Horários disponíveis"`; cada bloco é
`<button aria-pressed>`.

### 34. Booking Summary

Resumo persistente durante o checkout. Desktop: trilho sticky de 400px. Mobile:
barra fixa no rodapé, expansível.

```
Sala Executiva
Ágora Tech Park · Perini Business Park
Qui, 5 set · 14:00 – 15:30      [Alterar]
─────────────────────────────────────────
1h30 × R$ 120/h              R$ 180,00
─────────────────────────────────────────
Total                        R$ 180,00
⏱ Horário reservado por 08:42
```

O contador de hold é o elemento mais delicado: cria urgência real, e urgência
falsa destrói confiança. Ele mostra o tempo verdadeiro do hold do banco.

| Restante | Tratamento |
| --- | --- |
| > 5 min | `slate-600`, discreto |
| 2–5 min | `warning-text` + ícone |
| < 2 min | `danger-text`, `aria-live="polite"` a cada minuto |
| Expirado | Bloqueia o pagamento e oferece "Escolher outro horário" |

`aria-live` anuncia por minuto, nunca por segundo — anúncio a cada segundo torna
a tela inutilizável com leitor.

### 35. Booking Status

Badge + linha do tempo do ciclo de vida.

| Estado | Badge | Significado |
| --- | --- | --- |
| Aguardando pagamento | Alerta | Hold ativo, ainda dá para pagar |
| Confirmada | Sucesso | Paga; acesso será liberado |
| Em andamento | Info | Está acontecendo agora |
| Concluída | Neutro | Terminou |
| Cancelada | Neutro | Cancelada pelo cliente ou pela operação |
| **Expirada** | Erro | Hold venceu sem pagamento |
| **Reembolsada** | Info | Valor devolvido |
| **Em revisão** | Alerta | Divergência exige conferência humana |

"Em revisão" é o estado que a maioria dos produtos esconde. Aqui ele é visível,
com texto claro: "Estamos conferindo seu pagamento. Você recebe uma resposta em
até 1 hora."

### 36. Access Credential Card

O momento de maior valor do produto.

```
┌──────────────────────────────────┐
│ 🔑 CÓDIGO DE ACESSO              │
│                                  │
│      5 8 3   9 2 1               │  Geist Mono, 40px, tabular
│                                  │
│ Válido 13:55 – 15:05             │
│ Sala Executiva · Porta 2         │
│                    [Copiar]      │
└──────────────────────────────────┘
```

Fundo `surface-inverse`, texto branco, `radius-xl`. Dígitos agrupados em três
para leitura e digitação no teclado da porta.

| Estado | Tratamento |
| --- | --- |
| **Ainda não disponível** | Card fechado com cadeado: "Seu código aparece 5 minutos antes, às 13:55" |
| Ativo | Código visível, contador até expirar |
| Expirado | Código riscado, "Expirou às 15:05" |
| Revogado | Superfície de erro, "Acesso revogado — reserva cancelada" |
| **Falha ao gerar** | Superfície de alerta, "Não conseguimos liberar o acesso. Nossa equipe já foi avisada" + telefone |

O último estado é obrigatório: o cliente pagou e a porta não abriu. Esconder
isso é o pior resultado possível do produto.

**Acessibilidade**: o código tem `aria-label="Código de acesso: 5 8 3 9 2 1"`
com espaços, para o leitor soletrar dígito a dígito em vez de dizer "quinhentos
e oitenta e três mil". O botão Copiar confirma por região `aria-live`.

**Segurança visual**: o código não aparece em captura de tela de listagem nem em
notificação — só na página da reserva, com sessão ativa.

### 37. Extend Booking

Aparece na reserva em andamento, quando há bloco livre logo em seguida.

| Situação | Interface |
| --- | --- |
| Extensão possível | "Estender até 16:30 por R$ 60" + botão primário |
| **Sala ocupada depois** | "A sala tem reserva às 15:30. Veja outras salas livres" + link |
| **Precisa de limpeza** | "A sala precisa de 20 min de preparo. Extensão até 15:10" |
| Reserva não iniciada | Componente não aparece |
| Extensão em processamento | Botão em carregamento, sem permitir segundo clique |

A extensão reusa o mesmo caminho de reserva e pagamento — mesmo hold, mesma
idempotência. Nunca é um caminho paralelo com regras próprias.

### 38. Room Amenities

Chips de 28px com ícone de 16px e rótulo. Máximo 3 visíveis, o resto vira "+2"
que abre a lista completa.

Ícone **sempre com texto**. Um ícone de TV sozinho não distingue "TV 50" de
"TV 65" nem informa se há câmera — e câmera em sala de reunião é informação
sensível de privacidade, que nunca pode depender de um pictograma.

### 39. Cleaning/Maintenance Status

No `/admin`, o estado operacional da sala.

| Estado | Badge | Ação |
| --- | --- | --- |
| Limpa | Sucesso | — |
| Aguardando limpeza | Alerta | "Atribuir" |
| Em limpeza | Info | "Concluir" |
| **Atrasada** | Erro | Alerta sonoro e visual; a sala fica indisponível |
| **Em manutenção** | Alerta | Sala retirada do catálogo com data de retorno |

Quando a limpeza atrasa e há reserva próxima, o componente mostra o conflito
explicitamente: "Próxima reserva em 12 min — limpeza não concluída".
