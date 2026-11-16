# Como contribuir com o Roomly

O processo completo está no [Plano de GCS](docs/gcs/PLANO_GCS.md). Este é o resumo para o dia a dia.

## 1. Comece por uma issue

Use o modelo **Solicitação de mudança** ou **Relato de defeito**. Correções triviais e PRs do Dependabot dispensam issue.

## 2. Crie uma branch a partir de `main`

```bash
git switch main
git pull
git switch -c feat/nome-curto
```

Prefixos: `feat/`, `fix/`, `docs/`, `refactor/`, `test/`, `ci/`, `chore/`, `build/`, `hotfix/`.

## 3. Faça commits no padrão Conventional Commits

```text
feat: permitir extensão da reserva em um clique
fix: impedir cobrança sem reserva registrada
docs: descrever o fluxo de baseline
```

## 4. Verifique antes de abrir o PR

```bash
npm run verify
npm run test:db   # se mexeu em supabase/
```

## 5. Abra o pull request para `main`

- Preencha o modelo e escreva `Closes #N`.
- O workflow `verify` precisa ficar verde.
- Um dono de código que não seja o autor precisa aprovar (`.github/CODEOWNERS`).
- Push direto em `main` é recusado pelo GitHub, inclusive para o dono do repositório.

## 6. Depois do merge

A branch é apagada, a `main` vai para `staging` automaticamente e a mudança entra na próxima baseline (`CHANGELOG.md`, seção *Não lançado*).

## Segredos

Nunca faça commit de `.env`, tokens ou chaves. Use `.env.example` só com os nomes das variáveis e guarde os valores nos segredos do environment no GitHub ou no provedor.
