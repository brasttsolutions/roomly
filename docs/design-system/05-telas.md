# 05 — Telas

## Pesquisa que orienta estas decisões

**Persona primária — Marina, 34, consultora autônoma.** Atende clientes em
cidades onde não tem escritório. Reserva sala com 2 a 48 horas de antecedência,
quase sempre pelo celular, muitas vezes em deslocamento. Já chegou a um
coworking e ficou 15 minutos na portaria esperando alguém achar a chave.

**Persona secundária — Rafael, 41, gestor de duas unidades.** Precisa saber a
ocupação do dia, quem não pagou e qual sala não foi limpa. Usa desktop.

**Os três objetivos**

1. Confirmar que existe sala no horário exato de que preciso — em segundos.
2. Pagar e receber a garantia de que vou conseguir entrar.
3. Entrar sem falar com ninguém.

**Dores das soluções atuais**

- A disponibilidade só aparece depois de escolher a sala e a data.
- Paga-se sem saber como será o acesso; a credencial chega por e-mail, ou não
  chega.
- Estender uma reunião exige ligar para a recepção.
- Cancelar não deixa claro quanto volta nem quando.

---

## 1. Hierarquia e layout

**Ordem de leitura projetada** — catálogo, do primeiro ao terceiro elemento:

1. **Foto da sala** — julgar o espaço é instantâneo e pré-verbal.
2. **Nome e unidade** — "é aqui perto?"
3. **Horários livres hoje** — a resposta à pergunta que trouxe a pessoa.

Preço vem em quarto lugar, deliberadamente. Preço antes de disponibilidade
transforma a decisão em comparação de tabela, e o produto perde para uma
planilha.

**Padrão Z na landing**: logo (canto superior esquerdo) → "Entrar" (direito) →
proposta de valor (esquerda) → busca (direita/centro). **Padrão F no catálogo e
no `/admin`**, onde a varredura é vertical pela primeira coluna.

**Densidade.** Duas densidades convivem no produto:

| Contexto | Densidade | Altura de linha/alvo |
| --- | --- | --- |
| Cliente | Confortável | Alvos de 44–48px, `space-6` entre blocos |
| `/admin` tabelas | Compacta | Linhas de 56px, alvos de 36px com 8px de folga |

*Nota do designer*: o instinto é padronizar. Mas Rafael olha 40 reservas por dia
e Marina olha uma. Aplicar a densidade do cliente ao `/admin` faria o gestor
rolar três telas para ver o que cabia em uma.

**Materialidade.** Superfícies translúcidas aparecem em exatamente dois lugares:
o header sticky (`backdrop-filter: blur(12px)` sobre branco a 95%) e a barra de
ação fixa do mobile. Em qualquer outro lugar, translucidez sobre foto de sala
prejudica a leitura do espaço — que é justamente o que a pessoa está avaliando.

---

## 2. Padrões de plataforma

**Navegação**: header persistente no cliente; sidebar no `/admin`, que vira
gaveta abaixo de 1024px. Sem tab bar inferior — o produto é web, e tab bar
imitando app nativo em navegador móvel rouba a barra do sistema.

**Modais**: usados só para decisão que interrompe (confirmar cancelamento,
cadastrar recurso). No mobile viram folha inferior com alça. Sempre com foco
preso, `Escape` para fechar e retorno de foco ao gatilho.

**Gestos**

| Gesto | Onde | Alternativa acessível |
| --- | --- | --- |
| Deslizar horizontal | Galeria da sala | Setas e miniaturas clicáveis |
| Deslizar para baixo | Fechar folha inferior | Botão fechar |
| Puxar para atualizar | "Minhas reservas" no mobile | Botão atualizar |
| Toque longo | — | Não usado: nada fica escondido atrás dele |

*Nota do designer*: gesto nunca é o único caminho. Toque longo é invisível para
quem não descobre, e impossível para parte dos usuários motores.

---

## 3. As oito telas

### Tela 1 — Landing

**Estrutura**

