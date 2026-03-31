import { useState, useMemo } from "react";
import { ComposedChart, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, Line } from "recharts";
import { Target, TrendingUp, Users, CheckSquare, AlertTriangle, Calendar, Phone, MessageCircle, Mail, ExternalLink, Settings, ChevronRight, Award, Clock } from "lucide-react";
import { PRODUCT_COLORS, STAGE_COLORS } from "../utils/constants";
import { formatCurrency, formatDate, today } from "../utils/helpers";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function getCycleRange(settings) {
  const now = new Date();
  if (settings.cycleType === "custom") {
    return { start: settings.cycleStart, end: settings.cycleEnd };
  }
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  if (settings.cycleType === "weekly") {
    const dow = now.getDay();
    const start = new Date(now); start.setDate(d - dow);
    const end   = new Date(start); end.setDate(start.getDate() + 6);
    return { start: start.toISOString().slice(0,10), end: end.toISOString().slice(0,10) };
  }
  if (settings.cycleType === "quarterly") {
    const qStart = new Date(y, Math.floor(m/3)*3, 1);
    const qEnd   = new Date(y, Math.floor(m/3)*3+3, 0);
    return { start: qStart.toISOString().slice(0,10), end: qEnd.toISOString().slice(0,10) };
  }
  // monthly (default)
  return {
    start: `${y}-${String(m+1).padStart(2,"0")}-01`,
    end:   new Date(y, m+1, 0).toISOString().slice(0,10),
  };
}

function inRange(dateStr, start, end) {
  if (!dateStr) return false;
  const d = dateStr.slice(0,10);
  return d >= start && d <= end;
}

