import { useState } from "react";
import { ChevronUp, ChevronDown, X, Star } from "lucide-react";

// ─── Modal ───
export function Modal({ title, onClose, children, footer, wide }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal fade-in`} style={wide ? { width: 780 } : {}} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// ─── Form Field ───
export function Field({ label, children }) {
  return <div className="field"><label>{label}</label>{children}</div>;
}

// ─── Autocomplete Input ───
export function AutoInput({ value, onChange, suggestions = [], placeholder = "" }) {
  const [open, setOpen] = useState(false);
  const filtered = suggestions.filter(s => s && s.toLowerCase().includes((value || "").toLowerCase()) && s !== value);

  return (
    <div style={{ position: "relative" }}>
      <input
        value={value || ""}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0,
          background: "var(--s2)", border: "1px solid var(--bd)", borderRadius: 5,
          zIndex: 20, maxHeight: 100, overflowY: "auto"
        }}>
          {filtered.slice(0, 5).map(s => (
            <div key={s}
              style={{ padding: "5px 9px", fontSize: 11, cursor: "pointer", color: "var(--tx2)" }}
              onMouseDown={() => { onChange(s); setOpen(false); }}>
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Collapsible Panel ───
export function Panel({ title, defaultOpen = true, children, actions }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="panel">
      <div className="panel-header" onClick={() => setOpen(!open)}>
        <h4>{title}</h4>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {actions}
          {open ? <ChevronUp size={14} color="var(--tx3)" /> : <ChevronDown size={14} color="var(--tx3)" />}
        </div>
      </div>
      {open && <div className="panel-body">{children}</div>}
    </div>
  );
}

// ─── Star Rating ───
export function Stars({ value = 0, onChange, size = 14 }) {
  return (
    <div className="stars">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={size}
          fill={i <= value ? "#F59E0B" : "none"}
          stroke="#F59E0B"
          strokeWidth={2}
          onClick={(e) => { e.stopPropagation(); if (onChange) onChange(i === value ? 0 : i); }}
          style={{ cursor: onChange ? "pointer" : "default" }}
        />
      ))}
    </div>
  );
}

// ─── Search Box ───
export function SearchBox({ value, onChange, placeholder = "Buscar…" }) {
  return (
    <div className="search-box">
      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35" />
      </svg>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ width: 150 }} />
    </div>
  );
}

// ─── Status Tag ───
export function StatusTag({ status }) {
  const colors = { open: "#3B82F6", won: "#10B981", lost: "#EF4444" };
  const labels = { open: "Em andamento", won: "Vendida", lost: "Perdida" };
  return (
    <span className="status-tag" style={{
      background: colors[status] + "18",
      color: colors[status]
    }}>
      {labels[status] || status}
    </span>
  );
}

// ─── Empty State ───
export function Empty({ icon, title, subtitle }) {
  return (
    <div className="empty">
      {icon}
      <h3>{title}</h3>
      {subtitle && <p>{subtitle}</p>}
    </div>
  );
}
