# HANDOFF TÉCNICO — ROOMLY

## 1. Contexto geral

O projeto se chama **Roomly**.

É uma plataforma web para automatizar aluguel/reserva de salas de coworking ou salas de reunião.

O objetivo é que praticamente todo o processo aconteça sem intervenção humana:

```text
Usuário acessa o Roomly
→ visualiza salas disponíveis
→ escolhe uma sala
→ seleciona data e horário
→ sistema bloqueia temporariamente o horário
→ usuário realiza pagamento
→ Mercado Pago confirma o pagamento
→ reserva é confirmada
→ sistema cria uma senha temporária da fechadura
→ usuário recebe a senha
→ usuário utiliza a sala
→ senha expira ao final da reserva
→ sistema encerra/revoga o acesso
→ equipe de limpeza é acionada
→ sala volta a ficar disponível
```

O projeto será inicialmente validado com **um cliente real**, porém foi projetado desde o início como **multi-tenant**, permitindo posteriormente atender diversas empresas, unidades e salas como SaaS.

Não recomeçar o projeto do zero.

A arquitetura já foi planejada e uma implementação considerável já foi realizada.

---

# 2. Stack atual

Pelo `package.json`, documentação e histórico, a stack utilizada atualmente é aproximadamente:

### Frontend/backend

```text
Next.js 16.3.4
Next.js App Router
React 19.2.8
TypeScript 5
Tailwind CSS 4
```

O backend continua dentro do Next.js utilizando principalmente Route Handlers/Server-side code.

### Banco, autenticação e persistência

```text
PostgreSQL
Supabase
Supabase Auth
Supabase RLS
```

### Pagamentos

```text
Mercado Pago
PIX
Cartão
```

### Controle físico de acesso

```text
TTLock Open API
Fechadura TTLock
Gateway Wi-Fi
Senha temporária
```

### Automação

```text
n8n
```

Principalmente para o fluxo de limpeza e futuras automações.

### E-mails

```text
Resend
```

### Observabilidade

```text
Sentry
```

### Testes

```text
Vitest
Playwright
pgTAP / Supabase local
```

### Infraestrutura

```text
Docker
GitHub Actions
Dependabot
Vercel planejado para hospedagem
```

---

# 3. Modos de integração existentes

O projeto foi estruturado para conseguir funcionar localmente mesmo sem credenciais reais.

Existem três configurações importantes:

```env
ROOMLY_INTEGRATION_MODE=simulator|supabase
ROOMLY_PAYMENT_MODE=simulator|mercado_pago
ROOMLY_ACCESS_MODE=simulator|ttlock
```

Em modo `simulator`, os provedores externos são substituídos por simuladores determinísticos.

Isso permite desenvolver e testar o sistema antes de conectar Mercado Pago, TTLock etc.

O objetivo agora é começar a substituir os simuladores pelos serviços reais de forma controlada.

---

# 4. Estado reportado da implementação

Segundo o último estado registrado do desenvolvimento, já foram implementados:

* autenticação Supabase;
* sistema de convites;
* RLS;
* persistência multi-tenant;
* checkout PIX;
* checkout por cartão;
* integração Mercado Pago;
* webhook Mercado Pago idempotente;
* processamento durável de jobs;
* criação/controle de acesso;
* reembolso;
* limpeza;
* integração n8n;
* e-mails via Resend;
* idempotência nas operações críticas;
* tratamento/reconciliação de timeout ambíguo do TTLock;
* Sentry;
* health/readiness checks;
* Dockerfile;
* GitHub Actions;
* Dependabot;
* documentação operacional;
* ADRs;
* documentação da POC TTLock.

O commit reportado como marco do MVP foi:

```text
b4ed9f9 feat: build roomly booking platform MVP
```

Esse estado foi descrito como o “máximo verificável localmente”.

IMPORTANTE: isso é o **estado reportado pelo desenvolvimento anterior**. A nova IA deve conferir o repositório real antes de assumir que todos esses itens continuam funcionando.

---

# 5. Testes que já passaram anteriormente

Foi reportado que:

```bash
npm run verify
```

passou integralmente.

O comando executa aproximadamente:

