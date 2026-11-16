# Cowork Booking Platform

Plataforma web para **reserva automatizada de salas de coworking**, com pagamento online, controle de acesso por senha temporária, gerenciamento de fechaduras inteligentes, notificações, automação de limpeza e painel administrativo.

O projeto será inicialmente validado com **um único cliente**, porém sua arquitetura será construída desde o início com suporte a **múltiplas empresas, unidades e salas**, permitindo futura comercialização como SaaS.

---

# 1. Objetivo

Criar uma plataforma na qual o usuário possa:

1. Visualizar salas disponíveis.
2. Escolher uma data e horário.
3. Realizar o pagamento.
4. Ter sua reserva confirmada automaticamente.
5. Receber uma senha temporária para acessar a sala.
6. Utilizar a senha apenas durante o período reservado.
7. Estender a reserva caso exista disponibilidade.
8. Finalizar a utilização da sala.
9. Acionar automaticamente o processo de limpeza após a reunião.

Todo o fluxo deve exigir o mínimo possível de intervenção humana.

---

# 2. Visão do Produto

Fluxo principal:

```text
Usuário
   ↓
Escolhe uma sala
   ↓
Seleciona data e horário
   ↓
Sistema verifica disponibilidade
   ↓
Reserva temporariamente o horário
   ↓
Usuário realiza pagamento
   ↓
Mercado Pago confirma pagamento
   ↓
Webhook recebido pelo Backend
   ↓
Reserva confirmada
   ↓
Backend gera senha temporária
   ↓
TTLock / Fechadura recebe credencial
   ↓
Cliente recebe confirmação + senha
   ↓
Reunião acontece
   ↓
Senha expira automaticamente
   ↓
Reserva é encerrada
   ↓
Equipe de limpeza é acionada
```

---

# 3. Stack Tecnológica

## Frontend

- Next.js
- TypeScript
- React
- Tailwind CSS
- shadcn/ui

## Backend

Inicialmente o backend poderá utilizar o próprio Next.js através de:

```text
Server Actions
Route Handlers
API Routes
Server Components
```

Isso reduz a complexidade do MVP sem impedir uma futura separação entre frontend e backend.

## Banco de Dados

```text
PostgreSQL
Supabase
```

O Supabase será utilizado inicialmente para:

- PostgreSQL
- Authentication
- Row Level Security
- Storage
- Edge Functions quando necessário

## Pagamentos

```text
Mercado Pago
```

Métodos iniciais:

- PIX
- Cartão

## Controle de acesso

```text
TTLock Open API
```

Hardware:

```text
Fechadura compatível com TTLock
+
Teclado numérico
+
Gateway Wi-Fi
```

## Automações

```text
n8n
```

Responsável principalmente por tarefas secundárias como:

- Notificação da equipe de limpeza
- Alertas internos
- Integrações externas
- Comunicação com outros sistemas

## E-mail

```text
Resend
```

## Hospedagem

```text
Vercel
```

## Monitoramento

```text
Sentry
```

---

# 4. Princípios da Arquitetura

O sistema deve seguir alguns princípios desde o início.

### Multi-tenant

Mesmo o primeiro cliente sendo único, todas as entidades principais devem possuir vínculo com uma empresa.

Exemplo:

```text
company_id
```

Isso permitirá futuramente:

```text
Empresa A
 ├── Unidade Joinville
 │    ├── Sala 01
 │    └── Sala 02
 │
 └── Unidade Curitiba
      └── Sala 01

Empresa B
 ├── Unidade São Paulo
 └── Unidade Campinas
```

Cada empresa deverá enxergar apenas seus próprios:

- usuários;
- unidades;
- salas;
- reservas;
- pagamentos;
- fechaduras;
- relatórios;
- solicitações de limpeza.

---

# 5. Arquitetura Geral

