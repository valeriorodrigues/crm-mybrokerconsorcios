// ═══════════════════════════════════════════════════════════════
// Meta Pixel — My Broker CRM
// Pixel ID: 910342471805450 (Form_Udi_01 — Alpha Norte)
// ═══════════════════════════════════════════════════════════════
// Todos os eventos seguem o padrão Meta Conversions API
// Documentação: https://developers.facebook.com/docs/meta-pixel/reference

function fbq(...args) {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq(...args);
  }
}

// ── Contatos ──────────────────────────────────────────────────────────────────

/**
 * Disparado quando um novo contato/lead é criado no CRM.
 * Sinaliza para a Meta que um lead foi capturado.
 */
export function pixelLead(contact = {}) {
  fbq("track", "Lead", {
    content_name:     contact.name     || "Lead CRM",
    content_category: contact.leadOrigin || "CRM My Broker",
    // Não enviar dados PII (CPF, email, telefone) diretamente via Pixel
    // Para matching avançado, usar Conversions API server-side
  });
}

/**
 * Disparado quando um contato é trabalhado (atividade registrada).
 * Sinaliza engajamento no processo de vendas.
 */
export function pixelContact(channel = "") {
  fbq("track", "Contact", {
    content_name: `Contato via ${channel}`,
  });
}

// ── Negociações ───────────────────────────────────────────────────────────────

/**
 * Disparado quando uma nova negociação é criada.
 * Equivale a "início do processo de compra".
 */
export function pixelInitiateCheckout(negotiation = {}) {
  fbq("track", "InitiateCheckout", {
    content_name:     negotiation.name    || negotiation.product || "Negociação",
    content_category: negotiation.product || "Produto",
    value:            Number(negotiation.value) || 0,
    currency:         "BRL",
    num_items:        1,
  });
}

/**
 * Disparado quando negociação entra em "Proposta Enviada".
 * Sinaliza lead quente — proposta concreta enviada.
 */
export function pixelAddToCart(negotiation = {}) {
  fbq("track", "AddToCart", {
    content_name:     negotiation.name    || negotiation.product || "Proposta",
    content_category: negotiation.product || "Produto",
    value:            Number(negotiation.value) || 0,
    currency:         "BRL",
  });
}

/**
 * Disparado quando negociação é GANHA (venda fechada).
 * Este é o evento mais importante — otimiza seus anúncios para mais vendas.
 */
export function pixelPurchase(negotiation = {}) {
  fbq("track", "Purchase", {
    content_name:     negotiation.name    || negotiation.product || "Venda",
    content_category: negotiation.product || "Produto",
    value:            Number(negotiation.value) || 0,
    currency:         "BRL",
    content_type:     "product",
    content_ids:      [negotiation.id || ""],
  });
}

/**
 * Disparado quando negociação é PERDIDA.
 * Evento customizado — ajuda a entender funil de perdas.
 */
export function pixelLost(negotiation = {}, reason = "") {
  fbq("trackCustom", "NegociacaoPerdida", {
    content_name:     negotiation.name    || negotiation.product || "Perda",
    content_category: negotiation.product || "Produto",
    lost_reason:      reason,
    value:            Number(negotiation.value) || 0,
    currency:         "BRL",
  });
}

/**
 * Disparado quando negociação avança de etapa no funil.
 * Evento customizado para acompanhar progressão.
 */
export function pixelStageChange(negotiation = {}, newStage = "") {
  // Só dispara para etapas relevantes
  const tracked = ["Proposta Enviada", "Fechamento"];
  if (!tracked.includes(newStage)) return;

  if (newStage === "Proposta Enviada") {
    pixelAddToCart(negotiation);
    return;
  }
  if (newStage === "Fechamento") {
    fbq("trackCustom", "EmFechamento", {
      content_name:     negotiation.name    || negotiation.product,
      content_category: negotiation.product || "Produto",
      value:            Number(negotiation.value) || 0,
      currency:         "BRL",
    });
  }
}