```text
ESLint
→ TypeScript
→ Vitest
→ Next.js production build
→ Playwright
```

No último resultado registrado:

```text
35 testes unitários/integração passaram
22 páginas foram compiladas
10 testes Playwright passaram em desktop/mobile
npm audit encontrou 0 vulnerabilidades
```

Porém esses testes precisam ser executados novamente pela nova IA no estado atual do repositório.

---

# 6. Superfícies principais do sistema

Segundo o README, já existem ou foram planejadas as seguintes rotas.

### Cliente

```text
/
```

Catálogo/listagem de salas.

```text
/salas/[slug]
```

Detalhes da sala, disponibilidade e checkout.

```text
/entrar
/cadastro
```

Autenticação.

```text
/minhas-reservas
```

Reservas futuras, acesso, histórico e cancelamento.

### Administração

```text
/admin
```

Administração multi-tenant de:

```text
salas
unidades
reservas
clientes
pagamentos
limpeza
fechaduras
configurações
auditoria
```

### APIs relevantes

```text
/api/bookings
/api/webhooks/mercado-pago
/api/internal/jobs/run
/api/health
/api/ready
```

O endpoint de bookings deve calcular preço e disponibilidade no servidor/banco, nunca confiar no frontend.

---

# 7. Arquitetura de reservas

A reserva possui aproximadamente os seguintes estados:

```text
pending
awaiting_payment
confirmed
in_progress
completed
cancelled
expired
refunded
```

Também há estados separados para:

```text
payment_status
access_status
cleaning_status
```

Ao usuário selecionar um horário, deve existir um **hold temporário**, originalmente planejado para aproximadamente 10 minutos.

Exemplo:

```text
14:00–15:00 selecionado

→ hold criado
→ usuário possui alguns minutos para pagar

se não pagar:
→ hold expira
→ horário volta a ficar disponível
```

A prevenção de reservas conflitantes deve ocorrer no PostgreSQL, não apenas no frontend.

Condição conceitual de conflito:

```text
nova.start < existente.end
AND
nova.end > existente.start
```

O projeto reporta possuir constraint/controle de concorrência no banco.

Isso precisa ser novamente validado.

---

# 8. Arquitetura de pagamento

Fluxo:

```text
booking
→ awaiting_payment
→ pagamento Mercado Pago criado
→ cliente paga
→ webhook Mercado Pago
→ backend verifica autenticidade
→ pagamento atualizado
→ booking confirmado
→ job de criação do acesso
```

O projeto foi construído considerando que webhooks podem chegar duplicados.

Portanto deve haver:

```text
provider_payment_id
external_event_id
idempotency_key
```

e/ou constraints equivalentes.

Nunca criar duas reservas, dois pagamentos ou dois códigos de acesso porque um webhook foi reenviado.

---

# 9. Arquitetura de controle de acesso

Depois do pagamento aprovado:

```text
Payment approved
→ Booking confirmed
→ AccessService
→ TTLock
→ senha temporária
```

Exemplo:

```text
Reserva:
14:00–15:00

Tolerância:
5 minutos antes
5 minutos depois

Senha:
13:55–15:05
```

A senha deve possuir validade definida no próprio TTLock.

Além disso, existe a intenção de haver:

```text
expiração no provedor
+
revogação ativa pelo backend
+
job de reconciliação/auditoria
```

A senha não deve ser armazenada em texto puro desnecessariamente.

Existe uma variável específica:

```env
ACCESS_CODE_ENCRYPTION_KEY=
```

---

# 10. TTLock — situação atual

A integração de software foi preparada, inclusive com tratamento para situações em que a API sofre timeout e não fica claro se a senha chegou ou não a ser criada.

Porém a **integração física ainda não foi validada**.

Isso é uma das maiores pendências do projeto.

Por enquanto deve permanecer:

```env
ROOMLY_ACCESS_MODE=simulator
```

Até existirem:

```text
1 fechadura TTLock compatível
1 gateway
acesso à TTLock Open API
TTLOCK_CLIENT_ID
TTLOCK_CLIENT_SECRET
TTLOCK_USERNAME
TTLOCK_PASSWORD
```