```text
                    ┌─────────────────┐
                    │     Cliente     │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │     Next.js     │
                    │   Frontend UI   │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │     Backend     │
                    │     Next.js     │
                    └─────┬────┬──────┘
                          │    │
                ┌─────────┘    └──────────┐
                ▼                         ▼
        ┌───────────────┐        ┌────────────────┐
        │   Supabase    │        │ Mercado Pago   │
        │  PostgreSQL   │        │    Payments    │
        └───────────────┘        └────────────────┘
                │
                │
                ▼
        ┌───────────────┐
        │     TTLock    │
        │ Smart Locks   │
        └───────────────┘
                │
                ▼
        ┌───────────────┐
        │      n8n      │
        │  Automations  │
        └───────────────┘
```

---

# 6. Estrutura Inicial do Banco

## companies

Empresas que utilizam a plataforma.

```text
id
name
document
email
phone
timezone
status
created_at
updated_at
```

---

## locations

Unidades físicas.

```text
id
company_id
name
address
city
state
zip_code
latitude
longitude
timezone
status
created_at
updated_at
```

---

## rooms

Salas disponíveis para reserva.

```text
id
company_id
location_id
name
description
capacity
hourly_price
cleaning_time_minutes
minimum_booking_minutes
maximum_booking_minutes
access_before_minutes
access_after_minutes
status
created_at
updated_at
```

---

## room_images

```text
id
room_id
url
position
created_at
```

---

## room_features

Exemplos:

```text
Wi-Fi
TV
Projetor
Ar-condicionado
Lousa
Videoconferência
Café
```

Estrutura:

```text
id
name
icon
```

---

## room_feature_relations

```text
room_id
feature_id
```

---

## locks

Representa a fechadura instalada na sala.

```text
id
company_id
room_id
provider
external_lock_id
gateway_id
name
status
last_online_at
created_at
updated_at
```

---

## profiles

Perfil dos usuários.

```text
id
company_id
auth_user_id
name
email
phone
role
status
created_at
updated_at
```

Possíveis roles:

```text
customer
employee
manager
admin
super_admin
cleaning
```

---

# 7. Reservas

Tabela principal:

## bookings

```text
id
company_id
location_id
room_id
user_id

start_at
end_at

subtotal
discount
total

status

payment_status
access_status
cleaning_status

created_at
updated_at
cancelled_at
completed_at
```

Status possíveis:

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

---

# 8. Reserva Temporária

Quando o usuário selecionar um horário, o sistema deverá criar um bloqueio temporário.

Exemplo:

```text
14:00 → 15:00
```

Esse horário pode ficar reservado durante aproximadamente:

```text
10 minutos
```

enquanto o pagamento é realizado.

Caso o pagamento não aconteça:

```text
reservation_hold
      ↓
expira
      ↓
horário volta a ficar disponível
```

Isso evita que dois usuários paguem pela mesma sala simultaneamente.

---

# 9. Controle de Concorrência

Antes de confirmar qualquer reserva, o backend deverá verificar se existe conflito.

Regra:

```text
nova.start < existente.end
AND
nova.end > existente.start
```

Se verdadeiro, existe conflito.

A validação deve ocorrer no banco de dados e não apenas no frontend.

O frontend jamais poderá ser considerado fonte confiável para disponibilidade.

---

# 10. Pagamentos

## Fluxo

```text
Reserva criada
      ↓
status = awaiting_payment
      ↓
Pagamento criado
      ↓
Mercado Pago
      ↓
Cliente paga
      ↓
Webhook
      ↓
Backend valida webhook
      ↓
Pagamento confirmado
      ↓
Reserva confirmada
```

---

# 11. Tabela de Pagamentos

## payments

```text
id
company_id
booking_id

provider
provider_payment_id

amount
currency

payment_method
status

idempotency_key

paid_at
refunded_at

created_at
updated_at
```

Status:

```text
pending
approved
rejected
cancelled
refunded
partially_refunded
```

---

# 12. Eventos de Pagamento

