export const PRODUCTS = ["Consórcio", "Plano de Saúde", "Seguro de Vida"];
export const STAGES = ["Novos Leads", "Andamento", "Proposta Enviada", "Fechamento", "Fechado", "Não Conseguiu Contato", "Declinada / Não quer", "Inválida", "Cancelada", "Retrabalhar"];
// Estágios ativos do pipeline (exibidos na barra de progresso)
export const PIPELINE_STAGES = ["Novos Leads", "Andamento", "Proposta Enviada", "Fechamento"];
export const OUTCOME_STAGES  = ["Fechado", "Não Conseguiu Contato", "Declinada / Não quer", "Inválida", "Cancelada", "Retrabalhar"];
export const CHANNELS = ["WhatsApp", "Telefone", "E-mail", "Presencial"];

// ── Status de acompanhamento do contato (lead follow-up) ─────────────────────
export const FOLLOW_STATUSES = [
  { id: "nao_atendido",       label: "Não Atendido",                 color: "#94A3B8", icon: "📵" },
  { id: "em_atendimento",     label: "Em Atendimento",               color: "#3B82F6", icon: "🗣️" },
  { id: "aguardando_retorno", label: "Aguardando Retorno",           color: "#F59E0B", icon: "⏳" },
  { id: "visita_agendada",    label: "Visita Agendada",              color: "#8B5CF6", icon: "📅" },
  { id: "avaliando_proposta", label: "Avaliando Proposta",           color: "#EC4899", icon: "📋" },
  { id: "em_negociacao",      label: "Em Negociação",                color: "#F97316", icon: "🤝" },
  { id: "em_fechamento",      label: "Em Fechamento",                color: "#10B981", icon: "✍️" },
  { id: "ligar",              label: "Ligar para o Cliente",         color: "#06B6D4", icon: "📞" },
  { id: "enviar_email",       label: "Enviar E-mail",                color: "#6366F1", icon: "✉️" },
  { id: "enviar_mensagem",    label: "Enviar Mensagem",              color: "#25D366", icon: "💬" },
  { id: "fechado",            label: "Fechado",                      color: "#059669", icon: "✅" },
  { id: "sem_interesse",      label: "Sem Interesse",                color: "#EF4444", icon: "❌" },
  { id: "contato_inexistente",label: "Contato Inexistente",          color: "#6B7280", icon: "🚫" },
  { id: "retrabalhar",        label: "Retrabalhar",                  color: "#D97706", icon: "🔄" },
];

// ── Origens do lead ───────────────────────────────────────────────────────────
export const LEAD_ORIGIN_GROUPS = [
  { group: "Prospecção",         options: ["Prospecção Ativa", "Cold Call", "Porta a Porta"] },
  { group: "Indicação",          options: ["Indicação de Cliente", "Indicação de Parceiro"] },
  { group: "My Broker",          options: ["My Broker - Vinhedos", "My Broker - Santa Mônica", "My Broker - Outro"] },
  { group: "Digital",            options: ["Facebook Ads", "Google Ads", "Instagram", "WhatsApp Orgânico", "Site"] },
  { group: "Outros",             options: ["Evento", "Feira", "Outra Fonte"] },
];

// Cores padrão para tags (cicla automaticamente)
export const TAG_PALETTE = [
  "#3B82F6","#10B981","#F59E0B","#EC4899","#8B5CF6",
  "#06B6D4","#F97316","#EF4444","#6366F1","#14B8A6",
];

export const STAGE_COLORS = {
  "Novos Leads":           "#94A3B8",
  "Andamento":             "#3B82F6",
  "Proposta Enviada":      "#F59E0B",
  "Fechamento":            "#8B5CF6",
  "Fechado":               "#10B981",
  "Não Conseguiu Contato": "#F97316",
  "Declinada / Não quer":  "#EF4444",
  "Inválida":              "#6B7280",
  "Cancelada":             "#DC2626",
  "Retrabalhar":           "#D97706",
};
export const PRODUCT_COLORS = { "Consórcio": "#0EA5E9", "Plano de Saúde": "#10B981", "Seguro de Vida": "#F59E0B" };
export const STATUS_LABELS = { open: "Em andamento", won: "Vendida", lost: "Perdida" };
export const STATUS_COLORS = { open: "#3B82F6", won: "#10B981", lost: "#EF4444" };
export const GRADE_COLORS = { A: "#10B981", B: "#3B82F6", C: "#F59E0B", D: "#F97316", E: "#EF4444" };

