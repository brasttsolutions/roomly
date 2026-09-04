# Roomly Design System

Sistema de design do Roomly — plataforma de reserva e gestão de salas de reunião
e coworking.

| Documento | Conteúdo |
| --- | --- |
| [01 — Fundamentos](01-fundamentos.md) | Cor, tipografia, grid, espaçamento, elevação, movimento |
| [02 — Componentes](02-componentes.md) | 34 componentes com anatomia, estados, acessibilidade e medidas |
| [03 — Padrões](03-padroes.md) | Templates de página, fluxos e os estados críticos do produto |
| [04 — Marca](04-marca.md) | Estratégia, personalidade, voz e aplicação |
| [05 — Telas](05-telas.md) | Especificação das telas prioritárias, cliente e administração |
| [06 — Acessibilidade](06-acessibilidade.md) | Auditoria WCAG 2.2 AA do produto atual |
| [07 — Implementação](07-implementacao.md) | Guia para desenvolvedores e plano de migração |
| [08 — UX: auditoria e plano](08-ux-auditoria-e-plano.md) | Diferença entre o produto atual e o alvo, em 9 lotes |

## Os três princípios

**1. O horário é o produto.** Reservar uma sala é escolher um bloco de tempo. A
disponibilidade nunca é escondida atrás de um clique: aparece no card, na página
da sala e no seletor. Quando um horário não pode ser reservado, a interface diz
**por quê** — ocupado, em limpeza, fora do expediente, curto demais — e não
apenas que "não está disponível".

**2. Dinheiro e porta exigem certeza.** Toda ação que cobra ou libera acesso
físico mostra antes o que vai acontecer, e depois o que aconteceu. Nada de
otimismo de interface: o botão só vira "pago" quando o pagamento foi confirmado
pelo provedor, e o código de acesso só aparece quando existe de verdade na
fechadura. Estado ambíguo é comunicado como ambíguo.

**3. Silêncio é a meta.** O produto foi feito para desaparecer: quem reserva às
14h quer entrar às 14h. Cada elemento na tela precisa justificar sua presença.
Se um dado não muda a decisão de reservar, ele não vai para o card — vai para os
detalhes.

## Como decidir uma cor, rápido

```
É texto?            → text-primary (títulos, corpo) ou text-secondary (apoio)
É a ação principal? → action-primary, sempre com rótulo navy
É destrutivo?       → danger-action com rótulo branco
É um estado?        → success | warning | danger | info + o seu par de superfície
É estrutura?        → border-subtle (decorativo) ou border-control (interativo)
```

Nunca escreva um hex em componente. Use os tokens semânticos de
[`src/styles/tokens.css`](../../src/styles/tokens.css).

## Fonte da verdade

Os valores vivem em [`scripts/design-tokens.mjs`](../../scripts/design-tokens.mjs).
Tudo o mais é gerado:

```bash
node scripts/build-tokens.mjs   # gera design-tokens.json e src/styles/tokens.css
npm test                        # 27 asserções, entre elas os 21 contrastes obrigatórios
```

O gerador **falha** se qualquer par obrigatório cair abaixo do alvo WCAG. Isso é
intencional: a acessibilidade do sistema é um teste que quebra o build, não uma
recomendação em documento.