Todos os webhooks recebidos devem ser armazenados.

## payment_events

```text
id
payment_id
provider
external_event_id
event_type
payload
processed
processed_at
created_at
```

Isso é importante para:

- auditoria;
- debugging;
- evitar processamento duplicado;
- investigação de problemas financeiros.

---

# 13. Idempotência

Operações críticas deverão ser idempotentes.

Por exemplo:

```text
Mercado Pago envia webhook
↓
Backend processa
↓
Conexão apresenta problema
↓
Mercado Pago envia webhook novamente
```

O sistema não poderá:

```text
criar duas reservas
criar duas cobranças
criar duas senhas
```

Toda operação importante deverá utilizar:

```text
idempotency_key
```

ou identificadores externos únicos.

---

# 14. Controle de Acesso

Após o pagamento ser confirmado:

```text
booking.confirmed
        ↓
AccessService
        ↓
TTLock API
        ↓
Senha temporária criada
```

Exemplo:

Reserva:

```text
14:00 → 15:00
```

Configuração:

```text
access_before_minutes = 5
access_after_minutes = 5
```

Senha:

```text
13:55 → 15:05
```

---

# 15. Credenciais de Acesso

## booking_access_codes

```text
id
company_id
booking_id
lock_id

provider
external_code_id

access_code_encrypted

valid_from
valid_until

status

created_at
revoked_at
updated_at
```

Status:

```text
pending
active
expired
revoked
failed
```

A senha nunca deve ser armazenada em texto puro quando não for necessário.

---

# 16. Segurança da Senha

O fluxo nunca deve ser:

```text
Frontend
↓
TTLock
```

O correto é:

```text
Frontend
↓
Backend
↓
TTLock
```

Credenciais como:

```text
TTLOCK_CLIENT_ID
TTLOCK_CLIENT_SECRET
MERCADO_PAGO_ACCESS_TOKEN
SUPABASE_SERVICE_ROLE_KEY
```

jamais poderão ficar disponíveis no navegador.

---

# 17. Expiração da Senha

Devemos utilizar mais de uma camada de proteção.

### Camada 1

A própria senha é criada com:

```text
valid_from
valid_until
```

### Camada 2

Após a reserva acabar:

```text
Backend
↓
revoga a senha
```

### Camada 3

Uma rotina de auditoria verifica se existem credenciais que deveriam estar expiradas.

Exemplo:

```text
15:05
 ↓
Senha deixa de funcionar

15:06
 ↓
Backend tenta revogar

15:10
 ↓
Job de auditoria confirma status
```

---

# 18. Extensão da Reserva

Antes do término da reserva:

```text
Sua reunião termina em 10 minutos.

Deseja adicionar +1 hora?
```

O sistema deverá:

```text
verificar disponibilidade
      ↓
calcular valor adicional
      ↓
processar pagamento
      ↓
alterar booking.end_at
      ↓
atualizar validade da senha
```

Se existir outra reserva posteriormente, a extensão não poderá ser realizada.

---

# 19. Limpeza

Depois da reserva:

```text
booking.completed
      ↓
CleaningService
      ↓
cleaning_request criada
      ↓
n8n
      ↓
equipe de limpeza notificada
```

---

# 20. Solicitações de Limpeza

## cleaning_requests

```text
id
company_id
booking_id
room_id

scheduled_at
started_at
completed_at

assigned_to

status

created_at
updated_at
```

Status:

```text
pending
assigned
in_progress
completed
cancelled
```

---

# 21. Inteligência no Agendamento da Limpeza

Antes de solicitar limpeza, verificar:

```text
fim da reserva atual
↓
tempo necessário para limpeza
↓
horário da próxima reserva
```

Exemplo:

```text
Reserva termina: 15:00
Limpeza: 20 minutos
Próxima reserva: 17:00
```

Resultado:

```text
limpeza permitida entre
15:00 e 16:40
```

---

