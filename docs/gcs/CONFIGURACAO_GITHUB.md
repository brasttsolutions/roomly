# Configuração do GitHub para a GCS

As regras de branch, os colaboradores e os environments **não ficam no Git**: vivem nas configurações do repositório. Este documento é o item de configuração que as descreve (IC-17). Se uma configuração mudar no GitHub, este arquivo muda junto, por PR.

Todos os passos são feitos por quem tem papel **Admin** no repositório (`@brasttsolutions`), em <https://github.com/brasttsolutions/roomly/settings>.

| Passo | Atende ao critério |
|---|---|
| 1. Renomear `master` para `main` | 3 |
| 2. Convidar o revisor par com escrita | 4 |
| 3. Ruleset `proteger-main` | 3 |
| 4. Ruleset `proteger-baselines` | Plano, seção 5 |
| 5. Environments `staging` e `production` | 5 |
| 6. Evidência da recusa do push direto | 3 |
| 7. Primeira baseline `v0.1.0` | 1 e 5 |

---

## 1. Renomear a branch padrão para `main`

1. *Settings → General → Default branch* → ícone de lápis ao lado de `master`.
2. Digite `main` e confirme em **Rename branch**. O GitHub redireciona links antigos e redireciona os PRs abertos.
3. Em cada clone local:
   ```bash
   git branch -m master main
   git fetch origin
   git branch -u origin/main main
   git remote set-head origin -a
   ```
4. No Railway, troque a branch de origem do serviço de `master` para `main` (*Service → Settings → Source*). Para que só a promoção pelos environments publique, desligue ali o deploy automático a partir do GitHub ou ative a espera pelo CI.

## 2. Convidar o revisor par (permissão de escrita)

1. *Settings → Collaborators → Add people*.
2. Busque o usuário do par, `gabrieldsantana28`, e envie o convite. Em repositório de conta pessoal, todo colaborador recebe **Write**.
3. O par aceita o convite pelo e-mail ou em <https://github.com/notifications>.
4. O par já está registrado em `.github/CODEOWNERS` e em `docs/gcs/PLANO_GCS.md` (seção 2.1).
5. Evidência: captura da lista de colaboradores mostrando o papel → `evidencias/colaborador-revisor.png`.

## 3. Ruleset `proteger-main` (recusa do push direto)

*Settings → Rules → Rulesets → New ruleset → New branch ruleset*

| Campo | Valor |
|---|---|
| Ruleset name | `proteger-main` |
| Enforcement status | **Active** |
| Bypass list | **vazia** — nem o dono pode contornar |
| Target branches | *Add target → Include default branch* |
| Restrict deletions | ✅ |
| Block force pushes | ✅ |
| Require a pull request before merging | ✅ |
| ↳ Required approvals | `1` |
| ↳ Dismiss stale pull request approvals when new commits are pushed | ✅ |
| ↳ Require review from Code Owners | ✅ |
| ↳ Require conversation resolution before merging | ✅ |
| ↳ Allowed merge methods | Squash |
| Require status checks to pass | ✅ — adicionar `application` e `database` (jobs do workflow `verify`) |

Salve em **Create**. Evidência: captura da tela do ruleset → `evidencias/ruleset-proteger-main.png`.

> Se o workflow `verify` ainda não tiver rodado com a branch `main`, os nomes `application` e `database` podem não aparecer na busca. Digite-os mesmo assim, ou ative esta opção depois que o primeiro PR mostrar os dois checks.

## 4. Ruleset `proteger-baselines` (tags imutáveis)

*Settings → Rules → Rulesets → New ruleset → New tag ruleset*

| Campo | Valor |
|---|---|
| Ruleset name | `proteger-baselines` |
| Enforcement status | **Active** |
| Target tags | *Include by pattern* → `v*` |
| Restrict updates | ✅ |
| Restrict deletions | ✅ |

## 5. Environments `staging` e `production`

*Settings → Environments → New environment*

### `staging`

| Campo | Valor |
|---|---|
| Name | `staging` |
| Required reviewers | — |
| Deployment branches and tags | *Selected branches and tags* → branch `main` e tag `v*` |
| Secrets (opcional) | `RAILWAY_TOKEN` — token de projeto do Railway com escopo do ambiente de staging |
| Variables (opcional) | `RAILWAY_SERVICE`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL` |

### `production`

| Campo | Valor |
|---|---|
| Name | `production` |
| Required reviewers | ✅ **Thauã Brandão** (`@brasttsolutions`) |
| Prevent self-review | ❌ desmarcado — quem cria a tag é o mesmo revisor obrigatório |
| Allow administrators to bypass configured protection rules | ❌ desmarcado |
| Deployment branches and tags | *Selected branches and tags* → somente tag `v*` |
| Secrets (opcional) | `RAILWAY_TOKEN` com escopo do ambiente de produção |
| Variables (opcional) | `RAILWAY_SERVICE` |

O environment `thorough-flow / production`, criado automaticamente pela integração do Railway, não faz parte deste fluxo e pode ficar como está.

Evidência: capturas de *Settings → Environments* e da tela do `production` → `evidencias/environments.png` e `evidencias/environment-production.png`.

## 6. Gerar a evidência da recusa do push direto

Com o ruleset ativo, tente publicar um commit direto na `main`:

```bash
git switch main
git pull
git commit --allow-empty -m "test: tentativa de push direto na main"
git push origin main 2>&1 | tee ../push-direto-recusado.txt
```

O GitHub deve recusar com uma mensagem como:

```text
remote: error: GH013: Repository rule violations found for refs/heads/main.
remote: - Changes must be made through a pull request.
 ! [remote rejected] main -> main (push declined due to repository rule violations)
```

Tire uma captura do terminal e desfaça o commit local:

```bash
git reset --hard origin/main
```

Depois anexe a evidência por PR, que é o caminho permitido:

```bash
git switch -c docs/evidencias-gcs
mv ../push-direto-recusado.txt docs/gcs/evidencias/
# copie as capturas para docs/gcs/evidencias/
git add docs/gcs/evidencias
git commit -m "docs: anexar evidências da configuração da GCS"
git push -u origin docs/evidencias-gcs
```

Abra o PR e peça a revisão do par. O próprio PR aprovado pelo par também é evidência do critério 4.

## 7. Primeira baseline `v0.1.0`

1. PR `chore(release): v0.1.0` trocando `## [Não lançado]` por `## [0.1.0] - AAAA-MM-DD` no `CHANGELOG.md` (o `package.json` já está em `0.1.0`).
2. Após o merge:
   ```bash
   git switch main && git pull
   git tag -a v0.1.0 -m "Roomly v0.1.0 — baseline inicial"
   git push origin v0.1.0
   ```
3. Em *Actions → deploy*, o job `staging` roda e o job `production` fica em **Waiting for review** até o revisor obrigatório (`@brasttsolutions`) aprovar. Captura → `evidencias/deploy-aguardando-aprovacao.png`.
