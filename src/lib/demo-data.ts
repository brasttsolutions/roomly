export type Room = Readonly<{
  id: string;
  slug: string;
  name: string;
  description: string;
  image: string;
  images?: readonly string[];
  address?: string;
  capacity: number;
  hourlyPriceCents: number;
  location: string;
  floor: string;
  features: readonly string[];
  accent: "green" | "coral" | "blue";
}>;

export const rooms: readonly Room[] = [
  {
    id: "30000000-0000-4000-8000-000000000001",
    slug: "sala-executiva",
    name: "Sala Executiva",
    description:
      "Privacidade, luz natural e estrutura completa para decisões importantes.",
    image: "/rooms/executiva.png",
    address: "Perini Business Park · Joinville/SC",
    capacity: 8,
    hourlyPriceCents: 12000,
    location: "Ágora Tech Park",
    floor: "2º andar",
    features: ['TV 65"', "Videoconferência", "Lousa", "Café", "Wi-Fi"],
    accent: "green",
  },
  {
    id: "30000000-0000-4000-8000-000000000002",
    slug: "sala-foco",
    name: "Sala Foco",
    description:
      "Um ambiente reservado para conversas objetivas e pequenos times.",
    image: "/rooms/foco.png",
    address: "Perini Business Park · Joinville/SC",
    capacity: 4,
    hourlyPriceCents: 7500,
    location: "Ágora Tech Park",
    floor: "1º andar",
    features: ['TV 50"', "Lousa", "Isolamento acústico", "Wi-Fi"],
    accent: "blue",
  },
  {
    id: "30000000-0000-4000-8000-000000000003",
    slug: "atelier-criativo",
    name: "Atelier Criativo",
    description:
      "Mesas modulares e ferramentas visuais para workshops produtivos.",
    image: "/rooms/atelier.png",
    address: "Rua do Príncipe, 330 · Joinville/SC",
    capacity: 12,
    hourlyPriceCents: 16500,
    location: "Centro Joinville",
    floor: "Térreo",
    features: [
      "Projetor",
      "Videoconferência",
      "Parede gravável",
      "Café",
      "Wi-Fi",
    ],
    accent: "coral",
  },
] as const;

export const timeSlots = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
];

export const adminMetrics = [
  { label: "Reservas hoje", value: "18", change: "+12%", tone: "green" },
  { label: "Ocupação", value: "74%", change: "+8%", tone: "blue" },
  {
    label: "Receita no mês",
    value: "R$ 28,4 mil",
    change: "+18%",
    tone: "coral",
  },
  { label: "Ticket médio", value: "R$ 164", change: "+4%", tone: "neutral" },
] as const;

export const todayBookings = [
  {
    time: "08:30",
    room: "Sala Foco",
    customer: "Marina Costa",
    duration: "1h",
    status: "Em andamento",
  },
  {
    time: "10:00",
    room: "Sala Executiva",
    customer: "Norte Labs",
    duration: "2h",
    status: "Confirmada",
  },
  {
    time: "13:30",
    room: "Atelier Criativo",
    customer: "Viva Design",
    duration: "3h",
    status: "Confirmada",
  },
  {
    time: "17:00",
    room: "Sala Foco",
    customer: "Rafael Lima",
    duration: "1h",
    status: "Aguardando",
  },
] as const;
