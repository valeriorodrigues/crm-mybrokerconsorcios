import { useState, useEffect, useRef, useMemo } from "react";
import {
  Home, Users, Building2, Target, CheckSquare, Activity, Plus,
  ChevronDown, MessageCircle, BarChart3, Calculator, Upload, Download
} from "lucide-react";

import { PRODUCTS, STAGES, STAGE_COLORS, PRODUCT_COLORS, DEFAULT_TEMPLATES } from "./utils/constants";
import {
  uid, today, loadData, saveData, calcScore, formatCurrency, formatDate,
  emptyContact, emptyCompany, emptyNegotiation, emptyTask, emptyActivity,
  deriveSavedOptions
} from "./utils/helpers";
import { db } from "./utils/storage";

import { SearchBox } from "./components/UI";
import { ContactForm, ContactList, ContactDetail } from "./components/Contacts";
import { CompanyForm, CompanyDetail } from "./components/Companies";
import { NegotiationForm } from "./components/NegotiationForm";
import { NegotiationDetail } from "./components/NegotiationDetail";
import { NegotiationPipeline } from "./components/NegotiationPipeline";
import { TaskForm, TasksPage } from "./components/Tasks";
import { ActivityForm } from "./components/ActivityForm";

export default function App() {
  // ─── State ───
  const [contacts, setContacts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [negotiations, setNegotiations] = useState([]);
  const [activities, setActivities] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [ready, setReady] = useState(false);

  const [page, setPage] = useState("dashboard");
  const [view, setView] = useState("kanban"); // kanban or list
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null); // selected entity
  const [editTarget, setEditTarget] = useState(null);
  const [modalNegId, setModalNegId] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const init = useRef(false);

  // ─── Load from Supabase ───
  useEffect(() => {
    if (init.current) return;
    init.current = true;
    (async () => {
      try {
        const [ct, co, ng, ac, tk, tp] = await Promise.all([
          db.getContacts(),
          db.getCompanies(),
          db.getNegotiations(),
          db.getActivities(),
          db.getTasks(),
          db.getTemplates(),
        ]);
        setContacts(ct || []);
        setCompanies(co || []);
        setNegotiations(ng || []);
        setActivities(ac || []);
        setTasks(tk || []);
        setTemplates(tp?.length ? tp : []);
        setReady(true);
      } catch (err) {
        console.error("Failed to load from Supabase:", err);
        setReady(true);
      }
    })();
  }, []);

  // No auto-save effects needed — we save on each action via db calls

  // ─── Derived ───
  const savedOptions = useMemo(() => deriveSavedOptions(negotiations), [negotiations]);
  const pendingTasks = tasks.filter(t => !t.done && t.date && t.date.slice(0, 10) <= today()).length;

  // ─── CRUD (state + Supabase) ───
  const saveContact = (c) => {
    setContacts(p => { const i = p.findIndex(x => x.id === c.id); return i >= 0 ? p.map(x => x.id === c.id ? c : x) : [...p, c]; });
    setModal(null); setEditTarget(null);
    db.saveContact(c);
  };
  const deleteContact = (id) => {
    if (!confirm("Excluir contato?")) return;
    setContacts(p => p.filter(x => x.id !== id)); setSelected(null);
    db.deleteContact(id);
  };

  const saveCompany = (c) => {
    setCompanies(p => { const i = p.findIndex(x => x.id === c.id); return i >= 0 ? p.map(x => x.id === c.id ? c : x) : [...p, c]; });
    setModal(null); setEditTarget(null);
    db.saveCompany(c);
  };
  const deleteCompany = (id) => {
    if (!confirm("Excluir empresa?")) return;
    setCompanies(p => p.filter(x => x.id !== id)); setSelected(null);
    db.deleteCompany(id);
  };

  const saveNeg = (n) => {
    setNegotiations(p => { const i = p.findIndex(x => x.id === n.id); return i >= 0 ? p.map(x => x.id === n.id ? n : x) : [...p, n]; });
    setModal(null); setEditTarget(null);
    if (selected?.id === n.id) setSelected(n);
    db.saveNegotiation(n);
  };
  const deleteNeg = (id) => {
    if (!confirm("Excluir negociação?")) return;
    setNegotiations(p => p.filter(x => x.id !== id));
    setActivities(p => p.filter(x => x.negotiationId !== id));
    setTasks(p => p.filter(x => x.negotiationId !== id));
    setSelected(null);
    db.deleteNegotiation(id);
    db.deleteActivitiesByNeg(id);
    db.deleteTasksByNeg(id);
  };

  const saveActivity = (a) => { setActivities(p => [...p, a]); setModal(null); db.saveActivity(a); };
  const saveTask = (t) => {
    setTasks(p => { const i = p.findIndex(x => x.id === t.id); return i >= 0 ? p.map(x => x.id === t.id ? t : x) : [...p, t]; });
    setModal(null);
    db.saveTask(t);
  };
  const toggleTask = (id) => {
    setTasks(p => p.map(t => {
      if (t.id === id) { const updated = { ...t, done: !t.done }; db.toggleTask(id, updated.done); return updated; }
      return t;
    }));
  };

  const changeStage = (id, stage) => {
    setNegotiations(p => p.map(n => n.id === id ? { ...n, stage } : n));
    const act = { id: uid(), contactId: "", negotiationId: id, channel: "Sistema", description: `Movido para ${stage}`, date: today() };
    setActivities(p => [...p, act]);
    if (selected?.id === id) setSelected(p => ({ ...p, stage }));
    db.updateNegotiation(id, 'stage', stage);
    db.saveActivity(act);
  };

  const markWon = (id) => {
    setNegotiations(p => p.map(n => n.id === id ? { ...n, status: "won", stage: "Fechamento" } : n));
    const act = { id: uid(), contactId: "", negotiationId: id, channel: "Sistema", description: "✅ Venda realizada!", date: today() };
    setActivities(p => [...p, act]);
    if (selected?.id === id) setSelected(p => ({ ...p, status: "won", stage: "Fechamento" }));
    db.saveNegotiation({ id, status: "won", stage: "Fechamento" });
    db.saveActivity(act);
  };

  const markLost = (id) => {
    const reason = prompt("Motivo da perda:");
    if (reason === null) return;
    setNegotiations(p => p.map(n => n.id === id ? { ...n, status: "lost", lostReason: reason } : n));
    const act = { id: uid(), contactId: "", negotiationId: id, channel: "Sistema", description: `❌ Perda: ${reason || "Sem motivo"}`, date: today() };
    setActivities(p => [...p, act]);
    if (selected?.id === id) setSelected(p => ({ ...p, status: "lost", lostReason: reason }));
    db.saveNegotiation({ id, status: "lost", lostReason: reason });
    db.saveActivity(act);
  };

  // Handle kanban drop
  useEffect(() => {
    const handler = () => {
      const data = window.__crmDrop;
      if (data) {
        changeStage(data.id, data.stage);
        window.__crmDrop = null;
      }
    };
    window.addEventListener("crm-drop", handler);
    return () => window.removeEventListener("crm-drop", handler);
  }, []);

  // ─── Navigation ───
  const navigate = (pg) => { setPage(pg); setSelected(null); };

  if (!ready) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg)", color: "var(--tx2)", fontFamily: "'DM Sans'" }}>Carregando…</div>;
  }

  // ─── Page titles ───
  const pageTitles = {
    dashboard: "Dashboard",
    negotiations: "Negociações",
    contacts: "Contatos",
    companies: "Empresas",
    tasks: "Tarefas",
    reports: "Relatórios",
  };

  const pageTitle = selected
    ? (selected.name || selected.product || "Detalhe")
    : pageTitles[page] || "CRM";

  // ─── Navigation items ───
  const navItems = [
    { id: "dashboard", icon: Home, label: "Início" },
    { id: "negotiations", icon: Target, label: "Negociações" },
    { id: "contacts", icon: Users, label: "Contatos" },
    { id: "companies", icon: Building2, label: "Empresas" },
    { id: "tasks", icon: CheckSquare, label: "Tarefas", badge: pendingTasks > 0 ? pendingTasks : null },
    { id: "reports", icon: BarChart3, label: "Análises" },
  ];

  return (
    <>
      <div className="app">
        {/* ═══ SIDEBAR ═══ */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <h1>My Broker</h1>
            <span>CRM</span>
          </div>
          <nav className="sidebar-nav">
            {navItems.map(n => (
              <button key={n.id}
                className={`nav-item ${page === n.id ? "active" : ""}`}
                onClick={() => navigate(n.id)}>
                <n.icon size={14} />
                {n.label}
                {n.badge && <span className="nav-badge">{n.badge}</span>}
              </button>
            ))}
          </nav>
          {/* Simulador link */}
          <a href="/simulador" target="_blank" rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", margin: "0 5px",
              borderRadius: 6, fontSize: 12.5, color: "var(--ac)", textDecoration: "none",
              border: "1px solid var(--ac)", background: "var(--acbg)", transition: ".12s"
            }}>
            <Calculator size={14} /> Simulador de Propostas
          </a>
          <div className="sidebar-footer">
            {PRODUCTS.map(p => (
              <div key={p} style={{ display: "flex", justifyContent: "space-between", padding: "2px 4px" }}>
                <span>{p}</span>
                <span style={{ color: "var(--tx2)", fontWeight: 500 }}>
                  {negotiations.filter(n => n.product === p).length}
                </span>
              </div>
            ))}
            <div style={{ borderTop: "1px solid var(--bd)", marginTop: 6, paddingTop: 6, display: "flex", justifyContent: "space-between" }}>
              <span>Total</span>
              <span style={{ color: "var(--ac)", fontWeight: 600 }}>{negotiations.length}</span>
            </div>
            {/* Backup buttons */}
            <div style={{ borderTop: "1px solid var(--bd)", marginTop: 8, paddingTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
              <button className="btn btn-sm" style={{ width: "100%", justifyContent: "center", fontSize: 10 }}
                onClick={() => {
                  const backup = {
                    version: "2.0",
                    date: new Date().toISOString(),
                    contacts, companies, negotiations, activities, tasks, templates,
                  };
                  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `mybroker-backup-${new Date().toISOString().slice(0, 10)}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}>
                <Download size={10} /> Exportar Backup
              </button>
              <label className="btn btn-sm" style={{ width: "100%", justifyContent: "center", fontSize: 10, cursor: "pointer" }}>
                <Upload size={10} /> Restaurar Backup
                <input type="file" accept=".json" style={{ display: "none" }} onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (!confirm("Restaurar backup? Isso substituirá TODOS os dados atuais.")) { e.target.value = ""; return; }
                  try {
                    const data = JSON.parse(await file.text());
                    if (data.contacts) { setContacts(data.contacts); for (const c of data.contacts) db.saveContact(c); }
                    if (data.companies) { setCompanies(data.companies); for (const c of data.companies) db.saveCompany(c); }
                    if (data.negotiations) { setNegotiations(data.negotiations); for (const n of data.negotiations) db.saveNegotiation(n); }
                    if (data.activities) { setActivities(data.activities); for (const a of data.activities) db.saveActivity(a); }
                    if (data.tasks) { setTasks(data.tasks); for (const t of data.tasks) db.saveTask(t); }
                    alert(`Backup restaurado! ${(data.contacts||[]).length} contatos, ${(data.negotiations||[]).length} negociações, ${(data.activities||[]).length} atividades, ${(data.tasks||[]).length} tarefas.`);
                  } catch (err) { alert("Erro ao restaurar: " + err.message); }
                  e.target.value = "";
                }} />
              </label>
            </div>
          </div>
        </aside>

        {/* ═══ MAIN ═══ */}
        <div className="main">
          <div className="topbar">
            <h2>{pageTitle}</h2>
            <div className="topbar-actions">
              {/* Create dropdown (like RD Station) */}
              <div className="dropdown">
                <button className="btn btn-primary" onClick={() => setCreateOpen(!createOpen)}>
                  <Plus size={13} /> Criar <ChevronDown size={11} />
                </button>
                {createOpen && (
                  <div className="dropdown-menu">
                    <button className="dropdown-item" onClick={() => { setCreateOpen(false); setModal("newNeg"); }}>
                      <Target size={13} /> Criar Negociação
                    </button>
                    <button className="dropdown-item" onClick={() => { setCreateOpen(false); setModal("newCompany"); }}>
                      <Building2 size={13} /> Criar Empresa
                    </button>
                    <button className="dropdown-item" onClick={() => { setCreateOpen(false); setModal("newContact"); }}>
                      <Users size={13} /> Criar Contato
                    </button>
                    <button className="dropdown-item" onClick={() => { setCreateOpen(false); setModal("newTask"); }}>
                      <CheckSquare size={13} /> Criar Tarefa
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="content" onClick={() => createOpen && setCreateOpen(false)}>
            {/* ═══ DASHBOARD ═══ */}
            {page === "dashboard" && !selected && (
              <div className="fade-in">
                <div className="kpi-grid">
                  <div className="kpi"><div className="kpi-label">Negociações</div><div className="kpi-value">{negotiations.length}</div><div className="kpi-sub">{contacts.length} contatos · {companies.length} empresas</div></div>
                  <div className="kpi"><div className="kpi-label">Pipeline Total</div><div className="kpi-value" style={{ color: "var(--ac)" }}>{formatCurrency(negotiations.reduce((s, n) => s + (Number(n.value) || 0), 0))}</div></div>
                  <div className="kpi kpi-green"><div className="kpi-label">Vendas</div><div className="kpi-value" style={{ color: "var(--grn)" }}>{negotiations.filter(n => n.status === "won").length}</div><div className="kpi-sub">{formatCurrency(negotiations.filter(n => n.status === "won").reduce((s, n) => s + (Number(n.value) || 0), 0))}</div></div>
                  <div className="kpi kpi-red"><div className="kpi-label">Perdas</div><div className="kpi-value" style={{ color: "var(--red)" }}>{negotiations.filter(n => n.status === "lost").length}</div></div>
                  <div className="kpi"><div className="kpi-label">Tarefas Atrasadas</div><div className="kpi-value" style={{ color: pendingTasks > 0 ? "var(--red)" : "var(--grn)" }}>{pendingTasks}</div></div>
                </div>

                {/* Funnel summary */}
                <div className="panel" style={{ marginBottom: 16 }}>
                  <div className="panel-header"><h4>Funil de Vendas</h4></div>
                  <div className="panel-body">
                    {STAGES.map(stg => {
                      const cnt = negotiations.filter(n => n.stage === stg && n.status !== "lost").length;
                      const val = negotiations.filter(n => n.stage === stg && n.status !== "lost").reduce((s, n) => s + (Number(n.value) || 0), 0);
                      const pct = negotiations.length ? Math.round(cnt / negotiations.length * 100) : 0;
                      return (
                        <div key={stg} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                          <span style={{ fontSize: 10.5, color: "var(--tx2)", minWidth: 100 }}>{stg}</span>
                          <div style={{ flex: 1, height: 22, background: "var(--bd)", borderRadius: 4, overflow: "hidden" }}>
                            <div style={{
                              width: Math.max(pct, 3) + "%", height: "100%", background: STAGE_COLORS[stg],
                              borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 9, color: "#fff", fontWeight: 600
                            }}>{cnt}</div>
                          </div>
                          <span style={{ fontSize: 10, color: "var(--ac)", minWidth: 70, textAlign: "right" }}>{formatCurrency(val)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ═══ NEGOTIATIONS ═══ */}
            {page === "negotiations" && !selected && (
              <NegotiationPipeline
                negotiations={negotiations} contacts={contacts} companies={companies}
                activities={activities} tasks={tasks}
                onSelect={(n) => { setSelected(n); }}
                onDelete={deleteNeg}
                view={view} setView={setView}
                onCreateNeg={() => setModal("newNeg")}
              />
            )}

            {page === "negotiations" && selected && (
              <NegotiationDetail
                negotiation={selected}
                contact={contacts.find(c => c.id === selected.contactId)}
                company={companies.find(c => c.id === selected.companyId)}
                activities={activities} tasks={tasks} templates={templates}
                allContacts={contacts}
                onEdit={(n) => { setEditTarget(n); setModal("editNeg"); }}
                onBack={() => setSelected(null)}
                onDelete={deleteNeg}
                onStageChange={changeStage}
                onWin={markWon}
                onLose={markLost}
                onAddActivity={(negId, data) => {
                  if (data) {
                    setActivities(p => [...p, { id: uid(), negotiationId: negId, channel: data.channel, description: data.description, date: today() }]);
                  } else {
                    setModalNegId(negId); setModal("newActivity");
                  }
                }}
                onAddTask={(negId, data) => {
                  if (data) {
                    setTasks(p => [...p, { id: uid(), negotiationId: negId, title: data.title, description: data.description || "", date: data.date, done: false, createdAt: today() }]);
                    setActivities(p => [...p, { id: uid(), negotiationId: negId, channel: "Sistema", description: `Tarefa criada: ${data.title}`, date: today() }]);
                  } else {
                    setModalNegId(negId); setModal("newTaskFor");
                  }
                }}
                onToggleTask={toggleTask}
                onAddNote={addNote}
              />
            )}

            {/* ═══ CONTACTS ═══ */}
            {page === "contacts" && !selected && (
              <div className="fade-in">
                <div style={{ display: "flex", gap: 6, marginBottom: 12, alignItems: "center" }}>
                  <button className="btn btn-primary btn-sm" onClick={() => setModal("newContact")}>
                    <Plus size={11} /> Criar Contato
                  </button>
                  <label className="btn btn-sm" style={{ cursor: "pointer" }}>
                    <Upload size={11} /> Importar Planilha
                    <input type="file" accept=".xlsx,.xls,.csv,.json" style={{ display: "none" }}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          if (file.name.endsWith('.json')) {
                            const text = await file.text();
                            const data = JSON.parse(text);
                            if (Array.isArray(data)) {
                              const newContacts = data.filter(c => c.name).map(c => ({
                                ...emptyContact(),
                                ...c,
                                id: c.id || uid(),
                                createdAt: c.createdAt || today(),
                              }));
                              setContacts(prev => {
                                const existingNames = new Set(prev.map(c => c.name.toLowerCase()));
                                const fresh = newContacts.filter(c => !existingNames.has(c.name.toLowerCase()));
                                // Save to Supabase
                                if (fresh.length > 0) db.importContacts(fresh);
                                return [...prev, ...fresh];
                              });
                              alert(`${newContacts.length} contatos importados (duplicados ignorados).`);
                            }
                          } else {
                            // For XLSX/CSV: use SheetJS via dynamic import or manual parsing
                            const text = await file.text();
                            const lines = text.split('\n').filter(l => l.trim());
                            if (lines.length < 2) { alert("Arquivo vazio"); return; }
                            const headers = lines[0].split(/[,;\t]/).map(h => h.trim().replace(/"/g, '').toLowerCase());
                            const nameIdx = headers.findIndex(h => h.includes('nome') && !h.includes('corretor'));
                            const phoneIdx = headers.findIndex(h => h.includes('telefone') || h.includes('phone') || h.includes('celular'));
                            const emailIdx = headers.findIndex(h => h.includes('email') || h.includes('e-mail'));
                            const corretorIdx = headers.findIndex(h => h.includes('corretor') || h.includes('indicador') || h.includes('responsavel'));
                            
                            if (nameIdx === -1) { alert("Coluna 'Nome' não encontrada na planilha."); return; }
                            
                            const newContacts = [];
                            for (let i = 1; i < lines.length; i++) {
                              const cols = lines[i].split(/[,;\t]/).map(c => c.trim().replace(/"/g, ''));
                              const name = cols[nameIdx] || "";
                              if (!name) continue;
                              newContacts.push({
                                ...emptyContact(),
                                id: uid(),
                                name,
                                phone: phoneIdx >= 0 ? (cols[phoneIdx] || "") : "",
                                email: emailIdx >= 0 ? (cols[emailIdx] || "").toLowerCase() : "",
                                notes: corretorIdx >= 0 && cols[corretorIdx] ? `Corretor indicador: ${cols[corretorIdx]}` : "",
                                createdAt: today(),
                              });
                            }
                            setContacts(prev => {
                              const existingNames = new Set(prev.map(c => c.name.toLowerCase()));
                              const fresh = newContacts.filter(c => !existingNames.has(c.name.toLowerCase()));
                              return [...prev, ...fresh];
                            });
                            alert(`${newContacts.length} contatos encontrados. Duplicados ignorados.`);
                          }
                        } catch (err) {
                          alert("Erro ao importar: " + err.message + "\n\nPara arquivos .xlsx, use o JSON gerado ou salve como .csv primeiro.");
                        }
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {contacts.length > 0 && (
                    <span style={{ fontSize: 10.5, color: "var(--tx3)", marginLeft: 8 }}>{contacts.length} contatos</span>
                  )}
                </div>
                {contacts.length === 0
                  ? <div className="empty"><h3>Nenhum contato</h3><p>Crie o primeiro contato ou importe uma planilha.</p></div>
                  : <ContactList
                    contacts={contacts} companies={companies} negotiations={negotiations}
                    onSelect={(c) => { setSelected(c); }}
                    onEdit={(c) => { setEditTarget(c); setModal("editContact"); }}
                    onDelete={deleteContact}
                  />
                }
              </div>
            )}

            {page === "contacts" && selected && (
              <ContactDetail
                contact={selected}
                company={companies.find(c => c.id === selected.companyId)}
                allContacts={contacts}
                negotiations={negotiations.filter(n => n.contactId === selected.id)}
                activities={activities}
                tasks={tasks}
                templates={templates}
                onBack={() => setSelected(null)}
                onEdit={(c) => { setEditTarget(c); setModal("editContact"); }}
                onDelete={deleteContact}
                onCreateNeg={() => setModal("newNeg")}
                onEditNeg={(n) => { setEditTarget(n); setModal("editNeg"); }}
                onDeleteNeg={deleteNeg}
                onStageChange={changeStage}
                onWin={markWon}
                onLose={markLost}
                onAddActivity={(contactId, negId, data) => {
                  if (data) {
                    const act = { id: uid(), contactId, negotiationId: negId || "", channel: data.channel, description: data.description, date: today() };
                    setActivities(p => [...p, act]);
                    db.saveActivity(act);
                  }
                }}
                onAddTask={(contactId, negId, data) => {
                  if (data) {
                    const task = { id: uid(), contactId, negotiationId: negId || "", title: data.title, description: data.description || "", date: data.date, done: false, createdAt: today() };
                    const act = { id: uid(), contactId, negotiationId: negId || "", channel: "Sistema", description: `Tarefa criada: ${data.title}`, date: today() };
                    setTasks(p => [...p, task]);
                    setActivities(p => [...p, act]);
                    db.saveTask(task);
                    db.saveActivity(act);
                  }
                }}
                onToggleTask={toggleTask}
                onAddNote={(contactId, negId, text, stage) => {
                  const act = { id: uid(), contactId, negotiationId: negId || "", channel: "Anotação", description: text, date: today(), stage: stage || "" };
                  setActivities(p => [...p, act]);
                  db.saveActivity(act);
                }}
              />
            )}

            {/* ═══ COMPANIES ═══ */}
            {page === "companies" && !selected && (
              <div className="fade-in">
                <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => setModal("newCompany")}>
                    <Plus size={11} /> Criar Empresa
                  </button>
                </div>
                {companies.length === 0
                  ? <div className="empty"><h3>Nenhuma empresa</h3></div>
                  : <div className="table-wrap">
                    <table>
                      <thead><tr><th>Empresas</th><th>Segmento</th><th>Negociações</th><th>Último Contato</th><th></th></tr></thead>
                      <tbody>
                        {companies.map(c => {
                          const negs = negotiations.filter(n => n.companyId === c.id);
                          return (
                            <tr key={c.id} onClick={() => setSelected(c)}>
                              <td style={{ fontWeight: 500 }}>{c.name}</td>
                              <td style={{ color: "var(--tx2)" }}>{c.segment || "—"}</td>
                              <td>{negs.length}</td>
                              <td style={{ color: "var(--tx3)", fontSize: 11 }}>—</td>
                              <td><button className="btn btn-sm btn-ghost btn-red" onClick={e => { e.stopPropagation(); deleteCompany(c.id); }}><X size={10} /></button></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                }
              </div>
            )}

            {page === "companies" && selected && (
              <CompanyDetail
                company={selected}
                contacts={contacts}
                negotiations={negotiations}
                activities={activities}
                tasks={tasks}
                onBack={() => setSelected(null)}
                onEdit={(c) => { setEditTarget(c); setModal("editCompany"); }}
                onSelectNeg={(n) => { setPage("negotiations"); setSelected(n); }}
                onCreateNeg={() => { setModal("newNeg"); }}
              />
            )}

            {/* ═══ TASKS ═══ */}
            {page === "tasks" && (
              <TasksPage
                tasks={tasks} negotiations={negotiations} contacts={contacts}
                onToggle={toggleTask}
                onCreate={() => setModal("newTask")}
                onSelectNeg={(n) => { setPage("negotiations"); setSelected(n); }}
              />
            )}

            {/* ═══ REPORTS ═══ */}
            {page === "reports" && (
              <div className="fade-in">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                  {PRODUCTS.map(p => {
                    const negs = negotiations.filter(n => n.product === p);
                    const val = negs.reduce((s, n) => s + (Number(n.value) || 0), 0);
                    const won = negs.filter(n => n.status === "won").length;
                    const lost = negs.filter(n => n.status === "lost").length;
                    return (
                      <div key={p} className="panel">
                        <div className="panel-header">
                          <h4 style={{ color: PRODUCT_COLORS[p] }}>{p}</h4>
                        </div>
                        <div className="panel-body">
                          <div className="panel-row"><span className="label">Negociações</span><span className="value">{negs.length}</span></div>
                          <div className="panel-row"><span className="label">Valor total</span><span className="value" style={{ color: "var(--ac)" }}>{formatCurrency(val)}</span></div>
                          <div className="panel-row"><span className="label">Vendas</span><span className="value" style={{ color: "var(--grn)" }}>{won}</span></div>
                          <div className="panel-row"><span className="label">Perdas</span><span className="value" style={{ color: "var(--red)" }}>{lost}</span></div>
                          <div className="panel-row"><span className="label">Conversão</span><span className="value">{negs.length > 0 ? Math.round(won / negs.length * 100) : 0}%</span></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ MODALS ═══ */}
      {(modal === "newContact" || modal === "editContact") && (
        <ContactForm
          contact={modal === "editContact" ? editTarget : null}
          companies={companies} allContacts={contacts}
          onSave={saveContact} onClose={() => { setModal(null); setEditTarget(null); }}
        />
      )}
      {(modal === "newCompany" || modal === "editCompany") && (
        <CompanyForm
          company={modal === "editCompany" ? editTarget : null}
          onSave={saveCompany} onClose={() => { setModal(null); setEditTarget(null); }}
        />
      )}
      {(modal === "newNeg" || modal === "editNeg") && (
        <NegotiationForm
          negotiation={modal === "editNeg" ? editTarget : null}
          contacts={contacts} companies={companies} savedOptions={savedOptions}
          onSave={saveNeg} onClose={() => { setModal(null); setEditTarget(null); }}
        />
      )}
      {(modal === "newActivity" || modal === "actFor") && (
        <ActivityForm
          negotiations={negotiations}
          onSave={saveActivity}
          onClose={() => setModal(null)}
          defaultNegId={modalNegId}
        />
      )}
      {(modal === "newTask" || modal === "newTaskFor") && (
        <TaskForm
          negotiations={negotiations}
          onSave={saveTask}
          onClose={() => setModal(null)}
          defaultNegId={modal === "newTaskFor" ? modalNegId : ""}
        />
      )}
    </>
  );
}
