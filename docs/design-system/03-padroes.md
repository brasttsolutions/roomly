# 03 — Padrões

## 1. Templates de página

### Landing

```
Header transparente sobre o herói
├ Herói: Display + subtítulo + busca embutida (unidade · data · pessoas)
├ Prova: 3 métricas em Stat  (salas ativas, reservas, tempo médio de liberação)
├ Como funciona: 4 passos com ícone — reservar, pagar, receber código, entrar
├ Salas em destaque: 3 Room Cards
├ Objeções: acordeão com cancelamento, nota fiscal, acesso, suporte
└ Rodapé: navegação, legal, contato
```

A busca fica **no herói**, não abaixo dele. Quem chega na landing do Roomly tem
uma pergunta concreta — "tem sala amanhã às 14h?" — e ela é respondida antes de
qualquer texto institucional.

### Catálogo

Barra de filtros sticky (unidade · data · capacidade · recursos) sobre grade de
Room Cards. Contagem de resultados em região `aria-live`. Filtro ativo vira chip
removível. Sem resultado: Empty state que sugere afrouxar o filtro mais
restritivo, nomeando qual é.

### Detalhe da sala

```
Desktop: [galeria + descrição + recursos]  [trilho sticky: calendário → horários → resumo]
Mobile:  galeria → nome → recursos → calendário → horários → barra fixa com preço e ação
```

### Checkout

Stepper no topo, formulário à esquerda, Booking Summary à direita. Um passo por
vez. O contador de hold acompanha em todos os passos.

### Dashboard administrativo

Sidebar navy + área de trabalho `surface-page`. Linha de Stats, depois a agenda
do dia, depois pendências (limpeza atrasada, pagamento em revisão, acesso com
falha). Pendência vem antes de métrica: métrica informa, pendência exige ação.

### Configurações

Navegação lateral de seções + formulário de uma coluna com largura máxima de
640px. Salvamento explícito com barra fixa "Você tem alterações não salvas".

---

## 2. Fluxos

### Reserva (o fluxo central)

```
Catálogo → Sala → Data → Horário → [login se preciso] → Resumo → Pagamento
   → Processando → Confirmada → Código de acesso
```

Regras que valem em todo o fluxo:

1. **O login acontece o mais tarde possível.** A pessoa escolhe sala e horário
   antes de criar conta. O hold é criado no momento do login, não antes.
2. **O hold é visível desde que existe.** Nunca se descobre que o horário
   expirou só ao tentar pagar.
3. **Voltar nunca perde a seleção.** Sala, data e horário sobrevivem à
   navegação para trás.
4. **O preço vem do servidor.** A interface exibe o que o banco calculou; nunca
   multiplica no cliente.

### Cadastro por convite

```
Gestor convida → link (por e-mail ou copiado da tela) → /cadastro?convite=…
   → nome + e-mail + senha → primeiro acesso aceita o convite e cria o perfil
```

O formulário informa antecipadamente que o e-mail precisa ser o mesmo do
convite — descobrir isso só no erro é frustração evitável.

### Extensão

```
Reserva em andamento → "Estender" → verifica bloco seguinte
   → disponível: mesmo fluxo de pagamento, mesmo hold
   → indisponível: alternativas de sala, sem beco sem saída
```

### Cancelamento

Confirmação em modal com **consequência explícita**: quanto volta, em quanto
tempo, e que o código de acesso é revogado imediatamente. Nunca "Tem certeza?"
sem números.

---

## 3. Estados críticos

Cada um destes tem tratamento definido porque cada um já custou dinheiro ou
confiança em algum produto do gênero.

### Sala indisponível

- **Onde**: card, página da sala, resultado de busca.
- **Interface**: badge alerta, botão desabilitado, motivo visível.
- **Nunca**: sumir com a sala da lista sem explicação. Some da lista quando o
  filtro exclui, não quando ela está ocupada.
- **Saída**: "Ver salas parecidas livres neste horário".

### Horário indisponível

- **Interface**: bloco riscado, motivo em `aria-label` ("reservado", "limpeza",
  "fora do expediente").
- **Nunca**: permitir selecionar e falhar depois. A recusa é imediata e local.

### Pagamento processando

- **Interface**: superfície info, "Confirmando seu pagamento…", com o aviso de
  que a pessoa pode fechar a página e será notificada.
- **Nunca**: travar a tela sem prazo. O PIX pode demorar; o produto assume isso.
- **Timeout**: após 3 minutos, oferece acompanhar em "Minhas reservas".

### Pagamento recusado

- **Interface**: superfície de erro, **motivo do provedor traduzido**
  ("cartão sem limite", "dados incorretos"), e o horário **ainda segurado** se o
  hold não venceu.
- **Ação**: "Tentar outro cartão" ou "Pagar com PIX", sem refazer a seleção.

### Reserva expirada

- **Interface**: badge de erro, "O prazo de pagamento venceu e o horário foi
  liberado".
- **Ação**: "Ver disponibilidade" com a mesma sala pré-selecionada.

### Extensão indisponível

- **Interface**: motivo concreto — reserva seguinte, ou janela de limpeza — e
  alternativas.
- **Nunca**: botão desabilitado sem explicação.

### Credencial ainda indisponível

- **Interface**: card fechado com o horário exato em que o código aparece.
- **Nunca**: espaço vazio ou "—". A ausência precisa ser explicada, porque é
  exatamente o momento de maior ansiedade do cliente.

### Falha ao liberar acesso

- **Interface**: superfície de alerta com telefone do suporte, mais aviso de que
  a operação já foi notificada.
- **Backend**: o job vai para revisão manual; a interface reflete isso.
- **Nunca**: mostrar um código que talvez não funcione.

### Sala em manutenção

- **Interface**: retirada do catálogo público com data prevista de retorno; no
  `/admin`, badge de alerta e bloqueio de novas reservas.
- **Reservas existentes**: a operação é avisada para realocar, e o cliente
  recebe comunicação ativa — não descobre na porta.

---

## 4. Padrões de feedback

| Situação | Padrão | Onde |
| --- | --- | --- |
| Sucesso de ação pontual | Toast, 5s | Salvar no `/admin` |
| Sucesso de marco | Tela dedicada | Reserva confirmada |
| Erro de campo | Inline, no campo | Formulários |
| Erro de operação | Alert inline no topo do bloco | Falha ao salvar |
| Erro de sistema | Tela com o que fazer | Provedor fora do ar |
| Carregando região | Skeleton com a forma real | Catálogo, tabelas |
| Carregando ação | Spinner dentro do botão | Reservar, pagar |
| Vazio por filtro | Empty com sugestão nomeada | Busca sem resultado |
| Vazio por novidade | Empty com primeira ação | Sem reservas ainda |

**Regra do dinheiro.** Nenhuma ação que cobra usa atualização otimista. O botão
espera a confirmação do servidor. Em contrapartida, ações sem custo — favoritar,
filtrar, marcar como limpa — atualizam na hora e revertem em caso de falha.
