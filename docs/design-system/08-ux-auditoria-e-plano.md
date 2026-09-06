# 08 — UX: auditoria do produto atual e plano de mudança

Este documento compara o Roomly **como ele está** com o alvo definido em
[05 — Telas](05-telas.md) e [03 — Padrões](03-padroes.md), e organiza a
diferença em um plano executável.

Nenhum arquivo de código foi alterado na produção deste documento.

---

## 1. Análise da UX atual

### 1.1. O que existe hoje

| Rota | Estado | Observação |
| --- | --- | --- |
| `/` | Funcional | Catálogo com filtro parcial |
| `/salas/[slug]` | Funcional | Galeria, endereço, seleção de horário, checkout |
| `/entrar` · `/cadastro` | Funcional | Auth real com convite |
| `/minhas-reservas` | Parcial | Próxima reserva real, credencial fixa no código |
| `/conta` | Funcional | Dados, senha, sessões |
| `/admin` | Parcial | Métricas reais, cabeçalho e gráfico fixos |
| `/admin/[section]` | Parcial | 11 seções; 2 sem dados, 1 não é o que o nome diz |
| `/sentry-example-page` | Descartável | Artefato do assistente do Sentry |

Componentes: 12 de produto, 2 primitivos (`Button`, `Badge`), 3 de painel.
Ausentes: 9 dos componentes especificados no sistema.

### 1.2. O achado central

**A disponibilidade não existe na interface.** O seletor de horário renderiza
seis blocos fixos de `timeSlots.slice(3, 9)` — dados de demonstração — e todos
aparecem como disponíveis, sempre, inclusive em modo `supabase`.

O usuário escolhe um horário, preenche o pagamento, e só descobre o conflito
quando a API recusa. O banco protege a integridade (o índice GiST impede a
sobreposição), mas a interface trata a recusa como erro genérico.

Isso viola os dois primeiros princípios do sistema: *o horário é o produto* e
*dinheiro e porta exigem certeza*. E não há como corrigir só no front: **não
existe endpoint de disponibilidade** — `src/app/api/` tem `bookings`, `health`,
`internal`, `ready` e `webhooks`, e nada que responda "o que está livre?".

Consequências em cadeia:

- O Room Card não pode mostrar horários livres.
- O calendário de disponibilidade não pode existir.
- A extensão de reserva não pode saber se o bloco seguinte está livre.
- O filtro por data no catálogo não tem o que filtrar.

**Esta é a lacuna que bloqueia mais componentes do que qualquer outra.**

### 1.3. Controles que aparentam funcionar e não funcionam

| Onde | Controle | Comportamento real |
| --- | --- | --- |
| Catálogo | "Unidade" | Texto estático `Todas as unidades`, não é campo |
| Catálogo | "Data" | `<input type="date">` sem `onChange` — não filtra |
| Catálogo | Botão de busca | Sem ação |
| `/minhas-reservas` | "Ver detalhes" | Sem ação |
| `/admin` | Seletor de unidade | Sem ação |
| `/admin` | Gráfico de barras | Array fixo `[42,58,48,72,67,84,74]` |
| `/admin` | Data do cabeçalho | Texto fixo "TERÇA, 01 DE SETEMBRO" |

Controle que não faz nada é pior que controle ausente: a pessoa tenta, não
entende o resultado e passa a duvidar do que o resto da tela informa.

### 1.4. Dados fixos apresentados como reais

Em `/minhas-reservas`, o painel de acesso mostra sempre:

- código `583 921`;
- validade `03/09, das 13:55 às 15:05`;
- barra de progresso em `72%`.

Independentemente da reserva. Em modo `supabase`, a reserva ao lado é
verdadeira — o que torna a credencial falsa mais perigosa, porque o contexto
sugere que ela também é.

O sistema já grava o dado certo: `booking_access_codes` tem
`access_code_fingerprint`, `valid_from` e `valid_until`. O que falta é a
interface ler.

### 1.5. Restrição indevida na data

