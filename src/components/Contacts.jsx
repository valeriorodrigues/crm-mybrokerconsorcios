import { useState } from "react";
import { Modal, Field, AutoInput } from "./UI";
import { RELATIONSHIPS, COMPANY_ROLES } from "../utils/constants";
import { uid, emptyContact, calcAge, formatDate } from "../utils/helpers";
import { Check, UserPlus, X, Phone, Mail } from "lucide-react";

export function ContactForm({ contact, companies, allContacts, onSave, onClose }) {
  const [f, setF] = useState(contact ? { ...contact } : emptyContact());
  const s = (k, v) => setF(p => ({ ...p, [k]: v }));

  const addLink = () => s("linkedContacts", [...(f.linkedContacts || []), { contactId: "", relationship: "", role: "Dependente" }]);
  const updLink = (i, k, v) => { const a = [...f.linkedContacts]; a[i] = { ...a[i], [k]: v }; s("linkedContacts", a); };
  const rmLink = (i) => s("linkedContacts", f.linkedContacts.filter((_, j) => j !== i));

  return (
    <Modal title={contact ? "Editar Contato" : "Novo Contato"} onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => { if (f.name.trim()) onSave({ ...f, id: f.id || uid() }); }}>
          <Check size={12} /> Salvar
        </button>
      </>}>

      <div className="row2">
        <Field label="Nome Completo *"><input value={f.name} onChange={e => s("name", e.target.value)} autoFocus /></Field>
        <Field label="Data de Nascimento"><input type="date" value={f.birthDate || ""} onChange={e => s("birthDate", e.target.value)} /></Field>
      </div>
      <div className="row3">
        <Field label="Telefone"><input value={f.phone} onChange={e => s("phone", e.target.value)} placeholder="(00) 00000-0000" /></Field>
        <Field label="E-mail"><input value={f.email} onChange={e => s("email", e.target.value)} /></Field>
        <Field label="Cidade"><input value={f.city} onChange={e => s("city", e.target.value)} /></Field>
      </div>
      <div className="row2">
        <Field label="CPF"><input value={f.cpf || ""} onChange={e => s("cpf", e.target.value)} /></Field>
        <Field label="Cargo"><input value={f.cargo || ""} onChange={e => s("cargo", e.target.value)} /></Field>
      </div>

      <div className="section-title">Vínculo com Empresa</div>
      <div className="row2">
        <Field label="Empresa">
          <select value={f.companyId || ""} onChange={e => s("companyId", e.target.value)}>
            <option value="">Nenhuma</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Função">
          <select value={f.companyRole || ""} onChange={e => s("companyRole", e.target.value)}>
            <option value="">—</option>
            {COMPANY_ROLES.map(r => <option key={r}>{r}</option>)}
          </select>
        </Field>
      </div>

      <div className="section-title">Contatos Vinculados</div>
      {(f.linkedContacts || []).map((lc, i) => (
        <div key={i} className="row3" style={{ alignItems: "end" }}>
          <Field label="Contato">
            <select value={lc.contactId} onChange={e => updLink(i, "contactId", e.target.value)}>
              <option value="">—</option>
              {allContacts.filter(c => c.id !== f.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Parentesco">
            <select value={lc.relationship} onChange={e => updLink(i, "relationship", e.target.value)}>
              <option value="">—</option>
              {RELATIONSHIPS.map(r => <option key={r}>{r}</option>)}
            </select>
          </Field>
          <div style={{ display: "flex", gap: 3 }}>
            <select value={lc.role} onChange={e => updLink(i, "role", e.target.value)} style={{ flex: 1 }}>
              <option>Dependente</option><option>Titular</option>
            </select>
            <button className="btn btn-sm btn-red" onClick={() => rmLink(i)}><X size={10} /></button>
          </div>
        </div>
      ))}
      <button className="btn btn-sm" onClick={addLink}><UserPlus size={10} /> Vincular contato</button>

      <Field label="Observações"><textarea value={f.notes} onChange={e => s("notes", e.target.value)} /></Field>
    </Modal>
  );
}

