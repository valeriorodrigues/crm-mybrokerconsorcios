import { useState } from "react";
import { Modal, Field, StatusTag } from "./UI";
import { uid, emptyTask, formatDate, formatCurrency } from "../utils/helpers";
import { Check, Plus, Clock, AlertCircle } from "lucide-react";

export function TaskForm({ task, negotiations, onSave, onClose, defaultNegId }) {
  const [f, setF] = useState(task ? { ...task } : {
    ...emptyTask(),
    negotiationId: defaultNegId || "",
  });
  const s = (k, v) => setF(p => ({ ...p, [k]: v }));

  return (
    <Modal title={task ? "Editar Tarefa" : "Nova Tarefa"} onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => {
          if (f.negotiationId && f.date) onSave({ ...f, id: f.id || uid() });
        }}><Check size={12} /> {task ? "Salvar" : "Criar Tarefa"}</button>
      </>}>
      <Field label="Negociação *">
        <select value={f.negotiationId} onChange={e => s("negotiationId", e.target.value)}>
          <option value="">Selecionar…</option>
          {negotiations.map(n => <option key={n.id} value={n.id}>{n.name || n.product}</option>)}
        </select>
      </Field>
      <Field label="Título">
        <input value={f.title || ""} onChange={e => s("title", e.target.value)} placeholder="Ex: Ligar para cliente, Enviar proposta…" />
      </Field>
      <div className="row2">
        <Field label="Data e Hora *">
          <input type="datetime-local" value={f.date || ""} onChange={e => s("date", e.target.value)} />
        </Field>
      </div>
      <Field label="Descrição">
        <textarea value={f.description || ""} onChange={e => s("description", e.target.value)} placeholder="Detalhes da tarefa…" />
      </Field>
    </Modal>
  );
}

export function TasksPage({ tasks, negotiations, contacts, onToggle, onCreate, onSelectNeg }) {
  const [filterStatus, setFilterStatus] = useState("pending");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");

  const now = new Date().toISOString().slice(0, 10);

  const filtered = tasks.filter(t => {
    if (filterStatus === "pending" && t.done) return false;
    if (filterStatus === "done" && !t.done) return false;
    if (dateFrom && t.date && t.date.slice(0, 10) < dateFrom) return false;
    if (dateTo && t.date && t.date.slice(0, 10) > dateTo) return false;
    if (search) {
      const q = search.toLowerCase();
      const neg = negotiations.find(n => n.id === t.negotiationId);
      if (!(t.title || "").toLowerCase().includes(q) && !(t.description || "").toLowerCase().includes(q) && !(neg?.name || "").toLowerCase().includes(q)) return false;
    }
    return true;
  }).sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  return (
    <div className="fade-in">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: "5px 10px", fontSize: 11 }}>
          <option value="pending">Pendentes</option>
          <option value="done">Concluídas</option>
          <option value="">Todas</option>
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ padding: "4px 6px", fontSize: 11, width: 120 }} title="De" />
        <span style={{ fontSize: 10, color: "var(--tx3)" }}>a</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ padding: "4px 6px", fontSize: 11, width: 120 }} title="Até" />
        <div className="search-box">
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35" /></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar tarefa…" style={{ width: 140 }} />
        </div>
        <span style={{ fontSize: 10, color: "var(--tx3)" }}>{filtered.length} tarefas</span>
        <button className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }} onClick={() => onCreate()}>
          <Plus size={10} /> Criar Tarefa
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Tarefas</th>
              <th>Status</th>
              <th>Data e Hora</th>
              <th>Negociação</th>
              <th>Valor Total</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0
              ? <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--tx3)", padding: 30 }}>Nenhuma tarefa encontrada.</td></tr>
              : filtered.map(t => {
                const neg = negotiations.find(n => n.id === t.negotiationId);
                const isOverdue = !t.done && t.date && t.date.slice(0, 10) < now;

                return (
                  <tr key={t.id}>
                    <td>
                      <input type="checkbox" checked={t.done} onChange={() => onToggle(t.id)} />
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Clock size={13} color="var(--tx3)" />
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 12 }}>{t.title || "Tarefa"}</div>
                          {t.description && <div style={{ fontSize: 10, color: "var(--tx3)" }}>{t.description}</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      {isOverdue
                        ? <span className="status-tag" style={{ background: "#EF444418", color: "#EF4444" }}>ATRASADA</span>
                        : t.done
                          ? <span className="status-tag" style={{ background: "#10B98118", color: "#10B981" }}>CONCLUÍDA</span>
                          : <span className="status-tag" style={{ background: "#3B82F618", color: "#3B82F6" }}>PENDENTE</span>
                      }
                    </td>
                    <td style={{ fontSize: 11, color: "var(--tx2)" }}>{formatDate(t.date?.slice(0, 10))}{t.date?.slice(10) ? ` às ${t.date.slice(11, 16)}` : ""}</td>
                    <td>
                      {neg
                        ? <span style={{ color: "var(--ac)", cursor: "pointer" }} onClick={() => onSelectNeg(neg)}>{neg.name || neg.product}</span>
                        : "—"
                      }
                    </td>
                    <td style={{ color: "var(--ac)" }}>{neg ? formatCurrency(neg.value) : "—"}</td>
                  </tr>
                );
              })
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}