O histórico confirma que o hardware e as credenciais TTLock ainda eram necessários para avançar.

---

# 11. POC obrigatória da TTLock

Antes de colocar o Roomly em produção, realizar obrigatoriamente uma POC física.

Teste:

```text
backend
→ TTLock
→ criar senha
→ digitar senha na porta
→ porta abre
→ aguardar expiração
→ tentar senha novamente
→ acesso recusado
→ criar outra senha
→ revogar pela API
→ senha deixa de funcionar
```

Também testar:

```text
gateway offline
internet desconectada
TTLock API indisponível
timeout da API
backend indisponível
senha expirada
senha revogada
falha na revogação
```

Essa é provavelmente a validação técnica mais importante do projeto, porque o Roomly controla acesso físico real.

---

# 12. Supabase — estado atual

Uma conta/projeto Supabase já foi criada.

Houve inicialmente dúvida sobre `Framework`, `Server`, `App Router` e os nomes das novas chaves do Supabase.

O projeto Roomly utiliza **Next.js App Router**.

O painel atual do Supabase pode fornecer algo como:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SECRET_KEY
```

Porém o código atual utiliza nomes internos como:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Portanto o mapeamento definido foi:

```env
NEXT_PUBLIC_SUPABASE_URL=<URL apresentada pelo Supabase>

NEXT_PUBLIC_SUPABASE_ANON_KEY=<PUBLISHABLE KEY apresentada pelo Supabase>

SUPABASE_SERVICE_ROLE_KEY=<SECRET KEY obtida na configuração Server>

ROOMLY_INTEGRATION_MODE=supabase
```

A `SECRET_KEY` nunca deve receber prefixo `NEXT_PUBLIC_`.

O `JWKS_URL` não era necessário para a implementação atual.

`DATABASE_URL` poderia permanecer vazio nesta etapa.

Esse foi o último mapeamento definido no histórico.

IMPORTANTE:

Antes havia sido recomendado hospedar o Supabase em São Paulo. Confirmar qual região o projeto atual realmente está utilizando antes de mudar qualquer coisa.

Não recriar banco ou projeto sem necessidade.

---

# 13. O que testar agora no Supabase

A próxima IA deve primeiro encontrar a migration existente, reportada anteriormente como algo parecido com:

```text
supabase/migrations/0001_roomly_foundation.sql
```

Antes de aplicar qualquer migration remotamente:

1. inspecionar a migration;
2. conferir se é destrutiva;
3. executar localmente com Docker/Supabase;
4. executar testes do banco;
5. somente depois utilizar um projeto remoto de desenvolvimento/staging.

Com Docker:

```bash
npx supabase start
npx supabase db reset --local
npm run test:db
```

Validar principalmente:

```text
schema
foreign keys
multi-tenancy
RLS
RPCs
constraints de conflito de reservas
hold temporário
rate limiting
fila/jobs
idempotência
```

Também realizar um teste específico de isolamento:

```text
Empresa A cria sala/reserva

Usuário Empresa B tenta consultar

Resultado esperado:
ACESSO NEGADO
```

Esse teste é crítico.

---

# 14. Mercado Pago — estado atual

A aplicação Mercado Pago foi recriada e o usuário conseguiu obter:

```text
Public Key
Access Token
```

A intenção é utilizar **credenciais de teste/sandbox** primeiro.

Elas devem ser colocadas em `.env.local`:

```env
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=<Public Key de teste>

MERCADO_PAGO_ACCESS_TOKEN=<Access Token de teste>

ROOMLY_PAYMENT_MODE=mercado_pago
```

Isso foi o último direcionamento registrado.

Não solicitar ao usuário que cole essas credenciais no chat.

---

# 15. Webhook Mercado Pago

Ainda existe uma pendência:

```env
MERCADO_PAGO_WEBHOOK_SECRET=
```

Não preencher aleatoriamente.

O histórico estabeleceu que o webhook real seria configurado depois que o Roomly possuir uma URL HTTPS pública.

Portanto será necessário criar primeiro algum ambiente acessível publicamente, preferencialmente staging.

Exemplo:

```text
https://staging.roomly...
```

Depois:

```text
Mercado Pago
→ webhook HTTPS
→ /api/webhooks/mercado-pago
```

Configurar assinatura/segredo e validar no backend.

---

# 16. Casos obrigatórios para testar no Mercado Pago

Não testar apenas “pagamento aprovado”.

Testar:

```text
PIX aprovado
cartão aprovado
pagamento rejeitado
pagamento cancelado

