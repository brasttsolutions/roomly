# Guia local do Roomly

Como rodar, testar e operar o Roomly na sua máquina. Complementa o
[HANDOFF](HANDOFF.md) (contexto do projeto), a [ARQUITETURA](ARCHITECTURE.md),
a [OPERAÇÃO](OPERATIONS.md) e a [VERIFICAÇÃO](VERIFICATION.md).

---

## 1. Os dois modos de execução

O Roomly funciona inteiro sem credencial nenhuma. Quem decide isso são três
variáveis do `.env.local`:

```env
ROOMLY_INTEGRATION_MODE=simulator|supabase
ROOMLY_PAYMENT_MODE=simulator|mercado_pago
ROOMLY_ACCESS_MODE=simulator|ttlock
```

| Valor | O que muda |
| --- | --- |
| `ROOMLY_INTEGRATION_MODE=simulator` | Catálogo, login e reservas são fictícios e vivem na memória. Nada é gravado. |
| `ROOMLY_INTEGRATION_MODE=supabase` | Tudo passa pelo PostgreSQL: autenticação, salas, reservas, pagamentos, jobs e administração. |
| `ROOMLY_PAYMENT_MODE=simulator` | A cobrança é gerada localmente, com um identificador `sim_pay_...`. |
| `ROOMLY_PAYMENT_MODE=mercado_pago` | A cobrança vai de verdade para o Mercado Pago. |
| `ROOMLY_ACCESS_MODE=simulator` | A senha da porta é simulada. Único valor permitido até a POC física. |

> **Atenção ao valor exato.** Qualquer texto diferente de `mercado_pago` cai no
> simulador em silêncio — `simulador`, com D, é lido como simulador. O mesmo vale
> para `supabase`: qualquer outra grafia volta para o modo simulador sem avisar.

---

## 2. Subir a aplicação

```bash
npm install
npm run dev
```

Abra **`http://localhost:3000`**.

> **Use `localhost`, não `127.0.0.1`.** O Next 16 bloqueia recursos de
> desenvolvimento vindos de outra origem. Pelo IP a página até carrega, mas o
> JavaScript não é ativado: os botões não respondem e o checkout nunca avança.

### Quando aparecer 404 em páginas que existem

Sintoma: `/` abre normalmente, mas `/entrar`, `/admin` e até `/api/health`
devolvem "404 This page could not be found".

Causa: a pasta `.next` ficou inconsistente. Isso acontece quando mais de um
servidor usa a mesma pasta — dois `npm run dev` em portas diferentes, ou um
`npm run dev` rodando enquanto `npm run verify` executa o `next build`.

Solução:

```bash
npx kill-port 3000
rm -rf .next
npm run dev
```

Como prevenir: não deixe `npm run dev` aberto enquanto roda `npm run verify`.

### Conferir se está tudo de pé

```bash
curl http://localhost:3000/api/health   # sempre 200 se o servidor subiu
curl http://localhost:3000/api/ready    # 200 só quando toda a configuração existe
```

O `/api/ready` devolve **503 com a lista do que falta**. Hoje ele responde
`{"status":"not_ready","missing":["resend_api_key"]}` — é o esperado enquanto o
Resend não estiver configurado, e não impede nada de ser testado.

---

## 3. O que dá para testar hoje

| Funcionalidade | Simulador | Supabase |
| --- | --- | --- |
| Catálogo, filtros e página da sala | fictício | real, vindo do banco |
| Login e cadastro por convite | pula direto | real, via Supabase Auth |
| Reserva com hold de 10 minutos | fictício | real, com preço calculado no banco |
| Bloqueio de horário conflitante | não exercita | real, garantido pelo índice GiST |
| Webhook de pagamento assinado | real (HMAC próprio) | real, com deduplicação no banco |
| Fila de jobs | devolve vazio | real |
| Código de acesso temporário | simulado | gravado com janela e máscara |
| Painel `/admin` | dados fictícios | real, exceto Relatórios e Configurações |
| Cancelamento | visual | real |
| Reembolso | — | precisa do Mercado Pago |
| E-mail | — | precisa do Resend |
| Limpeza | — | precisa do n8n |
| Fechadura física | simulada | bloqueada até a POC |

