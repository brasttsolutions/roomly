/** Valores crus de um registro, usados para preencher o formulário de edição. */
export type AdminRecord = Readonly<Record<string, string>>;
export type AdminRow = Readonly<{ cells: string[]; record?: AdminRecord }>;
export type AdminResource = "unidades" | "salas" | "fechaduras";

export const adminSections = {
  reservas: {
    title: "Reservas",
    subtitle: "Acompanhe o ciclo completo de cada reserva.",
    action: "Nova reserva",
    columns: ["Reserva", "Cliente", "Sala", "Data e hora", "Status"],
    rows: [
      ["#RM-2048", "Marina Costa", "Sala Foco", "03 set · 14:00", "Confirmada"],
      [
        "#RM-2047",
        "Norte Labs",
        "Sala Executiva",
        "03 set · 10:00",
        "Aguardando",
      ],
      [
        "#RM-2046",
        "Viva Design",
        "Atelier Criativo",
        "02 set · 13:30",
        "Confirmada",
      ],
      ["#RM-2045", "Rafael Lima", "Sala Foco", "02 set · 09:00", "Cancelada"],
    ],
  },
  calendario: {
    title: "Calendário",
    subtitle: "Distribuição de reservas por sala e horário.",
    action: "Bloquear horário",
    columns: [
      "Horário",
      "Sala Foco",
      "Sala Executiva",
      "Atelier Criativo",
      "Status",
    ],
    rows: [
      ["09:00", "Marina Costa", "Livre", "Viva Design", "3 de 3"],
      ["10:00", "Norte Labs", "Norte Labs", "Viva Design", "Ocupado"],
      ["11:00", "Livre", "Norte Labs", "Livre", "1 de 3"],
      ["13:00", "Rafael Lima", "Livre", "Criativa Co.", "2 de 3"],
      ["14:00", "Livre", "Marina Costa", "Criativa Co.", "2 de 3"],
    ],
  },
  salas: {
    title: "Salas",
    subtitle: "Preços, capacidade e disponibilidade dos espaços.",
    action: "Nova sala",
    columns: ["Sala", "Unidade", "Capacidade", "Preço/hora", "Status"],
    rows: [
      ["Sala Executiva", "Ágora Tech Park", "8 pessoas", "R$ 120", "Ativa"],
      ["Sala Foco", "Ágora Tech Park", "4 pessoas", "R$ 75", "Ativa"],
      ["Atelier Criativo", "Centro Joinville", "12 pessoas", "R$ 165", "Ativa"],
    ],
  },
  unidades: {
    title: "Unidades",
    subtitle: "Endereços e configurações operacionais.",
    action: "Nova unidade",
    columns: ["Unidade", "Cidade", "Salas", "Ocupação", "Status"],
    rows: [
      ["Ágora Tech Park", "Joinville, SC", "2", "78%", "Ativa"],
      ["Centro Joinville", "Joinville, SC", "1", "66%", "Ativa"],
    ],
  },
  clientes: {
    title: "Clientes",
    subtitle: "Relacionamento e histórico de utilização.",
    action: "Novo cliente",
    columns: ["Cliente", "Contato", "Reservas", "Total gasto", "Status"],
    rows: [
      ["Marina Costa", "marina@nortelabs.com", "12", "R$ 1.640", "Ativo"],
      ["Norte Labs", "contato@nortelabs.com", "28", "R$ 4.920", "Ativo"],
      ["Viva Design", "agenda@vivadesign.co", "7", "R$ 2.180", "Ativo"],
    ],
  },
  pagamentos: {
    title: "Pagamentos",
    subtitle: "Conciliação financeira e reembolsos.",
    action: "Exportar",
    columns: ["Pagamento", "Reserva", "Método", "Valor", "Status"],
    rows: [
      ["pay_829104", "#RM-2048", "PIX", "R$ 120", "Aprovado"],
      ["pay_829099", "#RM-2047", "Cartão", "R$ 240", "Aprovado"],
      ["pay_829084", "#RM-2045", "PIX", "R$ 75", "Reembolsado"],
    ],
  },
  fechaduras: {
    title: "Fechaduras",
    subtitle: "Conectividade, bateria e última comunicação.",
    action: "Nova fechadura",
    columns: ["Sala", "Fechadura", "Gateway", "Bateria", "Status"],
    rows: [
      ["Sala Executiva", "TTLock A-201", "Online", "92%", "Online"],
      ["Sala Foco", "TTLock A-202", "Online", "68%", "Online"],
      ["Atelier Criativo", "TTLock B-101", "Offline", "41%", "Revisar"],
    ],
  },
  limpeza: {
    title: "Limpeza",
    subtitle: "Preparação das salas entre reservas.",
    action: "Nova solicitação",
    columns: ["Sala", "Janela", "Responsável", "Próxima reserva", "Status"],
    rows: [
      ["Sala Foco", "11:00 – 11:30", "Carla Souza", "13:00", "Pendente"],
      [
        "Sala Executiva",
        "12:00 – 12:25",
        "Paulo Reis",
        "14:00",
        "Em andamento",
      ],
      ["Atelier Criativo", "16:30 – 17:00", "Carla Souza", "18:00", "Agendada"],
    ],
  },
  relatorios: {
    title: "Relatórios",
    subtitle: "Indicadores para decisões de ocupação e receita.",
    action: "Gerar relatório",
    columns: ["Relatório", "Período", "Gerado por", "Atualização", "Status"],
    rows: [
      [
        "Ocupação por sala",
        "Agosto 2026",
        "Thiago Silva",
        "Hoje, 08:12",
        "Pronto",
      ],
      [
        "Receita e ticket médio",
        "Agosto 2026",
        "Automático",
        "Hoje, 06:00",
        "Pronto",
      ],
      [
        "Cancelamentos",
        "3º trimestre",
        "Thiago Silva",
        "Ontem, 17:44",
        "Pronto",
      ],
    ],
  },
  logs: {
    title: "Logs e auditoria",
    subtitle: "Rastreabilidade de ações e integrações críticas.",
    action: "Exportar logs",
    columns: ["Horário", "Ação", "Entidade", "Request ID", "Resultado"],
    rows: [
      ["08:41:22", "PAYMENT_APPROVED", "#RM-2048", "req_8f72a1", "Sucesso"],
      ["08:41:24", "ACCESS_CREATED", "#RM-2048", "req_8f72a1", "Sucesso"],
      ["08:37:09", "ACCESS_RETRY", "#RM-2046", "req_7b01e3", "Atenção"],
    ],
  },
  configuracoes: {
    title: "Configurações",
    subtitle: "Políticas comerciais, acesso e comunicação.",
    action: "Salvar alterações",
    columns: [
      "Configuração",
      "Valor atual",
      "Escopo",
      "Alterado por",
      "Status",
    ],
    rows: [
      ["Duração mínima", "60 minutos", "Empresa", "Thiago Silva", "Ativa"],
      ["Hold de pagamento", "10 minutos", "Empresa", "Sistema", "Ativa"],
      [
        "Tolerância de acesso",
        "5 min antes e depois",
        "Unidade",
        "Thiago Silva",
        "Ativa",
      ],
    ],
  },
} as const;
export type AdminSection = keyof typeof adminSections;
