import { useState, useRef } from "react";
import { Modal, Field, AutoInput, Panel, Stars, StatusTag } from "./UI";
import { RELATIONSHIPS, COMPANY_ROLES, STAGES, STAGE_COLORS, PRODUCT_COLORS, GRADE_COLORS, CHANNELS } from "../utils/constants";
import { uid, emptyContact, calcAge, formatDate, formatCurrency, daysSince, calcScore, fillTemplate, today } from "../utils/helpers";
import {
  Check, UserPlus, X, Phone, Mail, Plus, ArrowLeft, Edit3, Trash2,
  MessageCircle, FileText, Activity, Clipboard, Calendar, Clock,
  AlertTriangle, Pencil, User, XCircle, Trophy, Copy, Send, Target
} from "lucide-react";

// ─── Contact Form ───
export function ContactForm({ contact, companies, allContacts, onSave, onClose }) {
  const [f, setF] = useState(contact ? { ...contact } : emptyContact());
  const s = (k, v) => setF(p => ({ ...p, [k]: v }));
  const addLink = () => s("linkedContacts", [...(f.linkedContacts || []), { contactId: "", relationship: "", role: "Dependente" }]);
  const updLink = (i, k, v) => { const a = [...f.linkedContacts]; a[i] = { ...a[i], [k]: v }; s("linkedContacts", a); };
  const rmLink = (i) => s("linkedContacts", f.linkedContacts.filter((_, j) => j !== i));

  return (
    <Modal title={contact ? "Editar Contato" : "Novo Contato"} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancelar</button><button className="btn btn-primary" onClick={() => { if (f.name.trim()) onSave({ ...f, id: f.id || uid() }); }}><Check size={12} /> Salvar</button></>}>
      <div className="row2"><Field label="Nome Completo *"><input value={f.name} onChange={e => s("name", e.target.value)} autoFocus /></Field><Field label="Data de Nascimento"><input type="date" value={f.birthDate || ""} onChange={e => s("birthDate", e.target.value)} /></Field></div>
      <div className="row3"><Field label="Telefone"><input value={f.phone} onChange={e => s("phone", e.target.value)} placeholder="(00) 00000-0000" /></Field><Field label="E-mail"><input value={f.email} onChange={e => s("email", e.target.value)} /></Field><Field label="Cidade"><input value={f.city} onChange={e => s("city", e.target.value)} /></Field></div>
      <div className="row2"><Field label="CPF"><input value={f.cpf || ""} onChange={e => s("cpf", e.target.value)} /></Field><Field label="Cargo"><input value={f.cargo || ""} onChange={e => s("cargo", e.target.value)} /></Field></div>
      <div className="section-title">Vínculo com Empresa</div>
      <div className="row2">
        <Field label="Empresa"><select value={f.companyId || ""} onChange={e => s("companyId", e.target.value)}><option value="">Nenhuma</option>{companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label="Função"><select value={f.companyRole || ""} onChange={e => s("companyRole", e.target.value)}><option value="">—</option>{COMPANY_ROLES.map(r => <option key={r}>{r}</option>)}</select></Field>
      </div>
      <div className="section-title">Contatos Vinculados</div>
      {(f.linkedContacts || []).map((lc, i) => (
        <div key={i} className="row3" style={{ alignItems: "end" }}>
          <Field label="Contato"><select value={lc.contactId} onChange={e => updLink(i, "contactId", e.target.value)}><option value="">—</option>{allContacts.filter(c => c.id !== f.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <Field label="Parentesco"><select value={lc.relationship} onChange={e => updLink(i, "relationship", e.target.value)}><option value="">—</option>{RELATIONSHIPS.map(r => <option key={r}>{r}</option>)}</select></Field>
          <div style={{ display: "flex", gap: 3 }}><select value={lc.role} onChange={e => updLink(i, "role", e.target.value)} style={{ flex: 1 }}><option>Dependente</option><option>Titular</option></select><button className="btn btn-sm btn-red" onClick={() => rmLink(i)}><X size={10} /></button></div>
        </div>
      ))}
      <button className="btn btn-sm" onClick={addLink}><UserPlus size={10} /> Vincular contato</button>
      <Field label="Observações"><textarea value={f.notes} onChange={e => s("notes", e.target.value)} /></Field>
    </Modal>
  );
}

// ─── Contact List with filters ───
export function ContactList({ contacts, companies, negotiations, onSelect, onDelete }) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");

  const filtered = contacts.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (c.name || "").toLowerCase().includes(q)
      || (c.phone || "").toLowerCase().includes(q)
      || (c.email || "").toLowerCase().includes(q)
      || (c.city || "").toLowerCase().includes(q)
      || (c.notes || "").toLowerCase().includes(q)
      || (c.cargo || "").toLowerCase().includes(q);
  }).sort((a, b) => {
    if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
    if (sortBy === "negs") return negotiations.filter(n => n.contactId === b.id).length - negotiations.filter(n => n.contactId === a.id).length;
    if (sortBy === "recent") return (b.createdAt || "").localeCompare(a.createdAt || "");
    return 0;
  });

  return (<>
    <div style={{ display: "flex", gap: 6, marginBottom: 10, alignItems: "center", flexWrap: "wrap" }}>
      <div className="search-box">
        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35" /></svg>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nome, telefone, email, cidade…" style={{ width: 260 }} />
      </div>
      <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: "5px 8px", fontSize: 11 }}>
        <option value="name">Ordenar por nome</option>
        <option value="recent">Mais recentes</option>
        <option value="negs">Mais negociações</option>
      </select>
      <span style={{ fontSize: 10.5, color: "var(--tx3)" }}>{filtered.length}/{contacts.length} contatos</span>
    </div>
    <div className="table-wrap"><table><thead><tr><th>Contato</th><th>Empresa</th><th>E-mail</th><th>Telefone</th><th>Cargo</th><th>Negociações</th><th></th></tr></thead><tbody>
      {filtered.length === 0 ? <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--tx3)", padding: 20 }}>Nenhum contato encontrado.</td></tr>
      : filtered.map(c => {
        const comp = companies.find(x => x.id === c.companyId);
        const negs = negotiations.filter(n => n.contactId === c.id);
        return (<tr key={c.id} onClick={() => onSelect(c)}>
          <td><div style={{ display: "flex", alignItems: "center", gap: 8 }}><div className="contact-avatar">{(c.name || "?")[0].toUpperCase()}</div><span style={{ fontWeight: 500 }}>{c.name}</span></div></td>
          <td style={{ color: "var(--tx2)" }}>{comp?.name || "—"}</td>
          <td style={{ color: "var(--tx2)" }}>{c.email || "—"}</td>
          <td style={{ color: "var(--tx2)" }}>{c.phone || "—"}</td>
          <td style={{ color: "var(--tx3)" }}>{c.cargo || "—"}</td>
          <td>{negs.length}</td>
          <td><button className="btn btn-sm btn-ghost btn-red" onClick={e => { e.stopPropagation(); onDelete(c.id); }}><X size={10} /></button></td>
        </tr>);
      })}
    </tbody></table></div>
  </>);
}

