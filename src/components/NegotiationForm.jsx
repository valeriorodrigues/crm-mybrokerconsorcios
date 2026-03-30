import { useState } from "react";
import { Modal, Field, AutoInput, Stars } from "./UI";
import {
  PRODUCTS, STAGES, HEALTH_MODALITIES, HEALTH_BRANCHES, HEALTH_ACCOMMODATIONS, HEALTH_COVERAGES,
  AGE_BANDS, CONSORCIO_BRANCHES, BUYER_PROFILES, BID_TYPES, RELATIONSHIPS, LEAD_ORIGIN_GROUPS
} from "../utils/constants";
import { uid, emptyNegotiation, emptyBeneficiary, calcAge } from "../utils/helpers";
import { Check, Plus, X, Star } from "lucide-react";

// Defensive fallbacks — garante funcionamento mesmo se constants.js ainda não foi atualizado
const _PRODUCTS             = PRODUCTS             || [];
const _STAGES               = STAGES               || [];
const _HEALTH_MODALITIES    = HEALTH_MODALITIES    || [];
const _HEALTH_BRANCHES      = HEALTH_BRANCHES      || [];
const _HEALTH_ACCOMMODATIONS= HEALTH_ACCOMMODATIONS|| [];
const _HEALTH_COVERAGES     = HEALTH_COVERAGES     || [];
const _AGE_BANDS            = AGE_BANDS            || [];
const _CONSORCIO_BRANCHES   = CONSORCIO_BRANCHES   || [];
const _BUYER_PROFILES       = BUYER_PROFILES       || { default: [] };
const _BID_TYPES            = BID_TYPES            || [];
const _RELATIONSHIPS        = RELATIONSHIPS        || [];
const _LEAD_ORIGIN_GROUPS   = LEAD_ORIGIN_GROUPS   || [];