```
[Header transparente]
┌──────────────────────────────────────────────┐
│  Salas no seu tempo.            (Display)    │
│  Reserve, pague e entre. Sem ninguém no meio.│
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ Unidade ▾ │ Data ▾ │ Pessoas ▾ │ [Ver] │  │  ← busca no herói
│  └────────────────────────────────────────┘  │
│                        [foto ampla da sala]  │
└──────────────────────────────────────────────┘
  3 Stats · Como funciona (4 passos) · 3 Room Cards · FAQ · Rodapé
```

**Inventário**: Header, Display, Body, Search composto (Select · Date ·
Stepper · Button primary), imagem 16:9, 3 Stat, 4 blocos de passo, 3 Room Card,
Accordion, Footer.

**Interações**: o botão "Ver salas" leva ao catálogo já filtrado. Cada campo da
busca é um alvo de 48px. No mobile a busca vira três linhas empilhadas com o
botão em largura total.

**Estados**: sem sala cadastrada na unidade, o bloco de destaques dá lugar a um
Empty com "Estamos preparando as salas desta unidade".

*Nota do designer*: a busca dentro do herói custa altura visual e ganha
conversão. Quem chega com intenção não deveria rolar para agir.

---

### Tela 2 — Catálogo

**Estrutura**

```
[Header]
[Filtros sticky: Unidade · Data · Capacidade · Recursos · (chips ativos)]
  "12 salas encontradas"                          [Ordenar ▾]
  ┌────────┐ ┌────────┐ ┌────────┐
  │RoomCard│ │RoomCard│ │RoomCard│     3 col ≥1024 · 2 col ≥640 · 1 col
  └────────┘ └────────┘ └────────┘
```

**Interações**: filtrar não recarrega a página; a contagem é anunciada por
`aria-live="polite"`. Cada filtro ativo vira chip removível. "Limpar filtros"
aparece só quando há algum.

**Estados**

| Estado | Tratamento |
| --- | --- |
| Carregando | 6 skeletons na proporção 16:9 + 3 linhas |
| Vazio por filtro | "Nenhuma sala para 12 pessoas em Ágora Tech Park. Tente Centro Joinville ou reduza a capacidade" com ações |
| Vazio por unidade | "Esta unidade ainda não tem salas publicadas" |
| Erro de carga | "Não conseguimos carregar o catálogo" + "Tentar de novo" |

*Nota do designer*: o Empty nomeia o filtro responsável. "Sem resultados" obriga
o usuário a adivinhar qual dos quatro filtros afrouxar.

---

### Tela 3 — Detalhe da sala *(tarefa principal)*

**Estrutura desktop**

```
[Header]
‹ Todas as salas
┌───────────────────────────────┬──────────────────┐
│ [galeria: destaque + minis]   │  Reserve agora   │  ← sticky
│                               │  ┌─────────────┐ │
│ Sala Executiva      (Title 1) │  │  Calendário │ │
│ Ágora Tech Park · 2º andar    │  │  disponib.  │ │
│ Perini Business Park, SC      │  └─────────────┘ │
│ [8 pessoas]                   │  Horário         │
│                               │  [11:00][13:00]  │
│ Descrição (Body, 65ch)        │  [14:00][15:00]  │
│                               │  Duração  − 1h + │
│ O que você encontra           │  ───────────────  │
│ [TV 65"][Câmera][Lousa][Café] │  Total  R$ 180   │
│                               │  [   Reservar  ] │
│ Acesso · Cancelamento · Apoio │                  │
└───────────────────────────────┴──────────────────┘
```

**Mobile**: galeria → nome → recursos → calendário → horários → **barra fixa**
no rodapé com total e "Reservar", respeitando `safe-area-inset-bottom`.

**Interações**: escolher data recarrega os horários sem perder a rolagem.
Escolher horário atualiza o total na hora. "Reservar" só habilita com data e
horário definidos, e nunca fica desabilitado sem que o motivo esteja visível ao
lado.

