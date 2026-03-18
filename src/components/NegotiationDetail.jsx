import { useState } from "react";
import { Panel, Stars, StatusTag, Modal } from "./UI";
import { STAGES, STAGE_COLORS, PRODUCT_COLORS, GRADE_COLORS, CHANNELS } from "../utils/constants";
import { formatDate, formatCurrency, daysSince, calcAge, calcScore, fillTemplate } from "../utils/helpers";
import {
  ArrowLeft, Edit3, Trash2, Plus, Clock, XCircle, Trophy, Phone, Mail,
  MessageCircle, FileText, Activity, Copy, Check
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

  const channelColors = { WhatsApp: "#25D366", Telefone: "#3B82F6", "E-mail": "#F59E0B", Presencial: "#8B5CF6", Sistema: "#6B7280", Anotação: "#C8935A" };
  const channelIcons = { WhatsApp: MessageCircle, Telefone: Phone, "E-mail": Mail, Anotação: FileText, Sistema: Activity, Presencial: Activity };

  const ctx = [
    contact?.name || "",
    isH ? h.modality || "" : "",
    isC ? co.branch || "" : "",
    isH ? h.branch || "" : ""
  ].filter(Boolean).join(" · ");

  const submitNote = () => {
    if (!noteText.trim()) return;
    onAddNote(n.id, noteText);
    setNoteText("");
  };

  return (
    <div className="fade-in">
      {/* ═══ HEADER ═══ */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, paddingBottom: 14, flexWrap: "wrap" }}>
        <button className="btn btn-sm" onClick={onBack}><ArrowLeft size={12} /></button>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 19, fontWeight: 400 }}>
            {n.name || n.product}
          </h2>
          <div style={{ display: "flex", gap: 4, marginTop: 3, flexWrap: "wrap", alignItems: "center" }}>
            {n.status !== "open" && <StatusTag status={n.status} />}
            <span className="tag" style={{ background: PRODUCT_COLORS[n.product] + "22", color: PRODUCT_COLORS[n.product] }}>{n.product}</span>
            <div className="grade" style={{ background: GRADE_COLORS[sc.grade] + "22", color: GRADE_COLORS[sc.grade] }}>{sc.grade}</div>
            <Stars value={n.stars || 0} size={13} />
            <span style={{ fontSize: 10, color: "var(--tx3)" }}>{sc.score}pts</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 5 }}>
          <button className="btn btn-red btn-sm" onClick={() => onLose(n.id)}><XCircle size={12} /> Marcar Perda</button>
          <button className="btn btn-green btn-sm" onClick={() => onWin(n.id)}><Trophy size={12} /> Marcar Venda</button>
        </div>
      </div>

      {/* ═══ PIPELINE PROGRESS BAR ═══ */}
      <div className="pipeline-bar">
        {STAGES.map((stg, i) => {
          const isActive = i === stgIdx;
          const passed = i < stgIdx;
          return (
            <div key={stg}
              className={`pipeline-step ${isActive ? "active" : ""} ${passed ? "passed" : ""}`}
              style={{ background: isActive ? STAGE_COLORS[stg] : passed ? STAGE_COLORS[stg] + "88" : "var(--s1)" }}
              onClick={() => onStageChange(n.id, stg)}>
              {stg}
              {isActive && <span className="days">{days} dias</span>}
            </div>
          );
        })}
      </div>

      {/* ═══ TWO-COLUMN LAYOUT ═══ */}
      <div className="detail-layout">
        {/* LEFT PANEL */}
        <div>
          <Panel title="Negociação">
            <div className="panel-row"><span className="label">Nome</span><span className="value">{n.name}</span></div>
            <div className="panel-row"><span className="label">Qualificação</span><span className="value"><Stars value={n.stars || 0} size={12} /></span></div>
            <div className="panel-row"><span className="label">Criada em</span><span className="value">{formatDate(n.createdAt)}</span></div>
            <div className="panel-row"><span className="label">Valor total</span><span className="value" style={{ color: "var(--ac)" }}>{formatCurrency(n.value)}</span></div>
            <div className="panel-row"><span className="label">Prev. fechamento</span><span className="value">{formatDate(n.closingDate)}</span></div>
            <div className="panel-row"><span className="label">Fonte</span><span className="value">{n.sourceOrigin || "—"}</span></div>
            {n.sourceReferral && <div className="panel-row"><span className="label">Indicação</span><span className="value">{n.sourceReferral}</span></div>}
            {n.notes && <div className="panel-row"><span className="label">Obs.</span><span className="value" style={{ color: "var(--tx2)", fontSize: 11 }}>{n.notes}</span></div>}
          </Panel>

          {contact && (
            <Panel title="Contato">
              <div className="contact-row">
                <div className="contact-avatar">{(contact.name || "?")[0].toUpperCase()}</div>
                <div className="contact-info">
                  <div className="contact-name">{contact.name}</div>
                  <div className="contact-sub">{contact.city || ""}{contact.birthDate ? ` · ${calcAge(contact.birthDate)}a` : ""}</div>
                </div>
                <div className="contact-actions">
                  {contact.phone && <button title={contact.phone} onClick={() => navigator.clipboard?.writeText(contact.phone)}><Phone size={13} /></button>}
                  {contact.email && <button title={contact.email} onClick={() => navigator.clipboard?.writeText(contact.email)}><Mail size={13} /></button>}
                </div>
              </div>
              {contact.phone && <div className="panel-row"><span className="label">Telefone</span><span className="value">{contact.phone}</span></div>}
              {contact.email && <div className="panel-row"><span className="label">E-mail</span><span className="value">{contact.email}</span></div>}
            </Panel>
          )}

          {company && (
            <Panel title="Empresa" defaultOpen={false}>
              <div className="panel-row"><span className="label">Empresa</span><span className="value">{company.name}</span></div>
              {company.segment && <div className="panel-row"><span className="label">Segmento</span><span className="value">{company.segment}</span></div>}
            </Panel>
          )}

          {/* Product panels */}
          {isH && h.modality && (
            <Panel title={`Saúde — ${h.modality}`}>
              {h.branch && <div className="panel-row"><span className="label">Ramo</span><span className="value">{h.branch}</span></div>}
              {(h.beneficiaries || []).length > 0 && (
                <div className="panel-row">
                  <span className="label">Beneficiários</span>
                  <span className="value">
                    {h.beneficiaries.map((b, i) => <span key={b.id} className="chip">{b.name || `B${i + 1}`}{b.age ? ` ${b.age}a` : ""}</span>)}
                  </span>
                </div>
              )}
              {h.operator && <div className="panel-row"><span className="label">Operadora</span><span className="value">{h.operator}</span></div>}
              {h.administrator && <div className="panel-row"><span className="label">Administradora</span><span className="value">{h.administrator}</span></div>}
              {h.classEntity && <div className="panel-row"><span className="label">Ent. Classe</span><span className="value">{h.classEntity}</span></div>}
              {h.accommodation && <div className="panel-row"><span className="label">Acomodação</span><span className="value">{h.accommodation}</span></div>}
              {h.coverageScope && <div className="panel-row"><span className="label">Abrangência</span><span className="value">{h.coverageScope}</span></div>}
              {h.currentPlan && <div className="panel-row"><span className="label">Plano atual</span><span className="value">{h.currentPlanName} · {h.currentPlanTime}</span></div>}
            </Panel>
          )}

          {isC && co.branch && (
            <Panel title={`Consórcio — ${co.branch}`}>
              <div className="panel-row"><span className="label">Crédito</span><span className="value">{formatCurrency(co.creditValue)}</span></div>
              {co.expectedTerm && <div className="panel-row"><span className="label">Prazo</span><span className="value">{co.expectedTerm} meses</span></div>}
              {co.income && <div className="panel-row"><span className="label">Renda</span><span className="value">{formatCurrency(co.income)}</span></div>}
              {co.monthlyPayment && <div className="panel-row"><span className="label">Parcela</span><span className="value">{formatCurrency(co.monthlyPayment)}</span></div>}
              {co.buyerProfile && <div className="panel-row"><span className="label">Perfil</span><span className="value">{co.buyerProfile}</span></div>}
              {co.bidValue && <div className="panel-row"><span className="label">Lance disp.</span><span className="value">{formatCurrency(co.bidValue)}</span></div>}
              {co.tradeIn && <div className="panel-row"><span className="label">Troca</span><span className="value">{co.tradeInType} · {formatCurrency(co.tradeInValue)}</span></div>}
              {co.administrator && <div className="panel-row"><span className="label">Administradora</span><span className="value">{co.administrator}</span></div>}
              {co.groups && <div className="panel-row"><span className="label">Grupo(s)</span><span className="value">{co.groups}</span></div>}
              {co.quotas && <div className="panel-row"><span className="label">Cota(s)</span><span className="value">{co.quotas}</span></div>}
              {co.assetValue && <div className="panel-row"><span className="label">Valor bem</span><span className="value">{formatCurrency(co.assetValue)}</span></div>}
              {co.bidType && <div className="panel-row"><span className="label">Tipo lance</span><span className="value">{co.bidType}{co.bidPercentage ? ` (${co.bidPercentage}%)` : ""}</span></div>}
            </Panel>
          )}

          <div style={{ marginTop: 8, display: "flex", gap: 4 }}>
            <button className="btn btn-sm" onClick={() => onEdit(n)}><Edit3 size={10} /> Editar</button>
            <button className="btn btn-sm btn-red" onClick={() => onDelete(n.id)}><Trash2 size={10} /> Excluir</button>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div>
          {/* Tasks box */}
          <div className="tasks-box">
            <h4>
              Próximas tarefas
              <button className="btn btn-sm" onClick={() => onAddTask(n.id)}><Plus size={9} /> Criar tarefa</button>
            </h4>
            {pendingTasks.length === 0
              ? <p style={{ fontSize: 11, color: "var(--tx3)" }}>Nenhuma tarefa pendente.</p>
              : pendingTasks.map(t => (
                <div key={t.id} className="task-item">
                  <input type="checkbox" checked={t.done} onChange={() => onToggleTask(t.id)} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 11.5 }}>{t.title || t.description || "Tarefa"}</span>
                    <span style={{
                      fontSize: 9.5, display: "block",
                      color: new Date(t.date) < new Date() ? "var(--red)" : "var(--tx3)"
                    }}>
                      {t.date < new Date().toISOString().slice(0, 10) && !t.done
                        ? <><span className="status-tag" style={{ background: "#EF444418", color: "#EF4444", marginRight: 4 }}>ATRASADA</span></>
                        : null}
                      {formatDate(t.date)}
                    </span>
                  </div>
                </div>
              ))
            }
          </div>

          {/* Tabs */}
          <div className="detail-tabs">
            <button className={`detail-tab ${tab === "hist" ? "active" : ""}`} onClick={() => setTab("hist")}>Histórico</button>
            <button className={`detail-tab ${tab === "tasks" ? "active" : ""}`} onClick={() => setTab("tasks")}>Tarefas</button>
            <button className={`detail-tab ${tab === "product" ? "active" : ""}`} onClick={() => setTab("product")}>Produtos e Serviços</button>
            <button className={`detail-tab ${tab === "tpl" ? "active" : ""}`} onClick={() => setTab("tpl")}>Templates</button>
          </div>

          <div className="timeline-area">
            {tab === "hist" && <>
              {/* Annotation form */}
              <div className="note-form">
                <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Criar anotação…" />
                <button className="btn btn-primary btn-sm" onClick={submitNote}><Plus size={10} /> Anotar</button>
              </div>

              {/* Timeline */}
              {myActs.length === 0
                ? <p style={{ fontSize: 11, color: "var(--tx3)", textAlign: "center", padding: 20 }}>Nenhuma atividade registrada.</p>
                : myActs.map(a => {
                  const IconComp = channelIcons[a.channel] || Activity;
                  return (
                    <div key={a.id} className="timeline-item">
                      <div className="timeline-dot" style={{ background: (channelColors[a.channel] || "#6B7280") + "22" }}>
                        <IconComp size={13} color={channelColors[a.channel] || "#6B7280"} />
                      </div>
                      <div className="timeline-content">
                        <div className="timeline-title">{a.channel === "Anotação" ? "Anotação" : a.channel}</div>
                        <div className="timeline-desc">{a.description}</div>
                        <div className="timeline-date">{formatDate(a.date)}</div>
                      </div>
                    </div>
                  );
                })
              }
            </>}

            {tab === "tasks" && <>
              <button className="btn btn-sm" style={{ marginBottom: 10 }} onClick={() => onAddTask(n.id)}>
                <Plus size={10} /> Criar tarefa
              </button>
              {myTasks.length === 0
                ? <p style={{ fontSize: 11, color: "var(--tx3)" }}>Nenhuma tarefa.</p>
                : myTasks.map(t => (
                  <div key={t.id} className="task-item">
                    <input type="checkbox" checked={t.done} onChange={() => onToggleTask(t.id)} />
                    <div style={{ flex: 1 }}>
                      <span style={{
                        fontSize: 12, fontWeight: 500,
                        textDecoration: t.done ? "line-through" : "none",
                        color: t.done ? "var(--tx3)" : "var(--tx)"
                      }}>{t.title || t.description || "Tarefa"}</span>
                      <span style={{ fontSize: 10, color: "var(--tx3)", display: "block" }}>
                        Prazo: {formatDate(t.date)}
                      </span>
                    </div>
                  </div>
                ))
              }
            </>}

            {tab === "product" && (
              <div style={{ fontSize: 12, color: "var(--tx2)", lineHeight: 1.8 }}>
                <strong>Produto:</strong> {n.product}<br />
                {isH && <>
                  {h.modality && <><strong>Modalidade:</strong> {h.modality}<br /></>}
                  {h.branch && <><strong>Ramo:</strong> {h.branch}<br /></>}
                  {(h.beneficiaries || []).length > 0 && <><strong>Beneficiários:</strong> {h.beneficiaries.map(b => `${b.name || "?"} (${b.relationship}${b.age ? `, ${b.age}a` : ""})`).join(", ")}<br /></>}
                  {h.operator && <><strong>Operadora:</strong> {h.operator}<br /></>}
                </>}
                {isC && <>
                  {co.branch && <><strong>Ramo:</strong> {co.branch}<br /></>}
                  {co.creditValue && <><strong>Crédito:</strong> {formatCurrency(co.creditValue)}<br /></>}
                  {co.buyerProfile && <><strong>Perfil:</strong> {co.buyerProfile}<br /></>}
                  {co.administrator && <><strong>Administradora:</strong> {co.administrator}<br /></>}
                </>}
              </div>
            )}

            {tab === "tpl" && <>
              {templates.map(t => (
                <div key={t.id}
                  style={{ background: "var(--s2)", border: "1px solid var(--bd)", borderRadius: 6, padding: 10, marginBottom: 6, cursor: "pointer" }}
                  onClick={() => setTplPick(t)}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{t.name}</span>
                    <span className="tag" style={{
                      background: t.channel === "WhatsApp" ? "#25D36622" : "var(--s3)",
                      color: t.channel === "WhatsApp" ? "#25D366" : "var(--tx2)"
                    }}>{t.channel}</span>
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--tx3)", whiteSpace: "pre-wrap", maxHeight: 40, overflow: "hidden", lineHeight: 1.3 }}>{t.body}</div>
                </div>
              ))}
            </>}
          </div>

          {/* Template preview modal */}
          {tplPick && (
            <Modal title="Usar Template" onClose={() => setTplPick(null)}
              footer={<>
                <button className="btn" onClick={() => setTplPick(null)}>Fechar</button>
                <button className="btn btn-primary" onClick={() => {
                  navigator.clipboard?.writeText(fillTemplate(tplPick.body, n, contact));
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}><Copy size={11} /> {copied ? "Copiado!" : "Copiar"}</button>
              </>}>
              <div style={{
                background: "var(--s2)", border: "1px solid var(--bd)", borderRadius: 7,
                padding: 14, whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.6, minHeight: 70
              }}>
                {fillTemplate(tplPick.body, n, contact)}
              </div>
            </Modal>
          )}
        </div>
      </div>
    </div>
  );
}
