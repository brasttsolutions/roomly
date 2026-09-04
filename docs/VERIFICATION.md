# Verificação

Última execução local: 2026-09-04.

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

## PostgreSQL real (2026-09-04)

Executado com o stack local do Supabase CLI sobre Docker, migration e seed aplicados por `npx supabase db reset --local`.

| Camada                     | Resultado                    | Comando ou evidência                    |
| -------------------------- | ---------------------------- | --------------------------------------- |
| pgTAP                      | 20 testes em 2 arquivos      | `npm run test:db`                       |
| Isolamento entre inquilinos | 8 asserções                  | `supabase/tests/rls_tenant_isolation.sql` |
| Cadeia reserva → pagamento | exercitada via RPC e via HTTP | `create_booking_hold`, `process_payment_event` |
| Aplicação em modo supabase | login, catálogo e reserva reais | `next dev` apontado ao Supabase local |

Provas obtidas contra o banco real:

- preço calculado no banco (90 min de sala de R$120/h resultaram em 18000 centavos), ignorando qualquer valor vindo do cliente;
- reserva concorrente sobreposta recusada pelo índice GiST com `23P01`, e intervalo adjacente aceito;
- webhook com assinatura inválida recusado com 401; evento válido confirmou a reserva; reenvio do mesmo evento retornou `duplicate`; valor divergente foi para `manual_review`;
- confirmação enfileirou `access.provision`, `notification.send`, `booking.complete` e `access.revoke` com os horários corretos;
- worker protegido por `CRON_SECRET` (401 sem cabeçalho) provisionou o código de acesso com janela 16:55–18:05 para uma reserva de 17:00–18:00, gravando apenas a impressão mascarada;
- `notification.send` falhou com `resend_not_configured` e voltou para retry, comprovando o backoff em vez de perda silenciosa;
- cliente da empresa B não enxergou reservas, pagamentos, auditoria, fechaduras nem o cadastro da empresa A, enquanto o catálogo público permaneceu legível.

## Supabase remoto (2026-09-04)

Projeto `sa-east-1`, PostgreSQL 17.6, com a migration já aplicada. Foi criado o inquilino de
demonstração `Ágora Coworking (demonstração)` ao lado do inquilino real existente, para exercitar o
fluxo sem misturar dados. O login `demo@roomly.test` é descartável e deve ser removido antes de produção.

- catálogo, unidades, fechaduras e características servidos pelo projeto remoto;
- autenticação real do Supabase Auth e reserva persistida pelo navegador;
- webhook assinado confirmou a reserva; assinatura inválida retornou 401; reenvio retornou `duplicate`;
- worker protegido provisionou o código de acesso (16:55–18:05 para reserva de 17:00–18:00) e deixou
  `notification.send` em retry com `resend_not_configured`;
- sessão real do cliente de demonstração enxergou apenas a própria empresa, o próprio perfil e a
  própria reserva; fechaduras e auditoria retornaram vazio, e o inquilino existente permaneceu invisível.

## Gates externos

Ainda exigem intervenção externa:

- validar PIX/cartão, assinatura e reembolso no sandbox Mercado Pago;
- validar criação, expiração, revogação e comportamento offline na fechadura física;
- configurar Resend, n8n e Sentry e exercitar os jobs em staging;
- testar backup/restauração, alertas e deploy do container.

A CI prepara os gates de aplicação e banco assim que o repositório for publicado em um remote compatível com GitHub Actions.
