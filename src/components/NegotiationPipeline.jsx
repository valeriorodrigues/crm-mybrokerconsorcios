import { useState } from "react";
import { Stars, StatusTag, SearchBox } from "./UI";
import { PRODUCTS, STAGES, STAGE_COLORS, PRODUCT_COLORS, GRADE_COLORS, FOLLOW_STATUSES } from "../utils/constants";
import { formatCurrency, formatDate, calcScore } from "../utils/helpers";
import { GripVertical, Plus, LayoutGrid, List } from "lucide-react";

export function NegotiationPipeline({
  negotiations, contacts, companies, activities, tasks,
  onSelect, onDelete, view, setView, onCreateNeg
}) {
  const [search, setSearch] = useState("");
  const [filterProduct, setFilterProduct] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [dragId, setDragId] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [onDrop, setOnDrop] = useState(null);

  const filtered = negotiations.filter(n => {
    const q = search.toLowerCase();
    const contact = contacts.find(c => c.id === n.contactId);
    const matchSearch = !q || n.name.toLowerCase().includes(q) || (contact?.name || "").toLowerCase().includes(q);
    const matchProduct = !filterProduct || n.product === filterProduct;
    const matchStatus = !filterStatus || n.status === filterStatus;
    return matchSearch && matchProduct && matchStatus;
  });

  // Active pipeline stages vs outcome stages
  const PIPELINE_STAGES  = ["Novos Leads", "Andamento", "Proposta Enviada", "Fechamento"];
  const OUTCOME_STAGES   = ["Fechado", "Não Conseguiu Contato", "Declinada / Não quer", "Inválida", "Cancelada", "Retrabalhar"];
  const [showOutcomes, setShowOutcomes] = useState(false);
  const displayStages = showOutcomes ? OUTCOME_STAGES : PIPELINE_STAGES;

  return (
    <div className="fade-in">
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <div className="view-toggle">
          <button className={view === "kanban" ? "active" : ""} onClick={() => setView("kanban")}>
            <LayoutGrid size={12} /> Kanban
          </button>
          <button className={view === "list" ? "active" : ""} onClick={() => setView("list")}>
            <List size={12} /> Lista
          </button>
        </div>

        <SearchBox value={search} onChange={setSearch} />

        <select value={filterProduct} onChange={e => setFilterProduct(e.target.value)} style={{ padding: "5px 8px", fontSize: 11 }}>
          <option value="">Todos os produtos</option>
          {PRODUCTS.map(p => <option key={p}>{p}</option>)}
        </select>

        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: "5px 8px", fontSize: 11 }}>
          <option value="">Todos os status</option>
          <option value="open">Em andamento</option>
          <option value="won">Vendida</option>
          <option value="lost">Perdida</option>
        </select>

        <button className="btn btn-sm" style={{ marginLeft: "auto", background: showOutcomes ? "var(--acbg)" : undefined, color: showOutcomes ? "var(--ac)" : undefined }}
          onClick={() => setShowOutcomes(v => !v)}>
          {showOutcomes ? "← Pipeline" : "Resultados →"}
        </button>

        <span style={{ fontSize: 10, color: "var(--tx3)" }}>{filtered.length} Negociações</span>
      </div>

      {/* KANBAN VIEW */}
      {view === "kanban" && (
        <div className="kanban">
          {displayStages.map(stage => {
            const stageNegs = filtered.filter(n => n.stage === stage);
            const stageValue = stageNegs.reduce((s, n) => s + (Number(n.value) || 0), 0);

            return (
              <div key={stage}
                className={`kanban-col ${dragOver === stage ? "drag-over" : ""}`}
                onDragOver={e => { e.preventDefault(); setDragOver(stage); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={e => {
                  e.preventDefault();
                  setDragOver(null);
                  if (dragId && onDrop) onDrop(dragId, stage);
                }}>
                <div className="kanban-header">
                  <h3 style={{ color: STAGE_COLORS[stage] }}>
                    {stage} ({stageNegs.length})
                  </h3>
                  <span className="kanban-value">{formatCurrency(stageValue)}</span>
                </div>
                <div className="kanban-cards">
                  {stageNegs.map(n => {
                    const sc = calcScore(n, activities, tasks);
                    const contact = contacts.find(c => c.id === n.contactId);
                    const company = companies.find(c => c.id === n.companyId);
                    const fs = FOLLOW_STATUSES.find(x => x.id === contact?.followStatus);

                    return (
                      <div key={n.id}
                        className={`kanban-card ${dragId === n.id ? "dragging" : ""}`}
                        draggable
                        onDragStart={e => {
                          setDragId(n.id);
                          setOnDrop(() => (id, stage) => {
                            window.__crmDrop = { id, stage };
                            window.dispatchEvent(new Event("crm-drop"));
                          });
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragEnd={() => setDragId(null)}
                        onClick={() => onSelect(n)}>

                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                          <StatusTag status={n.status} />
                          {fs && <span style={{ fontSize: 9, fontWeight: 600, padding: "1px 6px", borderRadius: 10, background: fs.color + "22", color: fs.color, whiteSpace: "nowrap" }}>{fs.icon} {fs.label}</span>}
                        </div>
                        <div className="card-name">
                          <GripVertical size={10} color="var(--tx3)" />
                          {n.name || n.product}
                          <div className="grade" style={{
                            background: GRADE_COLORS[sc.grade] + "22",
                            color: GRADE_COLORS[sc.grade],
                            width: 17, height: 17, fontSize: 8.5, marginLeft: "auto"
                          }}>{sc.grade}</div>
                        </div>
                        {company && <div className="card-company">{company.name}</div>}
                        <div className="card-meta">
                          <div className="card-stars"><Stars value={n.stars || 0} size={10} /></div>
                          {contact && <span style={{ fontSize: 9, color: "var(--tx3)" }}>👤 {contact.name?.split(" ")[0]}</span>}
                          {/* Produto badge */}
                          <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 8, background: (PRODUCT_COLORS[n.product] || "#888") + "22", color: PRODUCT_COLORS[n.product] || "#888", marginLeft: "auto" }}>{n.product?.split(" ")[0]}</span>
                        </div>
                        {n.value && <div style={{ fontSize: 10.5, color: "var(--ac)", fontWeight: 600, marginTop: 3 }}>{formatCurrency(n.value)}</div>}
                      </div>
                    );
                  })}
                  {stageNegs.length === 0 && <p style={{ fontSize: 10, color: "var(--tx3)", textAlign: "center", padding: 16 }}>—</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LIST VIEW */}
      {view === "list" && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Negociações</th>
                <th>Responsável</th>
                <th>Qualificação</th>
                <th>Etapa do Funil</th>
                <th>Valor Total</th>
                <th>Data de Criação</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--tx3)", padding: 30 }}>Nenhuma negociação encontrada.</td></tr>
                : filtered.map(n => {
                  const sc = calcScore(n, activities, tasks);
                  const contact = contacts.find(c => c.id === n.contactId);
                  const company = companies.find(c => c.id === n.companyId);

                  return (
                    <tr key={n.id} onClick={() => onSelect(n)}>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: 12 }}>{n.name || n.product}</div>
                        {company && <div style={{ fontSize: 10, color: "var(--tx3)" }}>{company.name}</div>}
                      </td>
                      <td>
                        <div className="contact-avatar" style={{ width: 24, height: 24, fontSize: 9 }}>VR</div>
                      </td>
                      <td><Stars value={n.stars || 0} size={12} /></td>
                      <td>
                        <span className="tag" style={{ background: STAGE_COLORS[n.stage] + "22", color: STAGE_COLORS[n.stage] }}>
                          {n.stage}
                        </span>
                      </td>
                      <td>
                        {n.value
                          ? <span style={{ color: "var(--ac)" }}>Único: {formatCurrency(n.value)}</span>
                          : <span style={{ color: "var(--tx3)", fontSize: 11 }}>Adicionar valor</span>}
                      </td>
                      <td style={{ fontSize: 11, color: "var(--tx2)" }}>{formatDate(n.createdAt)}</td>
                      <td><StatusTag status={n.status} /></td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