Relatórios e Configurações são telas montadas, mas ainda sem consulta ao banco:
em modo `supabase` elas aparecem vazias. Não é defeito, é funcionalidade não
implementada.

---

## 4. Usuários: como criar cada tipo

Existem cinco papéis, do menor para o maior: `customer`, `employee`, `manager`,
`admin`, `super_admin`.

| Papel | O que pode fazer |
| --- | --- |
| `customer` | Reservar e ver as próprias reservas. **Não entra no `/admin`.** |
| `employee` | Entra no `/admin` e enxerga a operação, mas não cadastra. |
| `manager` | Cadastra unidades, salas e fechaduras; convida clientes e operação. |
| `admin` | Tudo do gerente, e ainda convida gerentes. |
| `super_admin` | Único que pode criar outro administrador. |

### 4.1. O primeiro administrador da empresa

Há um ovo e galinha: convidar alguém exige estar logado como administrador. Por
isso **o primeiro administrador de cada empresa nasce por inserção direta**, com
a chave de serviço — nunca pela interface.

São três passos: criar o usuário no Supabase Auth, vinculá-lo à empresa em
`company_members` e criar o `profiles`. O script abaixo faz os três:

```bash
node --env-file=.env.local -e "
const url=process.env.NEXT_PUBLIC_SUPABASE_URL, sr=process.env.SUPABASE_SERVICE_ROLE_KEY;
const COMPANY='COLE_AQUI_O_ID_DA_EMPRESA';
const EMAIL='admin@suaempresa.com', NOME='Nome do Administrador';
const h={apikey:sr,authorization:'Bearer '+sr,'content-type':'application/json'};
(async()=>{
  const r=await fetch(url+'/auth/v1/admin/users',{method:'POST',headers:h,
    body:JSON.stringify({email:EMAIL,password:process.argv[1],email_confirm:true})});
  const u=await r.json();
  if(!u.id){console.log('falhou:',r.status,JSON.stringify(u).slice(0,200));return;}
  console.log('usuario:',u.id);
  for (const [t,row] of [
    ['company_members',{company_id:COMPANY,auth_user_id:u.id,role:'admin'}],
    ['profiles',{company_id:COMPANY,auth_user_id:u.id,name:NOME,email:EMAIL,role:'admin'}]]) {
    const rr=await fetch(url+'/rest/v1/'+t,{method:'POST',
      headers:{...h,Prefer:'resolution=ignore-duplicates'},body:JSON.stringify([row])});
    console.log(t, rr.status);
  }
})();
" 'SenhaForteAqui'
```

Troque `role:'admin'` por `role:'super_admin'` se esse usuário precisar criar outros administradores depois.

Para descobrir o ID da empresa:

```bash
node --env-file=.env.local -e "
const u=process.env.NEXT_PUBLIC_SUPABASE_URL,k=process.env.SUPABASE_SERVICE_ROLE_KEY;
fetch(u+'/rest/v1/companies?select=id,name',{headers:{apikey:k,authorization:'Bearer '+k}})
  .then(r=>r.text()).then(console.log);
"
```

> A senha vai como argumento (`process.argv[1]`) justamente para não ficar
> escrita no meio do código. Ainda assim ela fica no histórico do terminal —
> troque-a depois pelo painel do Supabase, ou peça que a pessoa redefina.

### 4.2. Os demais usuários, pelo convite

Esse é o caminho de verdade, e o único que não exige acesso ao banco:

1. entre como gerente ou administrador e vá em **`/admin/clientes`**;
2. clique em **Novo cliente**;
3. informe o e-mail e escolha o papel;
4. **enquanto o Resend não estiver configurado, o link do convite aparece na
   própria tela**, no lugar da mensagem de confirmação. Copie o link. Depois de
   configurar o Resend, ele passa a ser enviado por e-mail automaticamente;
5. a pessoa abre `/cadastro?convite=TOKEN`, informa nome, **o mesmo e-mail que
   recebeu o convite** e uma senha de pelo menos 10 caracteres;
6. no primeiro acesso, a função `accept_company_invitation` cria o perfil e o
   vínculo já com o papel convidado.

