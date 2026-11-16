## O que muda

<!-- Uma ou duas frases. -->

Closes #

## Itens de configuração afetados

<!-- Marque os ICs tocados (docs/gcs/PLANO_GCS.md, seção 3.1). -->

- [ ] IC-01 Código-fonte (`src/`)
- [ ] IC-02 Migrations (`supabase/migrations/`)
- [ ] IC-04 Testes
- [ ] IC-05 / IC-06 Build e contêiner
- [ ] IC-07 Workflows
- [ ] IC-09 `.env.example`
- [ ] IC-13 / IC-14 Documentação
- [ ] IC-17 Plano de GCS
- [ ] Outro:

## Como foi verificado

- [ ] `npm run verify` passou localmente
- [ ] Testes de banco (`npm run test:db`) quando há migration
- [ ] Testado manualmente:

## Checklist do revisor

- [ ] A mudança corresponde ao que a issue pede
- [ ] Testes cobrem o comportamento novo ou corrigido
- [ ] Nenhum segredo, token ou `.env` no diff
- [ ] Migrations novas, nenhuma migration antiga editada
- [ ] `CHANGELOG.md` atualizado na seção *Não lançado* quando o comportamento muda
