export const PRODUCTS = ["Consórcio", "Plano de Saúde", "Seguro de Vida"];
export const STAGES = ["Sem Contato", "Contato Feito", "Levantamento", "Apresentação", "Negociação", "Proposta Enviada", "Fechamento"];
export const CHANNELS = ["WhatsApp", "Telefone", "E-mail", "Presencial"];

export const STAGE_COLORS = {
  "Sem Contato": "#94A3B8", "Contato Feito": "#3B82F6", "Levantamento": "#8B5CF6",
  "Apresentação": "#F59E0B", "Negociação": "#EC4899", "Proposta Enviada": "#10B981", "Fechamento": "#059669"
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