webhook enviado uma vez
webhook enviado duas vezes
webhook enviado várias vezes

webhook com assinatura inválida

pagamento aprovado após hold da reserva expirar

reserva cancelada

reembolso

reembolso duplicado

pagamento aprovado sem reserva válida

falha temporária de comunicação com Mercado Pago
```

Depois de cada cenário verificar banco, status da booking, payment, jobs, logs e auditoria.

---

# 17. n8n — estado atual

Um workflow n8n já havia sido criado.

Ainda faltava:

```text
configurar segredo HMAC
publicar workflow
obter Production URL
```

Variáveis:

```env
N8N_WEBHOOK_URL=
N8N_WEBHOOK_SECRET=
```

O mesmo segredo precisa ser utilizado pelo Roomly e pelo workflow.

Também ficou registrada uma pendência de segurança:

**substituir comparação simples do HMAC por comparação resistente a timing attack antes da produção.**

Essa pendência foi explicitamente registrada anteriormente.

---

# 18. Fluxo de limpeza

Ao finalizar uma reserva:

```text
booking.completed
→ CleaningService
→ cleaning_request
→ job
→ n8n
→ equipe de limpeza
```

A arquitetura também prevê verificar o horário da próxima reserva antes de agendar a limpeza.

Exemplo:

```text
Reserva termina 15:00
Limpeza exige 20 min
Próxima reserva 17:00

→ janela disponível para limpeza
```

Essa integração precisa ser validada de ponta a ponta com o n8n real.

---

# 19. Resend — estado atual

A integração foi preparada no código, mas ainda era necessário configurar o serviço real.

Faltava:

```text
domínio
DNS
verificação do domínio
API Key
e-mail remetente
```

Variáveis:

```env
RESEND_API_KEY=
RESEND_FROM_EMAIL=
```

Fluxos importantes para testar:

```text
convite
confirmação da reserva
pagamento
código/informações de acesso
cancelamento
reembolso
alertas necessários
```

O histórico ainda apontava domínio e chave do Resend como pendentes.

---

# 20. Sentry — estado atual

O assistente de configuração do Sentry já havia sido executado parcialmente.

Existem variáveis como:

```env
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=

SENTRY_ENVIRONMENT=development
NEXT_PUBLIC_SENTRY_ENVIRONMENT=development

SENTRY_TRACES_SAMPLE_RATE=0.1
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.05

SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=
```

Foi relatado que o wizard havia deixado configuração com DSN fixo e amostragem muito alta/100% em alguns arquivos.

Portanto:

**auditar a configuração Sentry antes de produção.**

Não executar novamente o wizard sem antes verificar os arquivos atuais.

O histórico também menciona `.env.sentry-build-plugin` contendo token e já ignorado pelo Git.

---

# 21. Segredos internos

Existem segredos que não vêm de serviços externos.

Principalmente:

```env
CRON_SECRET=
ACCESS_CODE_ENCRYPTION_KEY=
```

Eles devem ser valores criptograficamente aleatórios.

Nunca:

```text
hardcode no código
commit no Git
mostrar no frontend
enviar pelo chat
```

O endpoint:

```text
/api/internal/jobs/run
```

deve ser protegido por `CRON_SECRET`.

---

# 22. `.env.local`

Todas as credenciais de desenvolvimento devem ficar em:

```text
.env.local
```

na raiz do projeto, ao lado do `package.json`.

Não alterar `.env.example` colocando credenciais reais.

Estrutura esperada aproximadamente:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=

MERCADO_PAGO_ACCESS_TOKEN=
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=
MERCADO_PAGO_WEBHOOK_SECRET=

ROOMLY_PAYMENT_MODE=
ROOMLY_ACCESS_MODE=
ROOMLY_INTEGRATION_MODE=

CRON_SECRET=
ACCESS_CODE_ENCRYPTION_KEY=

TTLOCK_CLIENT_ID=
TTLOCK_CLIENT_SECRET=
TTLOCK_USERNAME=
TTLOCK_PASSWORD=

RESEND_API_KEY=
RESEND_FROM_EMAIL=

N8N_WEBHOOK_URL=
N8N_WEBHOOK_SECRET=

SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ENVIRONMENT=
NEXT_PUBLIC_SENTRY_ENVIRONMENT=
SENTRY_TRACES_SAMPLE_RATE=
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=
```