O campo de data usa `min={addIsoDays(today, 1)}`: **não é possível reservar
hoje**. A restrição veio da correção do bug de data fixa e foi longe demais —
o caso de uso mais comum de coworking é "preciso de sala daqui a duas horas".

O correto é `min = hoje` com os blocos já passados desabilitados.

### 1.6. Hierarquia e carga cognitiva

**Room Card** carrega a descrição completa da sala (2 a 3 linhas) e não carrega
disponibilidade nem endereço. A informação que decide — "posso usar hoje?" e "dá
tempo de chegar?" — está ausente; a que não decide ocupa o maior bloco de texto.

A ação do card é um **ícone de seta** de 40px no canto. Não há botão "Reservar".
O alvo principal do produto é o menos evidente do card.

Há ainda dois links para o mesmo destino (foto e seta), o que faz o leitor de
tela anunciar o mesmo destino duas vezes.

**Página da sala** está próxima do alvo depois das últimas mudanças: galeria,
endereço, recursos e painel de reserva sticky. Falta disponibilidade real e
contador de hold.

**Painel** mostra métricas antes de pendências. Pendência custa dinheiro a cada
minuto; métrica informa. A ordem está invertida em relação ao definido em
[05 — Telas](05-telas.md#tela-7--dashboard-administrativo).

### 1.7. Seções do painel que não entregam o nome

| Seção | Problema |
| --- | --- |
| Calendário | Lista as mesmas reservas em tabela. Não há visão de calendário |
| Relatórios | Retorna vazio em modo `supabase` |
| Configurações | Retorna vazio em modo `supabase` |
| Limpeza | Lista solicitações, sem ação de atribuir ou concluir |
| Clientes | Lista perfis, sem histórico nem ficha |

### 1.8. Fluxo do cliente incompleto

Do fluxo pedido — Explorar → Detalhes → Disponibilidade → Horário → Reserva →
Pagamento → Confirmação → Acesso → Extensão:

| Etapa | Situação |
| --- | --- |
| Explorar | Parcial — filtros decorativos |
| Detalhes | Completa |
| **Disponibilidade** | **Ausente** |
| Horário | Falso — blocos fixos |
| Reserva | Completa |
| Pagamento | Completa em simulador; Mercado Pago não exercitado |
| Confirmação | Parcial — tela existe, credencial é fixa |
| Acesso | Parcial — dado existe no banco, não chega à tela |
| **Extensão** | **Ausente** |

### 1.9. O que está bem resolvido

Vale registrar para não ser desfeito na migração:

- **Cabeçalho com identidade e menu de conta** — recém-implementado, com foco,
  `Escape`, retorno de foco e papéis ARIA corretos.
- **Painel administrativo com criação e edição** por diálogo, com o formulário
  montado só quando abre.
- **Convite com papel** e regras de delegação aplicadas no banco.
- **Preço calculado no servidor** — a interface nunca multiplica.
- **Estrutura de rotas** enxuta e previsível.
- **Estados de erro do webhook e do worker** já modelados no backend, prontos
  para a interface consumir.

---

## 2. Arquitetura de navegação e fluxos

### 2.1. Mapa alvo

```
PÚBLICO
  /                       Catálogo (filtros reais: unidade · data · capacidade · recursos)
  /salas/[slug]           Detalhe + disponibilidade + reserva
  /entrar · /cadastro     Autenticação

CLIENTE (sessão)
  /minhas-reservas        Próxima reserva · credencial · histórico
  /minhas-reservas/[id]   NOVA — detalhe da reserva, credencial, extensão, recibo
  /conta                  Dados, segurança, sessões

OPERAÇÃO (employee+)
  /admin                  Pendências → agenda → métricas
  /admin/calendario       NOVA visão real de calendário
  /admin/reservas         Lista + ficha da reserva
  /admin/salas            CRUD (existe)
  /admin/unidades         CRUD (existe)
  /admin/fechaduras       CRUD (existe)
  /admin/clientes         Lista + convite (existe)
  /admin/pagamentos       Conciliação
  /admin/limpeza          Fila com ação
  /admin/relatorios       Ocupação e receita
  /admin/configuracoes    Políticas da empresa
```

**Uma rota nova no cliente**: `/minhas-reservas/[id]`. Hoje "Ver detalhes" não
tem destino, e a credencial disputa espaço com o histórico. A reserva merece
página própria — é para onde o e-mail de confirmação aponta, é onde a extensão
acontece, e é a tela aberta na frente da porta.

### 2.2. Fluxo de reserva alvo

```
Catálogo ──► Sala ──► Data (calendário com densidade)
                        │
                        └─► Horário (blocos com disponibilidade real)
                                │
                                ├─ sem sessão ─► /entrar ──┐
                                │                          │
                                └──────────────────────────┴─► Hold criado (10 min)
                                                                │
                                                       Resumo + contador
                                                                │
                                                        Pagamento (PIX | cartão)
                                                        │       │        │
                                                  recusado  processando  aprovado
                                                        │       │        │
                                                  retentar   aguarda   Confirmação
                                                                          │
                                                                    Credencial
                                                                    (5 min antes)
                                                                          │
                                                                     Extensão
```

Quatro regras, já em [03 — Padrões](03-padroes.md#reserva-o-fluxo-central):
login o mais tarde possível, hold visível desde que existe, voltar não perde a
seleção, preço vem do servidor.

### 2.3. Navegação

Mantém-se o modelo atual: cabeçalho persistente no cliente, sidebar no painel
com gaveta abaixo de 1024px. **Não** se introduz tab bar inferior.

Acrescenta-se **breadcrumb apenas em `/minhas-reservas/[id]`** e nas fichas do
painel, onde a profundidade passa de dois níveis.

---

## 3. Hierarquia e comportamento das telas

Especificação completa em [05 — Telas](05-telas.md). Aqui, apenas a diferença
em relação ao que está no ar.

### 3.1. Catálogo

**Hierarquia**: foto → nome e unidade → **horários livres hoje** → recursos →
preço → ação.

| Mudança | De | Para |
| --- | --- | --- |
| Filtro de unidade | Texto estático | `<select>` com as unidades ativas |
| Filtro de data | Sem efeito | Filtra por disponibilidade no dia |
| Contagem | Silenciosa | `aria-live="polite"` a cada mudança |
| Filtros ativos | Invisíveis | Chips removíveis + "Limpar" |
| Ação do card | Ícone de seta | Botão "Reservar" + card inteiro clicável |
| Descrição no card | 2–3 linhas | Removida; entra a linha de horários |
| Endereço | Ausente | Unidade + cidade |

### 3.2. Detalhe da sala

| Mudança | De | Para |
| --- | --- | --- |
| Data | `<input type="date">` com `min` amanhã | Availability Calendar, `min` hoje |
| Horários | 6 blocos fixos sempre livres | Time Slot Picker com estado real e motivo |
| Duração | Stepper 1–4h | Mantém, limitado pelo próximo bloco ocupado |
| Hold | Frase estática | Contador real após criar o hold |
| Recursos | Badges | Room Amenities com "+N" |

### 3.3. Checkout

Passa a ter **Stepper** (Horário → Dados → Pagamento → Confirmação) e
**Booking Summary** persistente com contador. O botão exibe o valor:
"Pagar R$ 180,00".

### 3.4. Minhas reservas

Divide-se em lista e ficha. A lista mostra Booking Status por reserva; a ficha
(`/minhas-reservas/[id]`) concentra credencial, extensão, recibo e cancelamento.

A credencial passa a ler `booking_access_codes` de verdade, com os cinco estados
definidos em [02 — Componentes](02-componentes.md#36-access-credential-card).

### 3.5. Painel

| Mudança | De | Para |
| --- | --- | --- |
| Ordem | Métricas → agenda | **Pendências** → agenda → métricas |
| Data | Texto fixo | Data real, no fuso da operação |
| Unidade | Seletor inerte | Filtro real, persistido na sessão |
| Gráfico | Array fixo | Ocupação real dos últimos 7 dias, ou removido |
| Calendário | Tabela de reservas | Grade semana/dia por sala |
| Limpeza | Lista | Fila com "Atribuir" e "Concluir" |
| Relatórios | Vazio | Ocupação, receita e cancelamento |
| Configurações | Vazio | Políticas: duração, hold, tolerância de acesso |

---

## 4. Estados

Padrões gerais em [03 — Padrões](03-padroes.md#4-padrões-de-feedback). Abaixo,
os estados por tela, incluindo os que hoje não existem.

### Catálogo

| Estado | Tratamento |
| --- | --- |
| Carregando | 6 skeletons na proporção da foto + 3 linhas |
| Vazio por filtro | Nomeia o filtro responsável e oferece afrouxá-lo |
| Vazio por unidade | "Esta unidade ainda não tem salas publicadas" |
| Erro | "Não conseguimos carregar o catálogo" + "Tentar de novo" |

### Disponibilidade

| Estado | Tratamento |
| --- | --- |
| Carregando | Blocos em skeleton, mesma grade — sem salto de layout |
| Dia sem horário | "Nada livre em 5 de setembro. O próximo é 6 de setembro às 09:00" com ação |
| Sala em manutenção | Painel substituído por alerta com data de retorno |
| Erro | Mantém a data e oferece recarregar apenas os horários |

### Pagamento

| Estado | Tratamento |
| --- | --- |
| Processando | Info + "Você pode fechar esta página" |
| Recusado | Erro com motivo traduzido, hold preservado, outro método |
| Hold expirado | Bloqueia o pagamento, leva à escolha de horário |
| Timeout (3 min) | Oferece acompanhar em "Minhas reservas" |

### Credencial

Cinco estados: indisponível (com o horário em que aparece), ativa, expirada,
revogada e **falha ao gerar** — este último com telefone do suporte.

### Extensão

Possível · sala ocupada depois · precisa de limpeza · reserva não iniciada ·
em processamento.

### Sucesso

Ação pontual → toast de 5s. Marco (reserva confirmada) → tela dedicada.

---

## 5. Comportamento responsivo

| Elemento | Mobile | Tablet | Desktop |
| --- | --- | --- | --- |
| Catálogo | 1 coluna | 2 colunas | 3 colunas |
| Filtros | Botão "Filtrar" → folha inferior | Barra em 2 linhas | Barra em linha única |
| Detalhe da sala | Empilhado + barra fixa com preço e ação | Empilhado, painel largo | 2 colunas, trilho sticky 400px |
| Time Slot Picker | 3 col · 48px | 4 col · 44px | 6 col · 44px |
| Checkout | 1 passo por tela, resumo colapsável | 2 colunas estreitas | 2 colunas |
| Credencial | Largura total, dígitos 38px | Idem | Cartão no trilho |
| Painel | Gaveta + cards no lugar da tabela | Gaveta + tabela | Sidebar fixa + tabela |
| Calendário do painel | Um dia por vez | 3 dias | Semana |

Regras que valem em toda parte: barra fixa soma `env(safe-area-inset-bottom)`;
tabela vira lista de cards no mobile, nunca rolagem horizontal; alvo mínimo de
44px, 48px no seletor de horário.

---

## 6. Manter, alterar, remover, criar

### Manter

`SiteHeader` e `UserMenu` · `AdminCreateDialog` e `AdminEditDialog` ·
`/conta` · fluxo de convite · `RoomGallery` · estrutura de rotas ·
cálculo de preço no servidor · `Button` e `Badge` (portados para tokens).

### Alterar

| Item | Mudança |
| --- | --- |
| `catalog-browser` | Filtros reais de unidade e data; chips; contagem anunciada |
| `room-card` | Disponibilidade e endereço entram; descrição sai; botão "Reservar" |
| `booking-flow` | Calendário e horários reais; contador de hold; `min` = hoje |
| `customer-bookings` | Credencial real; link para a ficha; status por reserva |
| `admin/page` | Pendências primeiro; data real; unidade funcional |
| `admin-sections` | Calendário, limpeza, relatórios e configurações com dados |
| `globals.css` | Tokens; remover `font-family: Arial` |
| Primitivos `ui/` | `Field`, `Dialog`, `Alert`, `Skeleton`, `EmptyState` |

### Remover

- ~~`/sentry-example-page` e `/api/sentry-example-api`~~ — removidas em
  05/09/2026, depois de o Sentry ser validado: source maps enviados no build e
  um erro real disparado da página chegou ao painel (6 envelopes, todos 200).
- Gravação em `localStorage` de `roomly:last-booking` — nada lê.
- Link duplicado no Room Card (foto e seta para o mesmo destino).
- Barra de progresso fixa em `72%` na credencial.
- Gráfico de barras fixo do painel, até existir dado real.

### Criar

**Backend**

- `GET /api/salas/[slug]/disponibilidade?data=` — blocos com estado e motivo.
- `GET /api/salas/[slug]/calendario?mes=` — densidade por dia.
- `GET /api/disponibilidade?data=&unidade=` — para o filtro do catálogo.
- Extensão: verificação e criação reusando o caminho de reserva.

**Componentes**

`AvailabilityCalendar` · `TimeSlotPicker` · `BookingSummary` ·
`BookingStatus` · `AccessCredentialCard` · `ExtendBooking` · `RoomAmenities` ·
`CleaningStatus` · `Stepper` · `Field` · `Alert` · `Skeleton` · `EmptyState`

**Rota**

`/minhas-reservas/[id]`

---

## 7. Problemas de UX, por prioridade

| # | Problema | Impacto | Esforço | Critério |
| --- | --- | --- | --- | --- |
| **P1** | Disponibilidade não existe na interface | Reserva falha depois do esforço; bloqueia 4 componentes | Alto | — |
| **P2** | Credencial de acesso é fixa no código | Cliente pode ir à porta com código errado | Médio | — |
| **P3** | Foco invisível sobre superfícies escuras | Teclado sem referência no painel e na credencial | Baixo | 1.4.11 |
| **P4** | Filtros decorativos no catálogo | Quebra a confiança na tela inteira | Médio | — |
| **P5** | Não é possível reservar hoje | Perde o caso de uso mais comum | Baixo | — |
| **P6** | Bordas de campo em 1,48:1 | Campo some sob luz forte | Baixo | 1.4.11 |
| **P7** | Três cinzas de texto abaixo de 4,5:1 | Leitura difícil em metadados | Baixo | 1.4.3 |
| **P8** | Sete páginas sem título próprio | Abas indistinguíveis no leitor de tela | Baixo | 2.4.2 |
| **P9** | Sem link "pular para o conteúdo" | Navegação repetitiva por teclado | Baixo | 2.4.1 |
| **P10** | `prefers-reduced-motion` ausente | Desconforto vestibular | Baixo | 2.3.3 |
| **P11** | Produto renderiza em Arial | Identidade não chega à tela | Trivial | — |
| **P12** | Room Card sem disponibilidade nem ação clara | Decisão exige entrar na sala | Médio | — |
| **P13** | Painel mostra métrica antes de pendência | Atraso operacional passa despercebido | Baixo | — |
| **P14** | Contagem de resultados não anunciada | Filtro sem retorno para leitor de tela | Baixo | 4.1.3 |
| **P15** | Sem extensão de reserva | Fluxo pedido não existe | Alto | — |
| **P16** | Erro "Dados inválidos" sem nomear o campo | Usuário adivinha | Baixo | 3.3.3 |
| **P17** | Calendário do painel não é calendário | Operação sem visão de ocupação | Médio | — |
| **P18** | Relatórios e Configurações vazios | Promessa não cumprida | Médio | — |

**Ordem recomendada**: P3, P6, P7, P8, P9, P10, P11 primeiro — sete correções de
esforço baixo que resolvem todas as falhas de WCAG mensuráveis e trocam a
tipografia do produto inteiro. Depois P1, que destrava P4, P5, P12 e P15.

---

## 8. Plano de implementação para o Prompt 09

Nove lotes. Cada um é verificável isoladamente e não depende do seguinte.

> **Situação**: os nove lotes foram executados, mais três de acabamento — escala
> tipográfica aplicada ao produto inteiro, primitivos de exibição de dados com
> tabela que vira lista no telefone, e toast com escolha de tema. O que ficou de
> fora está registrado como desvio consciente em
> [02 — Componentes](02-componentes.md), e a única pendência de infraestrutura é
> aplicar as migrações 0002 e 0003 no Supabase remoto.

### Lote 1 — Fundação visual e acessibilidade
*Resolve P3, P6, P7, P8, P9, P10, P11*

Importar tokens no `globals.css` e mapear em `@theme`; remover
`font-family: Arial`; anel de foco `navy-900`; bordas de controle em
`border-control`; colapsar os três cinzas em `text-secondary`; link "pular para
o conteúdo"; `metadata.title` nas sete páginas; bloco `prefers-reduced-motion`.

*Verificação*: os 16 testes de navegador seguem verdes; novo teste de foco
visível sobre o botão primário; novo teste de títulos por rota.

### Lote 2 — Primitivos sobre tokens
Reescrever `Button` (6 variantes) e `Badge` (tons semânticos); criar `Field`,
`Alert`, `Skeleton`, `EmptyState`, `Dialog`.

*Verificação*: nenhum hex literal nos primitivos.

### Lote 3 — API de disponibilidade
*Destrava P1*

Três endpoints de leitura, derivando estado dos `bookings` confirmados, das
janelas de limpeza e do expediente da sala. Cada bloco retorna estado **e
motivo**.

*Verificação*: teste de integração cobrindo bloco reservado, bloco em limpeza,
bloco passado e dia inteiro livre.

### Lote 4 — Componentes de disponibilidade
*Resolve P1, P5*

`AvailabilityCalendar` e `TimeSlotPicker` consumindo o lote 3; `min` = hoje com
blocos passados desabilitados; duração limitada pelo próximo bloco ocupado.

*Verificação*: Playwright — selecionar bloco ocupado é impossível; motivo
presente no `aria-label`.

### Lote 5 — Re-skin de verde para coral e navy
*Resolve P11 por completo*

24 arquivos, 40 ocorrências de `#176b4d` e 13 cinzas distintos, trocados por
tokens semânticos. Mecânico e de risco médio por tocar todas as telas.

*Verificação*: os 16 testes de navegador; varredura por hex literal fora de
`tokens.css`.

### Lote 6 — Reserva e checkout
*Resolve P12, P16*

Room Card com disponibilidade, endereço e botão; `Stepper`; `BookingSummary`
com contador real; erros nomeando o campo.

### Lote 7 — Acesso e extensão
*Resolve P2, P15*

`AccessCredentialCard` lendo `booking_access_codes` com os cinco estados;
`/minhas-reservas/[id]`; `ExtendBooking` reusando reserva e pagamento.

*Verificação*: cada estado da credencial renderizado em teste; extensão
recusada quando o bloco seguinte está ocupado.

### Lote 8 — Painel
*Resolve P13, P17, P18*

Pendências antes de métricas; data e unidade reais; calendário de verdade; fila
de limpeza com ação; relatórios de ocupação e receita; configurações de
políticas.

### Lote 9 — Tema escuro e limpeza final
Camada de tokens do tema escuro; remover `/sentry-example-page`, a gravação
órfã em `localStorage` e o gráfico fixo.

### Dependências

```
Lote 1 ──► Lote 2 ──► Lote 5 ──► Lote 6 ──► Lote 7
                │                   ▲
Lote 3 ──► Lote 4 ──────────────────┘
Lote 8 (independente, depois do 2)
Lote 9 (por último)
```

### Entrada para o Prompt 09

Ao acionar o Design-to-Code Translator, informe: o lote, os arquivos alvo
listados acima, os tokens de [01 — Fundamentos](01-fundamentos.md), as
especificações de [02 — Componentes](02-componentes.md), os estados de
[03 — Padrões](03-padroes.md) e as regras de código de
[07 — Implementação](07-implementacao.md). A stack é Next.js 16 App Router,
React 19, TypeScript e Tailwind 4, e a rede de segurança são os 66 testes
existentes.
