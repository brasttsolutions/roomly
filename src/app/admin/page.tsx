import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  CircleAlert,
  DoorClosed,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { adminDashboardData } from "@/lib/server/admin-data";
const bars = [42, 58, 48, 72, 67, 84, 74];
export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const {
    metrics: adminMetrics,
    bookings: todayBookings,
    locksOnline,
    pendingActions,
  } = await adminDashboardData();
  return (
    <>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-[#176b4d]">
            TERÇA, 01 DE SETEMBRO
          </p>
          <h1 className="mt-1 text-3xl font-bold">Visão geral</h1>
          <p className="mt-2 text-sm text-[#66736d]">
            A operação de hoje em um só lugar.
          </p>
        </div>
        <select
          aria-label="Unidade"
          className="h-10 rounded-md border border-[#cfd6d1] bg-white px-3 text-sm font-semibold"
        >
          <option>Todas as unidades</option>
          <option>Ágora Tech Park</option>
          <option>Centro Joinville</option>
        </select>
      </div>
      <section className="grid gap-px overflow-hidden border border-[#d9ded9] bg-[#d9ded9] sm:grid-cols-2 xl:grid-cols-4">
        {adminMetrics.map((metric) => (
          <div key={metric.label} className="bg-white p-5">
            <p className="text-xs font-bold uppercase text-[#75817b]">
              {metric.label}
            </p>
            <div className="mt-3 flex items-end justify-between">
              <strong className="text-2xl">{metric.value}</strong>
              <span className="flex items-center text-xs font-bold text-[#176b4d]">
                {metric.change.startsWith("+") ? (
                  <ArrowUpRight size={14} />
                ) : (
                  <ArrowDownRight size={14} />
                )}{" "}
                {metric.change}
              </span>
            </div>
          </div>
        ))}
      </section>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <section className="rounded-lg border border-[#d9ded9] bg-white">
          <div className="flex items-center justify-between border-b border-[#e2e6e2] p-5">
            <div>
              <h2 className="font-bold">Ocupação da semana</h2>
              <p className="mt-1 text-xs text-[#75817b]">
                Horas reservadas por dia
              </p>
            </div>
            <Badge tone="green">74% média</Badge>
          </div>
          <div className="flex h-64 items-end gap-3 p-6">
            {bars.map((height, index) => (
              <div
                key={index}
                className="flex h-full flex-1 flex-col justify-end gap-2"
              >
                <div className="relative flex-1">
                  <div
                    className="absolute bottom-0 w-full rounded-t bg-[#176b4d] transition"
                    style={{ height: `${height}%` }}
                  />
                </div>
                <span className="text-center text-[11px] font-bold text-[#7a857f]">
                  {["S", "T", "Q", "Q", "S", "S", "D"][index]}
                </span>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-lg border border-[#d9ded9] bg-white">
          <div className="flex items-center justify-between border-b border-[#e2e6e2] p-5">
            <h2 className="font-bold">Saúde da operação</h2>
            <span className="size-2 rounded-full bg-[#2aa66f]" />
          </div>
          <div className="divide-y divide-[#e4e7e4]">
            <Health
              icon={<DoorClosed size={18} />}
              title="Fechaduras online"
              value={locksOnline}
              tone="blue"
            />
            <Health
              icon={<CalendarDays size={18} />}
              title="Próxima limpeza"
              value="15:10"
              tone="green"
            />
            <Health
              icon={<CircleAlert size={18} />}
              title="Ações pendentes"
              value={pendingActions}
              tone="coral"
            />
          </div>
        </section>
      </div>
      <section className="mt-6 overflow-hidden rounded-lg border border-[#d9ded9] bg-white">
        <div className="flex items-center justify-between border-b border-[#e2e6e2] p-5">
          <div>
            <h2 className="font-bold">Reservas de hoje</h2>
            <p className="mt-1 text-xs text-[#75817b]">
              18 reservas · 31 horas
            </p>
          </div>
          <Link
            href="/admin/calendario"
            className="inline-flex items-center gap-1 text-sm font-bold text-[#176b4d]"
          >
            Ver calendário
            <ChevronRight size={16} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-[#f5f6f3] text-xs uppercase text-[#75817b]">
              <tr>
                <th className="px-5 py-3">Horário</th>
                <th className="px-5 py-3">Sala</th>
                <th className="px-5 py-3">Cliente</th>
                <th className="px-5 py-3">Duração</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e4e7e4]">
              {todayBookings.map((row) => (
                <tr key={row.time} className="hover:bg-[#f8f9f7]">
                  <td className="px-5 py-4 font-bold">{row.time}</td>
                  <td className="px-5 py-4">{row.room}</td>
                  <td className="px-5 py-4">{row.customer}</td>
                  <td className="px-5 py-4 text-[#66736d]">{row.duration}</td>
                  <td className="px-5 py-4">
                    <Badge
                      tone={
                        row.status === "Em andamento"
                          ? "green"
                          : row.status === "Aguardando"
                            ? "coral"
                            : "blue"
                      }
                    >
                      {row.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
function Health({
  icon,
  title,
  value,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  tone: "green" | "blue" | "coral";
}) {
  return (
    <div className="flex items-center gap-3 p-5">
      <span className="grid size-10 place-items-center rounded-md bg-[#f0f2ef]">
        {icon}
      </span>
      <div className="flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-[#7a857f]">Atualizado agora</p>
      </div>
      <Badge tone={tone}>{value}</Badge>
    </div>
  );
}
