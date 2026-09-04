# API de disponibilidade

Três endpoints públicos de leitura, criados no lote 3 do plano de implementação
([08 — Auditoria e plano](design-system/08-ux-auditoria-e-plano.md)). Todos
derivam o estado das reservas reais: não existe tabela de blocos, e nenhum
consumidor decide disponibilidade no navegador.

## De onde vem cada estado

| Estado | Origem |
| --- | --- |
| `booked` | Reserva `confirmed`, `in_progress` ou hold `awaiting_payment` não vencido |
| `cleaning` | Janela de `rooms.cleaning_time_minutes` logo após cada reserva |
| `past` | Bloco que termina antes de agora, no fuso da unidade |
| `available` | O que sobra dentro do expediente da unidade |

O expediente vive em `locations.opening_time` / `locations.closing_time`
(migração `0002_availability.sql`, padrão 08:00–20:00). A grade é de 30 minutos
(`SLOT_MINUTES`), suficiente para reservas de 60, 90 e 120 minutos.

Cada bloco carrega **estado e motivo**. O motivo é texto em pt-BR pronto para o
`aria-label`: "Reservado", "Limpeza entre reservas", "Horário já passou",
"Livre por apenas 30 min; a reserva mínima é de 60 min".

`maxDurationMinutes` diz quantos minutos cabem a partir daquele bloco, limitado
pelo próximo bloco ocupado, pelo fechamento e por `maximum_booking_minutes`.
É o que impede o seletor de oferecer duas horas onde só há uma.

## Leitura anônima sem afrouxar a RLS

A política `bookings_owner_or_manager` restringe reservas ao dono e aos
gestores, e continua assim. A ocupação sai pela função `room_busy_intervals`,
`security definer`, que devolve apenas intervalo e motivo — nunca o id da
reserva, o usuário ou o valor. Quem reservou permanece invisível; que às 14h
está ocupado é informação pública de uma sala à venda.

## Endpoints

### `GET /api/salas/[slug]/disponibilidade?data=AAAA-MM-DD`

`data` é opcional e assume hoje.

```json
{
  "room": { "slug": "sala-executiva", "name": "Sala Executiva", "unit": "Ágora Tech Park" },
  "day": "2026-09-10",
  "timeZone": "America/Sao_Paulo",
  "openingTime": "08:00",
  "closingTime": "20:00",
  "slotMinutes": 30,
  "minimumMinutes": 60,
  "maximumMinutes": 240,
  "blocks": [
    {
      "time": "15:00",
      "startAt": "2026-09-10T18:00:00.000Z",
      "endAt": "2026-09-10T18:30:00.000Z",
      "state": "booked",
      "reason": "Reservado",
      "maxDurationMinutes": 0
    }
  ],
  "summary": {
    "day": "2026-09-10",
    "state": "partial",
    "free": 14,
    "total": 24,
    "nextFree": "08:00",
    "label": "14 livres"
  }
}
```

`422` para data inexistente (2026-02-31 inclusive), `404` para sala desconhecida,
`429` acima de 120 consultas por minuto, `503` quando o banco falha.

### `GET /api/salas/[slug]/calendario?mes=AAAA-MM`

Devolve `days`, um `summary` por dia do mês, com `state` em
`free` · `partial` · `full` · `past` · `closed` e `label` já escrito
("8 livres", "Lotado", "Data passada"). Uma única consulta cobre o mês inteiro.

`state` é `free` quando **nada** está ocupado — não quando todos os blocos
aceitam a duração mínima. O último bloco do dia quase nunca comporta uma hora, e
sem essa distinção um dia intocado apareceria como parcial.

### `GET /api/disponibilidade?data=AAAA-MM-DD&unidade=`

Resumo de todas as salas ativas num dia, para o filtro do catálogo. `unidade`
casa com o nome da unidade, sem diferenciar maiúsculas. Unidade inexistente
devolve `200` com lista vazia, não erro.

## Consumidores

`AvailabilityCalendar` (`src/components/ui/availability-calendar.tsx`) consome o
calendário; `TimeSlotPicker` (`src/components/ui/time-slot-picker.tsx`) consome
o dia. As duas requisições vivem em `src/components/use-availability.ts`, uma
por chave e canceladas quando a chave muda — sem isso a resposta de um dia
antigo poderia chegar depois e sobrescrever a do dia em tela.

Um bloco indisponível recebe `aria-disabled` em vez de `disabled`: continua
alcançável pelo teclado, e o motivo vai no `aria-label` — "08:00, indisponível,
reservado". Retirar o bloco da ordem de foco o faria sumir sem explicação.

**Desvio consciente da especificação**: o Time Slot Picker de
[02 — Componentes](design-system/02-componentes.md) prevê seleção por intervalo
(primeiro clique marca o início, segundo o fim). O fluxo de reserva já tinha um
seletor de duração, e dois controles disputando a mesma decisão confundem mais
do que ajudam. O picker escolhe o início e o seletor de duração define o fim,
limitado por `maxDurationMinutes`; os blocos cobertos aparecem no estado
"intervalo" da especificação.

## Testes

- `src/modules/availability/domain.test.ts` — 23 testes do cálculo puro,
  incluindo fuso de Manaus e fevereiro bissexto.
- `src/modules/availability/api.test.ts` — 10 testes de integração entrando
  pelas três rotas em modo simulador.
- `supabase/tests/availability.sql` — 8 asserções pgTAP: janela de limpeza,
  hold vencido, reserva cancelada e leitura pelo papel `anon`.
- `e2e/roomly.spec.ts` — o navegador reserva um bloco, recarrega a página e
  encontra o mesmo bloco reservado, riscado, com o motivo no `aria-label` e
  recusando o clique.
