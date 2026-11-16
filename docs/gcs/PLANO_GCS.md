# Plano de Gerenciamento de Configuração de Software (GCS) — Roomly

| Campo | Valor |
|---|---|
| Identificador | `IC-17` — `docs/gcs/PLANO_GCS.md` |
| Projeto | Roomly — plataforma multi-tenant de reservas de salas de coworking |
| Repositório | <https://github.com/brasttsolutions/roomly> |
| Disciplina | Gerenciamento, Configuração e Processos de Software (GCPSW) — Prof. Luiz Carlos Camargo, PhD |
| Responsável | Thauã Brandão (`@brasttsolutions`) |
| Versão do plano | 1.0.0 |
| Situação | Em vigor a partir do merge do PR que o introduz |

### Histórico de revisões

| Versão | Data | Autor | Descrição |
|---|---|---|---|
| 1.0.0 | 16/11/2026 | Thauã Brandão | Criação do plano: itens de configuração, branches, baselines, controle de mudanças, ambientes e auditoria. |

> Este plano é, ele próprio, um item de configuração. Qualquer alteração passa pelo mesmo fluxo de mudança da seção 6 (issue → branch → pull request → revisão → merge) e gera uma nova linha no histórico acima.

---

## 1. Introdução

### 1.1 Propósito

Definir como o Roomly mantém seus artefatos sob controle ao longo do ciclo de vida: o que é controlado, onde fica, quem pode alterar, como uma mudança é pedida, revisada, integrada, promovida entre ambientes e registrada. O objetivo é evitar os problemas clássicos de **dados compartilhados**, **manutenção múltipla** e **atualização simultânea**, garantindo integridade e rastreabilidade de cada versão entregue.

### 1.2 Escopo

Aplica-se a todo o conteúdo do repositório `brasttsolutions/roomly` e às configurações do GitHub que o governam (regras de branch, colaboradores, environments, segredos e workflows). Não cobre as contas dos provedores externos (Supabase, Mercado Pago, Resend, n8n, Sentry, TTLock, Railway), exceto quanto a **onde** suas credenciais ficam guardadas (seção 7.3).

### 1.3 Definições

| Termo | Significado neste projeto |
|---|---|
| Item de configuração (IC) | Artefato ou conjunto de artefatos tratado como unidade para fins de controle (seção 3). |
| Baseline | Versão de `main` formalmente revisada e aceita, marcada por uma tag anotada `vX.Y.Z` e publicada como GitHub Release (seção 5). |
| Solicitação de mudança | Issue aberta com o modelo *Solicitação de mudança* (`.github/ISSUE_TEMPLATE/`). |
| PR | Pull request: único caminho para alterar `main`. |
| Revisor par | Colaborador com permissão de escrita que revisa e aprova os PRs do autor (e vice-versa). |
| Environment | Ambiente de implantação do GitHub (`staging` e `production`), com regras de proteção e segredos próprios. |

### 1.4 Referências

- Material da disciplina GCPSW — Aula 01 (conceitos de configuração, IC, baseline e repositório) e Aula 1 publicada no GitHub do projeto Ongconecta.
- ESTUBLIER, J. *Software Configuration Management: a roadmap*. ICSE, 2000.
- ANDRADE, J.; RODRIGUES, J. *Gerência de configuração*. São Paulo: Pearson, 2015.
- Conventional Commits 1.0.0 — <https://www.conventionalcommits.org/pt-br/>
- Semantic Versioning 2.0.0 — <https://semver.org/lang/pt-BR/>
- Keep a Changelog 1.1.0 — <https://keepachangelog.com/pt-BR/>

---

## 2. Gerenciamento da GCS

### 2.1 Papéis e responsabilidades

