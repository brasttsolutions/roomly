# Evidências da execução do Plano de GCS

Cada evidência é anexada por pull request, como qualquer outro item de configuração. Nomes de arquivo em `kebab-case`.

| # | Critério | Arquivo esperado | Como gerar |
|---|---|---|---|
| 1 | Plano de GCS publicado no repositório | — | [`../PLANO_GCS.md`](../PLANO_GCS.md) na `main`. |
| 2 | Repositório acessível | — | Repositório público: <https://github.com/brasttsolutions/roomly>. |
| 3 | Recusa do push direto na `main` | `push-direto-recusado.txt` e `push-direto-recusado.png` | [`CONFIGURACAO_GITHUB.md`, passo 6](../CONFIGURACAO_GITHUB.md#6-gerar-a-evidência-da-recusa-do-push-direto). |
| 3 | Ruleset ativo | `ruleset-proteger-main.png` | Captura de *Settings → Rules → Rulesets → proteger-main*. |
| 4 | Par de revisão com escrita | `colaborador-revisor.png` e link do PR aprovado pelo par | Captura de *Settings → Collaborators* mostrando o papel **Write**. |
| 5 | Environments | `environments.png`, `environment-production.png` | Captura de *Settings → Environments* e da tela do `production` com o revisor obrigatório. |
| 5 | Aprovação de produção | `deploy-aguardando-aprovacao.png` | Captura do run de `deploy` em *Waiting for review* após a tag `v0.1.0`. |

## Registro

| Data | Evidência | Arquivo |
|---|---|---|
| 16/11/2026 | Branch padrão renomeada de `master` para `main` | — |
| 16/11/2026 | Ruleset `proteger-main` ativo, sem bypass, alvo `main` | `ruleset-proteger-main.png` |
| 16/11/2026 | Ruleset `proteger-baselines` ativo para tags `v*` | `ruleset-proteger-baselines.png` |
| 16/11/2026 | Convite de colaborador (Write) enviado a `@gabrieldsantana28` | `colaborador-revisor-convite.png` |
| 16/11/2026 | Environment `staging` restrito a `main` e `v*` | `environment-staging.png` |
| 16/11/2026 | Environment `production` com revisor obrigatório `@brasttsolutions`, sem bypass, restrito a `v*` | `environment-production.png` |
