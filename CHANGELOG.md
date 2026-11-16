# Changelog

Todas as mudanças relevantes do Roomly são registradas aqui.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto usa [Versionamento Semântico](https://semver.org/lang/pt-BR/). Cada versão listada corresponde a uma baseline com tag `vX.Y.Z` (Plano de GCS, seção 5).

## [Não lançado]

Conteúdo previsto para a baseline inicial `v0.1.0`.

### Adicionado

- Plano de Gerenciamento de Configuração de Software em `docs/gcs/PLANO_GCS.md`, com o passo a passo das configurações do GitHub e a pasta de evidências.
- `CODEOWNERS`, modelo de pull request e modelos de issue (solicitação de mudança e defeito).
- Workflow `deploy.yml` com promoção `staging` → `production` por environments do GitHub e aprovação obrigatória em produção.
- `CONTRIBUTING.md` e este `CHANGELOG.md`.
- MVP da plataforma multi-tenant de reservas: catálogo e perfil público de coworkings, disponibilidade real, checkout PIX/cartão (Mercado Pago), área do cliente com cancelamento e extensão, painel operacional multi-tenant, fila de limpeza, credencial de acesso, e-mails transacionais (Resend), fila durável de jobs, design system com tema escuro e páginas institucionais.

### Alterado

- Raiz do repositório organizada: especificação movida para `docs/especificacao/` e capturas de integrações para `docs/integracoes/`.
- `verify.yml` passa a observar a branch `main` e pode ser disparado manualmente.

### Removido

- Arquivo residual `sentry-example-page` da raiz.

### Segurança

- Correções de rate limit forjável, replay de webhook, isolamento entre inquilinos e sessão exposta a JavaScript (setembro de 2026, ver `docs/HANDOFF.md`).