export function ContactList({ contacts, companies, negotiations, onSelect, onEdit, onDelete }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Contato</th>
            <th>Empresa</th>
            <th>E-mail</th>
            <th>Telefone</th>
            <th>Cargo</th>
            <th>Negociações</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {contacts.map(c => {
            const comp = companies.find(x => x.id === c.companyId);
            const negs = negotiations.filter(n => n.contactId === c.id);
            return (
              <tr key={c.id} onClick={() => onSelect(c)}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div className="contact-avatar">{(c.name || "?")[0].toUpperCase()}</div>
                    <span style={{ fontWeight: 500 }}>{c.name}</span>
                  </div>
                </td>
                <td style={{ color: "var(--tx2)" }}>{comp?.name || "—"}</td>
                <td style={{ color: "var(--tx2)" }}>{c.email || "—"}</td>
                <td style={{ color: "var(--tx2)" }}>{c.phone || "—"}</td>
                <td style={{ color: "var(--tx3)" }}>{c.cargo || "—"}</td>
                <td>{negs.length}</td>
                <td>
                  <button className="btn btn-sm btn-ghost btn-red" onClick={e => { e.stopPropagation(); onDelete(c.id); }}>
                    <X size={10} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function ContactDetail({ contact, company, negotiations, activities, onBack, onEdit, onSelectNeg }) {
  const age = calcAge(contact.birthDate);
  return (
    <div className="fade-in">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <button className="btn btn-sm" onClick={onBack}>← Voltar</button>
        <div>
          <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 19, fontWeight: 400 }}>{contact.name}</h2>
          <span style={{ fontSize: 10, color: "var(--tx3)" }}>Contato</span>
        </div>
        <button className="btn btn-sm" style={{ marginLeft: "auto" }} onClick={() => onEdit(contact)}>Editar</button>
      </div>

      <div className="detail-layout">
        <div>
          <div className="panel">
            <div className="panel-header"><h4>Dados do Contato</h4></div>
            <div className="panel-body">
              <div className="panel-row"><span className="label">Nome</span><span className="value">{contact.name}</span></div>
              {contact.cargo && <div className="panel-row"><span className="label">Cargo</span><span className="value">{contact.cargo}</span></div>}
              {contact.phone && <div className="panel-row"><span className="label">Telefone</span><span className="value">{contact.phone}</span></div>}
              {contact.email && <div className="panel-row"><span className="label">E-mail</span><span className="value">{contact.email}</span></div>}
              {contact.city && <div className="panel-row"><span className="label">Cidade</span><span className="value">{contact.city}</span></div>}
              {contact.birthDate && <div className="panel-row"><span className="label">Nasc.</span><span className="value">{formatDate(contact.birthDate)}{age !== null ? ` (${age} anos)` : ""}</span></div>}
            </div>
          </div>
          {company && (
            <div className="panel">
              <div className="panel-header"><h4>Empresa</h4></div>
              <div className="panel-body">
                <div className="panel-row"><span className="label">Empresa</span><span className="value">{company.name}</span></div>
                {contact.companyRole && <div className="panel-row"><span className="label">Função</span><span className="value">{contact.companyRole}</span></div>}
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="panel">
            <div className="panel-header"><h4>Negociações ({negotiations.length})</h4></div>
            <div className="panel-body">
              {negotiations.length === 0
                ? <p style={{ fontSize: 11, color: "var(--tx3)" }}>Nenhuma negociação vinculada.</p>
                : negotiations.map(n => (
                  <div key={n.id}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--bd)", cursor: "pointer" }}
                    onClick={() => onSelectNeg(n)}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{n.name || n.product}</div>
                      <div style={{ fontSize: 10, color: "var(--tx3)" }}>{n.stage}</div>
                    </div>
                    <span style={{ fontSize: 11, color: "var(--ac)" }}>{n.value ? formatCurrency(n.value) : "—"}</span>
                    <span className="status-tag" style={{
                      background: ({ open: "#3B82F6", won: "#10B981", lost: "#EF4444" }[n.status]) + "18",
                      color: { open: "#3B82F6", won: "#10B981", lost: "#EF4444" }[n.status]
                    }}>{{ open: "Em andamento", won: "Vendida", lost: "Perdida" }[n.status]}</span>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