O convite vale 7 dias, funciona uma única vez e só aceita o e-mail exato para o
qual foi emitido. O token nunca é gravado: o banco guarda apenas o hash SHA-256.

**Quem pode conceder qual papel** — regra aplicada no banco, não só na tela:

| Quem convida | Pode conceder |
| --- | --- |
| `manager` | `customer`, `employee` |
| `admin` | `customer`, `employee`, `manager` |
| `super_admin` | todos, inclusive `admin` |

### 4.3. O cabeçalho depois do login

Assim que a sessão existe, o botão "Entrar" dá lugar ao **nome da pessoa
logada**. Clicando no nome abre um menu com:

| Item | Para quê |
| --- | --- |
| Área administrativa | Só aparece para quem não é `customer` |
| Editar conta | `/conta` — nome e telefone |
| Configurações | `/configuracoes` — senha e sessões |
| Sair da conta | Encerra a sessão e volta para o catálogo |

Quem tem papel de operação ou acima ganha também um **botão verde "Área
administrativa" direto no cabeçalho**, sem precisar digitar `/admin` na URL.

Em `/conta` dá para alterar nome e telefone. E-mail, empresa e papel aparecem
como leitura: são alterados por um gestor, não pela própria pessoa.

Em `/configuracoes` estão a troca de senha (mínimo de 10 caracteres) e o
encerramento de todas as sessões, útil quando se perde um aparelho ou se
suspeita que alguém tem a senha. Não há preferências de notificação: elas
exigiriam uma coluna nova no banco, e um interruptor que não faz nada seria pior
do que não existir.

> No modo `simulator` o cabeçalho sempre mostra uma conta fictícia, porque a
> aplicação assume uma identidade de demonstração. "Sair da conta" apenas volta
> para o catálogo. Para exercitar o login de verdade, use o modo `supabase`.

---

## 5. Como cadastrar uma sala

Logado como gerente ou administrador, **nesta ordem**:

**1. Unidade** — `/admin/unidades` → **Nova unidade**

| Campo | Regra |
| --- | --- |
| Nome | 2 a 120 caracteres |
| Endereço | 5 a 240 caracteres |
| Cidade | 2 a 120 caracteres |
| Estado | exatamente 2 letras (`SC`) |
| CEP | 8 a 10 caracteres |

**2. Sala** — `/admin/salas` → **Nova sala**

| Campo | Regra |
| --- | --- |
| Unidade | escolhida entre as unidades ativas |
| Nome | 2 a 120 caracteres |
| Descrição | **mínimo de 10 caracteres** |
| Capacidade | 1 a 100 |
| Preço por hora | **em centavos**: R$ 120,00 se escreve `12000` |

O endereço da sala é gerado a partir do nome: "Sala Executiva" vira
`/salas/sala-executiva`. Acentos e símbolos são removidos.

**3. Fechadura** — `/admin/fechaduras` → **Nova fechadura**

| Campo | Regra |
| --- | --- |
| Sala | a sala recém-criada |
| Nome | como a equipe chama a fechadura |
| ID externo TTLock | identificador da fechadura no provedor |
| ID do gateway | opcional |

> **O passo 3 não é opcional.** Sem fechadura vinculada, a reserva é paga e
> confirmada normalmente, mas o job `access.provision` falha com
> `lock_not_found` e vai para revisão manual: **o cliente paga e não recebe o
> código de acesso.** Cadastre a fechadura antes de publicar a sala.

Valores herdados pela sala, hoje ajustáveis só no banco: limpeza de 20 minutos,
reserva de 60 a 240 minutos e tolerância de acesso de 5 minutos antes e depois.

---

## 6. Ciclo completo de uma reserva

Para ver o fluxo inteiro em modo `supabase`:

1. entre como cliente e reserve uma sala em `/salas/...`. A reserva nasce em
   `awaiting_payment` com hold de 10 minutos;
2. confirme o pagamento. Em modo simulador a cobrança é criada na hora;
3. dispare o webhook (é o Mercado Pago que faz isso em produção):

