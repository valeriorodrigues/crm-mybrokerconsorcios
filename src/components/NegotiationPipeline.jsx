import { useState, useRef } from "react";
import { Stars, StatusTag, SearchBox } from "./UI";
import { PRODUCTS, STAGES, STAGE_COLORS, PRODUCT_COLORS, GRADE_COLORS, FOLLOW_STATUSES } from "../utils/constants";
import { formatCurrency, formatDate, calcScore } from "../utils/helpers";
import { LayoutGrid, List } from "lucide-react";

const _FOLLOW_STATUSES = FOLLOW_STATUSES || [];
const _STAGE_COLORS    = STAGE_COLORS    || {};
const _PRODUCT_COLORS  = PRODUCT_COLORS  || {};
const _GRADE_COLORS    = GRADE_COLORS    || {};
const _PRODUCTS        = PRODUCTS        || [];

export function NegotiationPipeline({
  negotiations, contacts, companies, activities, tasks,
  onSelect, onDelete, view, setView, onCreateNeg, onStageChange
}) {
  const [search, setSearch]             = useState("");
  const [filterProduct, setFilterProduct] = useState("");
  const [filterStatus, setFilterStatus]   = useState("");
  const [showOutcomes, setShowOutcomes]   = useState(false);
  const [dragId, setDragId]               = useState(null);
  const [dragOver, setDragOver]           = useState(null);
  const dragIdRef = useRef(null);

  const filtered = (negotiations || []).filter(n => {
    const q       = search.toLowerCase();
    const contact = (contacts || []).find(c => c.id === n.contactId);
    return (
      (!q || n.name?.toLowerCase().includes(q) || (contact?.name || "").toLowerCase().includes(q)) &&
      (!filterProduct || n.product === filterProduct) &&
      (!filterStatus  || n.status  === filterStatus)
    );
  });

  const PIPELINE_STAGES = ["Novos Leads", "Andamento", "Proposta Enviada", "Fechamento"];
  const OUTCOME_STAGES  = ["Fechado", "Não Conseguiu Contato", "Declinada / Não quer", "Inválida", "Cancelada", "Retrabalhar"];
  const displayStages   = showOutcomes ? OUTCOME_STAGES : PIPELINE_STAGES;

  const handleDrop = (e, stage) => {
    e.preventDefault();
    setDragOver(null);
    const id = dragIdRef.current || dragId;
    if (id && stage && onStageChange) onStageChange(id, stage);
    setDragId(null);
    dragIdRef.current = null;
  };

  return (
    <div className="fade-in">
      {/* ── Toolbar ── */}
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
          {_PRODUCTS.map(p => <option key={p}>{p}</option>)}
        </select>

        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: "5px 8px", fontSize: 11 }}>
          <option value="">Todos os status</option>
          <option value="open">Em andamento</option>
          <option value="won">Vendida</option>
          <option value="lost">Perdida</option>
        </select>

        <button className="btn btn-sm"
          style={{ marginLeft: "auto", background: showOutcomes ? "var(--acbg)" : undefined, color: showOutcomes ? "var(--ac)" : undefined }}
          onClick={() => setShowOutcomes(v => !v)}>
          {showOutcomes ? "← Pipeline" : "Resultados →"}
        </button>

        <span style={{ fontSize: 10, color: "var(--tx3)" }}>{filtered.length} negociações</span>
      </div>

      {/* ── KANBAN ── */}
      {view === "kanban" && (
        <div className="kanban">
          {displayStages.map(stage => {
            const stageNegs  = filtered.filter(n => n.stage === stage);
            const stageValue = stageNegs.reduce((s, n) => s + (Number(n.value) || 0), 0);
            const colColor   = _STAGE_COLORS[stage] || "#888";

            return (
              <div key={stage}
                className={`kanban-col${dragOver === stage ? " drag-over" : ""}`}
                onDragOver={e => { e.preventDefault(); setDragOver(stage); }}
                onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(null); }}
                onDrop={e => handleDrop(e, stage)}>

                <div className="kanban-header">
                  <h3 style={{ color: colColor }}>{stage} ({stageNegs.length})</h3>
                  <span className="kanban-value">{formatCurrency(stageValue)}</span>
                </div>

                <div className="kanban-cards">
                  {stageNegs.map(n => {
                    const sc      = calcScore(n, activities || [], tasks || []);
                    const contact = (contacts || []).find(c => c.id === n.contactId);
                    const company = (companies || []).find(c => c.id === n.companyId);
                    const fs      = _FOLLOW_STATUSES.find(x => x.id === contact?.followStatus);
                    const grade   = _GRADE_COLORS[sc.grade] || "#888";
                    const prodCol = _PRODUCT_COLORS[n.product] || "#888";

                    return (
                      <div key={n.id}
                        className={`kanban-card${dragId === n.id ? " dragging" : ""}`}
                        draggable
                        onDragStart={e => {
                          dragIdRef.current = n.id;
                          setDragId(n.id);
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("text/plain", n.id);
                        }}
                        onDragEnd={() => { setDragId(null); dragIdRef.current = null; setDragOver(null); }}
                        onClick={() => onSelect(n)}>

                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                          <StatusTag status={n.status} />
                          {fs && (
                            <span style={{ fontSize: 9, fontWeight: 600, padding: "1px 6px", borderRadius: 10, background: fs.color + "22", color: fs.color, whiteSpace: "nowrap" }}>
                              {fs.icon} {fs.label}
                            </span>
                          )}
                        </div>

                        <div className="card-name">
                          {n.name || n.product}
                          <div className="grade" style={{ background: grade + "22", color: grade, width: 17, height: 17, fontSize: 8.5, marginLeft: "auto", flexShrink: 0 }}>{sc.grade}</div>
                        </div>

                        {company && <div className="card-company">{company.name}</div>}

                        <div className="card-meta">
                          <div className="card-stars"><Stars value={n.stars || 0} size={10} /></div>
                          {contact && <span style={{ fontSize: 9, color: "var(--tx3)" }}>👤 {contact.name?.split(" ")[0]}</span>}
                          <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 8, background: prodCol + "22", color: prodCol, marginLeft: "auto" }}>
                            {n.product?.split(" ")[0]}
                          </span>
                        </div>

                        {n.value && (
                          <div style={{ fontSize: 10.5, color: "var(--ac)", fontWeight: 600, marginTop: 3 }}>
                            {formatCurrency(n.value)}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {stageNegs.length === 0 && (
                    <p style={{ fontSize: 10, color: "var(--tx3)", textAlign: "center", padding: 16 }}>—</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── LISTA ── */}
      {view === "list" && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Negociação</th>
                <th>Produto</th>
                <th>Qualificação</th>
                <th>Etapa</th>
                <th>Valor</th>
                <th>Criado em</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--tx3)", padding: 30 }}>Nenhuma negociação encontrada.</td></tr>
                : filtered.map(n => {
                    const sc      = calcScore(n, activities || [], tasks || []);
                    const contact = (contacts || []).find(c => c.id === n.contactId);
                    const company = (companies || []).find(c => c.id === n.companyId);
                    const stgCol  = _STAGE_COLORS[n.stage] || "#888";
                    const prodCol = _PRODUCT_COLORS[n.product] || "#888";
                    return (
                      <tr key={n.id} onClick={() => onSelect(n)}>
                        <td>
                          <div style={{ fontWeight: 500, fontSize: 12 }}>{n.name || n.product}</div>
                          {contact && <div style={{ fontSize: 10, color: "var(--tx3)" }}>👤 {contact.name}</div>}
                          {company && <div style={{ fontSize: 10, color: "var(--tx3)" }}>{company.name}</div>}
                        </td>
                        <td><span style={{ padding: "2px 7px", borderRadius: 8, fontSize: 10, background: prodCol + "22", color: prodCol }}>{n.product}</span></td>
                        <td><Stars value={n.stars || 0} size={12} /></td>
                        <td><span className="tag" style={{ background: stgCol + "22", color: stgCol }}>{n.stage}</span></td>
                        <td>{n.value ? <span style={{ color: "var(--ac)" }}>{formatCurrency(n.value)}</span> : <span style={{ color: "var(--tx3)", fontSize: 11 }}>—</span>}</td>
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