NUNCA pedir para o usuário colar os valores dessas chaves na conversa.

Apenas orientar onde obtê-las e pedir que o usuário confirme algo como:

```text
"Supabase preenchido"
```

ou

```text
"Mercado Pago preenchido"
```

---

# 23. GitHub/CI

O projeto possui configuração reportada de GitHub Actions e Dependabot.

Porém o histórico dizia que ainda seria necessário criar/conectar um repositório remoto privado para realmente executar a CI.

Confirmar antes de assumir que isso já ocorreu.

Se não houver remote:

```bash
git remote -v
```

e configurar o repositório privado apropriado.

Não colocar secrets no repositório.

Para staging/produção, utilizar GitHub/Vercel/Supabase secret management.

---

# 24. O que a próxima IA deve fazer PRIMEIRO

Não começar implementando novas funcionalidades.

Primeiramente executar uma auditoria do estado atual.

### Passo 1 — confirmar repositório

Executar:

```bash
git status
git log --oneline -10
git remote -v
```

Confirmar se existe o commit:

```text
b4ed9f9
```

ou commits posteriores.

Não sobrescrever alterações locais existentes.

---

### Passo 2 — estudar o projeto real

Ler antes de modificar:

```text
README.md
AGENTS.md
package.json
.env.example
docs/
supabase/
src/
tests/
playwright/
.github/
```

Especialmente:

```text
docs/ARCHITECTURE.md
docs/OPERATIONS.md
docs/VERIFICATION.md
docs/TTLOCK_POC.md
```

caso existam no repositório real.

---

### Passo 3 — respeitar Next.js atual

Existe um `AGENTS.md` alertando explicitamente que a versão atual do Next.js possui mudanças relevantes.

Antes de modificar APIs ou convenções do framework, consultar:

```text
node_modules/next/dist/docs/
```

quando necessário.

Não assumir automaticamente comportamento de versões antigas do Next.js.

---

### Passo 4 — baseline

Rodar:

```bash
npm install
npm run verify
```

ou `npm ci` se apropriado e o lockfile estiver consistente.

O objetivo é estabelecer:

```text
qual é o estado atual antes de qualquer alteração.
```

Se algo falhar, corrigir primeiro a regressão/baseline.

---

# 25. Ordem recomendada para continuar o desenvolvimento

## ETAPA A — Local

Confirmar novamente:

```text
lint
typecheck
unit tests
integration tests
build
Playwright
npm audit
```

---

## ETAPA B — PostgreSQL/Supabase local

Com Docker:

```bash
npx supabase start
npx supabase db reset --local
npm run test:db
```

Confirmar migration, RLS, constraints, RPCs e jobs.

---

## ETAPA C — Supabase real de desenvolvimento/staging

Depois do ambiente local funcionar:

```text
conectar Supabase
aplicar migrations
testar Auth
testar convites
testar tenant isolation
testar persistência
testar reservas
```

Não começar por production.

---

## ETAPA D — Mercado Pago sandbox

Ativar:

```env
ROOMLY_PAYMENT_MODE=mercado_pago
```

Testar PIX/cartão e todos os cenários de webhook/idempotência.

---

## ETAPA E — staging HTTPS

Fazer deploy de staging, provavelmente Vercel.

Necessário para:

```text
webhook Mercado Pago real
n8n
Resend
Sentry
testes externos
```

---

## ETAPA F — Mercado Pago webhook

Cadastrar endpoint HTTPS e configurar:

```env
MERCADO_PAGO_WEBHOOK_SECRET=
```

Validar assinatura real.

---

## ETAPA G — n8n + Resend