```bash
node -e "
const {createHmac}=require('node:crypto');
const secret='SEU_MERCADO_PAGO_WEBHOOK_SECRET';
const body=JSON.stringify({id:'evt-1',type:'payment.updated',data:{
  id:'ID_DO_PAGAMENTO', status:'approved',
  bookingId:'ID_DA_RESERVA', amountCents:12000}});
fetch('http://localhost:3000/api/webhooks/mercado-pago',{method:'POST',
  headers:{'content-type':'application/json',
    'x-roomly-signature':createHmac('sha256',secret).update(body).digest('hex')},
  body}).then(async r=>console.log(r.status, await r.text()));
"
```

4. rode o worker, que é quem cria o código de acesso e envia notificações:

```bash
curl -X POST http://localhost:3000/api/internal/jobs/run \
  -H "authorization: Bearer $(grep '^CRON_SECRET=' .env.local | cut -d= -f2-)"
```

Em produção esse worker é chamado a cada minuto por um agendador.

Respostas esperadas do webhook: assinatura errada devolve **401**; o evento
válido devolve `booking_confirmed`; o mesmo evento reenviado devolve
`duplicate`; um valor diferente do cobrado devolve `manual_review`.

Depois do worker, a reserva fica `confirmed`, o código de acesso fica `active`
com a janela correta, e `notification.send` volta para retry com
`resend_not_configured` — comportamento certo enquanto não houver Resend.

---

## 7. Os containers do Docker

Levantados por `npx supabase start`. É um Supabase completo na sua máquina, sem
nenhuma relação com o projeto hospedado.

| Container | Para que serve | Porta |
| --- | --- | --- |
| `db` | O PostgreSQL 17.6 em si | 54322 |
| `kong` | Portão de entrada: `/rest`, `/auth` e `/storage` passam por ele | **54321** |
| `rest` | PostgREST, transforma as tabelas em API REST; é o que o `supabase-js` chama | interna |
| `auth` | GoTrue: login, senha, tokens e confirmação de e-mail | interna |
| `studio` | Painel web do Supabase | **54323** |
| `pg_meta` | API que o Studio usa para inspecionar tabelas e funções | interna |
| `inbucket` | Mailpit, uma caixa de e-mail falsa que captura as mensagens locais | **54324** |
| `storage` | Upload de arquivos. O Roomly não usa hoje | interna |
| `realtime` | Websockets de mudanças no banco. O Roomly não usa hoje | interna |
| `analytics` | Logflare, junta os logs dos serviços para o Studio | 54327 |
| `vector` | Agente que envia os logs dos containers para o Logflare | — |

O `vector` reinicia em laço no Windows. É inofensivo e não afeta o Roomly.

O mais útil no dia a dia é o **Mailpit em `http://localhost:54324`**: dá para
conferir convites e confirmações sem depender do Resend.

Comandos:

```bash
npx supabase start          # sobe tudo
npx supabase stop           # derruba tudo
npx supabase db reset --local  # recria o banco: migration + seed
npm run test:db             # roda os testes pgTAP
```

`db reset` **apaga todos os dados locais** e recria do zero. Nunca aponta para o
projeto hospedado.

---

## 8. O que existe no banco

Uma única migration, `supabase/migrations/0001_roomly_foundation.sql`, com 19
tabelas.

| Grupo | Tabelas | Papel |
| --- | --- | --- |
| Identidade e empresa | `companies`, `company_members`, `profiles`, `company_invitations` | quem é a empresa, quem pertence a ela e com qual papel |
| Catálogo | `locations`, `rooms`, `room_images`, `room_features`, `room_feature_relations` | unidades, salas, fotos e características |
| Reserva e dinheiro | `bookings`, `payments`, `payment_events` | a reserva com seu intervalo, a cobrança e cada notificação recebida do provedor |
| Acesso físico | `locks`, `booking_access_codes` | a fechadura de cada sala e o código temporário emitido |
| Confiabilidade | `durable_jobs`, `idempotency_records`, `integration_operations`, `request_rate_limits` | fila com repetição, deduplicação e limite de requisições |
| Operação | `cleaning_requests`, `notifications`, `audit_logs` | limpeza, mensagens enviadas e trilha de auditoria |

As três peças que sustentam a segurança:

