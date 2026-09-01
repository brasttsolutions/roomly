# ADR 001: Monólito modular orientado ao domínio

Status: aceito em 2026-09-01.

## Contexto

Roomly precisa preservar quatro invariantes de alto impacto: uma única ocupação por sala e intervalo, confirmação financeira idempotente, isolamento entre empresas e acesso físico reconciliável após falhas de rede. O MVP também precisa executar localmente sem introduzir infraestrutura distribuída antes de haver volume real.

## Alternativas

### Módulos por domínio

Um módulo amplo de reservas mantém booking, disponibilidade, pagamento, cancelamento e reembolso próximos do mesmo invariante transacional. Acesso, limpeza e notificações consomem jobs duráveis.

### Fatias por operação com eventos

Checkout, webhook, provisionamento e ciclo de vida seriam fatias independentes conectadas por outbox. Essa forma isola comandos, mas distribui um fluxo crítico por mais módulos e estados intermediários.

## Decisão

Adotar módulos por domínio. Manter reservas e pagamento no mesmo limite transacional. Usar jobs tipados para efeitos externos. Incorporar da alternativa vertical somente:

- `idempotency_records` para comandos HTTP;
- `integration_operations` para efeitos externos;
- reconciliação antes de repetir criação TTLock;
- contratos específicos por capacidade;
- parsing de dados somente nas fronteiras.

Não adotar CQRS, event sourcing, broker, saga framework ou repository genérico no MVP.

## Consequências

O mantenedor encontra o invariante comercial em um único módulo e o banco confirma conflitos. O módulo de reservas é deliberadamente mais largo. Se ele crescer a ponto de esconder decisões independentes, a divisão futura deverá ocorrer por invariantes observados, não por etapas do fluxo.

A disponibilidade de fornecedores não interfere no commit financeiro. Jobs introduzem consistência eventual somente nos efeitos externos. A POC TTLock continua sendo gate obrigatório antes de acesso real.