// ═══════════════════════════════════════════════════════════════
// CONTACT DETAIL — THE HEART OF THE CRM
// Contact is the PARENT. Everything connects to contact.
// Negotiations, tasks, activities, notes — all belong to contact.
// ═══════════════════════════════════════════════════════════════
export function ContactDetail({
  contact, company, allContacts, negotiations, activities, tasks, templates,
  onBack, onEdit, onDelete,
  onCreateNeg, onEditNeg, onDeleteNeg,
  onStageChange, onWin, onLose,
  onAddActivity, onAddTask, onToggleTask, onAddNote
}) {
  const [tab, setTab] = useState("hist");
  const [noteText, setNoteText] = useState("");
  const [filterEvents, setFilterEvents] = useState("all");
  const [activeNegId, setActiveNegId] = useState(negotiations[0]?.id || null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDate, setTaskDate] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [showActForm, setShowActForm] = useState(false);
  const [actChannel, setActChannel] = useState("WhatsApp");
  const [actDesc, setActDesc] = useState("");
  const [tplPick, setTplPick] = useState(null);
  const [copied, setCopied] = useState(false);
  const noteRef = useRef(null);

  const age = calcAge(contact.birthDate);
  const linked = (contact.linkedContacts || []).map(lc => ({ ...lc, ct: allContacts.find(c => c.id === lc.contactId) }));

  const activeNeg = negotiations.find(n => n.id === activeNegId) || null;

  // ALL activities and tasks for this CONTACT (across all negotiations + direct)
  const contactActs = activities
    .filter(a => a.contactId === contact.id || negotiations.some(n => n.id === a.negotiationId))
    .sort((a, b) => (b.date + (b.id || "")).localeCompare(a.date + (a.id || "")));

  const contactTasks = tasks
    .filter(t => t.contactId === contact.id || negotiations.some(n => n.id === t.negotiationId));

  const pendingTasks = contactTasks.filter(t => !t.done).sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  // Filtered activities for display
  const filteredActs = filterEvents === "all" ? contactActs
    : filterEvents === "notes" ? contactActs.filter(a => a.channel === "Anotação")
    : filterEvents === "system" ? contactActs.filter(a => a.channel === "Sistema")
    : contactActs.filter(a => a.channel !== "Sistema" && a.channel !== "Anotação");

  const chColors = { WhatsApp: "#25D366", Telefone: "#3B82F6", "E-mail": "#F59E0B", Presencial: "#8B5CF6", Sistema: "#6B7280", Anotação: "#C8935A" };
  const chIcons = { WhatsApp: MessageCircle, Telefone: Phone, "E-mail": Mail, Anotação: FileText, Sistema: Activity, Presencial: User };

  // ─── ACTIONS: all tied to CONTACT, optionally to negotiation ───
  const submitNote = () => {
    if (!noteText.trim()) return;
    onAddNote(contact.id, activeNeg?.id || null, noteText, activeNeg?.stage || "");
    setNoteText("");
    noteRef.current?.focus();
  };

  const submitTask = () => {
    if (!taskTitle.trim() || !taskDate) return;
    onAddTask(contact.id, activeNeg?.id || null, { title: taskTitle, description: taskDesc, date: taskDate });
    setTaskTitle(""); setTaskDate(""); setTaskDesc(""); setShowTaskForm(false);
  };

  const submitActivity = () => {
    if (!actDesc.trim()) return;
    onAddActivity(contact.id, activeNeg?.id || null, { channel: actChannel, description: actDesc });
    setActDesc(""); setShowActForm(false);
  };

  const handleNoteKey = (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submitNote(); } };

  // Pipeline for active negotiation
  const stgIdx = activeNeg ? STAGES.indexOf(activeNeg.stage) : -1;
  const negDays = activeNeg ? daysSince(activeNeg.createdAt) : 0;

  return (
    <div className="fade-in">
      {/* ═══ HEADER ═══ */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, paddingBottom: 12, flexWrap: "wrap" }}>
        <button className="btn btn-sm" onClick={onBack}><ArrowLeft size={13} /></button>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 21, fontWeight: 400 }}>{contact.name}</h2>
          <span style={{ fontSize: 10.5, color: "var(--tx3)" }}>Contato{contact.city ? ` · ${contact.city}` : ""}{age !== null ? ` · ${age} anos` : ""}</span>
        </div>
        <div style={{ display: "flex", gap: 5 }}>
          <button className="btn btn-sm" onClick={() => onEdit(contact)}><Edit3 size={11} /> Editar</button>
          <button className="btn btn-primary btn-sm" onClick={onCreateNeg}><Plus size={11} /> Nova Negociação</button>
        </div>
      </div>

      {/* ═══ TWO-COLUMN ═══ */}
      <div className="detail-layout">

        {/* ═══ LEFT ═══ */}
        <div>
          <Panel title="Dados do Contato">
            <div className="contact-row">
              <div className="contact-avatar" style={{ width: 36, height: 36, fontSize: 14 }}>{(contact.name || "?")[0].toUpperCase()}</div>
              <div className="contact-info"><div className="contact-name">{contact.name}</div>{contact.cargo && <div className="contact-sub">{contact.cargo}</div>}</div>
            </div>
            {contact.phone && (<div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid var(--bd)" }}>
              <Phone size={13} color="var(--tx3)" /><span style={{ fontSize: 12.5 }}>{contact.phone}</span>
              <div style={{ display: "flex", gap: 3, marginLeft: "auto" }}>
                <button className="btn btn-sm btn-ghost" onClick={() => navigator.clipboard?.writeText(contact.phone)}><Clipboard size={11} /></button>
                <button className="btn btn-sm btn-ghost" onClick={() => window.open("https://wa.me/55" + contact.phone.replace(/\D/g, ""), "_blank")}><MessageCircle size={11} color="#25D366" /></button>
              </div>
            </div>)}
            {contact.email && (<div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid var(--bd)" }}>
              <Mail size={13} color="var(--tx3)" /><span style={{ fontSize: 12.5, color: "var(--blu)" }}>{contact.email}</span>
              <button className="btn btn-sm btn-ghost" style={{ marginLeft: "auto" }} onClick={() => navigator.clipboard?.writeText(contact.email)}><Clipboard size={11} /></button>
            </div>)}
            {contact.city && <div className="panel-row"><span className="label">Cidade</span><span className="value">{contact.city}</span></div>}
            {contact.birthDate && <div className="panel-row"><span className="label">Nascimento</span><span className="value">{formatDate(contact.birthDate)}{age !== null ? ` (${age} anos)` : ""}</span></div>}
            {contact.cpf && <div className="panel-row"><span className="label">CPF</span><span className="value">{contact.cpf}</span></div>}
            {contact.notes && <div className="panel-row"><span className="label">Obs.</span><span className="value" style={{ fontSize: 11, color: "var(--tx2)" }}>{contact.notes}</span></div>}
          </Panel>

          <Panel title="Empresa" defaultOpen={!!company}>
            {company ? (<>
              <div className="panel-row"><span className="label">Empresa</span><span className="value">{company.name}</span></div>
              {contact.companyRole && <div className="panel-row"><span className="label">Função</span><span className="value">{contact.companyRole}</span></div>}
              {company.segment && <div className="panel-row"><span className="label">Segmento</span><span className="value">{company.segment}</span></div>}
            </>) : <p style={{ fontSize: 11.5, color: "var(--tx3)" }}>Sem empresa vinculada.</p>}
          </Panel>

          {linked.length > 0 && (<Panel title="Vínculos" defaultOpen={false}>
            {linked.map((lc, i) => lc.ct && <div key={i} className="panel-row"><span className="label">{lc.role} ({lc.relationship})</span><span className="value">{lc.ct.name}</span></div>)}
          </Panel>)}

          {/* Negotiations selector */}
          <Panel title={`Negociações (${negotiations.length})`}>
            {negotiations.length === 0 ? (
              <div style={{ padding: "8px 0" }}>
                <p style={{ fontSize: 11.5, color: "var(--tx3)", marginBottom: 8 }}>Nenhuma negociação vinculada.</p>
                <p style={{ fontSize: 10.5, color: "var(--tx3)" }}>Crie uma negociação para acompanhar o pipeline de vendas deste contato.</p>
              </div>
            ) : (
              negotiations.map(n => {
                const sc = calcScore(n, activities, tasks);
                const isActive = activeNegId === n.id;
                return (
                  <div key={n.id} onClick={() => setActiveNegId(n.id)} style={{
                    padding: "9px 10px", marginBottom: 5, borderRadius: 7, cursor: "pointer", transition: ".12s",
                    background: isActive ? "var(--acbg)" : "var(--s2)",
                    border: isActive ? "1px solid var(--ac)" : "1px solid var(--bd)"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                      <Target size={11} color={isActive ? "var(--ac)" : "var(--tx3)"} />
                      <span style={{ fontSize: 12, fontWeight: 500, color: isActive ? "var(--ac)" : "var(--tx)" }}>{n.name || n.product}</span>
                      <div className="grade" style={{ background: GRADE_COLORS[sc.grade] + "22", color: GRADE_COLORS[sc.grade], width: 17, height: 17, fontSize: 8.5, marginLeft: "auto" }}>{sc.grade}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                      <span className="tag" style={{ background: PRODUCT_COLORS[n.product] + "22", color: PRODUCT_COLORS[n.product] }}>{n.product}</span>
                      <StatusTag status={n.status} />
                      {n.value && <span style={{ fontSize: 10.5, color: "var(--ac)", marginLeft: "auto" }}>{formatCurrency(n.value)}</span>}
                    </div>
                  </div>
                );
              })
            )}
            <button className="btn btn-sm" style={{ color: "var(--blu)", borderColor: "var(--blu)", marginTop: 6, width: "100%" }} onClick={onCreateNeg}>
              <Plus size={10} /> Nova Negociação
            </button>
          </Panel>

          {/* Product details for active negotiation */}
          {activeNeg && activeNeg.product === "Plano de Saúde" && activeNeg.health?.modality && (
            <Panel title={"Saúde — " + activeNeg.health.modality} defaultOpen={false}>
              {activeNeg.health.branch && <div className="panel-row"><span className="label">Ramo</span><span className="value">{activeNeg.health.branch}</span></div>}
              {activeNeg.health.operator && <div className="panel-row"><span className="label">Operadora</span><span className="value">{activeNeg.health.operator}</span></div>}
            </Panel>
          )}
          {activeNeg && activeNeg.product === "Consórcio" && activeNeg.consorcio?.branch && (
            <Panel title={"Consórcio — " + activeNeg.consorcio.branch} defaultOpen={false}>
              <div className="panel-row"><span className="label">Crédito</span><span className="value">{formatCurrency(activeNeg.consorcio.creditValue)}</span></div>
              {activeNeg.consorcio.buyerProfile && <div className="panel-row"><span className="label">Perfil</span><span className="value">{activeNeg.consorcio.buyerProfile}</span></div>}
            </Panel>
          )}

          <Panel title="Responsável" defaultOpen={false}>
            <div className="panel-row"><span className="label">Responsável</span><span className="value">Valério Rodrigues</span></div>
          </Panel>
        </div>

        {/* ═══ RIGHT ═══ */}
        <div>
          {/* Pipeline bar (only if a negotiation is selected) */}
          {activeNeg && (<>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{activeNeg.name || activeNeg.product}</span>
              <Stars value={activeNeg.stars || 0} size={13} />
              <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                <button className="btn btn-red btn-sm" onClick={() => onLose(activeNeg.id)}><XCircle size={11} /> Perda</button>
                <button className="btn btn-green btn-sm" onClick={() => onWin(activeNeg.id)}><Trophy size={11} /> Venda</button>
                <button className="btn btn-sm" onClick={() => onEditNeg(activeNeg)}><Edit3 size={10} /></button>
              </div>
            </div>
            <div className="pipeline-bar" style={{ marginBottom: 12 }}>
              {STAGES.map((stg, i) => {
                const active = i === stgIdx, passed = i < stgIdx;
                return (<div key={stg} className={`pipeline-step ${active ? "active" : ""} ${passed ? "passed" : ""}`}
                  style={{ background: active ? STAGE_COLORS[stg] : passed ? STAGE_COLORS[stg] + "88" : "var(--s1)" }}
                  onClick={() => onStageChange(activeNeg.id, stg)}>
                  {stg}{active && <span className="days">({negDays}d)</span>}
                </div>);
              })}
            </div>
          </>)}

          {/* ── TASKS (always visible, works with or without negotiation) ── */}
          <div className="tasks-box">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Próximas tarefas</span>
              <Calendar size={14} color="var(--tx3)" />
            </div>
            {pendingTasks.length === 0
              ? <p style={{ fontSize: 12, color: "var(--tx3)", padding: "8px 0" }}>Nenhuma tarefa pendente.</p>
              : pendingTasks.map(t => {
                const over = t.date && t.date.slice(0, 10) < today();
                const neg = negotiations.find(n => n.id === t.negotiationId);
                return (<div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", marginBottom: 5, background: over ? "rgba(239,68,68,.05)" : "var(--s2)", border: "1px solid " + (over ? "rgba(239,68,68,.15)" : "var(--bd)"), borderRadius: 8 }}>
                  <Clipboard size={13} color="var(--tx3)" />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ fontSize: 12, fontWeight: 500 }}>Tarefa</span>
                      {over && <span style={{ background: "#EF4444", color: "#fff", fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3 }}>ATRASADA</span>}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 1 }}>{t.title || t.description || "Tarefa"}</div>
                    {neg && <div style={{ fontSize: 9.5, color: "var(--tx3)", marginTop: 1 }}>{neg.name || neg.product}</div>}
                  </div>
                  <div style={{ fontSize: 10, color: over ? "var(--red)" : "var(--tx3)" }}>{formatDate(t.date?.slice(0, 10))}</div>
                  <button className="btn btn-sm btn-ghost" onClick={() => onToggleTask(t.id)}><Check size={11} color="var(--grn)" /></button>
                </div>);
              })
            }
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
              <span style={{ fontSize: 10, color: "var(--tx3)" }}>Mostrando {pendingTasks.length}/{contactTasks.length} tarefas</span>
              <button className="btn btn-sm" style={{ color: "var(--blu)", borderColor: "var(--blu)" }} onClick={() => setShowTaskForm(!showTaskForm)}>
                <Plus size={10} /> Criar tarefa
              </button>
            </div>
            {/* Inline task form */}
            {showTaskForm && (<div style={{ marginTop: 8, padding: 10, background: "var(--s2)", border: "1px solid var(--bd)", borderRadius: 7 }}>
              <input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Título da tarefa (ex: Ligar para cliente, Enviar proposta…)" style={{ marginBottom: 5 }} />
              <div className="row2" style={{ marginBottom: 5 }}>
                <input type="datetime-local" value={taskDate} onChange={e => setTaskDate(e.target.value)} />
                <input value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder="Descrição (opcional)" />
              </div>
              {negotiations.length > 0 && (<div style={{ marginBottom: 5 }}>
                <select value={activeNegId || ""} onChange={e => setActiveNegId(e.target.value)} style={{ fontSize: 11 }}>
                  <option value="">Sem negociação vinculada</option>
                  {negotiations.map(n => <option key={n.id} value={n.id}>{n.name || n.product}</option>)}
                </select>
              </div>)}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 4 }}>
                <button className="btn btn-sm" onClick={() => setShowTaskForm(false)}>Cancelar</button>
                <button className="btn btn-primary btn-sm" onClick={submitTask}><Check size={10} /> Criar</button>
              </div>
            </div>)}
          </div>

          {/* ── TABS ── */}
          <div className="detail-tabs">
            {[["hist","Histórico"],["tasks","Tarefas"],["product","Produtos"],["tpl","Propostas"]].map(([k, l]) => (
              <button key={k} className={"detail-tab " + (tab === k ? "active" : "")} onClick={() => setTab(k)}>{l}</button>
            ))}
          </div>

          <div className="timeline-area">
            {/* ═══ HISTÓRICO ═══ */}
            {tab === "hist" && <>
              {/* Filters */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: "var(--tx3)" }}>Do</span>
                <select style={{ padding: "4px 8px", fontSize: 11, width: 125 }} disabled><option>My Broker CRM</option></select>
                <span style={{ fontSize: 11, color: "var(--tx3)" }}>Exibir</span>
                <select value={filterEvents} onChange={e => setFilterEvents(e.target.value)} style={{ padding: "4px 8px", fontSize: 11, width: 140 }}>
                  <option value="all">Todos os eventos</option><option value="notes">Apenas anotações</option><option value="system">Eventos do sistema</option><option value="contacts">Contatos realizados</option>
                </select>
                <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                  <button className="btn btn-sm" style={{ color: "var(--blu)", borderColor: "var(--blu)" }} onClick={() => setShowActForm(!showActForm)}><Phone size={10} /> Registrar contato</button>
                  <button className="btn btn-sm" style={{ color: "var(--blu)", borderColor: "var(--blu)" }} onClick={() => noteRef.current?.focus()}><Plus size={10} /> Criar anotação</button>
                </div>
              </div>

              {/* Annotation form — ALWAYS visible, works without negotiation */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 3, color: "var(--tx2)" }}>Anotação</div>
                <div style={{ background: "var(--s2)", border: "1px solid var(--bd)", borderRadius: 7, padding: 10 }}>
                  <textarea ref={noteRef} value={noteText} onChange={e => setNoteText(e.target.value)} onKeyDown={handleNoteKey}
                    placeholder="Escreva uma anotação sobre este contato… (Ctrl+Enter para salvar)"
                    style={{ width: "100%", minHeight: 60, background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 6, padding: "8px 10px", fontSize: 12.5, color: "var(--tx)", fontFamily: "inherit", resize: "vertical", outline: "none" }} />
                  <div style={{ display: "flex", justifyContent: "flex-start", marginTop: 6, gap: 5 }}>
                    <button className="btn btn-sm" onClick={() => setNoteText("")} style={{ color: "var(--tx3)" }}>Cancelar</button>
                    <button className="btn btn-primary btn-sm" onClick={submitNote} disabled={!noteText.trim()}>Salvar no histórico</button>
                  </div>
                </div>
              </div>

              {/* Activity registration form */}
              {showActForm && (<div style={{ marginBottom: 12, padding: 10, background: "var(--s2)", border: "1px solid var(--bd)", borderRadius: 7 }}>
                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 5 }}>Registrar Contato</div>
                <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 5, marginBottom: 5 }}>
                  <select value={actChannel} onChange={e => setActChannel(e.target.value)} style={{ fontSize: 11 }}>{CHANNELS.map(c => <option key={c}>{c}</option>)}</select>
                  <input value={actDesc} onChange={e => setActDesc(e.target.value)} placeholder="O que foi conversado…" />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 4 }}>
                  <button className="btn btn-sm" onClick={() => setShowActForm(false)}>Cancelar</button>
                  <button className="btn btn-primary btn-sm" onClick={submitActivity}><Send size={10} /> Registrar</button>
                </div>
              </div>)}

              {/* Timeline marker */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--pur)", flexShrink: 0 }} />
                <div style={{ flex: 1, height: 1, background: "var(--bd)" }} />
              </div>

              {/* Timeline */}
              {filteredActs.length === 0 ? <p style={{ fontSize: 12, color: "var(--tx3)", textAlign: "center", padding: 20 }}>Nenhum evento registrado.</p>
              : filteredActs.map(a => {
                const Ic = chIcons[a.channel] || Activity;
                const isNote = a.channel === "Anotação", isSys = a.channel === "Sistema";
                const neg = negotiations.find(n => n.id === a.negotiationId);
                return (
                  <div key={a.id} className="timeline-item">
                    <div className="timeline-dot" style={{ background: (chColors[a.channel] || "#6B7280") + "22" }}><Ic size={13} color={chColors[a.channel] || "#6B7280"} /></div>
                    <div className="timeline-content">
                      <div className="timeline-title">
                        <strong style={{ color: "var(--tx)" }}>Valério Rodrigues</strong>
                        {isNote && <span style={{ color: "var(--tx2)", fontWeight: 400 }}> fez uma anotação{a.stage ? ` na etapa ${a.stage}` : ""}{neg ? ` — ${neg.name || neg.product}` : ""}</span>}
                        {isSys && <span style={{ color: "var(--tx2)", fontWeight: 400 }}> {a.description}</span>}
                        {!isNote && !isSys && <span style={{ color: "var(--tx2)", fontWeight: 400 }}> registrou contato via {a.channel}</span>}
                      </div>
                      {!isSys && a.description && (
                        <div className="timeline-desc" style={{ whiteSpace: "pre-wrap", marginTop: 4, lineHeight: 1.5, ...(isNote ? { background: "var(--s2)", padding: "8px 10px", borderRadius: 6, borderLeft: "3px solid var(--ac)" } : {}) }}>{a.description}</div>
                      )}
                      <div className="timeline-date">{formatDate(a.date)}</div>
                    </div>
                  </div>
                );
              })}
            </>}

            {/* ═══ TAREFAS ═══ */}
            {tab === "tasks" && <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <button className="btn btn-sm" style={{ marginLeft: "auto", color: "var(--blu)", borderColor: "var(--blu)" }} onClick={() => setShowTaskForm(true)}><Plus size={10} /> Criar tarefa</button>
              </div>
              {contactTasks.filter(t => !t.done).length === 0 ? <p style={{ fontSize: 12, color: "var(--tx3)", textAlign: "center", padding: 20 }}>Nenhuma tarefa pendente.</p>
              : contactTasks.filter(t => !t.done).map(t => {
                const over = t.date && t.date.slice(0, 10) < today();
                const neg = negotiations.find(n => n.id === t.negotiationId);
                return (<div key={t.id} style={{ padding: 11, marginBottom: 7, background: "var(--s2)", border: "1px solid var(--bd)", borderRadius: 7 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
                    <Clipboard size={12} color="var(--tx3)" /><span style={{ fontSize: 12, fontWeight: 500 }}>Tarefa</span>
                    {over && <span style={{ background: "#EF4444", color: "#fff", fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3 }}>ATRASADA</span>}
                    <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--tx3)" }}>{formatDate(t.date?.slice(0, 10))}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--tx2)", paddingLeft: 19 }}>{t.title || t.description || "Tarefa"}</div>
                  {neg && <div style={{ fontSize: 10, color: "var(--tx3)", paddingLeft: 19, marginTop: 2 }}>{neg.name || neg.product}</div>}
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 4, marginTop: 5 }}>
                    <button className="btn btn-sm btn-ghost" onClick={() => onToggleTask(t.id)}><Check size={10} color="var(--grn)" /> Concluir</button>
                  </div>
                </div>);
              })}
            </>}

            {/* ═══ PRODUTOS ═══ */}
            {tab === "product" && (<div style={{ fontSize: 12.5, color: "var(--tx2)", lineHeight: 1.8, padding: "8px 0" }}>
              {activeNeg ? (<>
                <strong style={{ color: "var(--tx)" }}>Produto:</strong> {activeNeg.product}<br />
                {activeNeg.value && <><strong>Valor:</strong> <span style={{ color: "var(--ac)" }}>{formatCurrency(activeNeg.value)}</span><br /></>}
                {activeNeg.health?.modality && <><strong>Modalidade:</strong> {activeNeg.health.modality}<br /></>}
                {activeNeg.health?.operator && <><strong>Operadora:</strong> {activeNeg.health.operator}<br /></>}
                {activeNeg.consorcio?.branch && <><strong>Ramo:</strong> {activeNeg.consorcio.branch}<br /></>}
                {activeNeg.consorcio?.creditValue && <><strong>Crédito:</strong> {formatCurrency(activeNeg.consorcio.creditValue)}<br /></>}
              </>) : <p style={{ color: "var(--tx3)" }}>Selecione ou crie uma negociação para ver os produtos.</p>}
            </div>)}

            {/* ═══ PROPOSTAS ═══ */}
            {tab === "tpl" && <>
              {templates.map(t => (<div key={t.id} style={{ background: "var(--s2)", border: "1px solid var(--bd)", borderRadius: 7, padding: 10, marginBottom: 6, cursor: "pointer" }} onClick={() => setTplPick(t)}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}><span style={{ fontSize: 12, fontWeight: 500 }}>{t.name}</span><span className="tag" style={{ background: t.channel === "WhatsApp" ? "#25D36622" : "var(--s3)", color: t.channel === "WhatsApp" ? "#25D366" : "var(--tx2)" }}>{t.channel}</span></div>
                <div style={{ fontSize: 10.5, color: "var(--tx3)", whiteSpace: "pre-wrap", maxHeight: 36, overflow: "hidden", lineHeight: 1.3 }}>{t.body}</div>
              </div>))}
              {activeNeg?.product === "Consórcio" && <a href="/simulador" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 13px", marginTop: 8, background: "var(--acbg)", border: "1px solid rgba(200,147,90,.15)", borderRadius: 8, color: "var(--ac)", textDecoration: "none", fontSize: 12, fontWeight: 500 }}>📊 Abrir Simulador de Propostas</a>}
            </>}
          </div>

          {/* Template modal */}
          {tplPick && (<Modal title="Usar Template" onClose={() => setTplPick(null)} footer={<><button className="btn" onClick={() => setTplPick(null)}>Fechar</button><button className="btn btn-primary" onClick={() => { navigator.clipboard?.writeText(fillTemplate(tplPick.body, activeNeg || {}, contact)); setCopied(true); setTimeout(() => setCopied(false), 2e3); }}><Copy size={11} /> {copied ? "Copiado!" : "Copiar"}</button></>}>
            <div style={{ background: "var(--s2)", border: "1px solid var(--bd)", borderRadius: 7, padding: 14, whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.6, minHeight: 70 }}>{fillTemplate(tplPick.body, activeNeg || {}, contact)}</div>
          </Modal>)}
        </div>
      </div>
    </div>
  );
}
