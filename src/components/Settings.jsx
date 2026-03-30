import { useState } from "react";
import { Modal, Field } from "./UI";
import { PRODUCTS } from "../utils/constants";
import { Check } from "lucide-react";

const _PRODUCTS = PRODUCTS || ["Consórcio", "Plano de Saúde", "Seguro de Vida"];

export const DEFAULT_SETTINGS = {
  cycleType: "monthly",       // monthly | weekly | quarterly | custom
  cycleStart: "",
  cycleEnd: "",
  goalValue: "",              // meta de receita total do ciclo
  productGoals: {},           // { "Consórcio": 5, "Plano de Saúde": 3 } — nº de vendas por produto
};

export function SettingsModal({ settings, onSave, onClose }) {
  const [f, setF] = useState({ ...DEFAULT_SETTINGS, ...settings });
  const s = (k, v) => setF(p => ({ ...p, [k]: v }));
  const setProdGoal = (prod, val) => setF(p => ({ ...p, productGoals: { ...(p.productGoals || {}), [prod]: val } }));

  return (
    <Modal title="Configurações de Metas" onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => onSave(f)}><Check size={12} /> Salvar</button>
        </>
      }>

      <div className="section-title" style={{ marginTop: 0 }}>Ciclo de Acompanhamento</div>

      <Field label="Tipo de Ciclo">
        <select value={f.cycleType} onChange={e => s("cycleType", e.target.value)}>
          <option value="monthly">Mensal</option>
          <option value="weekly">Semanal</option>
          <option value="quarterly">Trimestral</option>
          <option value="custom">Período personalizado</option>
        </select>
      </Field>

      {f.cycleType === "custom" && (
        <div className="row2">
          <Field label="Data Início"><input type="date" value={f.cycleStart || ""} onChange={e => s("cycleStart", e.target.value)} /></Field>
          <Field label="Data Fim"><input type="date" value={f.cycleEnd || ""} onChange={e => s("cycleEnd", e.target.value)} /></Field>
        </div>
      )}

      <div className="section-title">Meta do Ciclo</div>

      <Field label="Meta de Receita Total (R$)">
        <input type="number" value={f.goalValue || ""} onChange={e => s("goalValue", e.target.value)} placeholder="Ex: 50000" />
      </Field>

      <div className="section-title">Meta por Produto (nº de vendas)</div>

      {_PRODUCTS.map(prod => (
        <div key={prod} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: "var(--tx2)", flex: 1 }}>{prod}</span>
          <input
            type="number" min="0"
            value={(f.productGoals || {})[prod] || ""}
            onChange={e => setProdGoal(prod, e.target.value)}
            placeholder="0"
            style={{ width: 80, padding: "5px 8px", textAlign: "center" }}
          />
          <span style={{ fontSize: 10, color: "var(--tx3)" }}>vendas</span>
        </div>
      ))}

      <div style={{ marginTop: 14, padding: "10px 12px", background: "var(--s2)", borderRadius: 8, fontSize: 11, color: "var(--tx3)", lineHeight: 1.6 }}>
        <strong style={{ color: "var(--tx2)" }}>Como funciona:</strong> O ciclo define o período de acompanhamento das metas. A meta de receita é o total de valor em negociações ganhas. A meta por produto é o número de vendas fechadas por tipo de produto dentro do ciclo.
      </div>
    </Modal>
  );
}
