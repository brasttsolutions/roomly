# Plano de Gerência de Configuração de Software — Roomly

**Versão:** 1.0 (proposta para revisão)  
**Projeto:** Roomly — plataforma multi-tenant de reservas de espaços de coworking  
**Repositório:** https://github.com/brasttsolutions/roomly  
**Estado:** proposta; entra em vigor após aprovação por Pull Request.

## 1. Objetivo e escopo
Estabelecer como identificar, versionar, revisar, auditar e liberar os itens de configuração do Roomly. O plano abrange código, testes, documentação, infraestrutura, configurações versionáveis e migrações de banco.

## 2. Itens de configuração
| Item | Localização | Controle |
|---|---|---|
| Código da aplicação | `src/` | Git, Pull Request e revisão |
| Testes | `e2e/`, arquivos de teste e configurações Vitest/Playwright | Git e verificações automatizadas |
| Banco de dados | `supabase/` | Migrações versionadas e revisão |
| Infraestrutura | `Dockerfile`, `.dockerignore`, `next.config.ts` | Git e revisão |
| Dependências | `package.json`, `package-lock.json` | Git e atualização rastreável |
| Documentação | `README.md`, `docs/`, este plano | Git e revisão |
| Automações | `.github/workflows/` | Git e revisão |
| Exemplo de configuração | `.env.example` | Git; nunca incluir segredos |

Credenciais reais, tokens, arquivos `.env` locais e dados pessoais não devem ser versionados.

## 3. Papéis e responsabilidades
- **Responsável pelo repositório:** administra políticas, permissões e baselines.
- **Autor da alteração:** cria branch, registra motivo, executa testes e abre Pull Request.
- **Par revisor:** colaborador com acesso de escrita, analisa as mudanças e registra aprovação ou solicita ajustes.
- **Revisor de produção:** usuário designado em `production` no GitHub Environments, responsável por aprovar a passagem para esse ambiente.

Os nomes dos responsáveis devem ser registrados na configuração real do GitHub e nas evidências; não são presumidos neste plano.

## 4. Política de branches e mudanças
- `main`: branch de integração, protegida contra push direto.
- `feat/<assunto>`: funcionalidades.
- `fix/<assunto>`: correções.
- `docs/<assunto>`: documentação e GCS.
- `chore/<assunto>`: manutenção e dependências.

Fluxo: abrir issue ou descrever demanda → criar branch → realizar commits objetivos → executar verificações → abrir PR para `main` → solicitar revisão → obter aprovação → integrar → registrar versão/baseline quando aplicável.

A política pretendida exige Pull Request e pelo menos uma aprovação antes de integrar na `main`. A aplicação efetiva depende das regras de proteção configuradas no GitHub.

## 5. Verificação e auditoria
Antes do merge, revisar escopo, riscos, documentação, testes e eventuais migrações. Usar `npm run verify` conforme o README do projeto, quando o ambiente permitir. Verificar também ausência de segredos e coerência entre mudanças e documentação. Registrar resultados e limitações na PR.

## 6. Baselines e versões
Uma baseline corresponde a um estado revisado e aceito do projeto. Após aprovação e integração, criar tag anotada quando houver marco relevante, seguindo `vMAJOR.MINOR.PATCH` (por exemplo, `v1.0.0`, apenas quando efetivamente lançado). Registrar versão, commit, data, escopo e responsável em release notes ou descrição da tag. Não declarar baselines inexistentes.

## 7. Ambientes e entregas
- `staging`: validação de mudanças antes de produção.
- `production`: entrega controlada, exigindo aprovação do responsável designado como *required reviewer* quando o recurso estiver disponível.

A configuração de environments é administrativa e não é criada por este documento. O workflow demonstrativo de GCS apenas referencia os ambientes e **não faz deploy** nem manipula credenciais.

## 8. Solicitação e rastreabilidade
Cada PR deve indicar objetivo, itens afetados, testes realizados, riscos, vínculo com issue (se houver), responsável e revisor. O histórico de commits e PRs fornece rastreabilidade das mudanças. Mudanças urgentes seguem o mesmo processo, com justificativa e revisão prioritária.

## 9. Evidências e conformidade
Manter evidências em `docs/evidencias/` para: organização e plano publicado; acessibilidade; recusa de push direto na `main`; colaborador com escrita e aprovação; ambientes `staging` e `production` e revisor obrigatório. Evitar capturas com tokens, e-mails ou outros dados pessoais desnecessários.

## 10. Revisão do plano
Revisar quando houver mudança de fluxo, arquitetura, responsáveis, ferramentas ou política de entrega. Alterações ao próprio plano são itens de configuração e exigem PR.