Testar:

```text
booking finalizada
→ cleaning request
→ n8n
→ notificação

booking criada/paga
→ Resend
→ e-mail
```

---

## ETAPA H — Sentry

Forçar erros controlados em:

```text
frontend
API
job
integração externa
```

Confirmar se chegam corretamente ao Sentry e se dados sensíveis não são enviados.

---

## ETAPA I — TTLock física

Somente quando houver fechadura + gateway + Open API.

Executar toda a POC física.

Essa etapa deve bloquear produção se não passar.

---

## ETAPA J — E2E real de staging

Fluxo final:

```text
criar usuário
→ visualizar sala
→ escolher horário
→ reservar
→ pagar
→ webhook
→ confirmar booking
→ criar senha TTLock
→ receber e-mail
→ acessar sala
→ senha expirar
→ acesso ser revogado
→ limpeza ser acionada
```

Este é o teste definitivo do MVP.

---

# 26. Casos críticos que NÃO podem ficar sem teste

Obrigatoriamente validar:

```text
dois usuários reservando o mesmo horário

pagamento duplicado

webhook duplicado

pagamento de booking já expirada

reserva não paga

reserva cancelada

reembolso

reembolso duplicado

TTLock offline

gateway offline

timeout TTLock

senha criada mas resposta da API perdida

falha ao criar senha

falha ao revogar senha

senha funcionando depois do horário

usuário de outro tenant acessando informações

admin alterando reserva manualmente

job processado duas vezes

n8n indisponível

Resend indisponível

Mercado Pago indisponível
```

O sistema deve falhar de maneira segura.

---

# 27. Pontos de segurança prioritários

Como o Roomly envolve **dinheiro + acesso físico**, segurança e consistência possuem prioridade maior do que novas funcionalidades.

Revisar:

```text
RLS
RBAC
multi-tenancy
webhook signature
idempotência
rate limiting
validation
CSRF quando aplicável
XSS
headers HTTP
secret leakage
logs
auditoria
criptografia do código de acesso
cron authentication
n8n HMAC
Sentry sensitive-data filtering
TTLock credentials
```

Não permitir:

```text
service role no navegador
Access Token Mercado Pago no navegador
TTLock credentials no navegador
CRON_SECRET no navegador
ACCESS_CODE_ENCRYPTION_KEY no navegador
```

---

# 28. LGPD

O projeto foi pensado com minimização de dados.

Inicialmente coletar apenas o necessário, aproximadamente:

```text
nome
e-mail
telefone
informações necessárias para reserva/pagamento
```

Nunca armazenar dados de cartão diretamente no Roomly.

Essa responsabilidade permanece com o Mercado Pago.

Antes de produção ainda deve ser feita uma revisão específica de:

```text
retenção de dados
exclusão
exportação
logs
auditoria
cookies
base legal
política de privacidade
subprocessadores
transferências internacionais
segurança dos dados
```

Não assumir que LGPD está concluída apenas porque existem RLS e criptografia.

---

# 29. O que está faltando aplicar/configurar

As principais pendências conhecidas são:

### Supabase

```text
confirmar projeto/região atual
preencher .env.local
rodar migrations
rodar testes reais
validar RLS
```

### Mercado Pago

```text
preencher Public Key
preencher Access Token
testar sandbox
criar staging HTTPS
configurar webhook
obter/configurar webhook secret
```

### Resend

```text
adicionar domínio
configurar DNS
verificar domínio
criar API Key
configurar remetente
testar envio
```

### n8n

```text
configurar HMAC
publicar workflow
configurar Production URL
corrigir comparação para timing-safe
testar limpeza real
```

### Sentry

```text
configurar DSNs
organização/projeto
auditar arquivos do wizard
corrigir sample rate
testar captura real
```

### Secrets internos

```text
gerar CRON_SECRET
gerar ACCESS_CODE_ENCRYPTION_KEY
```

### TTLock

```text
comprar/disponibilizar fechadura
gateway
Open API
credenciais
POC física
testes de falha
```

### Infraestrutura

```text
confirmar GitHub remote
confirmar CI
deploy de staging
HTTPS
secret manager
backup
monitoramento
alertas
```