# 22. Notificações

O sistema deverá possuir uma camada própria de notificações.

## notifications

```text
id
company_id
user_id
booking_id

type
channel
destination

subject
content

status

sent_at
failed_at
created_at
```

Canais futuros:

```text
email
whatsapp
sms
push
```

---

# 23. Eventos Importantes

Podemos trabalhar com eventos internos:

```text
booking.created
booking.payment_pending
payment.approved
payment.failed
booking.confirmed
access.created
access.failed
booking.started
booking.ending_soon
booking.extended
booking.completed
access.revoked
cleaning.requested
cleaning.completed
booking.cancelled
refund.completed
```

Isso reduz o acoplamento entre os módulos.

---

# 24. Painel do Cliente

O painel do usuário deverá permitir:

### Próximas reservas

```text
Sala Executiva
01/09/2026

14:00 → 15:00

CONFIRMADA
```

### Código de acesso

Disponibilizar apenas próximo do período da reserva.

```text
Código de acesso

583921

Válido:
13:55 → 15:05
```

### Histórico

```text
Reservas anteriores
Pagamentos
Notas fiscais futuramente
Cancelamentos
Reembolsos
```

---

# 25. Painel Administrativo

Menu inicial:

```text
Dashboard
Reservas
Calendário
Salas
Unidades
Clientes
Pagamentos
Fechaduras
Limpeza
Relatórios
Logs
Configurações
```

---

# 26. Dashboard

Principais indicadores:

```text
Reservas hoje
Reservas no mês
Taxa de ocupação
Faturamento diário
Faturamento mensal
Ticket médio
Horas reservadas
Salas disponíveis
Salas ocupadas
Cancelamentos
```

---

# 27. Calendário Administrativo

Exemplo:

```text
09:00 ─ Sala 01 ─ João
10:00 ─ Sala 01 ─ João
11:00 ─ Sala 01 ─ Livre
12:00 ─ Sala 01 ─ Empresa ABC
13:00 ─ Sala 01 ─ Empresa ABC
```

O administrador poderá visualizar por:

```text
Dia
Semana
Mês
Sala
Unidade
```

---

# 28. Fechaduras

O painel administrativo deverá exibir:

```text
Sala
Fechadura
Status
Gateway
Última comunicação
Bateria
Último acesso
```

Exemplo:

```text
Sala 01
ONLINE

Sala 02
OFFLINE

Sala 03
BATERIA BAIXA
```

---

# 29. Falhas na Criação da Senha

Uma reserva paga não pode simplesmente ficar sem acesso.

Fluxo:

```text
Pagamento confirmado
↓
Tentativa TTLock falha
↓
access_status = failed
↓
Retry automático
↓
Retry novamente
↓
Administrador recebe alerta
```

Nenhuma falha crítica deve desaparecer silenciosamente.

---

# 30. Retry

Integrações externas devem possuir:

```text
retry_count
last_retry_at
next_retry_at
```

Exemplo:

```text
Tentativa 1
↓
30 segundos

Tentativa 2
↓
2 minutos

Tentativa 3
↓
5 minutos
```

Após um determinado limite:

```text
manual_review
```

---

# 31. Logs de Auditoria

## audit_logs

```text
id
company_id
user_id

entity_type
entity_id

action

old_values
new_values

ip_address
user_agent

created_at
```

Exemplos:

```text
BOOKING_CREATED
BOOKING_CANCELLED
PAYMENT_APPROVED
ACCESS_CREATED
ACCESS_REVOKED
ROOM_UPDATED
PRICE_CHANGED
ADMIN_LOGIN
```

---

# 32. Segurança

O projeto deve utilizar desde o início:

- HTTPS obrigatório
- RLS no Supabase
- Controle de acesso baseado em roles
- Rate limiting
- Validação de payload
- Sanitização de entrada
- Proteção contra CSRF quando aplicável
- Proteção contra XSS
- Headers de segurança
- Secrets apenas no backend
- Webhooks assinados/validados
- Auditoria de ações críticas
- Menor privilégio possível
- Logs sem exposição de informações sensíveis
- Criptografia de informações críticas

