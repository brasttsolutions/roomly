# Roomly

MVP da plataforma multi-tenant de reservas descrita em `Cowork Booking Platform (roomly).md`.

## Execução local

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`. Sem variáveis de ambiente, a aplicação usa simuladores determinísticos e não envia dados a provedores externos.

## Verificação

```bash
npm run verify
```

O comando executa ESLint, TypeScript, Vitest, build de produção e Playwright em desktop e mobile. Os testes PostgreSQL exigem Docker:

```bash
npx supabase start
npx supabase db reset --local
npm run test:db
```

## Modos

- `ROOMLY_INTEGRATION_MODE=simulator`: catálogo, identidade e reservas efêmeros para desenvolvimento.
- `ROOMLY_INTEGRATION_MODE=supabase`: Auth, tenant, catálogo, reservas, pagamentos, jobs e administração persistidos.
- `ROOMLY_PAYMENT_MODE=simulator|mercado_pago`: adaptador de cobrança explicitamente selecionado.
- `ROOMLY_ACCESS_MODE=simulator|ttlock`: o simulador é proibido em produção com Supabase; TTLock permanece bloqueado até a POC física.

Copie os nomes de `.env.example` para o gerenciador de segredos do ambiente. Nunca exponha `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, credenciais TTLock ou tokens dos provedores ao navegador.

## Superfícies

- `/`: catálogo e filtros.
- `/salas/[slug]`: disponibilidade, checkout PIX/cartão e confirmação.
- `/entrar`, `/cadastro`: autenticação e cadastro por convite.
- `/minhas-reservas`: próximas reservas, acesso, histórico e cancelamento.
- `/admin`: operação multi-tenant, cadastros, pagamentos, limpeza e auditoria.
- `/api/bookings`: criação idempotente com preço calculado no servidor e no banco.
- `/api/webhooks/mercado-pago`: assinatura, consulta ao provedor e deduplicação.
- `/api/internal/jobs/run`: consumo de jobs duráveis, protegido por `CRON_SECRET`.
- `/api/health`, `/api/ready`: liveness e readiness.

## Operação

A migration em `supabase/migrations/0001_roomly_foundation.sql` contém RLS, FKs multi-tenant, exclusão temporal GiST, RPCs transacionais, rate limit distribuído e fila durável. A CI está em `.github/workflows/verify.yml`; o container de produção está em `Dockerfile`.

Leia [arquitetura](docs/ARCHITECTURE.md), [operação](docs/OPERATIONS.md), [verificação](docs/VERIFICATION.md) e [POC TTLock](docs/TTLOCK_POC.md).
