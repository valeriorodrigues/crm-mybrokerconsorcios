import { useState } from "react";
import { Modal, Field } from "./UI";
import { CHANNELS } from "../utils/constants";
import { uid, today } from "../utils/helpers";
import { Check } from "lucide-react";

export function ActivityForm({ negotiations, onSave, onClose, defaultNegId }) {
  const [f, setF] = useState({
    negotiationId: defaultNegId || "",
    channel: CHANNELS[0],
    description: "",
    date: today(),
  });
  const s = (k, v) => setF(p => ({ ...p, [k]: v }));

  return (
    <Modal title="Registrar Atividade" onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => {
          if (f.negotiationId && f.description.trim()) onSave({ ...f, id: uid() });
        }}><Check size={12} /> Salvar</button>
      </>}>
      <Field label="Negociação *">
        <select value={f.negotiationId} onChange={e => s("negotiationId", e.target.value)}>
          <option value="">Selecionar…</option>
          {negotiations.map(n => <option key={n.id} value={n.id}>{n.name || n.product}</option>)}
        </select>
      </Field>
      <div className="row2">
        <Field label="Canal">
          <select value={f.channel} onChange={e => s("channel", e.target.value)}>
            {CHANNELS.map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Data">
          <input type="date" value={f.date} onChange={e => s("date", e.target.value)} />
        </Field>
      </div>
      <Field label="Descrição *">
        <textarea value={f.description} onChange={e => s("description", e.target.value)} placeholder="O que foi feito neste contato…" />
      </Field>
    </Modal>
  );
}
