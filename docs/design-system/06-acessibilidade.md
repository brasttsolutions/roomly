# 06 — Auditoria de acessibilidade

Auditoria do Roomly **como ele está hoje**, contra a WCAG 2.2 nível AA. Os
contrastes foram medidos sobre as cores realmente presentes no código, não
estimados.

**Resultado**: 6 falhas de contraste em 13 pares em uso, mais 4 violações
estruturais. Nenhuma é impeditiva de uso, mas duas afetam diretamente quem
navega por teclado ou tem baixa visão.

---

## 1. Perceptível

### 1.1. Contraste medido no produto atual

| Par em uso | Razão | Mínimo | Situação |
| --- | --- | --- | --- |
| Tinta `#17211d` sobre canvas | 15,08:1 | 4,5 | Passa |
| Apoio `#66736d` sobre branco | 4,96:1 | 4,5 | Passa |
| Apoio `#66736d` sobre canvas | 4,53:1 | 4,5 | Passa, por 0,03 |
| Texto `#53605a` sobre branco | 6,59:1 | 4,5 | Passa |
| Branco sobre verde `#176b4d` | 6,47:1 | 4,5 | Passa |
| Erro `#a84331` sobre branco | 5,98:1 | 4,5 | Passa |
| Foco `#286c9f` sobre branco | 5,62:1 | 3 | Passa |
| **Texto `#7a857f` sobre branco** | **3,83:1** | 4,5 | **Falha** |
| **Texto `#75817b` sobre branco** | **4,05:1** | 4,5 | **Falha** |
| **Texto `#78837e` sobre branco** | **3,93:1** | 4,5 | **Falha** |
| **Borda de campo `#cfd6d1`** | **1,48:1** | 3 | **Falha** |
| **Borda de card `#d9ded9`** | **1,36:1** | 3 | **Falha** |
| Foco `#286c9f` sobre o canvas | 5,13:1 | 3 | Passa |
| **Foco `#286c9f` sobre superfície escura** | **2,94:1** | 3 | **Falha** |

**Correção de uma medição anterior.** Uma versão inicial desta auditoria
comparou o anel de foco com o preenchimento do botão primário e concluiu falha
grave. Estava errado: o anel é desenhado com `outline-offset`, ou seja **fora**
do elemento, e nunca encosta no preenchimento. Contra o fundo adjacente real, o
anel azul media 5,62:1 no branco e 5,13:1 no canvas — passava.

**A falha real está nas superfícies escuras**: o painel do código de acesso
(`#17211d`) e a sidebar do `/admin`. Ali o anel azul mede 2,94:1 e 2,77:1,
abaixo dos 3:1 de 1.4.11.

*Como o sistema resolve*: anel de **dois tons** — traço `navy-900` com halo
branco de 2px. Em fundo claro quem carrega é o navy (14,55:1); em fundo escuro,
onde navy sobre navy sumiria, quem carrega é o branco (16,51:1). Um anel de cor
única falha em uma das duas superfícies, qualquer que seja a cor escolhida.

Os três textos reprovados (`#7a857f`, `#75817b`, `#78837e`) são o mesmo papel —
metadado e rótulo secundário — resolvido três vezes com valores ligeiramente
diferentes. O sistema colapsa os três em `text-secondary` (`#5A6480`, 5,88:1).

As bordas de `#cfd6d1` em campos de formulário violam 1.4.11: a borda é o que
identifica onde o campo começa. Em monitor com brilho baixo ou sob luz direta,
o campo simplesmente desaparece. O sistema exige `border-control` (`#828DAB`,
3,31:1) em qualquer controle interativo, e mantém as bordas claras apenas para
divisores decorativos, o que é permitido.

| Critério | Situação |
| --- | --- |
| 1.1.1 Conteúdo não textual | **Passa** — fotos de sala têm `alt` com o nome; ícones decorativos vêm de `lucide` sem texto acessível redundante |
| 1.3.1 Informação e relações | Passa parcialmente — tabelas do `/admin` usam `<th>` sem `scope` |
| 1.4.1 Uso da cor | **Falha** — badges de status no `/admin` distinguem-se por cor e texto, mas o calendário de ocupação planejado precisa de padrão além da cor |
| 1.4.3 Contraste mínimo | **Falha** — 3 pares de texto |
| 1.4.4 Redimensionar texto | Passa — layout reflui até 200% |
| 1.4.10 Reflow | Passa — `min-width: 320px` declarado |
| 1.4.11 Contraste não textual | **Falha** — bordas e foco |
| 1.4.12 Espaçamento de texto | Passa |