**Estados**: sala em manutenção substitui o painel por um aviso de alerta com a
data de retorno e um link para salas equivalentes. Sem horário no dia escolhido,
o painel mostra "Nada livre em 5 de setembro — o próximo é 6 de setembro às
09:00" com ação direta.

*Nota do designer*: o endereço completo entra aqui e no card. Marina precisa
saber se dá tempo de chegar — e essa informação estava faltando na versão atual
do produto.

---

### Tela 4 — Checkout

**Estrutura**

```
[Stepper: Horário ✓ · Dados ✓ · Pagamento ● · Confirmação]
┌────────────────────────────┬──────────────────┐
│ Como prefere pagar?        │ Booking Summary  │
│ ( ) PIX                    │ Sala Executiva   │
│ ( ) Cartão                 │ Qui, 5 set       │
│                            │ 14:00 – 15:30    │
│ [campos do método]         │ ───────────────  │
│                            │ Total  R$ 180,00 │
│ [    Pagar R$ 180,00    ]  │ ⏱ 08:42 restante │
└────────────────────────────┴──────────────────┘
```

O botão carrega **o valor**: "Pagar R$ 180,00". Botão que diz só "Pagar" obriga
a subir os olhos para conferir, e é onde a desistência acontece.

**Estados de pagamento**

| Estado | Interface |
| --- | --- |
| PIX gerado | QR + código copiável + "Aguardando pagamento" com info |
| Processando | Botão em carregamento, "Você pode fechar esta página" |
| Aprovado | Transição para confirmação |
| Recusado | Alerta de erro com o motivo traduzido, horário ainda segurado, alternativa de método |
| Hold expirado | Bloqueia o pagamento e leva de volta à escolha de horário |

*Nota do designer*: "Você pode fechar esta página" é a frase mais importante do
checkout. O PIX pode levar minutos, e prender a pessoa numa tela girando cria a
suspeita de que o dinheiro sumiu.

---

### Tela 5 — Confirmação

Marco, não toast. Tela dedicada com ícone de sucesso, "Tudo certo para
quinta-feira", os dados da reserva, o **Access Credential Card** (fechado, se o
horário ainda não chegou) e dois caminhos: "Ver minhas reservas" e "Adicionar ao
calendário".

É o único lugar do produto onde a animação usa `ease-spring` — e ainda assim
respeita `prefers-reduced-motion`.

---

### Tela 6 — Minhas reservas

**Estrutura**: próxima reserva em destaque, com a credencial; depois "Próximas";
depois "Histórico" colapsado.

A próxima reserva mostra Booking Status, Access Credential Card, Extend Booking
(quando em andamento) e "Cancelar reserva".

**Estados**: sem reserva alguma, Empty com "Você ainda não reservou nenhuma
sala" e botão para o catálogo. Reserva expirada aparece no histórico com badge
de erro e ação de "Reservar novamente".

---

### Tela 7 — Dashboard administrativo

**Estrutura**

```
[Sidebar navy]  ┌──────────────────────────────────────────┐
                │ Visão geral                              │
                │ [Reservas hoje][Ocupação][Receita][Salas]│  ← Stats
                │                                          │
                │ ⚠ Pendências                             │  ← antes das métricas
                │   Limpeza atrasada · Sala Foco · 12 min  │
                │   Pagamento em revisão · #RM-2048        │
                │                                          │
                │ Agenda de hoje            [tabela]       │
                └──────────────────────────────────────────┘
```

*Nota do designer*: pendências acima da agenda. Métrica informa; pendência
custa dinheiro a cada minuto que passa despercebida.

**Estados**: sem pendência, o bloco vira uma linha discreta de sucesso —
"Nenhuma pendência", e não desaparece. Some por completo é ambíguo: parece que
não carregou.

---

### Tela 8 — Erros e vazios