- **RLS ligado nas 19 tabelas.** O banco recusa devolver dados de outra empresa
  mesmo que a aplicação erre. Coberto por
  `supabase/tests/rls_tenant_isolation.sql`.
- **`bookings_no_room_overlap`.** Índice GiST que torna impossível duas reservas
  ocuparem a mesma sala no mesmo horário, mesmo em requisições simultâneas. Fim
  de reserva e início da seguinte podem coincidir.
- **Funções com `security definer`**, que concentram as operações críticas:

| Função | Responsabilidade |
| --- | --- |
| `create_booking_hold` | Calcula o preço no servidor e cria a reserva com hold |
| `record_pending_payment` | Registra a cobrança pendente |
| `process_payment_event` | Confirma o pagamento, deduplica webhooks e enfileira os jobs |
| `cancel_booking` | Cancela e agenda a revogação do acesso |
| `accept_company_invitation` | Valida o convite e cria perfil e vínculo |
| `claim_durable_jobs` | Reserva jobs com `SKIP LOCKED` e concessão de 2 minutos |
| `complete_durable_job`, `retry_durable_job` | Encerram ou reagendam com recuo progressivo |
| `consume_rate_limit` | Limite de requisições distribuído |
| `is_company_member`, `can_manage_company`, `can_invite_role` | Base das políticas de RLS |

O preço **nunca** vem do navegador: é recalculado a partir da tarifa da sala e da
duração. O mesmo vale para empresa e perfil, derivados da sessão.

### Tipos de job

| Job | Quando roda |
| --- | --- |
| `booking.expire` | No fim do hold, se o pagamento não chegou |
| `booking.complete` | No horário final da reserva |
| `cleaning.request` | Depois de concluída, aciona o n8n |
| `notification.send` | Envia o e-mail de confirmação |
| `refund.request` | Reembolso pelo Mercado Pago |
| `access.provision` | Cria a senha temporária |
| `access.reconcile` | Resolve resposta ambígua da fechadura |
| `access.revoke` | Revoga o acesso após a tolerância |

---

## 9. Ambiente hospedado

O projeto fica em **`sa-east-1` (São Paulo)**, PostgreSQL 17.6, com a migration
já aplicada. Nele existem dois inquilinos:

- o inquilino real, com um `super_admin`;
- **`Ágora Coworking (demonstração)`**, criado para exercitar o fluxo sem
  misturar dados: 2 unidades, 3 salas, 3 fechaduras e dois logins descartáveis,
  `demo@roomly.test` e `admin.demo@roomly.test`.

**Remova o inquilino de demonstração e os dois logins antes de produção.** Basta
apagar a empresa `10000000-0000-4000-8000-000000000001` — unidades, salas,
fechaduras e reservas saem em cascata — e excluir os usuários pelo painel de
Auth.

---

## 10. Verificação

```bash
npm run verify    # lint, tipos, testes, build e navegador
npm run test:db   # testes pgTAP, exige o Supabase local no ar
```

Rode antes e depois de qualquer alteração relevante. **Não deixe `npm run dev`
aberto durante o `verify`** — os dois disputam a pasta `.next` e é isso que
provoca os 404 descritos na seção 2.

---

## 11. Segredos

Tudo em `.env.local`, que já está no `.gitignore`. Nunca no `.env.example`, nunca
em commit, nunca no navegador.

Os dois segredos internos não vêm de provedor nenhum e precisam ser aleatórios:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

- `CRON_SECRET` protege `/api/internal/jobs/run`;
- `ACCESS_CODE_ENCRYPTION_KEY` está reservado para a cifragem do código de
  acesso. **Ainda não é usado pelo código** — hoje só a impressão mascarada é
  gravada. Implementar a cifragem é pendência da POC do TTLock.

Nunca podem chegar ao navegador: `SUPABASE_SERVICE_ROLE_KEY`,
`MERCADO_PAGO_ACCESS_TOKEN`, as credenciais do TTLock, `CRON_SECRET` e
`ACCESS_CODE_ENCRYPTION_KEY`. Só variáveis com prefixo `NEXT_PUBLIC_` são
enviadas ao cliente.