// Health
export const HEALTH_MODALITIES = ["Individual", "Familiar", "PME", "Empresarial", "CAEPF"];
export const HEALTH_BRANCHES = ["PF", "Adesão", "PME Administrado", "PME", "Empresarial"];
export const HEALTH_ACCOMMODATIONS = ["Quarto Coletivo", "Quarto Privativo"];
export const HEALTH_COVERAGES = ["Municipal", "Regional", "Grupos de Municípios", "Estadual", "Grupos de Estados", "Nacional"];
export const AGE_BANDS = ["0 a 18", "19 a 23", "24 a 28", "29 a 33", "34 a 38", "39 a 43", "44 a 48", "49 a 53", "54 a 58", "59+"];

// Consórcio
export const CONSORCIO_BRANCHES = ["Imóvel", "Veículo Leve", "Veículo Pesado", "Motocicleta", "Náutico", "Máquinas Agrícolas", "Maquinário Geral", "Serviços"];
export const BUYER_PROFILES = {
  "Imóvel": ["Aquisição de Bem", "Investidor", "Troca de Bem", "Plan. Aposentadoria Imobiliária", "Interveniente Quitante", "Alavancagem Patrimonial"],
  "default": ["Aquisição de Bem", "Investidor", "Troca de Bem"]
};
export const BID_TYPES = ["Livre", "Embutido", "Misto (Livre + Embutido)", "Fixo"];

// Relations
export const RELATIONSHIPS = ["Cônjuge", "Filho(a)", "Pai/Mãe", "Irmão(ã)", "Neto(a)", "Avô/Avó", "Sobrinho(a)", "Outro"];
export const COMPANY_ROLES = ["Sócio", "Funcionário", "Diretor", "Gerente", "Outro"];

// Default templates
export const DEFAULT_TEMPLATES = [
  { id: "t1", name: "Primeiro Contato", channel: "WhatsApp", product: "", body: "Olá {nome}, tudo bem? Aqui é o Valério da My Broker. Vi que você demonstrou interesse em {produto}. Posso te ajudar a encontrar a melhor opção?" },
  { id: "t2", name: "Follow-up Sem Resposta", channel: "WhatsApp", product: "", body: "Olá {nome}! Passando para saber se avaliou nossa conversa sobre {produto}. Fico à disposição!" },
  { id: "t3", name: "Apresentação Consórcio", channel: "WhatsApp", product: "Consórcio", body: "Olá {nome}! Sobre o crédito programado:\n\n• Ramo: {ramo_consorcio}\n• Crédito: {valor}\n• Perfil: {perfil_compra}\n\nPosso detalhar as melhores opções. Quando podemos conversar?" },
  { id: "t4", name: "Apresentação Saúde", channel: "WhatsApp", product: "Plano de Saúde", body: "Olá {nome}! Sobre o plano:\n\n• Modalidade: {modalidade}\n• Beneficiários: {qtd_beneficiarios}\n\nConsigo cotação personalizada. Qual melhor horário?" },
  { id: "t5", name: "Pós-venda Aniversário", channel: "WhatsApp", product: "", body: "Olá {nome}! Feliz aniversário! 🎂 Que esse novo ciclo traga muitas realizações. Conte comigo! — Valério, My Broker" },
  { id: "t6", name: "Proposta Formal", channel: "E-mail", product: "", body: "Prezado(a) {nome},\n\nSegue proposta referente ao(à) {produto}.\n\nÀ disposição para esclarecimentos.\n\nValério — My Broker" },
];
