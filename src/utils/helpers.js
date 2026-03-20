// ─── IDs & Formatting ───
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const formatDate = (d) => d ? new Date(d + "T12:00:00").toLocaleDateString("pt-BR") : "—";
export const formatCurrency = (v) => v ? Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";
export const today = () => new Date().toISOString().slice(0, 10);
export const daysSince = (d) => d ? Math.floor((new Date() - new Date(d)) / (1000 * 60 * 60 * 24)) : 0;
export const calcAge = (birthDate) => {
  if (!birthDate) return null;
  const t = new Date(), b = new Date(birthDate);
  let a = t.getFullYear() - b.getFullYear();
  if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--;
  return a;
};

// ─── LocalStorage (fallback for non-Vercel) ───
const store = {};
export async function loadData(key, fallback) {
  try {
    // Try window.storage first (Claude artifacts)
    if (window.storage) {
      const r = await window.storage.get(key);
      return r ? JSON.parse(r.value) : fallback;
    }
    // Fallback to localStorage
    const data = localStorage.getItem("crm_" + key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}
export async function saveData(key, value) {
  try {
    if (window.storage) {
      await window.storage.set(key, JSON.stringify(value));
    } else {
      localStorage.setItem("crm_" + key, JSON.stringify(value));
    }
  } catch (e) {
    console.error("Storage error:", e);
  }
}

// ─── Lead Score Calculation ───
export function calcScore(negotiation, activities, tasks) {
  let s = 0;
  if (negotiation.value && Number(negotiation.value) > 0) s += 12;
  if (negotiation.sourceOrigin) s += 5;
  if (negotiation.stars) s += negotiation.stars * 4;
  if (negotiation.closingDate) s += 3;

  const stageBonus = {
    "Sem Contato": 0, "Contato Feito": 5, "Levantamento": 10,
    "Apresentação": 15, "Negociação": 22, "Proposta Enviada": 28, "Fechamento": 30
  };
  s += stageBonus[negotiation.stage] || 0;
  s += Math.min(activities.filter(a => a.negotiationId === negotiation.id).length * 4, 20);
  if (tasks.filter(t => t.negotiationId === negotiation.id && !t.done).length > 0) s += 3;

  const h = negotiation.health || {};
  const c = negotiation.consorcio || {};
  if (negotiation.product === "Plano de Saúde") {
    if (h.modality) s += 4;
    if (h.branch) s += 3;
    if ((h.beneficiaries || []).length > 0) s += 5;
    if (h.operator) s += 4;
  }
  if (negotiation.product === "Consórcio") {
    if (c.branch) s += 4;
    if (c.creditValue) s += 4;
    if (c.buyerProfile) s += 4;
    if (c.administrator) s += 4;
  }

  s = Math.min(s, 100);
  const grade = s >= 80 ? "A" : s >= 60 ? "B" : s >= 40 ? "C" : s >= 20 ? "D" : "E";
  return { score: s, grade };
}

// ─── Empty Models ───
export const emptyContact = () => ({
  id: "",
  name: "",
  phone: "",
  email: "",
  birthDate: "",
  city: "",
  cpf: "",
  cargo: "",
  companyId: "",
  companyRole: "",
  linkedContacts: [],
  notes: "",
  createdAt: today(),
});

export const emptyCompany = () => ({
  id: "",
  name: "",
  cnpj: "",
  phone: "",
  email: "",
  city: "",
  segment: "",
  employeeCount: "",
  address: "",
  url: "",
  notes: "",
  createdAt: today(),
});

export const emptyNegotiation = () => ({
  id: "",
  contactId: "",
  companyId: "",
  name: "", // e.g. "Diego César – Advogado – Adesão"
  product: "Plano de Saúde",
  stage: "Sem Contato",
  status: "open", // open, won, lost
  lostReason: "",
  stars: 0,
  value: "",
  closingDate: "",
  sourceOrigin: "",
  sourceReferral: "",
  notes: "",
  createdAt: today(),
  // Health-specific
  health: {
    modality: "", branch: "", beneficiaries: [],
    currentPlan: false, currentPlanName: "", currentPlanModality: "", currentPlanTime: "",
    employeeCount: "", dependentCount: "", ageMethod: "age",
    operator: "", administrator: "", classEntity: "",
    accommodation: "", coverageScope: "",
  },
  // Consórcio-specific
  consorcio: {
    branch: "", creditValue: "", expectedTerm: "", bidValue: "",
    tradeIn: false, tradeInType: "", tradeInValue: "",
    income: "", monthlyPayment: "", buyerProfile: "",
    administrator: "", groups: "", quotas: "", assetValue: "", bidType: "", bidPercentage: "",
  },
  // Seguro
  seguro: { type: "", coverage: "", notes: "" },
});

export const emptyTask = () => ({
  id: "",
  contactId: "",
  negotiationId: "",
  title: "",
  description: "",
  date: "",
  done: false,
  createdAt: today(),
});

export const emptyActivity = () => ({
  id: "",
  contactId: "",
  negotiationId: "",
  channel: "Sistema",
  description: "",
  date: today(),
  stage: "",
});

export const emptyBeneficiary = () => ({
  id: uid(),
  name: "",
  birthDate: "",
  age: "",
  ageBand: "",
  relationship: "Titular",
});

// ─── Template variable replacement ───
export function fillTemplate(body, negotiation, contact) {
  if (!negotiation || !contact) return body;
  const h = negotiation.health || {};
  const c = negotiation.consorcio || {};
  return body
    .replace(/\{nome\}/g, contact.name || "")
    .replace(/\{produto\}/g, negotiation.product || "")
    .replace(/\{valor\}/g, formatCurrency(negotiation.value))
    .replace(/\{telefone\}/g, contact.phone || "")
    .replace(/\{email\}/g, contact.email || "")
    .replace(/\{cidade\}/g, contact.city || "")
    .replace(/\{modalidade\}/g, h.modality || "")
    .replace(/\{ramo_consorcio\}/g, c.branch || "")
    .replace(/\{perfil_compra\}/g, c.buyerProfile || "")
    .replace(/\{qtd_beneficiarios\}/g, (h.beneficiaries || []).length.toString())
    .replace(/\{operadora\}/g, h.operator || "")
    .replace(/\{administradora\}/g, h.administrator || c.administrator || "");
}

// ─── Derive saved options for autocomplete ───
export function deriveSavedOptions(negotiations) {
  return {
    origins: [...new Set(negotiations.map(n => n.sourceOrigin).filter(Boolean))],
    referrals: [...new Set(negotiations.map(n => n.sourceReferral).filter(Boolean))],
    operators: [...new Set(negotiations.map(n => n.health?.operator).filter(Boolean))],
    administrators: [...new Set(negotiations.map(n => n.health?.administrator).filter(Boolean))],
    classEntities: [...new Set(negotiations.map(n => n.health?.classEntity).filter(Boolean))],
    adminConsorcio: [...new Set(negotiations.map(n => n.consorcio?.administrator).filter(Boolean))],
    cities: [...new Set(negotiations.map(n => n.contact?.city).filter(Boolean))],
  };
}
