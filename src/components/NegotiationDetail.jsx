import { useState, useRef } from "react";
import { Panel, Stars, StatusTag, Modal } from "./UI";
import { STAGES, STAGE_COLORS, PRODUCT_COLORS, GRADE_COLORS, CHANNELS } from "../utils/constants";
import { formatDate, formatCurrency, daysSince, calcAge, calcScore, fillTemplate, today, uid } from "../utils/helpers";
import {
  ArrowLeft, Edit3, Trash2, Plus, Clock, XCircle, Trophy, Phone, Mail,
  MessageCircle, FileText, Activity, Copy, Check, AlertTriangle, Calendar,
  Clipboard, ChevronDown, Pencil, User, Send
} from "lucide-react";

export function NegotiationDetail({
  negotiation, contact, company, activities, tasks, templates, allContacts,
  onEdit, onBack, onDelete, onStageChange, onWin, onLose,
  onAddActivity, onAddTask, onToggleTask, onAddNote
}) {
  const [tab, setTab] = useState("hist");
  const [noteText, setNoteText] = useState("");
  const [tplPick, setTplPick] = useState(null);
  const [copied, setCopied] = useState(false);
  const [filterEvents, setFilterEvents] = useState("all");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDate, setTaskDate] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [actChannel, setActChannel] = useState("WhatsApp");
  const [actDesc, setActDesc] = useState("");
  const [showActForm, setShowActForm] = useState(false);
  const noteRef = useRef(null);

  const n = negotiation;
  const sc = calcScore(n, activities, tasks);
  const stgIdx = STAGES.indexOf(n.stage);
  const days = daysSince(n.createdAt);
  const isH = n.product === "Plano de Saúde";
  const isC = n.product === "Consórcio";
  const h = n.health || {};
  const co = n.consorcio || {};

  const myActs = activities.filter(a => a.negotiationId === n.id).sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id));
  const myTasks = tasks.filter(t => t.negotiationId === n.id).sort((a, b) => a.date.localeCompare(b.date));
  const pendingTasks = myTasks.filter(t => !t.done);

  const filteredActs = filterEvents === "all" ? myActs
    : filterEvents === "notes" ? myActs.filter(a => a.channel === "Anotação")
    : filterEvents === "system" ? myActs.filter(a => a.channel === "Sistema")
    : myActs.filter(a => a.channel !== "Sistema" && a.channel !== "Anotação");

  const chColors = { WhatsApp: "#25D366", Telefone: "#3B82F6", "E-mail": "#F59E0B", Presencial: "#8B5CF6", Sistema: "#6B7280", Anotação: "#C8935A" };
  const chIcons = { WhatsApp: MessageCircle, Telefone: Phone, "E-mail": Mail, Anotação: FileText, Sistema: Activity, Presencial: User };

  const submitNote = () => {
    if (!noteText.trim()) return;
    onAddNote(n.id, noteText, n.stage);
    setNoteText("");
  };

  const submitTask = () => {
    if (!taskTitle.trim() || !taskDate) return;
    onAddTask(n.id, { title: taskTitle, description: taskDesc, date: taskDate });
    setTaskTitle(""); setTaskDate(""); setTaskDesc(""); setShowTaskForm(false);
  };

  const submitActivity = () => {
    if (!actDesc.trim()) return;
    onAddActivity(n.id, { channel: actChannel, description: actDesc });
    setActDesc(""); setShowActForm(false);
  };

  const handleNoteKey = (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submitNote(); } };

  return (
    <div className="fade-in">
      {/* ═══ HEADER ═══ */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, paddingBottom: 10, flexWrap: "wrap" }}>
        <button className="btn btn-sm" onClick={onBack}><ArrowLeft size={13} /></button>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 20, fontWeight: 400 }}>{n.name || n.product}</h2>
          <div style={{ display: "flex", gap: 4, marginTop: 3, flexWrap: "wrap", alignItems: "center" }}>
            {n.status !== "open" && <StatusTag status={n.status} />}
            <span className="tag" style={{ background: PRODUCT_COLORS[n.product] + "22", color: PRODUCT_COLORS[n.product] }}>{n.product}</span>
            <Stars value={n.stars || 0} size={14} />
            <div className="grade" style={{ background: GRADE_COLORS[sc.grade] + "22", color: GRADE_COLORS[sc.grade] }}>{sc.grade}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn btn-red" style={{ fontSize: 12 }} onClick={() => onLose(n.id)}><XCircle size={13} /> Marcar perda</button>
          <button className="btn btn-green" style={{ fontSize: 12 }} onClick={() => onWin(n.id)}><Trophy size={13} /> Marcar venda</button>
        </div>
      </div>

      {/* ═══ PIPELINE BAR ═══ */}
      <div className="pipeline-bar">
        {STAGES.map((stg, i) => {
          const active = i === stgIdx, passed = i < stgIdx;
          return (<div key={stg} className={`pipeline-step ${active ? "active" : ""} ${passed ? "passed" : ""}`}
            style={{ background: active ? STAGE_COLORS[stg] : passed ? STAGE_COLORS[stg] + "88" : "var(--s1)" }}
            onClick={() => onStageChange(n.id, stg)}>
            {stg}{active && <span className="days">({days} dias)</span>}
          </div>);
        })}
      </div>

      {/* ═══ TWO-COLUMN LAYOUT ═══ */}
      <div className="detail-layout">

        {/* ═══════════ LEFT PANEL ═══════════ */}
        <div>
          <Panel title="Negociação">
            <div className="panel-row"><span className="label">Nome</span><span className="value">{n.name}</span></div>
            <div className="panel-row"><span className="label">Qualificação</span><span className="value"><Stars value={n.stars || 0} size={13} /></span></div>
            <div className="panel-row"><span className="label">Criada em</span><span className="value">{formatDate(n.createdAt)}</span></div>
            <div className="panel-row"><span className="label">Valor total</span><span className="value" style={{ color: "var(--ac)", fontWeight: 600 }}>{formatCurrency(n.value)}</span></div>
            <div className="panel-row"><span className="label">Prev. fechamento</span><span className="value">{formatDate(n.closingDate)}</span></div>
            <div className="panel-row"><span className="label">Fonte</span><span className="value">{n.sourceOrigin || "—"}</span></div>
            {n.sourceReferral && <div className="panel-row"><span className="label">Campanha</span><span className="value">{n.sourceReferral}</span></div>}
          </Panel>

          <Panel title="Contatos">
            {contact ? (<>
              <div className="contact-row">
                <div className="contact-avatar">{(contact.name || "?")[0].toUpperCase()}</div>
                <div className="contact-info"><div className="contact-name">{contact.name} <User size={11} color="var(--tx3)" /></div></div>
              </div>
              {contact.phone && (<div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid var(--bd)" }}>
                <Phone size={12} color="var(--tx3)" /><span style={{ fontSize: 12 }}>{contact.phone}</span>
                <div style={{ display: "flex", gap: 3, marginLeft: "auto" }}>
                  <button className="btn btn-sm btn-ghost" onClick={() => navigator.clipboard?.writeText(contact.phone)}><Clipboard size={11} /></button>
                  <button className="btn btn-sm btn-ghost" onClick={() => window.open("https://wa.me/55" + contact.phone.replace(/\D/g, ""), "_blank")}><MessageCircle size={11} color="#25D366" /></button>
                </div>
              </div>)}
              {contact.email && (<div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid var(--bd)" }}>
                <Mail size={12} color="var(--tx3)" /><span style={{ fontSize: 12, color: "var(--blu)" }}>{contact.email}</span>
                <button className="btn btn-sm btn-ghost" style={{ marginLeft: "auto" }} onClick={() => navigator.clipboard?.writeText(contact.email)}><Clipboard size={11} /></button>
              </div>)}
              {contact.city && <div className="panel-row"><span className="label">Cidade</span><span className="value">{contact.city}</span></div>}
            </>) : <p style={{ fontSize: 11.5, color: "var(--tx3)" }}>Nenhum contato vinculado.</p>}
            <button className="btn btn-sm btn-ghost" style={{ color: "var(--blu)", marginTop: 4, fontSize: 11.5 }}><Plus size={11} /> Adicionar contato</button>
          </Panel>

          <Panel title="Empresa" defaultOpen={!!company}>
            {company ? (<>
              <div className="panel-row"><span className="label">Empresa</span><span className="value">{company.name}</span></div>
              {company.segment && <div className="panel-row"><span className="label">Segmento</span><span className="value">{company.segment}</span></div>}
            </>) : <p style={{ fontSize: 11.5, color: "var(--tx3)" }}>Não há empresa nesta negociação.</p>}
            <button className="btn btn-sm btn-ghost" style={{ color: "var(--blu)", marginTop: 4, fontSize: 11.5 }}><Plus size={11} /> Adicionar empresa</button>
          </Panel>

          {isH && h.modality && (<Panel title={"Saúde — " + h.modality} defaultOpen={false}>
            {h.branch && <div className="panel-row"><span className="label">Ramo</span><span className="value">{h.branch}</span></div>}
            {h.operator && <div className="panel-row"><span className="label">Operadora</span><span className="value">{h.operator}</span></div>}
            {h.accommodation && <div className="panel-row"><span className="label">Acomodação</span><span className="value">{h.accommodation}</span></div>}
            {h.coverageScope && <div className="panel-row"><span className="label">Abrangência</span><span className="value">{h.coverageScope}</span></div>}
          </Panel>)}

          {isC && co.branch && (<Panel title={"Consórcio — " + co.branch} defaultOpen={false}>
            <div className="panel-row"><span className="label">Crédito</span><span className="value">{formatCurrency(co.creditValue)}</span></div>
            {co.buyerProfile && <div className="panel-row"><span className="label">Perfil</span><span className="value">{co.buyerProfile}</span></div>}
            {co.administrator && <div className="panel-row"><span className="label">Administradora</span><span className="value">{co.administrator}</span></div>}
          </Panel>)}

          <Panel title="Responsável" defaultOpen={false}>
            <div className="panel-row"><span className="label">Responsável</span><span className="value">Valério Rodrigues</span></div>
          </Panel>

          <div style={{ marginTop: 8, display: "flex", gap: 4 }}>
            <button className="btn btn-sm" onClick={() => onEdit(n)}><Edit3 size={11} /> Editar</button>
            <button className="btn btn-sm btn-red" onClick={() => onDelete(n.id)}><Trash2 size={11} /> Excluir</button>
          </div>
        </div>

        {/* ═══════════ RIGHT PANEL ═══════════ */}
        <div>

          {/* ──── TAREFAS PENDENTES (sempre visível no topo) ──── */}
          <div className="tasks-box">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Próximas tarefas</span>
              <Calendar size={15} color="var(--tx3)" />
            </div>
            {pendingTasks.length === 0
              ? <p style={{ fontSize: 12, color: "var(--tx3)", padding: "12px 0" }}>Não existem tarefas pendentes para essa Negociação</p>
              : pendingTasks.map(t => {
                const over = t.date && t.date.slice(0, 10) < today();
                return (<div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", marginBottom: 6, background: over ? "rgba(239,68,68,.05)" : "var(--s2)", border: "1px solid " + (over ? "rgba(239,68,68,.15)" : "var(--bd)"), borderRadius: 8 }}>
                  <Clipboard size={14} color="var(--tx3)" />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 500 }}>Tarefa</span>
                      {over && <span style={{ background: "#EF4444", color: "#fff", fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 3 }}>ATRASADA</span>}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--tx2)", marginTop: 2 }}>{t.title || t.description || "Tarefa"}</div>
                  </div>
                  <div style={{ textAlign: "right", fontSize: 10, color: over ? "var(--red)" : "var(--tx3)", whiteSpace: "nowrap" }}>
                    {formatDate(t.date?.slice(0, 10))}{t.date?.length > 10 ? " " + t.date.slice(11, 16) : ""}
                  </div>
                  <div style={{ display: "flex", gap: 2 }}>
                    <button className="btn btn-sm btn-ghost" onClick={() => onToggleTask(t.id)} title="Concluir"><Check size={12} color="var(--grn)" /></button>
                  </div>
                </div>);
              })
            }
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
              <span style={{ fontSize: 10.5, color: "var(--tx3)" }}>Mostrando {pendingTasks.length}/{myTasks.length} tarefas</span>
              <button className="btn btn-sm" style={{ color: "var(--blu)", borderColor: "var(--blu)" }} onClick={() => setShowTaskForm(!showTaskForm)}><Plus size={11} /> Criar tarefa</button>
            </div>
            {/* INLINE TASK FORM */}
            {showTaskForm && (<div style={{ marginTop: 10, padding: 12, background: "var(--s2)", border: "1px solid var(--bd)", borderRadius: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8 }}>Nova Tarefa</div>
              <input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Título da tarefa (ex: Ligar para cliente, Enviar proposta…)" style={{ marginBottom: 6 }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
                <input type="datetime-local" value={taskDate} onChange={e => setTaskDate(e.target.value)} />
                <input value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder="Descrição (opcional)" />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 4 }}>
                <button className="btn btn-sm" onClick={() => setShowTaskForm(false)}>Cancelar</button>
                <button className="btn btn-primary btn-sm" onClick={submitTask}><Check size={10} /> Criar</button>
              </div>
            </div>)}
          </div>

          {/* ──── ABAS ──── */}
          <div className="detail-tabs">
            {[["hist","Histórico"],["tasks","Tarefas"],["product","Produtos"],["tpl","Propostas"]].map(([k,l]) => (
              <button key={k} className={"detail-tab " + (tab === k ? "active" : "")} onClick={() => setTab(k)}>{l}</button>
            ))}
          </div>

          <div className="timeline-area">

            {/* ═══ ABA HISTÓRICO ═══ */}
            {tab === "hist" && <>
              {/* Filtros */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: "var(--tx3)" }}>Do</span>
                <select style={{ padding: "4px 8px", fontSize: 11, width: 125 }} disabled><option>My Broker CRM</option></select>
                <span style={{ fontSize: 11, color: "var(--tx3)" }}>Exibir</span>
                <select value={filterEvents} onChange={e => setFilterEvents(e.target.value)} style={{ padding: "4px 8px", fontSize: 11, width: 140 }}>
                  <option value="all">Todos os eventos</option>
                  <option value="notes">Apenas anotações</option>
                  <option value="system">Eventos do sistema</option>
                  <option value="contacts">Contatos realizados</option>
                </select>
                <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                  <button className="btn btn-sm" style={{ color: "var(--blu)", borderColor: "var(--blu)" }} onClick={() => setShowActForm(!showActForm)}><Phone size={10} /> Registrar contato</button>
                  <button className="btn btn-sm" style={{ color: "var(--blu)", borderColor: "var(--blu)" }} onClick={() => noteRef.current?.focus()}><Plus size={10} /> Criar anotação</button>
                </div>
              </div>

              {/* FORMULÁRIO DE ANOTAÇÃO — sempre visível */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, color: "var(--tx2)" }}>Anotação</div>
                <div style={{ background: "var(--s2)", border: "1px solid var(--bd)", borderRadius: 8, padding: 10 }}>
                  <textarea
                    ref={noteRef}
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    onKeyDown={handleNoteKey}
                    placeholder="Escreva uma anotação… (Ctrl+Enter para salvar)"
                    style={{ width: "100%", minHeight: 70, background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 6, padding: "8px 10px", fontSize: 12.5, color: "var(--tx)", fontFamily: "inherit", resize: "vertical", outline: "none" }}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-start", marginTop: 8, gap: 6 }}>
                    <button className="btn btn-sm" onClick={() => setNoteText("")} style={{ color: "var(--tx3)" }}>Cancelar</button>
                    <button className="btn btn-primary btn-sm" onClick={submitNote} disabled={!noteText.trim()}>Salvar no histórico</button>
                  </div>
                </div>
              </div>

              {/* FORMULÁRIO DE REGISTRO DE CONTATO (inline, toggle) */}
              {showActForm && (<div style={{ marginBottom: 14, padding: 12, background: "var(--s2)", border: "1px solid var(--bd)", borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Registrar Contato</div>
                <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 6, marginBottom: 6 }}>
                  <select value={actChannel} onChange={e => setActChannel(e.target.value)} style={{ fontSize: 11 }}>
                    {CHANNELS.map(c => <option key={c}>{c}</option>)}
                  </select>
                  <input value={actDesc} onChange={e => setActDesc(e.target.value)} placeholder="O que foi conversado…" />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 4 }}>
                  <button className="btn btn-sm" onClick={() => setShowActForm(false)}>Cancelar</button>
                  <button className="btn btn-primary btn-sm" onClick={submitActivity}><Send size={10} /> Registrar</button>
                </div>
              </div>)}

              {/* MARCADOR DE TIMELINE */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--pur)", flexShrink: 0 }} />
                <div style={{ flex: 1, height: 1, background: "var(--bd)" }} />
              </div>

              {/* TIMELINE DE EVENTOS */}
              {filteredActs.length === 0 ? <p style={{ fontSize: 12, color: "var(--tx3)", textAlign: "center", padding: 20 }}>Nenhum evento registrado ainda.</p>
              : filteredActs.map(a => {
                const Ic = chIcons[a.channel] || Activity;
                const isNote = a.channel === "Anotação";
                const isSys = a.channel === "Sistema";
                return (
                  <div key={a.id} className="timeline-item">
                    <div className="timeline-dot" style={{ background: (chColors[a.channel] || "#6B7280") + "22" }}>
                      <Ic size={13} color={chColors[a.channel] || "#6B7280"} />
                    </div>
                    <div className="timeline-content">
                      <div className="timeline-title">
                        <strong style={{ color: "var(--tx)" }}>Valério Rodrigues</strong>
                        {isNote && <span style={{ color: "var(--tx2)", fontWeight: 400 }}>{" "}fez uma anotação na etapa {a.stage || n.stage} do funil</span>}
                        {isSys && <span style={{ color: "var(--tx2)", fontWeight: 400 }}>{" "}{a.description}</span>}
                        {!isNote && !isSys && <span style={{ color: "var(--tx2)", fontWeight: 400 }}>{" "}registrou contato via {a.channel}</span>}
                      </div>
                      {!isSys && a.description && (
                        <div className="timeline-desc" style={{
                          whiteSpace: "pre-wrap", marginTop: 4, lineHeight: 1.5,
                          ...(isNote ? { background: "var(--s2)", padding: "8px 10px", borderRadius: 6, borderLeft: "3px solid var(--ac)" } : {})
                        }}>{a.description}</div>
                      )}
                      <div className="timeline-date">{formatDate(a.date)}</div>
                    </div>
                  </div>
                );
              })}
            </>}

            {/* ═══ ABA TAREFAS ═══ */}
            {tab === "tasks" && <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: "var(--tx3)" }}>Em</span>
                <select style={{ padding: "4px 8px", fontSize: 11, width: 150 }} defaultValue="pending">
                  <option value="pending">Tarefas pendentes</option>
                  <option value="all">Todas</option>
                </select>
                <button className="btn btn-sm" style={{ marginLeft: "auto", color: "var(--blu)", borderColor: "var(--blu)" }} onClick={() => setShowTaskForm(true)}><Plus size={11} /> Criar tarefa</button>
              </div>
              {showTaskForm && (<div style={{ marginBottom: 12, padding: 12, background: "var(--s2)", border: "1px solid var(--bd)", borderRadius: 8 }}>
                <input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Título" style={{ marginBottom: 6 }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
                  <input type="datetime-local" value={taskDate} onChange={e => setTaskDate(e.target.value)} />
                  <input value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder="Descrição" />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 4 }}>
                  <button className="btn btn-sm" onClick={() => setShowTaskForm(false)}>Cancelar</button>
                  <button className="btn btn-primary btn-sm" onClick={submitTask}><Check size={10} /> Criar</button>
                </div>
              </div>)}
              {myTasks.filter(t => !t.done).length === 0 ? <p style={{ fontSize: 12, color: "var(--tx3)", textAlign: "center", padding: 20 }}>Nenhuma tarefa pendente.</p>
              : myTasks.filter(t => !t.done).map(t => {
                const over = t.date && t.date.slice(0, 10) < today();
                return (<div key={t.id} style={{ padding: 12, marginBottom: 8, background: "var(--s2)", border: "1px solid var(--bd)", borderRadius: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <Clipboard size={13} color="var(--tx3)" /><span style={{ fontSize: 12, fontWeight: 500 }}>Tarefa</span>
                    {over && <span style={{ background: "#EF4444", color: "#fff", fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 3 }}>ATRASADA</span>}
                    <span style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--tx3)" }}>{formatDate(t.date?.slice(0, 10))}{t.date?.length > 10 ? " às " + t.date.slice(11, 16) : ""}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--tx2)", paddingLeft: 21, marginTop: 4 }}>{t.title || t.description || "Tarefa"}</div>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 4, marginTop: 6 }}>
                    <button className="btn btn-sm btn-ghost" onClick={() => onToggleTask(t.id)}><Check size={10} color="var(--grn)" /> Concluir</button>
                  </div>
                </div>);
              })}
            </>}

            {/* ═══ ABA PRODUTOS ═══ */}
            {tab === "product" && (<div style={{ fontSize: 12.5, color: "var(--tx2)", lineHeight: 1.8, padding: "8px 0" }}>
              <strong style={{ color: "var(--tx)" }}>Produto:</strong> {n.product}<br />
              {isH && <>{h.modality && <><strong>Modalidade:</strong> {h.modality}<br /></>}{h.branch && <><strong>Ramo:</strong> {h.branch}<br /></>}{h.operator && <><strong>Operadora:</strong> {h.operator}<br /></>}</>}
              {isC && <>{co.branch && <><strong>Ramo:</strong> {co.branch}<br /></>}{co.creditValue && <><strong>Crédito:</strong> {formatCurrency(co.creditValue)}<br /></>}{co.buyerProfile && <><strong>Perfil:</strong> {co.buyerProfile}<br /></>}</>}
              <div style={{ marginTop: 12 }}>
                <button className="btn btn-sm" style={{ color: "var(--blu)", borderColor: "var(--blu)" }}><Plus size={10} /> Adicionar produto ou serviço</button>
              </div>
            </div>)}

            {/* ═══ ABA PROPOSTAS / TEMPLATES ═══ */}
            {tab === "tpl" && <>
              {templates.map(t => (<div key={t.id} style={{ background: "var(--s2)", border: "1px solid var(--bd)", borderRadius: 7, padding: 11, marginBottom: 7, cursor: "pointer" }} onClick={() => setTplPick(t)}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}><span style={{ fontSize: 12.5, fontWeight: 500 }}>{t.name}</span><span className="tag" style={{ background: t.channel === "WhatsApp" ? "#25D36622" : "var(--s3)", color: t.channel === "WhatsApp" ? "#25D366" : "var(--tx2)" }}>{t.channel}</span></div>
                <div style={{ fontSize: 11, color: "var(--tx3)", whiteSpace: "pre-wrap", maxHeight: 42, overflow: "hidden", lineHeight: 1.3 }}>{t.body}</div>
              </div>))}
              {isC && <a href="/simulador" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", marginTop: 10, background: "var(--acbg)", border: "1px solid rgba(200,147,90,.15)", borderRadius: 8, color: "var(--ac)", textDecoration: "none", fontSize: 12.5, fontWeight: 500 }}>📊 Abrir Simulador de Propostas</a>}
            </>}
          </div>

          {/* Template preview modal */}
          {tplPick && (<Modal title="Usar Template" onClose={() => setTplPick(null)} footer={<><button className="btn" onClick={() => setTplPick(null)}>Fechar</button><button className="btn btn-primary" onClick={() => { navigator.clipboard?.writeText(fillTemplate(tplPick.body, n, contact)); setCopied(true); setTimeout(() => setCopied(false), 2e3); }}><Copy size={12} /> {copied ? "Copiado!" : "Copiar"}</button></>}>
            <div style={{ background: "var(--s2)", border: "1px solid var(--bd)", borderRadius: 8, padding: 16, whiteSpace: "pre-wrap", fontSize: 13.5, lineHeight: 1.7, minHeight: 80 }}>{fillTemplate(tplPick.body, n, contact)}</div>
          </Modal>)}
        </div>
      </div>
    </div>
  );
}