---

# 33. LGPD

O sistema deverá seguir princípios de:

```text
necessidade
finalidade
transparência
segurança
minimização de dados
```

Evitar armazenar dados pessoais sem necessidade.

Inicialmente:

```text
Nome
E-mail
Telefone
Dados necessários para pagamento/reserva
```

Dados de cartão não devem ser armazenados pela plataforma.

O processamento de cartões será responsabilidade do provedor de pagamento.

---

# 34. Row Level Security

Exemplo conceitual:

```text
Usuário da Empresa A
↓
pode consultar
↓
somente registros
company_id = Empresa A
```

Um usuário da Empresa A nunca poderá consultar informações pertencentes à Empresa B.

---

# 35. Estrutura do Projeto

```text
src/
│
├── app/
│   ├── (public)/
│   ├── (auth)/
│   ├── (customer)/
│   ├── (admin)/
│   │
│   ├── api/
│   │   ├── bookings/
│   │   ├── payments/
│   │   ├── locks/
│   │   ├── webhooks/
│   │   └── cleaning/
│   │
│   └── layout.tsx
│
├── components/
│   ├── ui/
│   ├── booking/
│   ├── rooms/
│   ├── payments/
│   └── admin/
│
├── services/
│   ├── booking/
│   ├── payment/
│   ├── access/
│   ├── cleaning/
│   └── notification/
│
├── integrations/
│   ├── mercado-pago/
│   ├── ttlock/
│   ├── resend/
│   └── n8n/
│
├── repositories/
│
├── lib/
│   ├── auth/
│   ├── database/
│   ├── validation/
│   ├── logging/
│   └── security/
│
├── jobs/
│   ├── expire-bookings/
│   ├── revoke-access/
│   ├── verify-access/
│   └── cleaning/
│
├── types/
│
├── schemas/
│
└── config/
```

---

# 36. Camada de Serviços

Evitar colocar regras de negócio diretamente nas rotas da API.

Exemplo:

```text
POST /api/bookings
        ↓
BookingController
        ↓
BookingService
        ↓
BookingRepository
        ↓
Database
```

A regra de negócio deve ficar no:

```text
BookingService
```

---

# 37. Integrações

Criar abstrações para fornecedores externos.

Exemplo:

```typescript
interface AccessProvider {
  createAccessCode(): Promise<void>
  revokeAccessCode(): Promise<void>
  extendAccessCode(): Promise<void>
}
```

Hoje:

```text
TTLockAccessProvider
```

Amanhã:

```text
IntelbrasAccessProvider
YaleAccessProvider
AssaAbloyAccessProvider
```

O restante do sistema não precisa saber qual fabricante está sendo utilizado.

---

# 38. Payment Provider

Seguir o mesmo conceito.

```typescript
interface PaymentProvider {
  createPayment(): Promise<void>
  getPayment(): Promise<void>
  refundPayment(): Promise<void>
}
```

Implementação inicial:

```text
MercadoPagoProvider
```

Futuramente:

```text
StripeProvider
PagarMeProvider
AsaasProvider
```

---

# 39. Environment Variables

Exemplo:

```env
NEXT_PUBLIC_APP_URL=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

DATABASE_URL=

MERCADO_PAGO_ACCESS_TOKEN=
MERCADO_PAGO_WEBHOOK_SECRET=

TTLOCK_CLIENT_ID=
TTLOCK_CLIENT_SECRET=
TTLOCK_USERNAME=
TTLOCK_PASSWORD=

RESEND_API_KEY=

N8N_WEBHOOK_URL=

SENTRY_DSN=
```

Criar também:

```text
.env.example
```

Nunca versionar:

```text
.env
.env.local
```

---

# 40. Ambientes

