import { useState } from "react";
import { Modal, Field, Stars, StatusTag } from "./UI";
import { uid, emptyCompany, formatCurrency, formatDate } from "../utils/helpers";
import { Check, Building2, X } from "lucide-react";

export function CompanyForm({ company, onSave, onClose }) {
  const [f, setF] = useState(company ? { ...company } : emptyCompany());
  const s = (k, v) => setF(p => ({ ...p, [k]: v }));

  return (
    <Modal title={company ? "Editar Empresa" : "Nova Empresa"} onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => { if (f.name.trim()) onSave({ ...f, id: f.id || uid() }); }}>
          <Check size={12} /> Salvar
        </button>
      </>}>
      <div className="row2">
        <Field label="Razão Social *"><input value={f.name} onChange={e => s("name", e.target.value)} autoFocus /></Field>
        <Field label="CNPJ"><input value={f.cnpj || ""} onChange={e => s("cnpj", e.target.value)} /></Field>
      </div>
      <div className="row3">
        <Field label="Telefone"><input value={f.phone || ""} onChange={e => s("phone", e.target.value)} /></Field>
        <Field label="E-mail"><input value={f.email || ""} onChange={e => s("email", e.target.value)} /></Field>
        <Field label="Cidade"><input value={f.city || ""} onChange={e => s("city", e.target.value)} /></Field>
      </div>
      <div className="row2">
        <Field label="Segmento"><input value={f.segment || ""} onChange={e => s("segment", e.target.value)} placeholder="Ramo de atividade" /></Field>
        <Field label="Funcionários"><input type="number" value={f.employeeCount || ""} onChange={e => s("employeeCount", e.target.value)} /></Field>
      </div>
      <div className="row2">
        <Field label="URL"><input value={f.url || ""} onChange={e => s("url", e.target.value)} /></Field>
        <Field label="Endereço"><input value={f.address || ""} onChange={e => s("address", e.target.value)} /></Field>
      </div>
      <Field label="Observações"><textarea value={f.notes || ""} onChange={e => s("notes", e.target.value)} /></Field>
    </Modal>
  );
}