---

## 2. Operável

| Critério | Situação |
| --- | --- |
| 2.1.1 Teclado | Passa — não há controle exclusivo de mouse |
| 2.1.2 Sem armadilha | Passa — o único diálogo usa `<dialog>` nativo |
| 2.4.1 Ignorar blocos | **Falha** — não existe link "Pular para o conteúdo" |
| 2.4.2 Título da página | **Falha** — 7 das 9 páginas não definem `metadata`, herdando o título padrão |
| 2.4.3 Ordem de foco | Passa |
| 2.4.4 Finalidade do link | Passa |
| 2.4.7 Foco visível | Passa em geral, **falha sobre o botão primário** |
| 2.4.11 Foco não obscurecido | **Falha** — mesma causa |
| 2.5.3 Rótulo no nome | Passa |
| 2.5.7 Movimentos de arrastar | Passa — não há funcionalidade só por arraste |
| 2.5.8 Tamanho do alvo | Passa — controles em 44px; **atenção**: o seletor de horário precisa manter 48px no mobile |
| 2.3.3 Animação por interação | **Falha** — `prefers-reduced-motion` não está implementado |

**2.4.1 e 2.4.2** são de correção trivial e alto impacto. Sem título distinto,
quem usa leitor de tela e mantém várias abas abertas não distingue "Minhas
reservas" de "Checkout" — as duas anunciam "roomly | Salas no seu tempo".

---

## 3. Compreensível

| Critério | Situação |
| --- | --- |
| 3.1.1 Idioma da página | Passa — `lang="pt-BR"` |
| 3.2.3 Navegação consistente | Passa |
| 3.2.4 Identificação consistente | Passa parcialmente — "Salvar" e "Confirmar" coexistem para a mesma ação |
| 3.3.1 Identificação de erro | Passa — erros de formulário são textuais |
| 3.3.2 Rótulos ou instruções | Passa — rótulos sempre visíveis |
| 3.3.3 Sugestão de erro | Passa parcialmente — "Dados inválidos" não diz **qual** campo |
| 3.3.4 Prevenção de erro | Passa — cancelamento pede confirmação |
| 3.3.7 Entrada redundante | Passa |
| 3.3.8 Autenticação acessível | Passa — sem CAPTCHA nem teste cognitivo |

**3.3.3 merece atenção**: a mensagem "Dados inválidos." aparecia no checkout
quando a data caía no passado. Um erro que não nomeia o campo obriga o usuário a
adivinhar. O sistema exige que toda mensagem de erro cite o campo e o que se
espera dele.

**Nível de leitura.** Os textos devem ficar em nível fundamental. Termos a
evitar na interface: "hold", "idempotência", "webhook", "provisionar",
"credencial" (prefira "código de acesso"), "tenant" (prefira "empresa").

**Limite de tempo (2.2.1).** O hold de 10 minutos é um limite de tempo real, com
consequência financeira. A WCAG exige que o usuário possa estender, ajustar ou
ser avisado. O sistema atende **avisando com antecedência**: o contador é
visível desde o início, muda de cor aos 5 e aos 2 minutos, e expirado oferece
retomada com um clique. É a exceção legítima da regra — o limite é essencial à
atividade, já que segurar uma sala indefinidamente impede outros de reservá-la.

---

## 4. Robusto

| Critério | Situação |
| --- | --- |
| 4.1.2 Nome, papel, valor | Passa — menu da conta usa `aria-haspopup`, `aria-expanded`, `role="menu"` |
| 4.1.3 Mensagens de status | **Falha parcial** — a contagem "12 salas encontradas" não é anunciada |

---

## 5. Correções prioritárias

