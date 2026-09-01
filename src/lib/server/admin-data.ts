import "server-only";
import { adminSections, type AdminSection } from "@/lib/admin-sections";
import { adminMetrics, todayBookings } from "@/lib/demo-data";
import { integrationMode } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

export async function adminRows(section: AdminSection): Promise<string[][]> {
  if (integrationMode() === "simulator") {
    return adminSections[section].rows.map((row) => [...row]);
  }
  const supabase = await createSupabaseServerClient();
  if (section === "reservas" || section === "calendario") {
    const { data, error } = await supabase
      .from("bookings")
      .select("id,start_at,end_at,status,profiles(name),rooms(name)")
      .order("start_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(`admin_bookings_failed:${error.code}`);
    return (data ?? []).map((row) => {
      const profile = row.profiles as { name?: string } | null;
      const room = row.rooms as { name?: string } | null;
      return section === "calendario"
        ? [
            formatDate(row.start_at),
            room?.name ?? "Sala",
            profile?.name ?? "Cliente",
            formatDate(row.end_at),
            statusLabel(row.status),
          ]
        : [
            `#${String(row.id).slice(0, 8).toUpperCase()}`,
            profile?.name ?? "Cliente",
            room?.name ?? "Sala",
            formatDate(row.start_at),
            statusLabel(row.status),
          ];
    });
  }
  if (section === "salas") {
    const { data, error } = await supabase
      .from("rooms")
      .select("name,capacity,hourly_price_cents,status,locations(name)")
      .order("name");
    if (error) throw new Error(`admin_rooms_failed:${error.code}`);
    return (data ?? []).map((row) => [
      row.name,
      (row.locations as { name?: string } | null)?.name ?? "Unidade",
      `${row.capacity} pessoas`,
      money(row.hourly_price_cents),
      row.status === "active" ? "Ativa" : "Inativa",
    ]);
  }
  if (section === "unidades") {
    const { data, error } = await supabase
      .from("locations")
      .select("name,city,state,status,rooms(count)")
      .order("name");
    if (error) throw new Error(`admin_locations_failed:${error.code}`);
    return (data ?? []).map((row) => [
      row.name,
      `${row.city}, ${row.state}`,
      String(
        (row.rooms as Array<{ count?: number }> | undefined)?.[0]?.count ?? 0,
      ),
      "-",
      row.status === "active" ? "Ativa" : "Inativa",
    ]);
  }
  if (section === "clientes") {
    const { data, error } = await supabase
      .from("profiles")
      .select("name,email,status,bookings(count)")
      .eq("role", "customer")
      .order("name");
    if (error) throw new Error(`admin_customers_failed:${error.code}`);
    return (data ?? []).map((row) => [
      row.name,
      row.email,
      String(
        (row.bookings as Array<{ count?: number }> | undefined)?.[0]?.count ??
          0,
      ),
      "-",
      row.status === "active" ? "Ativo" : "Inativo",
    ]);
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
    return (data ?? []).map((row) => [
      row.provider_payment_id ?? "Pendente",
      `#${String((row.bookings as { id?: string } | null)?.id ?? "").slice(0, 8)}`,
      row.payment_method === "pix" ? "PIX" : "Cartão",
      money(row.amount_cents),
      statusLabel(row.status),
    ]);
  }
  if (section === "fechaduras") {
    const { data, error } = await supabase
      .from("locks")
      .select("name,gateway_id,battery_level,status,rooms(name)")
      .order("name");
    if (error) throw new Error(`admin_locks_failed:${error.code}`);
    return (data ?? []).map((row) => [
      (row.rooms as { name?: string } | null)?.name ?? "Sala",
      row.name,
      row.gateway_id ? "Configurado" : "Sem gateway",
      row.battery_level == null ? "-" : `${row.battery_level}%`,
      row.status === "online" ? "Online" : "Revisar",
    ]);
  }
  if (section === "limpeza") {
    const { data, error } = await supabase
      .from("cleaning_requests")
      .select("scheduled_at,status,rooms(name),profiles(name)")
      .order("scheduled_at")
      .limit(100);
    if (error) throw new Error(`admin_cleaning_failed:${error.code}`);
    return (data ?? []).map((row) => [
      (row.rooms as { name?: string } | null)?.name ?? "Sala",
      formatDate(row.scheduled_at),
      (row.profiles as { name?: string } | null)?.name ?? "Não atribuído",
      "-",
      statusLabel(row.status),
    ]);
  }
  if (section === "logs") {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("created_at,action,entity_type,entity_id,request_id")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(`admin_logs_failed:${error.code}`);
    return (data ?? []).map((row) => [
      formatDate(row.created_at),
      row.action,
      `${row.entity_type}:${String(row.entity_id ?? "-").slice(0, 8)}`,
      row.request_id,
      "Sucesso",
    ]);
  }
  return [];
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
  const supabase = await createSupabaseServerClient();
  const [locations, rooms] = await Promise.all([
    supabase
      .from("locations")
      .select("id,name")
      .eq("status", "active")
      .order("name"),
    supabase
      .from("rooms")
      .select("id,name")
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
      .select("start_at,end_at,status,profiles(name),rooms(name)")
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
      customer: (row.profiles as { name?: string } | null)?.name ?? "Cliente",
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