| Papel | Quem | Permissão no GitHub | Responsabilidades |
|---|---|---|---|
| Gerente de configuração e desenvolvedor | Thauã Brandão (`@brasttsolutions`) | Admin (dono) | Manter este plano, abrir PRs, criar baselines, configurar regras e environments. **Não tem bypass** na regra da `main`. |
| Revisor par | Gabriel Santana (`@gabrieldsantana28`) | Write (colaborador) | Revisar e aprovar PRs (dono de código em `.github/CODEOWNERS`); pode abrir PRs, que então são revisados pelo dono. |
| Aprovador de produção | Thauã Brandão (`@brasttsolutions`) | Revisor obrigatório do environment `production` | Aprovar ou rejeitar cada implantação em produção, depois de conferir o resultado em `staging`. |
| Automação | GitHub Actions, Dependabot | Tokens do próprio GitHub | Executar a verificação (CI), abrir PRs de atualização de dependências e executar a promoção entre ambientes. Seguem as mesmas regras de PR. |

### 2.2 Ferramentas

| Ferramenta | Uso na GCS |
|---|---|
| Git | Controle de versões distribuído. |
| GitHub (repositório público) | Repositório central, PRs, revisões, issues, releases, rulesets e environments. |
| GitHub Actions | `verify.yml` (verificação de cada mudança) e `deploy.yml` (promoção staging → production). |
| Dependabot | Atualização semanal de dependências npm e de Actions (`.github/dependabot.yml`). |
| npm + `package-lock.json` | Gestão e travamento de versões de dependências. |
| Docker | Empacotamento reprodutível da aplicação (`Dockerfile`). |
| Supabase CLI | Migrations versionadas e testes de banco (pgTAP). |
| Railway | Hospedagem da aplicação; recebe a imagem/código promovido pelos environments. |

---

## 3. Identificação da configuração

### 3.1 Itens de configuração

