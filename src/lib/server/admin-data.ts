import "server-only";
import {
  adminSections,
  type AdminRecord,
  type AdminRow,
  type AdminSection,
} from "@/lib/admin-sections";
import { adminMetrics, todayBookings } from "@/lib/demo-data";
import { integrationMode } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requestIdentity } from "./identity";
import { cleaningNoticeFields } from "@/modules/cleaning/notice";

type AdminMetric = Readonly<{
  label: string;
  value: string;
  change: string;
  tone: "green" | "blue" | "coral" | "neutral";
}>;
type TodayBooking = Readonly<{
  time: string;
  room: string;
  customer: string;
  duration: string;
  status: string;
}>;

const plain = (cells: string[]): AdminRow => ({ cells });

export async function adminRows(section: AdminSection): Promise<AdminRow[]> {
  if (integrationMode() === "simulator") {
    return adminSections[section].rows.map((row, index) => ({
      cells: [...row],
      // O simulador não persiste: o registro existe só para exercitar a tela.
      record: simulatorRecord(section, index),
    }));
  }
  const supabase = await createSupabaseServerClient();
  if (section === "reservas" || section === "calendario") {
    const { data, error } = await supabase
      .from("bookings")
      .select("id,start_at,end_at,status,customers(name),rooms(name)")
      .order("start_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(`admin_bookings_failed:${error.code}`);
    return (data ?? []).map((row) => {
      const customer = row.customers as { name?: string } | null;
      const room = row.rooms as { name?: string } | null;
      return plain(
        section === "calendario"
          ? [
              formatDate(row.start_at),
              room?.name ?? "Sala",
              customer?.name ?? "Cliente",
              formatDate(row.end_at),
              statusLabel(row.status),
            ]
          : [
              `#${String(row.id).slice(0, 8).toUpperCase()}`,
              customer?.name ?? "Cliente",
              room?.name ?? "Sala",
              formatDate(row.start_at),
              statusLabel(row.status),
            ],
      );
    });
  }
  if (section === "salas") {
    // Sala ativa é catálogo público na RLS; no painel isso mostrava as salas de
    // outros coworkings. Recorta pela empresa da sessão.
    const identity = await requestIdentity();
    if (!identity) throw new Error("admin_identity_required");
    const { data, error } = await supabase
      .from("rooms")
      .select(
        "id,location_id,name,description,capacity,hourly_price_cents,cleaning_notice_offset_minutes,status,locations(name),room_feature_relations(room_features(name))",
      )
      .eq("company_id", identity.companyId)
      .order("name");
    if (error) throw new Error(`admin_rooms_failed:${error.code}`);
    return (data ?? []).map((row) => ({
      cells: [
        row.name,
        (row.locations as { name?: string } | null)?.name ?? "Unidade",
        `${row.capacity} pessoas`,
        money(row.hourly_price_cents),
        row.status === "active" ? "Ativa" : "Inativa",
      ],
      record: {
        id: row.id,
        locationId: row.location_id,
        name: row.name,
        description: row.description,
        capacity: String(row.capacity),
        hourlyPriceCents: String(row.hourly_price_cents),
        status: row.status,
        // O banco guarda um inteiro com sinal; o formulário mostra minutos e
        // direção separados, que é como a pessoa pensa o ajuste.
        ...(({ cleaningNoticeMinutes, cleaningNoticeWhen }) => ({
          cleaningNoticeMinutes: String(cleaningNoticeMinutes),
          cleaningNoticeWhen,
        }))(
          cleaningNoticeFields(
            Number(row.cleaning_notice_offset_minutes ?? 0),
          ),
        ),
        hasCamera: hasCamera(row.room_feature_relations) ? "on" : "",
      },
    }));
  }
  if (section === "unidades") {
    const identity = await requestIdentity();
    if (!identity) throw new Error("admin_identity_required");
    const { data, error } = await supabase
      .from("locations")
      .select("id,name,address,city,state,zip_code,status,rooms(count)")
      .eq("company_id", identity.companyId)
      .order("name");
    if (error) throw new Error(`admin_locations_failed:${error.code}`);
    return (data ?? []).map((row) => ({
      cells: [
        row.name,
        `${row.city}, ${row.state}`,
        String(
          (row.rooms as Array<{ count?: number }> | undefined)?.[0]?.count ?? 0,
        ),
        "-",
        row.status === "active" ? "Ativa" : "Inativa",
      ],
      record: {
        id: row.id,
        name: row.name,
        address: row.address,
        city: row.city,
        state: row.state,
        zipCode: row.zip_code,
        status: row.status,
      },
    }));
  }
  if (section === "clientes") {
    // Cliente não pertence mais a um coworking: quem aparece aqui é quem
    // reservou nesta empresa, e a RLS de `customers` já restringe a isso.
    const { data, error } = await supabase
      .from("customers")
      .select("name,email,status,bookings(count)")
      .order("name");
    if (error) throw new Error(`admin_customers_failed:${error.code}`);
    return (data ?? []).map((row) =>
      plain([
      row.name,
      row.email,
      String(
        (row.bookings as Array<{ count?: number }> | undefined)?.[0]?.count ??
          0,
      ),
      "-",
      row.status === "active" ? "Ativo" : "Inativo",
      ]),
    );
  }
  if (section === "pagamentos") {
    const { data, error } = await supabase
      .from("payments")
      .select(
        "provider_payment_id,payment_method,amount_cents,status,bookings(id)",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(`admin_payments_failed:${error.code}`);
    return (data ?? []).map((row) =>
      plain([
      row.provider_payment_id ?? "Pendente",
      `#${String((row.bookings as { id?: string } | null)?.id ?? "").slice(0, 8)}`,
      row.payment_method === "pix" ? "PIX" : "Cartão",
      money(row.amount_cents),
      statusLabel(row.status),
      ]),
    );
  }
  if (section === "fechaduras") {
    const { data, error } = await supabase
      .from("locks")
      .select(
        "id,room_id,name,external_lock_id,gateway_id,battery_level,status,rooms(name)",
      )
      .order("name");
    if (error) throw new Error(`admin_locks_failed:${error.code}`);
    return (data ?? []).map((row) => ({
      cells: [
        (row.rooms as { name?: string } | null)?.name ?? "Sala",
        row.name,
        row.gateway_id ? "Configurado" : "Sem gateway",
        row.battery_level == null ? "-" : `${row.battery_level}%`,
        row.status === "online" ? "Online" : "Revisar",
      ],
      record: {
        id: row.id,
        roomId: row.room_id,
        name: row.name,
        externalLockId: row.external_lock_id,
        gatewayId: row.gateway_id ?? "",
      },
    }));
  }
  if (section === "limpeza") {
    const { data, error } = await supabase
      .from("cleaning_requests")
      .select("scheduled_at,status,rooms(name),profiles(name)")
      .order("scheduled_at")
      .limit(100);
    if (error) throw new Error(`admin_cleaning_failed:${error.code}`);
    return (data ?? []).map((row) =>
      plain([
      (row.rooms as { name?: string } | null)?.name ?? "Sala",
      formatDate(row.scheduled_at),
      (row.profiles as { name?: string } | null)?.name ?? "Não atribuído",
      "-",
      statusLabel(row.status),
      ]),
    );
  }
  if (section === "logs") {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("created_at,action,entity_type,entity_id,request_id")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(`admin_logs_failed:${error.code}`);
    return (data ?? []).map((row) =>
      plain([
      formatDate(row.created_at),
      row.action,
      `${row.entity_type}:${String(row.entity_id ?? "-").slice(0, 8)}`,
      row.request_id,
      "Sucesso",
      ]),
    );
  }
  return [];
}

function hasCamera(relations: unknown) {
  return (
    (relations as Array<{ room_features?: { name?: string } | null }>) ?? []
  ).some((relation) => relation.room_features?.name === "Câmera");
}

function simulatorRecord(
  section: AdminSection,
  index: number,
): AdminRecord | undefined {
  if (section === "unidades") {
    return {
      id: `demo-unidade-${index}`,
      name: adminSections.unidades.rows[index][0],
      address: "Rua de demonstração, 100",
      city: "Joinville",
      state: "SC",
      zipCode: "89200-000",
      status: "active",
    };
  }
  if (section === "salas") {
    return {
      id: `demo-sala-${index}`,
      locationId: "20000000-0000-4000-8000-000000000001",
      name: adminSections.salas.rows[index][0],
      description: "Sala de demonstração do simulador.",
      capacity: "8",
      hourlyPriceCents: "12000",
      status: "active",
      hasCamera: "",
    };
  }
  if (section === "fechaduras") {
    return {
      id: `demo-fechadura-${index}`,
      roomId: "30000000-0000-4000-8000-000000000001",
      name: adminSections.fechaduras.rows[index][1],
      externalLockId: "demo-lock",
      gatewayId: "demo-gateway",
    };
  }
  return undefined;
}

export async function adminResourceOptions() {
  if (integrationMode() === "simulator") {
    return {
      locations: [
        { id: "20000000-0000-4000-8000-000000000001", name: "Ágora Tech Park" },
        {
          id: "20000000-0000-4000-8000-000000000002",
          name: "Centro Joinville",
        },
      ],
      rooms: [
        { id: "30000000-0000-4000-8000-000000000001", name: "Sala Executiva" },
        { id: "30000000-0000-4000-8000-000000000002", name: "Sala Foco" },
        {
          id: "30000000-0000-4000-8000-000000000003",
          name: "Atelier Criativo",
        },
      ],
    };
  }
  const identity = await requestIdentity();
  if (!identity) throw new Error("admin_identity_required");
  const supabase = await createSupabaseServerClient();
  const [locations, rooms] = await Promise.all([
    supabase
      .from("locations")
      .select("id,name")
      .eq("company_id", identity.companyId)
      .eq("status", "active")
      .order("name"),
    supabase
      .from("rooms")
      .select("id,name")
      .eq("company_id", identity.companyId)
      .eq("status", "active")
      .order("name"),
  ]);
  if (locations.error || rooms.error) throw new Error("admin_options_failed");
  return { locations: locations.data ?? [], rooms: rooms.data ?? [] };
}

export async function adminDashboardData(): Promise<{
  metrics: readonly AdminMetric[];
  bookings: readonly TodayBooking[];
  locksOnline: string;
  pendingActions: string;
}> {
  if (integrationMode() === "simulator") {
    return {
      metrics: adminMetrics,
      bookings: todayBookings,
      locksOnline: "5 de 6",
      pendingActions: "2",
    };
  }
  const supabase = await createSupabaseServerClient();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const [bookingResult, lockResult, jobResult] = await Promise.all([
    supabase
      .from("bookings")
      .select("start_at,end_at,status,customers(name),rooms(name)")
      .gte("start_at", start.toISOString())
      .lt("start_at", end.toISOString())
      .order("start_at"),
    supabase.from("locks").select("status"),
    supabase
      .from("durable_jobs")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "failed", "manual_review"]),
  ]);
  if (bookingResult.error) throw new Error("admin_dashboard_bookings_failed");
  const bookings = (bookingResult.data ?? []).map((row) => {
    const startAt = new Date(row.start_at);
    const endAt = new Date(row.end_at);
    return {
      time: time(startAt),
      room: (row.rooms as { name?: string } | null)?.name ?? "Sala",
      customer: (row.customers as { name?: string } | null)?.name ?? "Cliente",
      duration: `${Math.round((endAt.getTime() - startAt.getTime()) / 3_600_000)}h`,
      status: statusLabel(row.status),
    } as TodayBooking;
  });
  const locks = lockResult.data ?? [];
  return {
    metrics: [
      {
        label: "Reservas hoje",
        value: String(bookings.length),
        change: "-",
        tone: "green",
      },
      { label: "Ocupação", value: "-", change: "-", tone: "blue" },
      { label: "Receita no mês", value: "-", change: "-", tone: "coral" },
      { label: "Ticket médio", value: "-", change: "-", tone: "neutral" },
    ],
    bookings,
    locksOnline: `${locks.filter((lock) => lock.status === "online").length} de ${locks.length}`,
    pendingActions: String(jobResult.count ?? 0),
  };
}

function statusLabel(value: string) {
  return (
    {
      awaiting_payment: "Aguardando",
      confirmed: "Confirmada",
      in_progress: "Em andamento",
      completed: "Concluída",
      cancelled: "Cancelada",
      expired: "Expirada",
      refunded: "Reembolsado",
      approved: "Aprovado",
      rejected: "Rejeitado",
      pending: "Pendente",
      assigned: "Atribuída",
      manual_review: "Revisar",
    }[value] ?? value
  );
}
function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}
function time(value: Date) {
  return value.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}