Manter:

```text
development
staging
production
```

Nunca testar pagamentos, fechaduras ou alterações destrutivas diretamente em produção.

---

# 41. Branches

Estratégia inicial:

```text
main
develop
feature/*
fix/*
hotfix/*
```

Exemplo:

```text
feature/booking-calendar
feature/mercado-pago
feature/ttlock-integration
fix/booking-overlap
```

---

# 42. Commits

Utilizar padrão semelhante a Conventional Commits:

```text
feat:
fix:
refactor:
docs:
test:
chore:
security:
```

Exemplo:

```text
feat: add room booking flow

fix: prevent overlapping reservations

security: validate payment webhook signature
```

---

# 43. Testes

## Unitários

Testar principalmente regras de negócio:

```text
BookingService
PaymentService
AccessService
CleaningService
```

## Integração

Testar:

```text
Banco
Mercado Pago
TTLock
Supabase
```

## End-to-End

Fluxo completo:

```text
usuário
↓
escolhe sala
↓
reserva
↓
paga
↓
recebe confirmação
↓
senha criada
```

Ferramenta recomendada:

```text
Playwright
```

---

# 44. Casos que obrigatoriamente precisam ser testados

```text
Dois usuários tentando reservar o mesmo horário

Pagamento aprovado duas vezes

Webhook duplicado

Pagamento aprovado com reserva expirada

TTLock offline

Gateway offline

Falha na geração da senha

Falha ao revogar senha

Extensão com próxima reserva existente

Cancelamento

Reembolso

Reserva não paga

Reserva criada sem usuário

Alteração manual pelo administrador
```

---

# 45. Monitoramento

Integrar Sentry para capturar:

```text
exceptions
erros de API
falhas de integração
problemas no frontend
```

Também criar logs estruturados com:

```text
request_id
user_id
company_id
booking_id
payment_id
```

Isso facilita rastrear todo o fluxo.

---

# 46. Request ID

Cada operação importante deverá receber um identificador.

Exemplo:

```text
req_8f72...
```

Assim será possível encontrar:

```text
requisição
↓
reserva
↓
pagamento
↓
webhook
↓
senha
↓
notificação
```

nos logs.

---

# 47. Alertas Críticos

Administradores deverão ser notificados quando:

```text
fechadura ficar offline
gateway ficar offline
senha não for criada
pagamento apresentar inconsistência
webhook falhar repetidamente
senha não for revogada
bateria da fechadura estiver baixa
```

---

# 48. MVP

A primeira versão deverá conter:

### Cliente

- Cadastro
- Login
- Listagem das salas
- Detalhes da sala
- Calendário
- Seleção de horários
- Reserva
- Pagamento PIX
- Pagamento por cartão
- Confirmação
- Código de acesso
- Histórico de reservas
- Cancelamento

### Administração

- Dashboard
- Cadastro de unidades
- Cadastro de salas
- Cadastro de fechaduras
- Calendário de reservas
- Clientes
- Pagamentos
- Limpeza
- Configurações

### Automação

- Webhook Mercado Pago
- Confirmação automática
- Criação da senha
- Expiração da senha
- Revogação da senha
- Notificação da limpeza
- E-mails automáticos

---

# 49. Segunda Fase

Após validar o MVP:

```text
Extensão de reserva em 1 clique

WhatsApp Business

Cupons

Planos recorrentes

Pacotes de horas

Empresas com créditos mensais

Check-in

QR Code

Avaliação da sala

Relatórios avançados

Notas fiscais

Integração com ERP

Aplicativo mobile

Controle de estacionamento

Integração com catracas

Biometria

Reconhecimento facial
```

---

# 50. SaaS

Quando o produto estiver validado, cada empresa poderá possuir seu próprio ambiente lógico.

Exemplo:

```text
cowork-a.plataforma.com
cowork-b.plataforma.com
```

ou:

```text
app.plataforma.com/cowork-a
```