| ID | Item | Localização | Observação |
|---|---|---|---|
| IC-01 | Código-fonte da aplicação | `src/` | Next.js + TypeScript, organizado em `app/`, `modules/`, `integrations/`, `lib/`, `components/`. |
| IC-02 | Esquema do banco de dados | `supabase/migrations/` | Toda mudança de banco é uma nova migration; migrations aplicadas nunca são editadas. |
| IC-03 | Dados de desenvolvimento e testes de banco | `supabase/seed.sql`, `supabase/tests/`, `supabase/config.toml` | `seed.sql` só em desenvolvimento. |
| IC-04 | Testes automatizados | `src/**/*.test.ts(x)`, `src/test/`, `e2e/` | Vitest (unidade/integração) e Playwright (ponta a ponta). |
| IC-05 | Configuração de build e qualidade | `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `vitest.config.ts`, `playwright.config.ts`, `postcss.config.mjs` | O `package-lock.json` garante a reprodutibilidade das dependências. |
| IC-06 | Empacotamento | `Dockerfile`, `.dockerignore` | Imagem de produção. |
| IC-07 | Pipelines CI/CD | `.github/workflows/` | `verify.yml` e `deploy.yml`. |
| IC-08 | Política de dependências | `.github/dependabot.yml` | |
| IC-09 | Modelo de variáveis de ambiente | `.env.example` | Contém só **nomes**; valores reais nunca entram no repositório (seção 7.3). |
| IC-10 | Design system | `design-tokens.json`, `src/styles/`, `docs/design-system/` | `design-tokens.json` é gerado por `scripts/build-tokens.mjs`. |
| IC-11 | Scripts operacionais | `scripts/` | |
| IC-12 | Recursos estáticos | `public/` | |
| IC-13 | Especificação do produto | `docs/especificacao/roomly-especificacao.md` | |
| IC-14 | Documentação técnica | `docs/ARCHITECTURE.md`, `docs/ADR-*.md`, `docs/OPERATIONS.md`, `docs/VERIFICATION.md`, `docs/GUIA_LOCAL.md`, `docs/TTLOCK_POC.md`, `docs/api-disponibilidade.md`, `docs/HANDOFF.md`, `docs/integracoes/`, `docs/emails/` | |
| IC-15 | Regras de governança do repositório | `.github/CODEOWNERS`, `.github/pull_request_template.md`, `.github/ISSUE_TEMPLATE/`, `CONTRIBUTING.md` | |
| IC-16 | Registro de mudanças | `CHANGELOG.md` | |
| IC-17 | Este plano e seus anexos | `docs/gcs/` | Inclui a descrição das configurações do GitHub (`CONFIGURACAO_GITHUB.md`) e as evidências. |
| IC-18 | Instruções para agentes e registro de decisões | `AGENTS.md`, `CLAUDE.md`, `.audit/roomly.tsv` | |

### 3.2 O que **não** é item de configuração

Artefatos gerados ou locais, listados no `.gitignore`: `node_modules/`, `.next/`, `out/`, `build/`, `coverage/`, `playwright-report/`, `test-results/`, arquivos `.env*` (exceto `.env.example`) e `*.tsbuildinfo`. Podem ser recriados a partir dos ICs a qualquer momento.

### 3.3 Estrutura do repositório

```text
roomly/
├── .github/            # CI/CD, Dependabot, CODEOWNERS, modelos de PR e de issue
├── docs/
│   ├── gcs/            # Plano de GCS, configuração do GitHub e evidências
│   ├── especificacao/  # Especificação do produto
│   ├── integracoes/    # Capturas da configuração dos provedores externos
│   ├── design-system/  # Fundamentos, componentes, marca e telas
│   └── *.md            # Arquitetura, ADRs, operação, verificação, guia local
├── e2e/                # Testes Playwright
├── public/             # Recursos estáticos
├── scripts/            # Scripts de build, verificação e operação
├── src/                # Código-fonte da aplicação
├── supabase/           # Migrations, seed e testes de banco
├── CHANGELOG.md
├── CONTRIBUTING.md
├── Dockerfile
└── README.md
```

### 3.4 Convenções de nomenclatura

- Pastas e arquivos novos em `kebab-case`, sem espaços nem acentos (ex.: `docs/integracoes/resend-dns.png`).
- Documentos de referência em maiúsculas quando forem âncoras do projeto (`README.md`, `CHANGELOG.md`, `PLANO_GCS.md`).
- Migrations: `NNNN_descricao_curta.sql`, numeradas em sequência.
- Branches e tags: seção 4.

---

## 4. Controle de versões

### 4.1 Estratégia de branches

Fluxo baseado em tronco (*GitHub Flow*) com baselines por tag:

| Branch | Finalidade | Regras |
|---|---|---|
| `main` | Tronco. Sempre implantável; cada merge vai automaticamente para `staging`. | Protegida por ruleset (seção 6.3). Ninguém faz push direto, inclusive o dono. |
| `feat/<descricao>` | Nova funcionalidade. | Curta duração; nasce de `main` e volta por PR. |
| `fix/<descricao>` | Correção de defeito. | Idem. |
| `docs/<descricao>` | Documentação. | Idem. |
| `refactor/`, `test/`, `ci/`, `chore/`, `build/` | Demais tipos de mudança. | Idem. |
| `hotfix/<descricao>` | Correção urgente em produção. | Nasce de `main`, passa pelo mesmo PR; gera versão PATCH. |
| `dependabot/*` | Atualizações automáticas. | Mesmas regras de PR e revisão. |

Branches são apagadas após o merge.

### 4.2 Mensagens de commit

Padrão **Conventional Commits**, com descrição em português e no imperativo:

```text
<tipo>(<escopo opcional>): <descrição curta>

[corpo opcional explicando o porquê]

[rodapé opcional: Closes #12]
```

Tipos: `feat`, `fix`, `docs`, `refactor`, `test`, `build`, `ci`, `chore`, `perf`. Exemplo do histórico: `fix: fechar rate limit forjável, replay de webhook e z.url permissivo`.

### 4.3 Versionamento

**Versionamento semântico** `MAJOR.MINOR.PATCH`, com o número registrado em `package.json` (`version`) e na tag:

- `MAJOR` — quebra de contrato de API, de banco ou de comportamento esperado pelo cliente;
- `MINOR` — funcionalidade nova compatível;
- `PATCH` — correção compatível.

Enquanto o produto estiver em MVP, a série é `0.y.z`.

---

## 5. Baselines

### 5.1 Definição

Uma baseline é um commit de `main` que (1) passou por PR aprovado, (2) passou na verificação automática e (3) recebeu uma **tag anotada** `vX.Y.Z` acompanhada de **GitHub Release** e de entrada no `CHANGELOG.md`. Tags de baseline não são movidas nem apagadas (protegidas por ruleset de tags, seção 6.3).

### 5.2 Baselines planejadas

| Baseline | Conteúdo | Critério de aceite |
|---|---|---|
| `v0.1.0` — baseline inicial | MVP atual + estrutura de GCS deste plano | PR do plano aprovado pelo par, `verify` verde, regras e environments configurados. |
| `v0.2.0` | Integrações reais em staging (Supabase, Mercado Pago, Resend) | `/api/ready` 200 em staging. |
| `v1.0.0` | Abertura da operação | POC física TTLock concluída e aprovada (`docs/TTLOCK_POC.md`). |

### 5.3 Procedimento para criar uma baseline

1. Abrir um PR `chore(release): vX.Y.Z` que atualiza `version` no `package.json` e move os itens de *Não lançado* para `## [X.Y.Z] - AAAA-MM-DD` no `CHANGELOG.md`.
2. Após aprovação e merge, criar a tag anotada no commit de merge:
   ```bash
   git switch main && git pull
   git tag -a vX.Y.Z -m "Roomly vX.Y.Z"
   git push origin vX.Y.Z
   ```
3. O push da tag dispara `deploy.yml`: `staging` → aguarda aprovação do revisor obrigatório → `production` → GitHub Release com as notas geradas.

---

## 6. Controle de mudanças

### 6.1 Fluxo

```text
Solicitação de mudança (issue) ──► triagem (rótulo, prioridade)
        │
        ▼
branch tipo/descricao a partir de main ──► commits (Conventional Commits)
        │
        ▼
Pull request para main (modelo .github/pull_request_template.md, "Closes #N")
        │
        ├── verificação automática: verify / application + verify / database
        └── revisão do par (CODEOWNERS), conversas resolvidas
        │
        ▼
Merge (squash) ──► deploy automático em staging
        │
        ▼
Baseline (tag vX.Y.Z) ──► staging ──► aprovação do revisor obrigatório ──► production
```

### 6.2 Solicitação de mudança

Toda mudança não trivial começa por uma issue com o modelo *Solicitação de mudança*, que registra: motivação, descrição, ICs afetados, impacto/risco e critério de aceite. Correções de digitação e atualizações do Dependabot dispensam issue, mas não dispensam PR.

### 6.3 Regras de proteção (configuradas no GitHub)

Detalhadas passo a passo em [`CONFIGURACAO_GITHUB.md`](CONFIGURACAO_GITHUB.md). Resumo:

**Ruleset `proteger-main`** (alvo: branch padrão `main`, sem lista de bypass):

- push direto **bloqueado** — mudança só por PR;
- 1 aprovação obrigatória; aprovação descartada se houver novo push; revisão de *code owner* obrigatória; conversas resolvidas;
- o workflow `verify` roda em todo PR; os checks `application` e `database` entram no ruleset como obrigatórios assim que o primeiro PR na `main` os registrar;
- force push e exclusão da branch bloqueados.

**Ruleset `proteger-baselines`** (alvo: tags `v*`): bloqueia atualização e exclusão de tags de baseline.

### 6.4 Critérios de revisão

O revisor verifica: aderência ao escopo da issue; testes novos ou ajustados; ausência de segredos; migrations novas em vez de editadas; documentação e `CHANGELOG.md` atualizados quando o comportamento muda.

---

## 7. Ambientes e promoção

### 7.1 Environments

| Environment | Origem permitida | Proteção | Implantação |
|---|---|---|---|
| `staging` | branch `main` e tags `v*` | Nenhuma aprovação manual | Automática a cada merge em `main` e a cada tag. |
| `production` | somente tags `v*` | **Revisor obrigatório: Thauã Brandão (`@brasttsolutions`)**, sem bypass para administradores | Só após `staging` concluir com sucesso **e** o revisor aprovar no GitHub. |

### 7.2 Workflow de promoção (`.github/workflows/deploy.yml`)

- **staging**: constrói a imagem Docker, sobe o contêiner e faz teste de fumaça em `/api/health`; se o segredo `RAILWAY_TOKEN` do environment existir, publica no serviço de staging.
- **production**: só roda para tags `v*`, depende de `staging` e fica em *Waiting for review* até a aprovação; publica no serviço de produção (quando configurado) e cria o GitHub Release da baseline.

### 7.3 Segredos e variáveis

- Valores reais **nunca** entram no Git. O `.gitignore` bloqueia `.env*`; o `.env.example` guarda só os nomes.
- Cada environment tem seus próprios segredos (`RAILWAY_TOKEN` com escopo do ambiente correspondente) e variáveis (`NEXT_PUBLIC_*`, `RAILWAY_SERVICE`). Segredos de `production` só são liberados ao job depois da aprovação do revisor.
- Credenciais vazadas são revogadas no provedor imediatamente; reescrever o histórico não basta.

---

## 8. Registro e relato de status

| Registro | Onde | O que mostra |
|---|---|---|
| Histórico de mudanças | `git log`, aba *Commits* | Quem mudou o quê, quando e por quê. |
| Pedidos de mudança | Aba *Issues* | Situação de cada solicitação (aberta, em andamento, fechada pelo PR). |
| Revisões | Aba *Pull requests* | Discussão, aprovação e checks de cada mudança. |
| Verificações | Aba *Actions* | Resultado de `verify` e `deploy` por commit. |
| Implantações | Página *Deployments* / *Environments* | Versão em `staging` e `production`, quem aprovou e quando. |
| Baselines | `CHANGELOG.md`, aba *Releases*, tags `v*` | Conteúdo de cada versão entregue. |
| Decisões de arquitetura | `docs/ADR-*.md`, `.audit/roomly.tsv` | Motivo das escolhas técnicas. |

---

## 9. Auditoria e verificação da configuração

### 9.1 Auditoria funcional (automática, a cada PR)

Workflow `verify`:

- `application`: ESLint, TypeScript, Vitest, build de produção e Playwright (desktop e mobile);
- `database`: Supabase local, `db reset` com todas as migrations, testes pgTAP e verificação de embeds.

### 9.2 Auditoria física (a cada baseline)

Checklist registrado no PR de release:

- [ ] a tag aponta para um commit de `main` que passou no `verify`;
- [ ] `package.json` e tag têm a mesma versão;
- [ ] `CHANGELOG.md` descreve a versão;
- [ ] `.env.example` lista todas as variáveis usadas pelo código;
- [ ] nenhum segredo no diff da versão;
- [ ] colaboradores e revisores do environment `production` conferidos.

### 9.3 Verificação periódica das regras

A cada baseline, o gerente de configuração confere que o ruleset da `main` continua ativo, sem bypass, e que uma tentativa de push direto é recusada (evidência em `docs/gcs/evidencias/`).

---

## 10. Dependências de terceiros

Dependências npm e Actions são atualizadas pelo Dependabot semanalmente. Cada atualização chega como PR e passa por `verify` e revisão como qualquer outra mudança; atualizações que quebram a verificação não são integradas até serem corrigidas.

---

## 11. Evidências de execução

As evidências da execução deste plano ficam em [`docs/gcs/evidencias/`](evidencias/README.md): recusa de push direto, ruleset, colaborador revisor, environments e aprovação de produção.
