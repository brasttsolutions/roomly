# Operação

## Inicialização

1. Configure as variáveis de `.env.example` no cofre de segredos.
2. Aplique `supabase/migrations/0001_roomly_foundation.sql` em um projeto isolado.
3. Execute `supabase/seed.sql` somente em desenvolvimento.
4. Rode `npm run verify` e `npm run test:db`.
5. Publique a imagem do `Dockerfile` e espere `/api/ready` retornar 200.

## Worker

Configure um agendador para chamar a cada minuto:

```bash
curl -X POST https://roomly.example.com/api/internal/jobs/run \
  -H "Authorization: Bearer $CRON_SECRET"
```

Jobs usam lease de dois minutos, `FOR UPDATE SKIP LOCKED`, backoff exponencial e no máximo oito tentativas. Erros de configuração ou entidade ausente vão para `manual_review`. Monitore `durable_jobs` por `pending`, `processing` vencido e `manual_review`.

## Incidentes

- Pagamento aprovado sem confirmação: consulte `payment_events`, `payments`, `bookings` e o request ID; não confirme manualmente sem comparar valor e ID no Mercado Pago.
- Acesso não provisionado: impeça entrada automática, mova o job para revisão e siga o procedimento presencial definido após a POC.
- Revogação falhou: trate como incidente crítico de segurança física e valide a fechadura localmente.
- n8n ou Resend indisponível: preserve o job para retry; não recrie a reserva ou cobrança.
- Lease vencido: outro worker pode reclamar o job; todos os efeitos externos devem manter a chave idempotente.

## Recuperação

Backups e restauração precisam ser testados em staging antes do primeiro cliente. O exercício deve medir RPO/RTO e verificar empresas, reservas, pagamentos, eventos, acessos, jobs e auditoria. Registre a evidência em `docs/VERIFICATION.md`.
