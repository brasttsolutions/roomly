# Arquitetura Roomly

## Forma

O MVP é um monólito modular Next.js com PostgreSQL. Reserva e pagamento permanecem no mesmo limite transacional. Acesso, notificações, limpeza e reembolsos são efeitos externos executados por jobs duráveis.

```text
Next.js routes and actions
          |
          v
reservations + tenancy + catalog
          |
          +---- PostgreSQL transaction
          |
          +---- durable_jobs
                    |
                    +---- access
                    +---- notifications
                    +---- cleaning
```

## Invariantes

- Todo dado operacional pertence a `company_id`.
- FKs compostas impedem referências entre empresas.
- RLS aplica posse do cliente ou função administrativa.
- O intervalo de reserva é `[start_at, end_at)` em UTC.
- A exclusão GiST no banco é a autoridade para conflitos.
- Webhooks, comandos e jobs possuem chaves de deduplicação.
- Um timeout da TTLock nunca dispara nova criação às cegas. Primeiro ocorre reconciliação.
- Códigos reais devem ser cifrados; logs armazenam somente identificadores e fingerprints.

## Execução local

O modo padrão usa dados de demonstração e adaptadores em `src/integrations/simulators.ts`. Os handlers mantêm estado efêmero somente nesse modo. `ROOMLY_INTEGRATION_MODE=supabase` troca identidade, catálogo, reservas e administração pelos repositórios persistentes sem fallback silencioso.

## Produção

1. Supabase Auth fornece a identidade; o backend deriva o tenant da associação autenticada.
2. `create_booking_hold` expira holds antigos e tenta a inserção transacional.
3. O webhook validado confirma pagamento e reserva, grava auditoria e enfileira jobs no mesmo commit.
4. `/api/internal/jobs/run` usa `FOR UPDATE SKIP LOCKED`, lease, backoff e limite de tentativas para consumir `durable_jobs`.
5. Integrações ambíguas passam por `integration_operations` até sucesso ou revisão manual.

O hold agenda sua própria expiração. A aprovação agenda provisão/revogação de acesso, conclusão, e-mail e limpeza. O cancelamento agenda revogação e reembolso. Resend e n8n recebem chaves idempotentes; o payload n8n é assinado com HMAC.

## Segurança operacional

- O backend deriva usuário, perfil e empresa da sessão Supabase.
- Preço e duração são validados novamente na RPC transacional.
- O rate limit de reserva é atômico no banco em modo Supabase.
- Funções privilegiadas de webhook e worker são concedidas somente a `service_role`.
- `/api/internal/jobs/run` compara `Authorization: Bearer <CRON_SECRET>` em tempo constante.
- Logs estruturados removem campos com senha, token, segredo, cartão ou código.
- Readiness falha quando dependências do modo real estão ausentes.

## Gates externos

- PostgreSQL real precisa executar os testes de corrida e RLS.
- O sandbox Mercado Pago precisa validar assinatura, consulta e reembolso vigentes.
- A POC TTLock precisa validar timeout, expiração offline e revogação.
- Staging precisa de Sentry, alertas, backup e restauração exercitada.