export function CompanyDetail({ company, contacts, negotiations, activities, tasks, onBack, onEdit, onSelectNeg, onCreateNeg }) {
  const [tab, setTab] = useState("negs");
  const linkedContacts = contacts.filter(c => c.companyId === company.id);
  const linkedNegs = negotiations.filter(n => n.companyId === company.id);

  // KPIs
  const valOpen = linkedNegs.filter(n => n.status === "open").reduce((s, n) => s + (Number(n.value) || 0), 0);
  const valWon = linkedNegs.filter(n => n.status === "won").reduce((s, n) => s + (Number(n.value) || 0), 0);
  const valLost = linkedNegs.filter(n => n.status === "lost").reduce((s, n) => s + (Number(n.value) || 0), 0);
  const ticketMedio = linkedNegs.length > 0 ? Math.round((valOpen + valWon + valLost) / linkedNegs.length) : 0;

  return (
    <div className="fade-in">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <button className="btn btn-sm" onClick={onBack}>← Voltar</button>
        <div>
          <span style={{ fontSize: 10, color: "var(--tx3)" }}>Empresa</span>
          <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 19, fontWeight: 400 }}>{company.name}</h2>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 5 }}>
          <button className="btn btn-sm" onClick={() => onEdit(company)}>Editar</button>
          <button className="btn btn-primary btn-sm" onClick={onCreateNeg}>+ Criar Negociação</button>
        </div>
      </div>

      <div className="detail-layout" style={{ marginTop: 16 }}>
        {/* Left panel */}
        <div>
          <div className="panel">
            <div className="panel-header"><h4>Empresa</h4></div>
            <div className="panel-body">
              <div style={{ fontSize: 11.5, fontWeight: 600, marginBottom: 8 }}>Cadastro</div>
              <div className="panel-row"><span className="label">Empresa</span><span className="value">{company.name}</span></div>
              {company.segment && <div className="panel-row"><span className="label">Segmento</span><span className="value">{company.segment}</span></div>}
              {company.url && <div className="panel-row"><span className="label">URL</span><span className="value">{company.url}</span></div>}
              {company.address && <div className="panel-row"><span className="label">Endereço</span><span className="value">{company.address}</span></div>}
              {company.city && <div className="panel-row"><span className="label">Cidade</span><span className="value">{company.city}</span></div>}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header"><h4>Contatos Associados ({linkedContacts.length})</h4></div>
            <div className="panel-body">
              {linkedContacts.length === 0
                ? <p style={{ fontSize: 11, color: "var(--tx3)" }}>Nenhum contato vinculado.</p>
                : linkedContacts.map(c => (
                  <div key={c.id} className="contact-row">
                    <div className="contact-avatar">{(c.name || "?")[0].toUpperCase()}</div>
                    <div className="contact-info">
                      <div className="contact-name">{c.name}</div>
                      <div className="contact-sub">{c.cargo || ""}{c.phone ? ` · ${c.phone}` : ""}</div>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>

        {/* Right panel with KPIs and negotiations */}
        <div>
          {/* KPI row (like RD Station) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
            <div className="kpi kpi-blue">
              <div className="kpi-label">Valor em andamento</div>
              <div className="kpi-value" style={{ color: "var(--blu)" }}>{formatCurrency(valOpen) || "R$ 0,00"}</div>
            </div>
            <div className="kpi kpi-green">
              <div className="kpi-label">Valor vendido</div>
              <div className="kpi-value" style={{ color: "var(--grn)" }}>{formatCurrency(valWon) || "R$ 0,00"}</div>
            </div>
            <div className="kpi kpi-red">
              <div className="kpi-label">Valor perdido</div>
              <div className="kpi-value" style={{ color: "var(--red)" }}>{formatCurrency(valLost) || "R$ 0,00"}</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
            <div className="kpi">
              <div className="kpi-label">Total negociações</div>
              <div className="kpi-value">{linkedNegs.length}</div>
            </div>
            <div className="kpi">
              <div className="kpi-label">Ticket médio</div>
              <div className="kpi-value">{formatCurrency(ticketMedio) || "R$ 0,00"}</div>
            </div>
            <div className="kpi">
              <div className="kpi-label">Tempo médio até venda</div>
              <div className="kpi-value">—</div>
              <div className="kpi-sub">Dias</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="detail-tabs">
            <button className={`detail-tab ${tab === "negs" ? "active" : ""}`} onClick={() => setTab("negs")}>Negociações</button>
            <button className={`detail-tab ${tab === "hist" ? "active" : ""}`} onClick={() => setTab("hist")}>Histórico</button>
          </div>
          <div className="timeline-area">
            {tab === "negs" && (
              <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
                <table>
                  <thead>
                    <tr><th>Status</th><th>Negociação</th><th>Qualificação</th><th>Status</th><th>Valor Total</th></tr>
                  </thead>
                  <tbody>
                    {linkedNegs.length === 0
                      ? <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--tx3)", padding: 20 }}>Nenhuma negociação</td></tr>
                      : linkedNegs.map(n => (
                        <tr key={n.id} onClick={() => onSelectNeg(n)}>
                          <td>
                            <div className="contact-avatar" style={{ width: 26, height: 26, fontSize: 9 }}>VR</div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 500, fontSize: 12 }}>{n.name || n.product}</div>
                            <div style={{ fontSize: 10, color: "var(--tx3)" }}>{n.stage}</div>
                          </td>
                          <td><Stars value={n.stars || 0} size={12} /></td>
                          <td><StatusTag status={n.status} /></td>
                          <td style={{ color: "var(--ac)" }}>{formatCurrency(n.value)}</td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            )}
            {tab === "hist" && (
              <div>
                {activities.filter(a => linkedNegs.some(n => n.id === a.negotiationId)).length === 0
                  ? <p style={{ fontSize: 11, color: "var(--tx3)", textAlign: "center", padding: 20 }}>Sem histórico.</p>
                  : activities.filter(a => linkedNegs.some(n => n.id === a.negotiationId)).slice(-10).reverse().map(a => (
                    <div key={a.id} className="timeline-item">
                      <div className="timeline-dot" style={{ background: "var(--s3)" }}>
                        <Building2 size={12} color="var(--tx3)" />
                      </div>
                      <div className="timeline-content">
                        <div className="timeline-title">{a.channel}</div>
                        <div className="timeline-desc">{a.description}</div>
                        <div className="timeline-date">{formatDate(a.date)}</div>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
