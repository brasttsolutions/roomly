# Guia de entrega N2-P2 — Roomly

## O que já pode ser entregue com este pacote
- Plano de GCS versionado (`docs/PLANO_GCS.md`).
- Modelo de Pull Request e documentação de evidências.
- Workflow de demonstração de ambientes (sem deploy real).

## Ações obrigatórias no GitHub (não executadas pelo pacote)
1. Criar branch `docs/plano-gcs` e abrir PR para `main` com estes arquivos.
2. Em **Settings → Rules → Rulesets** (ou Branch protection), exigir PR e pelo menos uma aprovação para `main`; impedir bypass pelo autor, se disponível.
3. Após a regra estar ativa, tentar `git push origin main` com um commit local de teste **sem alterar o histórico remoto**; capturar a mensagem de recusa. Não usar `--force`.
4. Em **Settings → Collaborators and teams**, conceder acesso **Write** ao colega (ou confirmar permissão de equipe). Solicitar a revisão da PR e obter aprovação real.
5. Em **Settings → Environments**, criar `staging` e `production`. Em `production`, configurar o proprietário responsável como *required reviewer*; verificar disponibilidade do recurso conforme o plano e a visibilidade do repositório.
6. Executar manualmente o workflow `GCS - Demonstracao de ambientes` pela aba Actions, primeiro para `staging` e depois para `production`. O job de produção deve aguardar aprovação quando a proteção estiver efetivamente habilitada.
7. Salvar capturas reais na pasta `docs/evidencias/` e atualizar o checklist abaixo.

## Checklist
- [ ] Plano de GCS publicado na `main` após PR.
- [ ] Repositório acessível ao avaliador.
- [ ] Captura da recusa de push direto na `main`.
- [ ] Captura da permissão Write do colega e da PR aprovada.
- [ ] Captura dos environments e do required reviewer em `production`.

**Nota:** um arquivo YAML que cita `production` não prova que a proteção de aprovação foi configurada. Não declarar como concluído sem capturas e teste real.