Cada empresa poderá configurar:

```text
Logo
Nome
Cores
Unidades
Salas
Preços
Horários
Política de cancelamento
Tempo de tolerância
Método de pagamento
Equipe de limpeza
```

---

# 51. Plano de Desenvolvimento

## Fase 1 — Fundação

```text
Next.js
Supabase
Autenticação
Banco
Multi-tenant
UI base
Admin
```

## Fase 2 — Reservas

```text
Salas
Calendário
Disponibilidade
Reserva temporária
Prevenção de conflitos
```

## Fase 3 — Pagamentos

```text
Mercado Pago
PIX
Cartão
Webhooks
Idempotência
Cancelamento
Reembolso
```

## Fase 4 — Controle de acesso

```text
TTLock
Gateway
Criação de senha
Expiração
Revogação
Retries
Auditoria
```

## Fase 5 — Limpeza

```text
Cleaning requests
n8n
Notificações
Painel
```

## Fase 6 — Produção

```text
Testes
Sentry
Logs
Rate limiting
Hardening de segurança
Backup
Monitoramento
Deploy
```

---

# 52. POC Obrigatória Antes do Desenvolvimento Completo

Antes de investir tempo no sistema inteiro, deverá ser executada uma prova de conceito com:

```text
1 fechadura
1 gateway
1 sala
1 backend
```

Teste:

```text
Backend
 ↓
TTLock API
 ↓
criar senha
 ↓
abrir a porta
 ↓
aguardar expiração
 ↓
tentar abrir novamente
 ↓
acesso recusado
 ↓
revogar senha via API
```

Também testar:

```text
internet desconectada
gateway offline
backend indisponível
senha expirada
senha revogada
```

Se essa etapa funcionar de maneira confiável, a parte tecnicamente mais crítica do projeto estará validada.

---

# 53. Definição de Pronto

Uma funcionalidade somente deverá ser considerada concluída quando:

```text
implementação finalizada
+
testes realizados
+
tratamento de erros
+
logs implementados
+
segurança revisada
+
documentação atualizada
+
deploy em staging
+
validação funcional
```

---

# 54. Prioridade do Projeto

A prioridade deve ser:

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

A plataforma estará controlando acesso físico a ambientes reais. Portanto uma falha no sistema não é apenas um erro de software.

Pode significar:

```text
usuário sem conseguir entrar
usuário entrando fora do horário
senha permanecendo válida
reserva duplicada
sala ocupada por duas pessoas
cobrança incorreta
```

Por esse motivo, todas as operações relacionadas a pagamento, reserva e acesso devem possuir:

```text
validação
logs
auditoria
idempotência
retry
monitoramento
```

---

# 55. Visão Final

O objetivo não é criar apenas um site para reservar salas.

O projeto deverá funcionar como uma plataforma de:

```text
Booking
+
Payments
+
Smart Access
+
Automation
+
Operations
```

Fluxo ideal:

```text
Cliente encontra a sala
↓
Cliente reserva
↓
Cliente paga
↓
Sistema confirma
↓
Sistema libera acesso
↓
Cliente utiliza
↓
Sistema encerra acesso
↓
Sistema solicita limpeza
↓
Sala fica disponível novamente
```

Com o mínimo possível de intervenção humana.

---

# 56. Stack Final Recomendada

```text
Frontend
Next.js
TypeScript
Tailwind CSS
shadcn/ui

Backend
Next.js
Server Actions
Route Handlers

Database
PostgreSQL
Supabase

Authentication
Supabase Auth

Payments
Mercado Pago

Smart Lock
TTLock Open API

Automation
n8n

E-mail
Resend

Monitoring
Sentry

E2E Testing
Playwright

Hosting
Vercel
```

Essa arquitetura permite desenvolver um MVP relativamente simples para o primeiro cliente, sem comprometer a evolução futura da aplicação para uma plataforma SaaS comercial.