| # | Correção | Critério | Esforço | Impacto |
| --- | --- | --- | --- | --- |
| 1 | Anel de foco `navy-900` em todas as superfícies | 2.4.7 · 2.4.11 · 1.4.11 | Baixo | **Alto** |
| 2 | Bordas de controle em `border-control` | 1.4.11 | Baixo | Alto |
| 3 | Colapsar 3 cinzas em `text-secondary` | 1.4.3 | Baixo | Alto |
| 4 | Link "Pular para o conteúdo" | 2.4.1 | Baixo | Médio |
| 5 | `metadata.title` nas 7 páginas restantes | 2.4.2 | Baixo | Médio |
| 6 | Bloco `prefers-reduced-motion` global | 2.3.3 | Baixo | Médio |
| 7 | `aria-live` na contagem de resultados | 4.1.3 | Baixo | Médio |
| 8 | `scope` nos `<th>` das tabelas | 1.3.1 | Baixo | Médio |
| 9 | Erros nomeando o campo | 3.3.3 | Médio | Médio |
| 10 | Padrão além da cor no calendário de ocupação | 1.4.1 | Médio | Médio |

As sete primeiras somam pouco código e resolvem todas as falhas de nível AA
mensuráveis. Estão no plano de [07 — Implementação](07-implementacao.md).

---

## 6. Navegação por leitor de tela

**Página da sala, fluxo esperado (NVDA/VoiceOver)**

```
"Link, pular para o conteúdo"
"Banner. Link, roomly, página inicial"
"Navegação principal. Link, minhas reservas. Botão, conta, Marina Costa, menu"
"Principal. Link, todas as salas"
"Imagem, Sala Executiva"
"Lista, fotos de Sala Executiva, 3 itens"
"Cabeçalho nível 1, Sala Executiva"
"Ágora Tech Park, 2º andar. Perini Business Park, Joinville, SC"
"Até 8 pessoas"
"Cabeçalho nível 2, o que você encontra. Lista, 4 itens: TV 65 polegadas…"
"Cabeçalho nível 2, escolha seu horário"
"Data da reserva, campo de data, 5 de setembro de 2026"
"Grupo, horários disponíveis"
"Botão, 11:00, disponível"
"Botão, 14:00, indisponível, reservado"        ← o motivo vem junto
"Botão, 15:00, disponível, selecionado"
"Total, 180 reais"
"Botão, reservar"
```

O ponto crítico é o bloco indisponível anunciar **por que**. Sem isso, o usuário
tenta repetidamente o mesmo horário sem entender a recusa.

**Confirmação com credencial**

```
"Cabeçalho nível 1, tudo certo para quinta-feira"
"Status, reserva confirmada"
"Sala Executiva. Quinta, 5 de setembro. 14:00 às 15:30"
"Região, código de acesso"
"Código de acesso: 5 8 3 9 2 1"                ← dígito a dígito
"Válido das 13:55 às 15:35"
"Botão, copiar código"
```

---

## 7. Checklist de QA

**Teclado** — percorra a reserva inteira sem mouse: `Tab` alcança tudo na ordem
visual; o foco é visível em toda parada, inclusive sobre o botão coral; `Escape`
fecha diálogos e devolve o foco; nenhuma armadilha.

**Zoom** — 200% sem rolagem horizontal; 400% com reflow em uma coluna; texto a
200% pelo ajuste do navegador sem corte.

**Leitor de tela** — títulos únicos por página; hierarquia de cabeçalhos sem
salto; formulários com rótulo associado; erros anunciados; contagem de
resultados anunciada; código de acesso soletrado.

**Cor e movimento** — em escala de cinza, todos os estados continuam
distinguíveis; com `prefers-reduced-motion`, nada anima; sem piscar acima de 3Hz.

**Toque** — alvos de 44px com 8px de folga; nada essencial atrás de gesto;
funciona em retrato e paisagem.

---

## 8. Declaração de acessibilidade (modelo)

> **Compromisso.** O Roomly busca conformidade com a WCAG 2.2 nível AA.
>
> **Situação.** Parcialmente conforme. As não conformidades conhecidas estão
> listadas abaixo, com previsão de correção.
>
> **Conhecidas.** [listar as pendentes com data prevista]
>
> **Avaliação.** Autoavaliação por inspeção de código e verificação
> programática de contraste, complementada por testes de navegador em desktop e
> mobile. Última revisão: [data].
>
> **Retorno.** Encontrou uma barreira? Escreva para acessibilidade@roomly.com.br.
> Respondemos em até 5 dias úteis.

---

## 9. Como isso não regride

Os 21 contrastes obrigatórios do sistema são verificados por
`src/lib/design-tokens.test.ts` e pelo gerador `scripts/build-tokens.mjs`, que
**falha** se algum par cair abaixo do alvo. Acessibilidade de cor, aqui, quebra
o build — não fica dependendo de alguém lembrar de conferir.