function gcalUrl(task, contact) {
  const title  = encodeURIComponent((task.title || "Tarefa") + (contact ? ` — ${contact.name}` : ""));
  const details= encodeURIComponent(task.description || "");
  const date   = (task.date || today()).replace(/-/g,"");
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${date}/${date}`;
}

// ─── Tooltip customizado ──────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label, currency }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--s2)", border: "1px solid var(--bd)", borderRadius: 7, padding: "8px 12px", fontSize: 11 }}>
      <div style={{ color: "var(--tx3)", marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: 600 }}>
          {p.name}: {currency ? formatCurrency(p.value) : p.value}
        </div>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
export function Dashboard({ negotiations, contacts, activities, tasks, settings, onOpenSettings }) {
  const [agendaDate, setAgendaDate] = useState(today());

  const cycle = useMemo(() => getCycleRange(settings), [settings]);

  // ── Negociações no ciclo ────────────────────────────────────────────────────
  const cycleNegs  = negotiations.filter(n => inRange(n.createdAt, cycle.start, cycle.end));
  const wonCycle   = negotiations.filter(n => n.status === "won" && inRange(n.createdAt, cycle.start, cycle.end));
  const wonValue   = wonCycle.reduce((s, n) => s + (Number(n.value) || 0), 0);
  const openNegs   = negotiations.filter(n => n.status === "open");
  const pipeValue  = openNegs.reduce((s, n) => s + (Number(n.value) || 0), 0);

  // Meta geral
  const goalValue  = Number(settings.goalValue) || 0;
  const goalPct    = goalValue > 0 ? Math.min(Math.round(wonValue / goalValue * 100), 100) : 0;

  // Contatos no ciclo
  const newContacts = contacts.filter(c => inRange(c.createdAt, cycle.start, cycle.end)).length;
  const workedContacts = [...new Set(
    activities.filter(a => inRange(a.date, cycle.start, cycle.end) && a.contactId)
              .map(a => a.contactId)
  )].length;
  const newDeals = cycleNegs.length;
  const closedWon = wonCycle.length;

  // ── Gráfico: vendas últimos 6 meses ─────────────────────────────────────────
  const salesChart = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d   = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const y   = d.getFullYear(), m = d.getMonth();
      const key = `${y}-${String(m+1).padStart(2,"0")}`;
      const won = negotiations.filter(n => n.status === "won" && n.createdAt?.startsWith(key));
      return {
        name: MONTH_NAMES[m],
        Vendas: won.length,
        Valor: won.reduce((s, n) => s + (Number(n.value) || 0), 0),
        Meta: goalValue / 6, // meta mensal proporcional
      };
    });
  }, [negotiations, goalValue]);

  // ── Gráfico: negociações por produto ────────────────────────────────────────
  const productChart = useMemo(() => {
    const map = {};
    negotiations.forEach(n => {
      if (!n.product) return;
      if (!map[n.product]) map[n.product] = { name: n.product, total: 0, ganhas: 0, valor: 0 };
      map[n.product].total++;
      if (n.status === "won") { map[n.product].ganhas++; map[n.product].valor += Number(n.value) || 0; }
    });
    return Object.values(map);
  }, [negotiations]);

  // ── Atividades recentes ──────────────────────────────────────────────────────
  const recentActs = useMemo(() =>
    [...activities]
      .sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id))
      .slice(0, 15),
    [activities]
  );

  // ── Agenda do dia ────────────────────────────────────────────────────────────
  const todayTasks = useMemo(() =>
    tasks
      .filter(t => !t.done && t.date && t.date.slice(0,10) === agendaDate)
      .sort((a, b) => (a.date || "").localeCompare(b.date || "")),
    [tasks, agendaDate]
  );

  const overdueTasks = useMemo(() =>
    tasks.filter(t => !t.done && t.date && t.date.slice(0,10) < today()).length,
    [tasks]
  );

  // Follow-ups por tipo baseados no status do contato
  const followUps = useMemo(() => {
    const statusMap = { ligar: [], enviar_mensagem: [], enviar_email: [], visita_agendada: [] };
    contacts.forEach(c => {
      if (statusMap[c.followStatus]) statusMap[c.followStatus].push(c);
    });
    return statusMap;
  }, [contacts]);

  const chIcon = { WhatsApp: MessageCircle, Telefone: Phone, "E-mail": Mail, Anotação: CheckSquare, Sistema: Target };
  const chColor = { WhatsApp: "#25D366", Telefone: "#3B82F6", "E-mail": "#F59E0B", Anotação: "#C8935A", Sistema: "#6B7280", Presencial: "#8B5CF6" };

  return (
    <div className="fade-in">

      {/* ── HEADER COM CICLO ────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--tx1)" }}>Dashboard</div>
          <div style={{ fontSize: 10.5, color: "var(--tx3)" }}>
            Ciclo: {formatDate(cycle.start)} → {formatDate(cycle.end)}
            {" · "}<span style={{ color: settings.cycleType === "monthly" ? "var(--ac)" : "var(--tx3)" }}>{
              { monthly: "Mensal", weekly: "Semanal", quarterly: "Trimestral", custom: "Personalizado" }[settings.cycleType]
            }</span>
          </div>
        </div>
        <button className="btn btn-sm" onClick={onOpenSettings} style={{ gap: 5 }}>
          <Settings size={12} /> Configurar Metas
        </button>
      </div>

      {/* ── KPIs PRINCIPAIS ─────────────────────────────────────────────────── */}
      <div className="kpi-grid" style={{ marginBottom: 16 }}>
        <div className="kpi">
          <div className="kpi-label">Negociações Abertas</div>
          <div className="kpi-value">{openNegs.length}</div>
          <div className="kpi-sub">{formatCurrency(pipeValue)} em pipeline</div>
        </div>
        <div className="kpi kpi-green">
          <div className="kpi-label">Vendas no Ciclo</div>
          <div className="kpi-value" style={{ color: "var(--grn)" }}>{wonCycle.length}</div>
          <div className="kpi-sub">{formatCurrency(wonValue)}</div>
        </div>
        <div className="kpi" style={{ position: "relative", overflow: "hidden" }}>
          <div className="kpi-label">Meta do Ciclo</div>
          <div className="kpi-value" style={{ color: goalPct >= 100 ? "var(--grn)" : goalPct >= 60 ? "var(--ac)" : "var(--red)" }}>
            {goalPct}%
          </div>
          <div className="kpi-sub">{formatCurrency(wonValue)} / {formatCurrency(goalValue)}</div>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "var(--bd)" }}>
            <div style={{ width: goalPct + "%", height: "100%", background: goalPct >= 100 ? "var(--grn)" : goalPct >= 60 ? "var(--ac)" : "var(--red)", transition: "width .5s" }} />
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Tarefas Atrasadas</div>
          <div className="kpi-value" style={{ color: overdueTasks > 0 ? "var(--red)" : "var(--grn)" }}>{overdueTasks}</div>
          <div className="kpi-sub">{todayTasks.length} para hoje</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Contatos no Ciclo</div>
          <div className="kpi-value">{newContacts}</div>
          <div className="kpi-sub">{workedContacts} trabalhados</div>
        </div>
      </div>

      {/* ── LINHA 1: Meta + Atividades ──────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>

        {/* Gráfico: Vendas x Meta */}
        <div className="panel">
          <div className="panel-header"><h4>Vendas x Meta — últimos 6 meses</h4></div>
          <div className="panel-body" style={{ padding: "8px 0 0" }}>
            <ResponsiveContainer width="100%" height={180}>
              <ComposedChart data={salesChart} margin={{ top: 0, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--tx3)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "var(--tx3)" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Vendas" fill="#C9A84C" radius={[3,3,0,0]} />
                <Line type="monotone" dataKey="Meta" stroke="#EF4444" strokeDasharray="4 4" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Total de contatos criados x trabalhados x negócios */}
        <div className="panel">
          <div className="panel-header"><h4>Ciclo atual — Contatos e Negócios</h4></div>
          <div className="panel-body">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { label: "Contatos Criados",   value: newContacts,    color: "#3B82F6" },
                { label: "Contatos Trabalhados",value: workedContacts, color: "#8B5CF6" },
                { label: "Negócios Criados",   value: newDeals,       color: "#F59E0B" },
                { label: "Negócios Fechados",  value: closedWon,      color: "#10B981" },
              ].map(item => (
                <div key={item.label} style={{ padding: "10px 12px", background: "var(--s2)", borderRadius: 8, borderLeft: `3px solid ${item.color}` }}>
                  <div style={{ fontSize: 10, color: "var(--tx3)", marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: item.color }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── LINHA 2: Produto + Funil ─────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>

        {/* Gráfico: Por produto */}
        <div className="panel">
          <div className="panel-header"><h4>Negociações por Produto</h4></div>
          <div className="panel-body" style={{ padding: "8px 0 0" }}>
            {productChart.length === 0
              ? <p style={{ fontSize: 11, color: "var(--tx3)", padding: 16, textAlign: "center" }}>Sem dados ainda.</p>
              : <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={productChart} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 10 }}>
                    <XAxis type="number" tick={{ fontSize: 9, fill: "var(--tx3)" }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: "var(--tx2)" }} axisLine={false} tickLine={false} width={90} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="total" radius={[0,3,3,0]}>
                      {productChart.map((entry, index) => (
                        <Cell key={index} fill={PRODUCT_COLORS[entry.name] || "#888"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
            }
            {/* Metas por produto */}
            {settings.productGoals && Object.keys(settings.productGoals).length > 0 && (
              <div style={{ padding: "8px 12px", borderTop: "1px solid var(--bd)" }}>
                {Object.entries(settings.productGoals).map(([prod, meta]) => {
                  const prodWon = wonCycle.filter(n => n.product === prod).length;
                  const pct = Number(meta) > 0 ? Math.min(Math.round(prodWon / Number(meta) * 100), 100) : 0;
                  return (
                    <div key={prod} style={{ marginBottom: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 2 }}>
                        <span style={{ color: "var(--tx2)" }}>{prod}</span>
                        <span style={{ color: "var(--tx3)" }}>{prodWon}/{meta} vendas</span>
                      </div>
                      <div style={{ height: 4, background: "var(--bd)", borderRadius: 2 }}>
                        <div style={{ width: pct + "%", height: "100%", background: PRODUCT_COLORS[prod] || "var(--ac)", borderRadius: 2, transition: "width .4s" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Funil de vendas */}
        <div className="panel">
          <div className="panel-header"><h4>Funil de Vendas</h4></div>
          <div className="panel-body">
            {["Novos Leads","Andamento","Proposta Enviada","Fechamento"].map(stg => {
              const stgNegs = negotiations.filter(n => n.stage === stg && n.status === "open");
              const val = stgNegs.reduce((s, n) => s + (Number(n.value) || 0), 0);
              const pct = negotiations.length ? Math.round(stgNegs.length / negotiations.length * 100) : 0;
              return (
                <div key={stg} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                  <span style={{ fontSize: 10, color: "var(--tx2)", minWidth: 110 }}>{stg}</span>
                  <div style={{ flex: 1, height: 20, background: "var(--bd)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: Math.max(pct, 2) + "%", height: "100%", background: STAGE_COLORS[stg] || "#888", borderRadius: 4, display: "flex", alignItems: "center", paddingLeft: 5, fontSize: 9, color: "#fff", fontWeight: 700 }}>
                      {stgNegs.length > 0 ? stgNegs.length : ""}
                    </div>
                  </div>
                  <span style={{ fontSize: 10, color: "var(--ac)", minWidth: 72, textAlign: "right" }}>{formatCurrency(val)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── LINHA 3: Agenda do dia + Atividades recentes ────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

        {/* Agenda do dia */}
        <div className="panel">
          <div className="panel-header" style={{ justifyContent: "space-between" }}>
            <h4>Agenda do Dia</h4>
            <input type="date" value={agendaDate} onChange={e => setAgendaDate(e.target.value)}
              style={{ fontSize: 11, padding: "2px 6px", background: "var(--s2)", border: "1px solid var(--bd)", borderRadius: 5, color: "var(--tx2)" }} />
          </div>
          <div className="panel-body">
            {/* Follow-ups pendentes */}
            {Object.entries({ ligar: { label: "Ligar", icon: Phone, color: "#06B6D4" }, enviar_mensagem: { label: "Mensagem", icon: MessageCircle, color: "#25D366" }, enviar_email: { label: "E-mail", icon: Mail, color: "#F59E0B" }, visita_agendada: { label: "Visita", icon: Calendar, color: "#8B5CF6" } })
              .filter(([k]) => (followUps[k] || []).length > 0)
              .map(([k, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", marginBottom: 5, background: "var(--s2)", borderRadius: 7, borderLeft: `3px solid ${cfg.color}` }}>
                    <Icon size={13} color={cfg.color} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--tx1)" }}>{cfg.label}</span>
                    <span style={{ fontSize: 10, color: "var(--tx3)" }}>{followUps[k].length} contatos</span>
                    <span style={{ marginLeft: "auto", fontSize: 10, color: cfg.color }}>{followUps[k].slice(0,2).map(c => c.name?.split(" ")[0]).join(", ")}{followUps[k].length > 2 ? `...` : ""}</span>
                  </div>
                );
              })
            }

            {/* Tarefas do dia */}
            {todayTasks.length === 0
              ? <p style={{ fontSize: 11, color: "var(--tx3)", textAlign: "center", padding: "12px 0" }}>
                  {agendaDate === today() ? "Nenhuma tarefa para hoje. ✓" : "Nenhuma tarefa nesta data."}
                </p>
              : todayTasks.map(t => {
                  const contact = contacts.find(c => c.id === t.contactId);
                  const neg = // find via negotiation
                    t.negotiationId ? null : null;
                  return (
                    <div key={t.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 10px", marginBottom: 5, background: "var(--s2)", borderRadius: 7, border: "1px solid var(--bd)" }}>
                      <CheckSquare size={13} color="var(--ac)" style={{ marginTop: 1, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--tx1)" }}>{t.title || "Tarefa"}</div>
                        {contact && <div style={{ fontSize: 10, color: "var(--tx3)" }}>👤 {contact.name}</div>}
                        {t.description && <div style={{ fontSize: 10, color: "var(--tx3)", marginTop: 1 }}>{t.description}</div>}
                      </div>
                      <a href={gcalUrl(t, contact)} target="_blank" rel="noopener noreferrer"
                        style={{ flexShrink: 0 }} title="Adicionar ao Google Calendar">
                        <ExternalLink size={11} color="var(--tx3)" />
                      </a>
                    </div>
                  );
                })
            }
          </div>
        </div>

        {/* Atividades recentes */}
        <div className="panel">
          <div className="panel-header"><h4>Atividades Recentes</h4></div>
          <div className="panel-body" style={{ maxHeight: 340, overflowY: "auto" }}>
            {recentActs.length === 0
              ? <p style={{ fontSize: 11, color: "var(--tx3)", textAlign: "center", padding: 20 }}>Nenhuma atividade registrada.</p>
              : recentActs.map(a => {
                  const contact = contacts.find(c => c.id === a.contactId);
                  const Icon = chIcon[a.channel] || Target;
                  const color = chColor[a.channel] || "#6B7280";
                  return (
                    <div key={a.id} style={{ display: "flex", gap: 9, padding: "7px 0", borderBottom: "1px solid var(--bd)" }}>
                      <div style={{ width: 26, height: 26, borderRadius: "50%", background: color + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                        <Icon size={12} color={color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 500, color: "var(--tx1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {contact ? contact.name : a.channel}
                          </span>
                          <span style={{ fontSize: 9, color: "var(--tx3)", flexShrink: 0 }}>{formatDate(a.date)}</span>
                        </div>
                        <div style={{ fontSize: 10.5, color: "var(--tx3)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {a.description}
                        </div>
                      </div>
                    </div>
                  );
                })
            }
          </div>
        </div>
      </div>
    </div>
  );
}