| Situação | Título | Corpo | Ação |
| --- | --- | --- | --- |
| 404 | "Esta página não existe" | "O link pode estar errado ou a sala saiu do catálogo" | "Ver salas" |
| 500 | "Algo quebrou do nosso lado" | "Já fomos avisados. Tente de novo em instantes" | "Tentar de novo" |
| Sem conexão | "Você está sem conexão" | "Suas reservas continuam salvas" | "Tentar de novo" |
| Sessão expirada | "Sua sessão expirou" | "Entre de novo para continuar de onde parou" | "Entrar" |
| Sem permissão | "Você não tem acesso a esta área" | "Fale com o administrador da sua empresa" | "Ir para minhas reservas" |

Nenhum destes usa "Ops" nem exclamação. O erro 500 assume a responsabilidade
("do nosso lado") porque atribuir vagamente é pior que assumir.

---

## 4. Acessibilidade das telas

**Tipo dinâmico**: layouts testados até **200%** de zoom sem rolagem horizontal
(WCAG 1.4.4) e até **310%** com reflow de uma coluna. Nada em altura fixa que
corte texto; alturas mínimas usam `min-height`, não `height`.

**Rótulos para leitor de tela** — os que exigem cuidado especial:

| Elemento | Rótulo anunciado |
| --- | --- |
| Bloco de horário livre | "14:00, disponível" |
| Bloco ocupado | "14:00, indisponível, reservado" |
| Bloco em limpeza | "14:00, indisponível, sala em preparo" |
| Preço do card | "120 reais por hora" |
| Código de acesso | "Código de acesso: 5 8 3 9 2 1" |
| Contador de hold | "Horário reservado por mais 2 minutos" |
| Célula do calendário | "12 de setembro, quinta-feira, 3 horários livres" |
| Badge de status | "Status: confirmada" |

**Foco**: anel de 2px navy com 2px de deslocamento, nunca removido. Ordem de
tabulação segue a ordem visual. Modal prende o foco e o devolve. Todo `<main>`
tem um link "Pular para o conteúdo" como primeiro elemento tabulável.

**Movimento reduzido**: transições caem para 1ms, o brilho do skeleton vira
estático, o contador de hold para de pulsar mas continua contando.

---

## 5. Microinterações

| Interação | Duração | Curva | Detalhe |
| --- | --- | --- | --- |
| Botão hover | 80ms | standard | Só a cor |
| Card hover | 140ms | standard | −2px e sombra `md` |
| Bloco de horário selecionado | 140ms | spring | Escala 1,02 e volta |
| Abrir dropdown | 200ms | decelerate | Opacidade + 4px |
| Modal | 320ms | decelerate | Escala 0,96→1 com fade do overlay |
| Revelar credencial | 480ms | decelerate | Fade escalonado por dígito |
| Toast | 200ms | decelerate | Desliza 8px |

**Retorno tátil** (onde a Vibration API existir): toque leve ao selecionar
horário; duplo ao confirmar pagamento; padrão de erro ao recusar. Sempre
opcional e nunca a única confirmação.

**Som**: nenhum. O produto é usado em coworking, muitas vezes em sala de
reunião. Som seria constrangimento, não feedback.

---

## 6. Comportamento responsivo

| Elemento | Mobile | Tablet | Desktop |
| --- | --- | --- | --- |
| Catálogo | 1 coluna | 2 colunas | 3 colunas |
| Página da sala | Empilhada + barra fixa | Empilhada, painel mais largo | Duas colunas com trilho sticky |
| Checkout | Passo único por tela, resumo colapsável | Duas colunas estreitas | Duas colunas |
| `/admin` | Gaveta + cards no lugar da tabela | Gaveta + tabela | Sidebar fixa + tabela |
| Time Slot Picker | 3 colunas, 48px | 4 colunas | 6 colunas, 44px |

**Rotação**: em paisagem no celular, o header encolhe para 52px e a barra fixa
some em favor de um botão flutuante — teclado em paisagem já rouba metade da
tela.

**Dobráveis**: acima de 1024px de largura útil, o layout de duas colunas entra
mesmo em dobrável aberto. A dobra é tratada com `env(fold-left)` quando
disponível para evitar que o Booking Summary caia sobre ela.
