import { useState, useEffect, useRef, useMemo } from "react";
import {
  Home, Users, Building2, Target, CheckSquare, Activity, Plus,
  ChevronDown, MessageCircle, BarChart3, Calculator, Upload, Download
} from "lucide-react";

import { PRODUCTS, STAGES, STAGE_COLORS, PRODUCT_COLORS, DEFAULT_TEMPLATES } from "./utils/constants";
import {
  uid, today, loadData, saveData, calcScore, formatCurrency, formatDate,
  emptyContact, emptyCompany, emptyNegotiation, emptyTask, emptyActivity,
  deriveSavedOptions, requestNotifPermission, checkTaskNotifications
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

  // ─── Notifications ───
  useEffect(() => {
    requestNotifPermission();
    // Verifica tarefas ao carregar e a cada 60 segundos
    const check = () => checkTaskNotifications(tasks, contacts, negotiations);
    check();
    const timer = setInterval(check, 60000);
    return () => clearInterval(timer);
  }, [tasks, contacts, negotiations]);

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
              <div className="fade-in" id="report-area">
                {/* ═══ FILTERS BAR ═══ */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Período:</span>
                  <input type="date" id="rpt-from" defaultValue={new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)} style={{ padding: "5px 8px", fontSize: 11 }} />
                  <span style={{ fontSize: 11, color: "var(--tx3)" }}>a</span>
                  <input type="date" id="rpt-to" defaultValue={today()} style={{ padding: "5px 8px", fontSize: 11 }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                  <select id="rpt-product" defaultValue="" style={{ padding: "5px 8px", fontSize: 11 }}>
                    <option value="">Todos os produtos</option>
                    {PRODUCTS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <select id="rpt-status" defaultValue="" style={{ padding: "5px 8px", fontSize: 11 }}>
                    <option value="">Todos os status</option>
                    <option value="open">Em andamento</option>
                    <option value="won">Vendida</option>
                    <option value="lost">Perdida</option>
                  </select>
                  <select id="rpt-stage" defaultValue="" style={{ padding: "5px 8px", fontSize: 11 }}>
                    <option value="">Todas as etapas</option>
                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select id="rpt-corretor" defaultValue="" style={{ padding: "5px 8px", fontSize: 11 }}>
                    <option value="">Todos os corretores</option>
                    {[...new Set(contacts.map(c => { const m = (c.notes || "").match(/Corretor indicador:\s*(.+)/i); return m ? m[1].trim() : null; }).filter(Boolean))].sort().map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input id="rpt-admin" placeholder="Administradora/Operadora" defaultValue="" style={{ padding: "5px 8px", fontSize: 11, width: 160 }} />
                  <button className="btn btn-sm btn-primary" onClick={() => { const a = document.getElementById("report-area"); if (a) { a.style.opacity = "0.5"; setTimeout(() => { if (a) a.style.opacity = "1"; }, 100); } }}>Gerar Relatório</button>
                </div>
                <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
                  <button className="btn btn-sm" onClick={() => window.print()}><Download size={10} /> Imprimir / PDF</button>
                  <button className="btn btn-sm" onClick={() => {
                    const from = document.getElementById("rpt-from")?.value || "";
                    const to = document.getElementById("rpt-to")?.value || "";
                    const fp = document.getElementById("rpt-product")?.value || "";
                    const fs = document.getElementById("rpt-status")?.value || "";
                    const fst = document.getElementById("rpt-stage")?.value || "";
                    const fc = document.getElementById("rpt-corretor")?.value || "";
                    const fa = (document.getElementById("rpt-admin")?.value || "").toLowerCase();
                    const fNegs = negotiations.filter(n => {
                      if (from && n.createdAt < from) return false;
                      if (to && n.createdAt > to) return false;
                      if (fp && n.product !== fp) return false;
                      if (fs && n.status !== fs) return false;
                      if (fst && n.stage !== fst) return false;
                      if (fc) { const ct = contacts.find(c => c.id === n.contactId); if (!(ct?.notes || "").includes(fc)) return false; }
                      if (fa) { const adm = (n.health?.operator || n.health?.administrator || n.consorcio?.administrator || "").toLowerCase(); if (!adm.includes(fa)) return false; }
                      return true;
                    });
                    const negIds = new Set(fNegs.map(n => n.id));
                    const ctIds = new Set(fNegs.map(n => n.contactId));
                    const fActs = activities.filter(a => {
                      if (from && a.date < from) return false;
                      if (to && a.date > to) return false;
                      if (fp || fs || fst || fc || fa) { return negIds.has(a.negotiationId) || ctIds.has(a.contactId); }
                      return true;
                    });
                    let csv = "Data,Canal,Contato,Negociação,Produto,Etapa,Status,Valor,Corretor,Descrição\n";
                    fActs.forEach(a => {
                      const ct = contacts.find(c => c.id === a.contactId);
                      const ng = negotiations.find(n => n.id === a.negotiationId);
                      const corr = (ct?.notes || "").match(/Corretor indicador:\s*(.+)/i)?.[1] || "";
                      csv += `"${a.date}","${a.channel}","${ct?.name || ""}","${ng?.name || ""}","${ng?.product || ""}","${ng?.stage || ""}","${{ open: "Em andamento", won: "Vendida", lost: "Perdida" }[ng?.status] || ""}","${ng?.value || ""}","${corr}","${(a.description || "").replace(/"/g, '""')}"\n`;
                    });
                    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url; a.download = `relatorio-${fp || "todos"}-${from}-a-${to}.csv`; a.click();
                    URL.revokeObjectURL(url);
                  }}><Download size={10} /> Exportar CSV</button>
                </div>

                {/* ═══ REPORT CONTENT ═══ */}
                {(() => {
                  const from = document.getElementById("rpt-from")?.value || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
                  const to = document.getElementById("rpt-to")?.value || today();
                  const fp = document.getElementById("rpt-product")?.value || "";
                  const fs = document.getElementById("rpt-status")?.value || "";
                  const fst = document.getElementById("rpt-stage")?.value || "";
                  const fc = document.getElementById("rpt-corretor")?.value || "";
                  const fa = (document.getElementById("rpt-admin")?.value || "").toLowerCase();

                  // Filter negotiations
                  const fNegs = negotiations.filter(n => {
                    if (from && n.createdAt < from) return false;
                    if (to && n.createdAt > to) return false;
                    if (fp && n.product !== fp) return false;
                    if (fs && n.status !== fs) return false;
                    if (fst && n.stage !== fst) return false;
                    if (fc) { const ct = contacts.find(c => c.id === n.contactId); if (!(ct?.notes || "").includes(fc)) return false; }
                    if (fa) { const adm = (n.health?.operator || n.health?.administrator || n.consorcio?.administrator || "").toLowerCase(); if (!adm.includes(fa)) return false; }
                    return true;
                  });
                  const negIds = new Set(fNegs.map(n => n.id));
                  const ctIds = new Set(fNegs.map(n => n.contactId));

                  // Filter activities
                  const fActs = activities.filter(a => {
                    if (from && a.date < from) return false;
                    if (to && a.date > to) return false;
                    if (fp || fs || fst || fc || fa) { return negIds.has(a.negotiationId) || ctIds.has(a.contactId); }
                    return true;
                  });

                  const fWon = fNegs.filter(n => n.status === "won");
                  const fLost = fNegs.filter(n => n.status === "lost");
                  const fOpen = fNegs.filter(n => n.status === "open");

                  // Group by channel
                  const actByChannel = {};
                  fActs.forEach(a => { actByChannel[a.channel] = (actByChannel[a.channel] || 0) + 1; });

                  const totalContatos = fActs.filter(a => a.channel !== "Sistema" && a.channel !== "Anotação").length;
                  const totalAnotacoes = fActs.filter(a => a.channel === "Anotação").length;

                  // Active filter label
                  const filterLabels = [fp, fs ? { open: "Em andamento", won: "Vendida", lost: "Perdida" }[fs] : "", fst, fc, fa].filter(Boolean);

                  return (<>
                    {filterLabels.length > 0 && (
                      <div style={{ marginBottom: 12, display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ fontSize: 10, color: "var(--tx3)" }}>Filtros ativos:</span>
                        {filterLabels.map((f, i) => <span key={i} className="tag" style={{ background: "var(--acbg)", color: "var(--ac)" }}>{f}</span>)}
                      </div>
                    )}

                    {/* KPIs */}
                    <div className="kpi-grid">
                      <div className="kpi"><div className="kpi-label">Contatos Realizados</div><div className="kpi-value">{totalContatos}</div><div className="kpi-sub">no período</div></div>
                      <div className="kpi"><div className="kpi-label">Anotações</div><div className="kpi-value">{totalAnotacoes}</div></div>
                      <div className="kpi"><div className="kpi-label">Total Atividades</div><div className="kpi-value">{fActs.length}</div></div>
                      <div className="kpi kpi-blue"><div className="kpi-label">Em Andamento</div><div className="kpi-value" style={{ color: "var(--blu)" }}>{fOpen.length}</div><div className="kpi-sub">{formatCurrency(fOpen.reduce((s, n) => s + (Number(n.value) || 0), 0))}</div></div>
                      <div className="kpi kpi-green"><div className="kpi-label">Vendas</div><div className="kpi-value" style={{ color: "var(--grn)" }}>{fWon.length}</div><div className="kpi-sub">{formatCurrency(fWon.reduce((s, n) => s + (Number(n.value) || 0), 0))}</div></div>
                      <div className="kpi kpi-red"><div className="kpi-label">Perdas</div><div className="kpi-value" style={{ color: "var(--red)" }}>{fLost.length}</div></div>
                      <div className="kpi"><div className="kpi-label">Negociações</div><div className="kpi-value">{fNegs.length}</div></div>
                      <div className="kpi"><div className="kpi-label">Conversão</div><div className="kpi-value">{fNegs.length > 0 ? Math.round(fWon.length / fNegs.length * 100) : 0}%</div></div>
                    </div>

                    {/* Products breakdown */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
                      {PRODUCTS.map(p => {
                        const negs = fNegs.filter(n => n.product === p);
                        if (fp && p !== fp) return null;
                        const val = negs.reduce((s, n) => s + (Number(n.value) || 0), 0);
                        const won = negs.filter(n => n.status === "won").length;
                        const lost = negs.filter(n => n.status === "lost").length;
                        return (
                          <div key={p} className="panel">
                            <div className="panel-header"><h4 style={{ color: PRODUCT_COLORS[p] }}>{p}</h4></div>
                            <div className="panel-body">
                              <div className="panel-row"><span className="label">Negociações</span><span className="value">{negs.length}</span></div>
                              <div className="panel-row"><span className="label">Valor</span><span className="value" style={{ color: "var(--ac)" }}>{formatCurrency(val)}</span></div>
                              <div className="panel-row"><span className="label">Vendas</span><span className="value" style={{ color: "var(--grn)" }}>{won}</span></div>
                              <div className="panel-row"><span className="label">Perdas</span><span className="value" style={{ color: "var(--red)" }}>{lost}</span></div>
                              <div className="panel-row"><span className="label">Conversão</span><span className="value">{negs.length > 0 ? Math.round(won / negs.length * 100) : 0}%</span></div>
                            </div>
                          </div>
                        );
                      }).filter(Boolean)}
                    </div>

                    {/* Funnel breakdown */}
                    <div className="panel" style={{ marginBottom: 16 }}>
                      <div className="panel-header"><h4>Funil de Vendas</h4></div>
                      <div className="panel-body">
                        {STAGES.map(stg => {
                          const cnt = fNegs.filter(n => n.stage === stg).length;
                          const val = fNegs.filter(n => n.stage === stg).reduce((s, n) => s + (Number(n.value) || 0), 0);
                          const pct = fNegs.length ? Math.round(cnt / fNegs.length * 100) : 0;
                          return (
                            <div key={stg} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                              <span style={{ fontSize: 10.5, color: "var(--tx2)", minWidth: 100 }}>{stg}</span>
                              <div style={{ flex: 1, height: 22, background: "var(--bd)", borderRadius: 4, overflow: "hidden" }}>
                                <div style={{ width: Math.max(pct, 3) + "%", height: "100%", background: STAGE_COLORS[stg], borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#fff", fontWeight: 600 }}>{cnt}</div>
                              </div>
                              <span style={{ fontSize: 10, color: "var(--ac)", minWidth: 70, textAlign: "right" }}>{formatCurrency(val)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Activities by channel */}
                    <div className="panel" style={{ marginBottom: 16 }}>
                      <div className="panel-header"><h4>Atividades por Canal</h4></div>
                      <div className="panel-body">
                        {Object.entries(actByChannel).sort((a, b) => b[1] - a[1]).map(([ch, count]) => (
                          <div key={ch} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                            <span style={{ fontSize: 11, color: "var(--tx2)", minWidth: 90 }}>{ch}</span>
                            <div style={{ flex: 1, height: 20, background: "var(--bd)", borderRadius: 4, overflow: "hidden" }}>
                              <div style={{ width: Math.max(Math.round(count / Math.max(fActs.length, 1) * 100), 5) + "%", height: "100%", background: ({"WhatsApp":"#25D366","Telefone":"#3B82F6","E-mail":"#F59E0B","Presencial":"#8B5CF6","Sistema":"#6B7280","Anotação":"#C8935A"}[ch]) || "var(--ac)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#fff", fontWeight: 600 }}>{count}</div>
                            </div>
                          </div>
                        ))}
                        {Object.keys(actByChannel).length === 0 && <p style={{ fontSize: 11, color: "var(--tx3)" }}>Nenhuma atividade no período.</p>}
                      </div>
                    </div>

                    {/* Activity log */}
                    <div className="panel">
                      <div className="panel-header"><h4>Histórico de Atividades ({fActs.length})</h4></div>
                      <div className="panel-body" style={{ maxHeight: 400, overflowY: "auto" }}>
                        {fActs.length === 0 ? <p style={{ fontSize: 11, color: "var(--tx3)", padding: 10 }}>Nenhuma atividade no período com os filtros selecionados.</p>
                        : fActs.sort((a, b) => (b.date + (b.id || "")).localeCompare(a.date + (a.id || ""))).map(a => {
                          const ct = contacts.find(c => c.id === a.contactId);
                          const ng = negotiations.find(n => n.id === a.negotiationId);
                          return (
                            <div key={a.id} style={{ display: "flex", gap: 8, padding: "7px 0", borderBottom: "1px solid var(--bd)", fontSize: 11.5 }}>
                              <span style={{ color: "var(--tx3)", minWidth: 72, fontSize: 10 }}>{formatDate(a.date)}</span>
                              <span className="tag" style={{ background: ({"WhatsApp":"#25D36622","Telefone":"#3B82F622","E-mail":"#F59E0B22","Anotação":"#C8935A22","Sistema":"#6B728022","Presencial":"#8B5CF622"}[a.channel]) || "var(--s3)", color: ({"WhatsApp":"#25D366","Telefone":"#3B82F6","E-mail":"#F59E0B","Anotação":"#C8935A","Sistema":"#6B7280","Presencial":"#8B5CF6"}[a.channel]) || "var(--tx2)", minWidth: 65, textAlign: "center" }}>{a.channel}</span>
                              <span style={{ fontWeight: 500, minWidth: 100 }}>{ct?.name?.split(" ").slice(0, 2).join(" ") || "—"}</span>
                              {ng && <span className="tag" style={{ background: PRODUCT_COLORS[ng.product] + "22", color: PRODUCT_COLORS[ng.product] }}>{ng.product}</span>}
                              <span style={{ color: "var(--tx2)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.description}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>);
                })()}
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