---

# 30. O que NÃO priorizar agora

A especificação possui uma segunda fase com recursos como:

```text
extensão da reserva em 1 clique
WhatsApp Business
cupons
planos recorrentes
pacotes de horas
créditos empresariais
check-in
QR Code
avaliações
notas fiscais
ERP
aplicativo mobile
estacionamento
catracas
biometria
reconhecimento facial
```

Não começar por esses itens.

Primeiro provar que o fluxo fundamental funciona de ponta a ponta:

```text
RESERVAR
→ PAGAR
→ LIBERAR ACESSO
→ EXPIRAR ACESSO
→ LIMPAR
```

Depois evoluir o produto.

---

# 31. Prioridade arquitetural

Seguir a prioridade definida originalmente:

```text
1. Segurança
2. Confiabilidade
3. Reserva correta
4. Controle de acesso
5. Pagamento
6. Experiência do usuário
7. Automação
8. Escalabilidade
```

Uma falha não significa apenas uma tela quebrada.

Pode significar:

```text
duas pessoas reservando a mesma sala

cliente pagando sem conseguir entrar

pessoa entrando fora do horário

senha permanecendo ativa

pagamento duplicado

reembolso duplicado
```

Por isso, operações de:

```text
booking
payment
access
```

precisam de:

```text
validação
idempotência
retry
logs
auditoria
monitoramento
reconciliação
```

---

# 32. Definição de concluído

Não considerar uma funcionalidade concluída apenas porque “funciona no computador”.

Ela deve possuir:

```text
implementação
+
testes
+
tratamento de erro
+
idempotência quando necessária
+
logs
+
segurança
+
documentação
+
staging
+
validação funcional
```

---

# 33. Observação importante sobre os anexos recebidos

O ZIP usado para gerar este handoff contém principalmente arquivos auxiliares:

```text
.env.example
AGENTS.md
CLAUDE.md
Cowork Booking Platform (roomly).md
Dockerfile
eslint.config.mjs
package-lock.json
package.json
postcss.config.mjs
README.md
tsconfig.json
...
```

Ele **não contém o repositório completo**, pelo menos neste material de handoff.

Não foram disponibilizados nele para auditoria completa:

```text
src/
supabase/
tests/
docs/
.github/
```

apesar de o README fazer referência a essas estruturas.

Portanto:

**não confiar cegamente nas afirmações de “já implementado”.**

Quando tiver acesso ao repositório real, comparar:

```text
documentação
versus
implementação existente
```

e atualizar este estado.

---

# 34. Instrução direta para a IA que assumir o projeto

Você está assumindo um projeto já desenvolvido chamado **Roomly**.

NÃO recrie o sistema do zero.

NÃO altere arquitetura sem primeiro estudar o código existente.

NÃO peça ao usuário para enviar secrets pelo chat.

Comece fazendo uma auditoria objetiva do repositório.

Primeiro informe:

```text
1. O que realmente existe no código.
2. O que realmente está funcionando.
3. O que está implementado porém ainda não testado com provedores reais.
4. O que está incompleto.
5. O que está divergente da documentação.
6. Quais riscos você identificou.
```

Depois execute:

```bash
git status
git log --oneline
git remote -v
npm run verify
```

e analise:

```text
src/
supabase/
docs/
tests/
.env.example
package.json
README.md
```

Não apagar ou refatorar uma implementação que já funciona apenas para recriá-la de outra maneira.

Priorize integração e validação do que já existe.

A sequência desejada neste momento é:

```text
1. Confirmar baseline local
2. Validar banco/Supabase
3. Validar Mercado Pago sandbox
4. Criar staging HTTPS
5. Validar webhook Mercado Pago
6. Configurar Resend
7. Configurar n8n
8. Configurar Sentry
9. Executar POC física TTLock
10. Executar E2E completo
11. Revisar segurança/LGPD
12. Preparar produção
```

O objetivo imediato NÃO é adicionar mais features.

O objetivo imediato é transformar um MVP que funciona localmente/simulado em um MVP **validado com infraestrutura e integrações reais**, mantendo segurança, idempotência, observabilidade e isolamento multi-tenant.