export function NegotiationForm({ negotiation, isNew = false, contacts, companies, savedOptions, onSave, onClose }) {
  const base = isNew
    ? { ...emptyNegotiation(), ...(negotiation || {}) }  // merge defaults (ex: contactId pré-selecionado)
    : (negotiation ? JSON.parse(JSON.stringify(negotiation)) : emptyNegotiation());
  const [f, setF] = useState(base);
  const [step, setStep] = useState(0);

  const s  = (k, v) => setF(p => ({ ...p, [k]: v }));
  const sH = (k, v) => setF(p => ({ ...p, health:    { ...(p.health    || {}), [k]: v } }));
  const sC = (k, v) => setF(p => ({ ...p, consorcio: { ...(p.consorcio || {}), [k]: v } }));
  const sS = (k, v) => setF(p => ({ ...p, seguro:    { ...(p.seguro    || {}), [k]: v } }));

  const isH   = f.product === "Plano de Saúde";
  const isC   = f.product === "Consórcio";
  const isSeg = f.product === "Seguro de Vida";
  const h   = f.health    || {};
  const co  = f.consorcio || {};
  const seg = f.seguro    || {};

  // Garantia: beneficiaries nunca é undefined
  const beneficiaries = Array.isArray(h.beneficiaries) ? h.beneficiaries : [];

  const isCorp   = h.modality === "PME" || h.modality === "Empresarial" || h.modality === "CAEPF";
  const isAdesao = h.branch === "Adesão" || h.branch === "PME Administrado";
  const isImovel = co.branch === "Imóvel";
  const isVeiculo= ["Veículo Leve", "Veículo Pesado", "Motocicleta"].includes(co.branch);
  const isServico= co.branch === "Serviços";
  const profiles = _BUYER_PROFILES[co.branch] || _BUYER_PROFILES["default"] || [];

  // Beneficiaries CRUD — usa variável local segura
  const addBen = () => sH("beneficiaries", [...beneficiaries, emptyBeneficiary()]);
  const updBen = (i, k, v) => {
    const b = [...beneficiaries];
    b[i] = { ...b[i], [k]: v };
    if (k === "birthDate" && v) b[i].age = calcAge(v)?.toString() || "";
    sH("beneficiaries", b);
  };
  const rmBen = (i) => sH("beneficiaries", beneficiaries.filter((_, j) => j !== i));

  const stepLabels = ["Negociação", "Produto", "Detalhes"];

  return (
    <Modal title={isNew ? "Nova Negociação" : "Editar Negociação"} onClose={onClose} wide
      footer={<>
        {step > 0 && <button className="btn" onClick={() => setStep(step - 1)}>← Voltar</button>}
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={onClose}>Cancelar</button>
        {step < 2
          ? <button className="btn btn-primary" onClick={() => setStep(step + 1)}>Próximo →</button>
          : <button className="btn btn-primary" onClick={() => {
            if (f.name.trim() || f.contactId) onSave({ ...f, id: f.id || uid() });
          }}><Check size={12} /> Salvar</button>
        }
      </>}>

      {/* Steps indicator */}
      <div className="steps">
        {stepLabels.map((l, i) => (
          <div key={i} className={`step ${step === i ? "active" : ""}`} onClick={() => setStep(i)}>
            {i + 1}. {l}
          </div>
        ))}
      </div>

      {/* ─── STEP 0: NEGOTIATION DATA ─── */}
      {step === 0 && <>
        <div className="row2">
          <Field label="Contato">
            <select value={f.contactId || ""} onChange={e => s("contactId", e.target.value)}>
              <option value="">Selecionar contato…</option>
              {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Empresa">
            <select value={f.companyId || ""} onChange={e => s("companyId", e.target.value)}>
              <option value="">Nenhuma</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        </div>
        <div className="row2">
          <Field label="Nome da Negociação *">
            <input value={f.name} onChange={e => s("name", e.target.value)} placeholder="Ex: Diego César – Advogado – Adesão" autoFocus />
          </Field>
          <Field label="Produto">
            <select value={f.product} onChange={e => s("product", e.target.value)}>
              {PRODUCTS.map(p => <option key={p}>{p}</option>)}
            </select>
          </Field>
        </div>
        <div className="row2">
          <Field label="Etapa">
            <select value={f.stage} onChange={e => s("stage", e.target.value)}>
              {STAGES.map(st => <option key={st}>{st}</option>)}
            </select>
          </Field>
          <Field label="Valor Total (R$)">
            <input type="number" value={f.value} onChange={e => s("value", e.target.value)} placeholder="0" />
          </Field>
        </div>
        <div className="row2">
          <Field label="Qualificação">
            <Stars value={f.stars || 0} onChange={v => s("stars", v)} size={18} />
          </Field>
          <Field label="Previsão Fechamento">
            <input type="date" value={f.closingDate || ""} onChange={e => s("closingDate", e.target.value)} />
          </Field>
        </div>
        <div className="section-title">Origem do Lead</div>
        <div className="row2">
          <Field label="Fonte de Origem">
            <select value={f.sourceOrigin || ""} onChange={e => s("sourceOrigin", e.target.value)}
              style={{ width: "100%", padding: "5px 8px", fontSize: 12, background: "var(--s2)", border: "1px solid var(--brd)", borderRadius: 6, color: "var(--tx1)" }}>
              <option value="">— Selecionar —</option>
              {(LEAD_ORIGIN_GROUPS || []).map(g => (
                <optgroup key={g.group} label={g.group}>
                  {g.options.map(o => <option key={o} value={o}>{o}</option>)}
                </optgroup>
              ))}
              <option value="__custom__">✏️ Outra (digitar)…</option>
            </select>
            {f.sourceOrigin === "__custom__" && (
              <input value={f.sourceReferral || ""} onChange={e => s("sourceReferral", e.target.value)}
                placeholder="Nome da fonte" style={{ marginTop: 4, width: "100%", padding: "5px 8px", fontSize: 12, background: "var(--s2)", border: "1px solid var(--brd)", borderRadius: 6, color: "var(--tx1)" }} />
            )}
          </Field>
          <Field label="Indicado por (nome)">
            <AutoInput value={f.sourceReferral && f.sourceOrigin !== "__custom__" ? f.sourceReferral : ""} onChange={v => s("sourceReferral", v)} suggestions={savedOptions.referrals || []} placeholder="Nome do indicador" />
          </Field>
        </div>
        <Field label="Observações"><textarea value={f.notes} onChange={e => s("notes", e.target.value)} /></Field>
      </>}

      {/* ─── STEP 1: PRODUCT-SPECIFIC ─── */}
      {step === 1 && <>
        {isH && <>
          <div className="context-hint">Os campos se adaptam conforme a modalidade e ramo selecionados.</div>
          <div className="row2">
            <Field label="Modalidade">
              <select value={h.modality} onChange={e => sH("modality", e.target.value)}>
                <option value="">Selecionar…</option>
                {_HEALTH_MODALITIES.map(m => <option key={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Ramo do Plano">
              <select value={h.branch} onChange={e => sH("branch", e.target.value)}>
                <option value="">Selecionar…</option>
                {_HEALTH_BRANCHES.map(b => <option key={b}>{b}</option>)}
              </select>
            </Field>
          </div>

          {isCorp && (
            <div className="row3">
              <Field label="Qtd Funcionários"><input type="number" value={h.employeeCount || ""} onChange={e => sH("employeeCount", e.target.value)} /></Field>
              <Field label="Qtd Dependentes"><input type="number" value={h.dependentCount || ""} onChange={e => sH("dependentCount", e.target.value)} /></Field>
              <Field label="Informar Idade por">
                <select value={h.ageMethod || "band"} onChange={e => sH("ageMethod", e.target.value)}>
                  <option value="age">Idade</option><option value="birth">Data Nasc.</option><option value="band">Faixa Etária</option>
                </select>
              </Field>
            </div>
          )}

          {h.modality && !isCorp && <>
            <div className="section-title">Beneficiários</div>
            <Field label="Informar Idade por">
              <select value={h.ageMethod || "age"} onChange={e => sH("ageMethod", e.target.value)} style={{ width: 160 }}>
                <option value="age">Idade</option><option value="birth">Data Nasc.</option><option value="band">Faixa Etária</option>
              </select>
            </Field>
            {beneficiaries.length > 0 && (
              <div style={{ overflowX: "auto" }}>
                <table className="ben-table">
                  <thead><tr><th>Nome</th><th>Relação</th>
                    {h.ageMethod === "birth" && <th>Data Nasc.</th>}
                    {h.ageMethod === "age" && <th>Idade</th>}
                    {h.ageMethod === "band" && <th>Faixa</th>}
                    <th></th>
                  </tr></thead>
                  <tbody>
                    {beneficiaries.map((b, i) => (
                      <tr key={b.id}>
                        <td><input value={b.name} onChange={e => updBen(i, "name", e.target.value)} placeholder="Nome" /></td>
                        <td>
                          <select value={b.relationship} onChange={e => updBen(i, "relationship", e.target.value)}>
                            <option>Titular</option>
                            {_RELATIONSHIPS.map(r => <option key={r}>{r}</option>)}
                          </select>
                        </td>
                        {h.ageMethod === "birth" && <td><input type="date" value={b.birthDate || ""} onChange={e => updBen(i, "birthDate", e.target.value)} /></td>}
                        {h.ageMethod === "age" && <td><input type="number" value={b.age || ""} onChange={e => updBen(i, "age", e.target.value)} /></td>}
                        {h.ageMethod === "band" && <td><select value={b.ageBand || ""} onChange={e => updBen(i, "ageBand", e.target.value)}><option value="">—</option>{_AGE_BANDS.map(a => <option key={a}>{a}</option>)}</select></td>}
                        <td><button className="btn btn-sm btn-red btn-ghost" onClick={() => rmBen(i)}><X size={10} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <button className="btn btn-sm" onClick={addBen}><Plus size={10} /> Beneficiário</button>
          </>}

          {h.modality && <>
            <div className="section-title">Plano Atual</div>
            <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, cursor: "pointer" }}>
              <input type="checkbox" checked={h.currentPlan || false} onChange={e => sH("currentPlan", e.target.checked)} />
              Possui plano de saúde atual
            </label>
            {h.currentPlan && (
              <div className="row3">
                <Field label="Plano Atual"><input value={h.currentPlanName || ""} onChange={e => sH("currentPlanName", e.target.value)} /></Field>
                <Field label="Modalidade Atual"><input value={h.currentPlanModality || ""} onChange={e => sH("currentPlanModality", e.target.value)} /></Field>
                <Field label="Tempo Permanência"><input value={h.currentPlanTime || ""} onChange={e => sH("currentPlanTime", e.target.value)} placeholder="Ex: 2 anos" /></Field>
              </div>
            )}
          </>}
        </>}

        {isC && <>
          <div className="context-hint">Campos mudam conforme o ramo selecionado.</div>
          <Field label="Ramo do Consórcio">
            <select value={co.branch} onChange={e => sC("branch", e.target.value)}>
              <option value="">Selecionar ramo…</option>
              {_CONSORCIO_BRANCHES.map(b => <option key={b}>{b}</option>)}
            </select>
          </Field>

          {co.branch && <>
            <div className="section-title">Levantamento de Perfil</div>
            <div className="row2">
              <Field label={isImovel ? "Valor do Imóvel" : isVeiculo ? "Valor do Veículo" : "Valor do Crédito"}>
                <input type="number" value={co.creditValue || ""} onChange={e => sC("creditValue", e.target.value)} placeholder="R$" />
              </Field>
              <Field label="Prazo Esperado (meses)">
                <input type="number" value={co.expectedTerm || ""} onChange={e => sC("expectedTerm", e.target.value)} />
              </Field>
            </div>
            <div className="row2">
              <Field label="Renda Média"><input type="number" value={co.income || ""} onChange={e => sC("income", e.target.value)} /></Field>
              <Field label="Parcela Mensal Desejada"><input type="number" value={co.monthlyPayment || ""} onChange={e => sC("monthlyPayment", e.target.value)} /></Field>
            </div>
            {!isServico && <Field label="Valor Disponível para Lance"><input type="number" value={co.bidValue || ""} onChange={e => sC("bidValue", e.target.value)} /></Field>}
            <Field label="Perfil de Compra">
              <select value={co.buyerProfile || ""} onChange={e => sC("buyerProfile", e.target.value)}>
                <option value="">Selecionar…</option>
                {profiles.map(p => <option key={p}>{p}</option>)}
              </select>
            </Field>

            {(isImovel || isVeiculo) && <>
              <div className="section-title">Troca / Permuta</div>
              <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, cursor: "pointer" }}>
                <input type="checkbox" checked={co.tradeIn || false} onChange={e => sC("tradeIn", e.target.checked)} />
                Deseja utilizar bem atual para troca
              </label>
              {co.tradeIn && (
                <div className="row2">
                  <Field label={isImovel ? "Valor Avaliação de Mercado" : "Valor Tabela FIPE"}>
                    <input type="number" value={co.tradeInValue || ""} onChange={e => sC("tradeInValue", e.target.value)} />
                  </Field>
                  <Field label="Tipo do Bem"><input value={co.tradeInType || ""} onChange={e => sC("tradeInType", e.target.value)} /></Field>
                </div>
              )}
            </>}
          </>}
        </>}

        {isSeg && <>
          <Field label="Tipo de Seguro">
            <select value={seg.type || ""} onChange={e => sS("type", e.target.value)}>
              <option value="">Selecionar…</option>
              <option>Vida Individual</option><option>Vida em Grupo</option><option>Prestamista</option><option>Acidentes Pessoais</option>
            </select>
          </Field>
          {seg.type && (
            <div className="row2">
              <Field label="Valor de Cobertura"><input type="number" value={seg.coverage || ""} onChange={e => sS("coverage", e.target.value)} /></Field>
              <Field label="Observações"><textarea value={seg.notes || ""} onChange={e => sS("notes", e.target.value)} /></Field>
            </div>
          )}
        </>}
      </>}

      {/* ─── STEP 2: NEGOTIATION DETAILS ─── */}
      {step === 2 && <>
        {isH && h.modality && <>
          <div className="context-hint">Negociação — {h.modality} / {h.branch || "Saúde"}</div>
          <div className="row2">
            <Field label="Operadora"><AutoInput value={h.operator || ""} onChange={v => sH("operator", v)} suggestions={savedOptions.operators || []} /></Field>
            {isAdesao
              ? <Field label="Administradora"><AutoInput value={h.administrator || ""} onChange={v => sH("administrator", v)} suggestions={savedOptions.administrators || []} /></Field>
              : <Field label="Acomodação"><select value={h.accommodation || ""} onChange={e => sH("accommodation", e.target.value)}><option value="">—</option>{_HEALTH_ACCOMMODATIONS.map(a => <option key={a}>{a}</option>)}</select></Field>
            }
          </div>
          {isAdesao && <Field label="Entidade de Classe"><AutoInput value={h.classEntity || ""} onChange={v => sH("classEntity", v)} suggestions={savedOptions.classEntities || []} /></Field>}
          {isAdesao && <Field label="Acomodação"><select value={h.accommodation || ""} onChange={e => sH("accommodation", e.target.value)}><option value="">—</option>{_HEALTH_ACCOMMODATIONS.map(a => <option key={a}>{a}</option>)}</select></Field>}
          <Field label="Abrangência"><select value={h.coverageScope || ""} onChange={e => sH("coverageScope", e.target.value)}><option value="">—</option>{_HEALTH_COVERAGES.map(c => <option key={c}>{c}</option>)}</select></Field>
        </>}

        {isC && co.branch && <>
          <div className="context-hint">Negociação — {co.branch}</div>
          <div className="row2">
            <Field label="Administradora"><AutoInput value={co.administrator || ""} onChange={v => sC("administrator", v)} suggestions={savedOptions.adminConsorcio || []} /></Field>
            <Field label="Grupo(s)"><input value={co.groups || ""} onChange={e => sC("groups", e.target.value)} /></Field>
          </div>
          <div className="row2">
            <Field label="Cota(s)"><input value={co.quotas || ""} onChange={e => sC("quotas", e.target.value)} /></Field>
            <Field label="Valor do Bem (Cota)"><input type="number" value={co.assetValue || ""} onChange={e => sC("assetValue", e.target.value)} /></Field>
          </div>
          <div className="row2">
            <Field label="Tipo de Lance"><select value={co.bidType || ""} onChange={e => sC("bidType", e.target.value)}><option value="">—</option>{_BID_TYPES.map(b => <option key={b}>{b}</option>)}</select></Field>
            <Field label="% de Lance"><input value={co.bidPercentage || ""} onChange={e => sC("bidPercentage", e.target.value)} /></Field>
          </div>
        </>}

        {!isH && !isC && !isSeg && <p style={{ color: "var(--tx3)", fontSize: 12 }}>Selecione um produto no passo anterior.</p>}
      </>}
    </Modal>
  );
}
