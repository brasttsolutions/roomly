# Verificação

Última execução local: 2026-09-01.

## Evidência executada

| Camada                | Resultado                      | Comando ou evidência |
| --------------------- | ------------------------------ | -------------------- |
| ESLint                | passou                         | `npm run lint`       |
| TypeScript            | passou                         | `npm run typecheck`  |
| Domínio e integrações | 35 testes                      | `npm test`           |
| Build Next.js         | 22 páginas                     | `npm run build`      |
| Browser de produção   | 10 testes desktop/mobile       | `npm run test:e2e`   |
| Segurança HTTP        | worker sem segredo retorna 401 | `e2e/roomly.spec.ts` |
| Dependências          | 0 vulnerabilidades             | `npm audit`          |

O Playwright sobe `node .next/standalone/server.js` na porta 3100 e verifica catálogo, imagens, checkout, cancelamento, administração responsiva e autenticação da rota interna.

## Casos cobertos

- conflito de intervalo, intervalo adjacente, hold expirado e preço calculado no servidor;
- idempotência da reserva, cobrança, webhook, jobs, e-mail e notificação n8n;
- assinatura de webhook Mercado Pago e HMAC da automação de limpeza;
- pagamento após expiração, cancelamento, reembolso e estados de revisão manual;
- TTLock offline, timeout ambíguo, reconciliação e falha de revogação no domínio/simulador;
- janela de acesso, limpeza sem intervalo e revogação visual no fluxo do cliente;
- RLS, posse de perfil, funções restritas e rate limit distribuído verificados estaticamente na migration.

## Gates externos

Este computador não possui Docker, credenciais de provedores, projeto Supabase remoto, remote Git ou hardware TTLock. Portanto ainda exigem intervenção externa:

- executar migration, pgTAP e testes concorrentes em PostgreSQL/Supabase real;
- validar PIX/cartão, assinatura e reembolso no sandbox Mercado Pago;
- validar criação, expiração, revogação e comportamento offline na fechadura física;
- configurar Resend, n8n e Sentry e exercitar os jobs em staging;
- testar backup/restauração, alertas e deploy do container.

A CI prepara os gates de aplicação e banco assim que o repositório for publicado em um remote compatível com GitHub Actions.
