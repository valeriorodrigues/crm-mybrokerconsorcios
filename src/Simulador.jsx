import { useState, useEffect, useMemo, useRef } from 'react';
import { storage } from './utils/storage.js';
import { db } from './utils/storage.js';

// ─── HELPERS ────────────────────────────────────────────────────────────────────
const R  = v => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }) ?? '—';
const Pt = (v, d = 1) => `${Number(v).toFixed(d).replace('.', ',')}%`;
const PMT = (pv, apr, n) => {
  if (!pv || !n) return 0;
  const i = (1 + apr / 100) ** (1 / 12) - 1;
  if (i === 0) return pv / n;
  return pv * (i * (1 + i) ** n) / ((1 + i) ** n - 1);
};
const uid = () => 'MB-' + Date.now().toString(36).toUpperCase().slice(-6);
const fmt = ts => new Date(ts).toLocaleDateString('pt-BR');

// ─── CONSTANTS ──────────────────────────────────────────────────────────────────
const ADMINISTRADORAS = [
  'Embracon', 'BB Consórcios', 'Itaú Consórcios', 'Recon', 'Santander Consórcios',
  'Magalu Consórcios', 'CNP Consórcios', 'Bradesco Consórcios'
];

const PRODUTOS = {
  imovel:         { label: 'Imóvel',               icon: '🏡', subtipos: ['Aquisição', 'Construção', 'Aquisição e Construção', 'Reforma', 'Interveniente Quitante', 'Alavancagem Patrimonial'] },
  veiculo_leve:   { label: 'Veículo Leve',         icon: '🚗', subtipos: ['Automóvel', 'SUV', 'Pickup Leve', 'Van'] },
  veiculo_pesado: { label: 'Veículo Pesado',       icon: '🚛', subtipos: ['Caminhão', 'Ônibus', 'Implemento Rodoviário', 'Toco/Truck'] },
  maquinas:       { label: 'Máquinas Agrícolas',   icon: '🚜', subtipos: ['Trator', 'Colheitadeira', 'Implemento Agrícola', 'Irrigação', 'Pulverizador'] },
  maquinas_ind:   { label: 'Máquinas',             icon: '🏗️', subtipos: ['Industrial', 'Construção Civil', 'Mineração', 'Energia', 'Portuária', 'Outros'] },
  motocicleta:    { label: 'Motocicleta',          icon: '🏍️', subtipos: ['Urbana', 'Trail/Adventure', 'Esportiva', 'Elétrica'] },
  servicos:       { label: 'Serviços',             icon: '⚙️', subtipos: ['Obras e Reformas', 'Tecnologia', 'Educação', 'Saúde', 'Energia Solar', 'Outros'] },
};

const TIPOS_PROP = [
  { id: 'simplificada', label: 'Simplificada', desc: 'Dados essenciais · 1 página' },
  { id: 'padrao',       label: 'Padrão',       desc: 'Equilibrada · 1 página' },
  { id: 'analitica',    label: 'Analítica',    desc: 'Completa com todos os indicadores' },
];

// ─── TIR via Newton-Raphson (find monthly rate i where PV = PMT * [(1-(1+i)^-n) / i]) ───
function calcTIR(pv, pmt, n) {
  if (!pv || !pmt || !n || pv <= 0 || pmt <= 0) return 0;
  let i = 0.01; // initial guess 1% monthly
  for (let iter = 0; iter < 300; iter++) {
    const pow = Math.pow(1 + i, -n);
    const annuity = (1 - pow) / i;
    const f = pmt * annuity - pv;
    const df = pmt * (n * Math.pow(1 + i, -n - 1) / i - annuity / i);
    if (Math.abs(df) < 1e-15) break;
    const newI = i - f / df;
    if (Math.abs(newI - i) < 1e-12) break;
    i = Math.max(newI, 1e-10);
  }
  return i;
}

// ─── CALCULATIONS ────────────────────────────────────────────────────────────────
function calcSim(g) {
  const { credito = 200000, taxa = 18, prazo = 84, lanceProprio = 0, lanceEmbutido = 0, fundoReserva = 0, reducao = false, reducaoPct = 0 } = g;
  const lancePct = (lanceProprio || 0) + (lanceEmbutido || 0);

  // CONSÓRCIO: taxa e fundo são % TOTAIS sobre o prazo (linear, não juros compostos)
  const ps = credito * (1 + (taxa || 0) / 100 + (fundoReserva || 0) / 100) / prazo;
  const fr = credito * (fundoReserva || 0) / 100;

  const lv      = credito * lancePct / 100;
  const lvProprio  = credito * (lanceProprio || 0) / 100;
  const lvEmbutido = credito * (lanceEmbutido || 0) / 100;
  const creditoLiquido = credito - lv;
  const saldoTotal = ps * prazo;

  // ── Parcela pós-lance — duas abordagens ────────────────────────────────────────
  // 1. CET Real (conservadora): lance abate saldo devedor → parcela = novoSaldo / prazo
  //    O custo total nominal não muda; as taxas foram calculadas sobre o bem inteiro.
  const plCetReal = lv > 0 ? Math.max((saldoTotal - lv) / prazo, 0) : ps;

  // 2. Taxa Administrativa (proporcional): parcela cai proporcionalmente ao lance
  //    Reflete a prática de algumas administradoras (ex: BB Consórcios).
  const plTaxaAdm = lv > 0 ? ps * (1 - lancePct / 100) : ps;

  // parcela "principal" usada para exibição e custo total
  const pl = plCetReal;
  // Parcela reduzida: o percentual redutor incide sobre o crédito líquido;
  // as taxas (adm + fundo de reserva) permanecem integrais sobre o crédito original.
  // plReduzida = (crédito × (1 − reducaoPct%) + taxasAbsolutas) / prazo
  const taxasAbsolutas = credito * ((taxa || 0) / 100 + (fundoReserva || 0) / 100);
  const creditoReduzido = credito * (1 - (reducaoPct || 0) / 100);
  const plReduzida = reducao && reducaoPct > 0 ? (creditoReduzido + taxasAbsolutas) / prazo : pl;
  const tl = lv + pl * prazo;
  const anos = prazo / 12;

  // ── TIR — CET Real ─────────────────────────────────────────────────────────────
  // PV = crédito líquido (o que a administradora realmente "empresta" ao cliente)
  // PMT = plCetReal (parcela que o cliente pagará após o lance)
  let cetRealMensal = 0, cetRealAnual = 0;
  if (creditoLiquido > 0 && plCetReal > 0 && prazo > 0) {
    cetRealMensal = calcTIR(creditoLiquido, plCetReal, prazo);
    cetRealAnual  = Math.pow(1 + cetRealMensal, 12) - 1;
  }

  // ── TIR — Taxa Administrativa (proporcional) ───────────────────────────────────
  // Mesma base (crédito líquido), parcela proporcional.
  let taxaAdmMensal = 0, taxaAdmAnual = 0;
  if (creditoLiquido > 0 && plTaxaAdm > 0 && prazo > 0) {
    taxaAdmMensal = calcTIR(creditoLiquido, plTaxaAdm, prazo);
    taxaAdmAnual  = Math.pow(1 + taxaAdmMensal, 12) - 1;
  }

  // ── Comparativo financiamento bancário ─────────────────────────────────────────
  const pmtCEF = PMT(credito, 12.5, prazo);
  const pmtBco = PMT(credito, 17.5, prazo);
  const ttCEF  = pmtCEF * prazo;
  const ttBco  = pmtBco * prazo;
  const ecCEF  = ttCEF - tl;
  const ecBco  = ttBco - tl;

  // ── Valorização INCC ───────────────────────────────────────────────────────────
  const fi = 1.058 ** anos;
  const cf = credito * fi; const inccGanho = cf - credito; const inccPct = (fi - 1) * 100;

  // ── Ganho venda rápida ─────────────────────────────────────────────────────────
  const vv = credito * 1.12; const ct3 = lv + pl * 3; const gvenda = vv - ct3;
  const roi = ct3 > 0 ? (gvenda / ct3) * 100 : 0;

  return {
    ps, lv, lvProprio, lvEmbutido, fr, pl, plCetReal, plTaxaAdm, plReduzida, tl,
    cetRealMensal: cetRealMensal * 100,
    cetRealAnual:  cetRealAnual  * 100,
    taxaAdmMensal: taxaAdmMensal * 100,
    taxaAdmAnual:  taxaAdmAnual  * 100,
    creditoLiquido,
    pmtCEF, pmtBco, ttCEF, ttBco, ecCEF, ecBco,
    cf, inccGanho, inccPct, vv, gvenda, roi, anos, lancePct
  };
}

// ─── NOVO GRUPO padrão ────────────────────────────────────────────────────────────
const gid = () => Math.random().toString(36).slice(2, 8);
function newGrupo(overrides = {}) {
  return {
    _id: gid(), nome: '', prazo: 200, taxa: 18, credito: 200000,
    fundoReserva: 2, lanceProprio: 0, lanceEmbutido: 0,
    reducao: false, reducaoPct: 0,
    ...overrides
  };
}

// ─── TOTAIS DE MÚLTIPLOS GRUPOS ────────────────────────────────────────────────
function calcTotais(grupos) {
  return grupos.reduce((acc, g) => {
    const s = calcSim(g);
    return {
      credito:   acc.credito   + g.credito,
      lance:     acc.lance     + s.lv,
      parcelaSL: acc.parcelaSL + s.ps,
      parcelaAL: acc.parcelaAL + s.pl,
      custoTotal:acc.custoTotal+ s.tl,
    };
  }, { credito: 0, lance: 0, parcelaSL: 0, parcelaAL: 0, custoTotal: 0 });
}

// ─── CSS ─────────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#060A12;--card:#0F1928;--bo:rgba(201,168,76,.18);--bo2:rgba(255,255,255,.08);
  --gold:#C9A84C;--gold2:#E8C56E;--text:rgba(255,255,255,.92);--muted:rgba(255,255,255,.45);
  --dim:rgba(255,255,255,.22);--green:#34D399;--red:#F87171;--blue:#60A5FA;
}
body{background:var(--bg);font-family:'Inter',sans-serif;color:var(--text);min-height:100vh}
.nav{background:rgba(13,21,37,.97);border-bottom:1px solid var(--bo);padding:0 14px;display:flex;align-items:center;justify-content:space-between;height:50px;position:sticky;top:0;z-index:50;backdrop-filter:blur(16px)}
.brand{font-family:'Inter',sans-serif;font-size:17px;font-weight:700;color:var(--gold);letter-spacing:-.3px}
.brand-sub{font-size:8px;color:var(--muted);letter-spacing:1.5px;text-transform:uppercase;font-weight:400}
.nav-r{display:flex;gap:5px;align-items:center}
.main{max-width:620px;margin:0 auto;padding:18px 13px 60px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:5px;padding:9px 14px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;transition:all .2s;font-family:'Inter',sans-serif;border:none;white-space:nowrap}
.btn-gold{background:linear-gradient(135deg,#C9A84C,#E8C56E);color:#060A12}
.btn-gold:hover{transform:translateY(-1px);box-shadow:0 5px 16px rgba(201,168,76,.3)}
.btn-ghost{background:transparent;border:1px solid rgba(201,168,76,.3);color:var(--gold)}
.btn-ghost:hover{background:rgba(201,168,76,.08)}
.btn-dim{background:rgba(255,255,255,.06);border:1px solid var(--bo2);color:var(--muted)}
.btn-dim:hover{background:rgba(255,255,255,.1);color:var(--text)}
.btn-danger{background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.2);color:var(--red)}
.btn-sm{padding:6px 11px;font-size:11px;border-radius:7px}
.btn-full{width:100%}
.btn:disabled{opacity:.3;cursor:not-allowed!important;transform:none!important}
.field{margin-bottom:11px}
.lbl{font-size:10px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.7px;margin-bottom:4px;display:block}
.inp,.sel{width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.11);border-radius:8px;padding:9px 11px;font-size:13px;color:var(--text);font-family:'Inter',sans-serif;outline:none;transition:border .2s;-webkit-appearance:none}
.inp:focus,.sel:focus{border-color:rgba(201,168,76,.5)}
.sel option{background:#111827;color:var(--text)}
input[type=range]{width:100%;height:4px;appearance:none;background:rgba(255,255,255,.1);border-radius:2px;cursor:pointer;margin:7px 0}
input[type=range]::-webkit-slider-thumb{appearance:none;width:15px;height:15px;background:linear-gradient(135deg,var(--gold),var(--gold2));border-radius:50%}
.tog-row{display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.05)}
.tog-row:last-child{border-bottom:none;padding-bottom:0}
.tog-label{font-size:12px;font-weight:500}
.tog-desc{font-size:10px;color:var(--muted);margin-top:1px}
.tog{width:36px;height:19px;background:rgba(255,255,255,.1);border-radius:10px;cursor:pointer;position:relative;transition:background .2s;flex-shrink:0;border:none}
.tog.on{background:linear-gradient(135deg,var(--gold),var(--gold2))}
.tog::after{content:'';position:absolute;top:2px;left:2px;width:15px;height:15px;background:#fff;border-radius:50%;transition:transform .2s}
.tog.on::after{transform:translateX(17px)}
.card{background:var(--card);border:1px solid var(--bo);border-radius:10px;padding:14px}
.card-sel{border-color:var(--gold)!important;background:rgba(201,168,76,.06)!important}
.card-click{cursor:pointer;transition:all .2s}
.card-click:hover:not(.card-sel){border-color:rgba(201,168,76,.3);transform:translateY(-1px)}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px}
.g4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:7px}
.stpr{display:flex;align-items:center;justify-content:center;margin-bottom:18px}
.st-dot{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex-shrink:0}
.st-dot.done{background:linear-gradient(135deg,var(--gold),var(--gold2));color:#060A12}
.st-dot.active{background:rgba(201,168,76,.18);border:2px solid var(--gold);color:var(--gold)}
.st-dot.idle{background:rgba(255,255,255,.06);color:var(--muted)}
.st-line{width:28px;height:2px;background:rgba(255,255,255,.08);margin:0 3px}
.st-line.done{background:var(--gold)}
.sec-title{font-size:16px;font-weight:700;margin-bottom:3px;letter-spacing:-.2px}
.sec-sub{font-size:12px;color:var(--muted);margin-bottom:12px}
.li{display:flex;align-items:center;gap:10px;padding:12px;background:var(--card);border:1px solid var(--bo);border-radius:10px;margin-bottom:7px;cursor:pointer;transition:all .2s}
.li:hover{border-color:var(--gold);transform:translateY(-1px)}
.li-icon{font-size:22px;flex-shrink:0}
.li-info{flex:1;min-width:0}
.li-name{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.li-meta{font-size:10px;color:var(--muted);margin-top:2px}
.li-val{font-size:13px;font-weight:700;color:var(--gold)}
.pg-title{font-family:'Inter',sans-serif;font-size:22px;font-weight:700;letter-spacing:-.5px}
.pg-sub{font-size:12px;color:var(--muted)}
.kv{display:flex;justify-content:space-between;align-items:baseline;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04)}
.kv:last-child{border-bottom:none}
.kv-l{font-size:11px;color:var(--muted)}
.kv-r{font-size:13px;font-weight:600;text-align:right}
.cb-badge{font-size:9px;background:rgba(96,165,250,.12);color:var(--blue);padding:2px 6px;border-radius:4px;font-weight:600}
.sec-block{background:var(--card);border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:14px;margin-bottom:10px}
.sec-block-title{font-size:11px;font-weight:700;color:var(--gold);text-transform:uppercase;letter-spacing:.7px;margin-bottom:8px}
@media print{
  body{background:#fff!important;color:#111!important}
  .nav,.btn,.no-print{display:none!important}
  .main{max-width:100%;padding:10px}
  .card,.sec-block{border-color:#ddd!important;background:#fafafa!important}
  .kv-l{color:#555!important}
  .kv-r{color:#111!important}
  .sec-block-title{color:#8B6914!important}
}
`;

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────────
export default function Simulador() {
  const [view, setView] = useState('list');
  const [proposals, setProps] = useState([]);
  const [current, setCurrent] = useState(null);
  const [step, setStep] = useState(0);
  const [viewCode, setViewCode] = useState('');
  const [viewProp, setViewProp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [contacts, setContacts] = useState([]);

  function showToast(msg, err = false) {
    setToast({ msg, err });
    setTimeout(() => setToast(''), 3000);
  }

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    try {
      // Load contacts from Supabase for linking
      try {
        const cts = await db.getContacts();
        if (cts?.length) setContacts(cts);
      } catch {}
      // Load proposals from localStorage
      const list = await storage.list('prop:');
      if (list?.keys?.length) {
        const arr = await Promise.all(list.keys.map(async k => {
          try {
            const r = await storage.get(k);
            if (!r) return null;
            const p = JSON.parse(r.value);
            // backward compat: migrate single grupo → grupos array
            if (p.grupo && !p.grupos) { p.grupos = [p.grupo]; delete p.grupo; }
            return p;
          } catch { return null; }
        }));
        setProps(arr.filter(Boolean).sort((a, b) => b.createdAt - a.createdAt));
      }
    } catch {}
    setLoading(false);
  }

  async function saveProp(p) {
    try { await storage.set(`prop:${p.id}`, JSON.stringify(p)); } catch {}
    setProps(prev => [p, ...prev.filter(x => x.id !== p.id)]);
  }

  async function delProp(id) {
    try { await storage.delete(`prop:${id}`); } catch {}
    setProps(prev => prev.filter(x => x.id !== id));
  }

  function newProp() {
    setCurrent({
      id: uid(), createdAt: Date.now(),
      contactId: '',
      cliente: { nome: '', telefone: '', email: '' },
      administradora: '',
      produto: { tipo: '', subtipo: '' },
      grupos: [newGrupo()],
      opcoes: {
          comparativo: true,
          incc: true,
          cetReal: false,          // CET Real (conservador — TIR sobre crédito líquido, parcela via saldo devedor)
          cetRealPeriodo: 'anual', // 'mensal' | 'anual' | 'ambos'
          taxaAdm: false,          // Taxa Administrativa (proporcional — TIR sobre crédito líquido, parcela proporcional)
          taxaAdmPeriodo: 'anual'  // 'mensal' | 'anual' | 'ambos'
        },
      tipoProposta: 'padrao',
      citybens: null
    });
    setStep(0); setView('create');
  }

  async function handleViewCode() {
    try {
      const r = await storage.get(`prop:${viewCode.trim().toUpperCase()}`);
      if (r) setViewProp(JSON.parse(r.value));
      else showToast('Proposta não encontrada. Verifique o código.', true);
    } catch { showToast('Erro ao buscar proposta.', true); }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS + `
#simulador-root { background: #060A12; color: rgba(255,255,255,.92); font-family: 'Inter', sans-serif; font-size: 14px; min-height: 100vh; }
#simulador-root .btn { display:inline-flex;align-items:center;justify-content:center;gap:5px;padding:9px 14px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;transition:all .2s;font-family:'Inter',sans-serif;border:none;white-space:nowrap;background:rgba(255,255,255,.06);color:rgba(255,255,255,.45); }
#simulador-root .btn-gold { background:linear-gradient(135deg,#C9A84C,#E8C56E)!important;color:#060A12!important;border:none!important; }
#simulador-root .btn-dim { background:rgba(255,255,255,.06)!important;border:1px solid rgba(255,255,255,.08)!important;color:rgba(255,255,255,.45)!important; }
#simulador-root .btn-ghost { background:transparent!important;border:1px solid rgba(201,168,76,.3)!important;color:#C9A84C!important; }
#simulador-root .btn-danger { background:rgba(248,113,113,.08)!important;border:1px solid rgba(248,113,113,.2)!important;color:#F87171!important; }
#simulador-root select, #simulador-root .sel { background:rgba(255,255,255,.05)!important;border:1px solid rgba(255,255,255,.11)!important;border-radius:8px!important;padding:9px 11px!important;font-size:13px!important;color:rgba(255,255,255,.92)!important;font-family:'Inter',sans-serif; }
#simulador-root input:not([type=range]):not([type=checkbox]), #simulador-root .inp { background:rgba(255,255,255,.05)!important;border:1px solid rgba(255,255,255,.11)!important;border-radius:8px!important;padding:9px 11px!important;font-size:13px!important;color:rgba(255,255,255,.92)!important;font-family:'Inter',sans-serif; }
` }} />
      {toast && (
        <div style={{ position: 'fixed', bottom: 18, left: '50%', transform: 'translateX(-50%)', background: toast.err ? 'rgba(248,113,113,.15)' : 'rgba(52,211,153,.15)', border: `1px solid ${toast.err ? 'rgba(248,113,113,.3)' : 'rgba(52,211,153,.3)'}`, color: toast.err ? '#F87171' : '#34D399', padding: '9px 18px', borderRadius: 9, zIndex: 200, fontSize: 12, fontFamily: 'Inter,sans-serif', whiteSpace: 'nowrap' }}>{toast.msg}</div>
      )}
      <div id="simulador-root">
        <nav className="nav">
          <div><div className="brand">My Broker</div><div className="brand-sub">Simulador de Propostas</div></div>
          <div className="nav-r">
            {view !== 'list' && <button className="btn btn-dim btn-sm" onClick={() => { setView('list'); setViewProp(null); }}>← Lista</button>}
            {view === 'list' && (<>
              <button className="btn btn-dim btn-sm" onClick={() => { setView('viewer'); setViewProp(null); }}>🔍 Ver Proposta</button>
              <button className="btn btn-gold btn-sm" onClick={newProp}>+ Nova</button>
            </>)}
            {(view === 'preview' || viewProp) && <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>🖨 PDF</button>}
          </div>
        </nav>
        <div className="main">
          {view === 'list' && <ListView proposals={proposals} loading={loading} onNew={newProp} onOpen={p => { setCurrent(p); setView('preview'); }} onDelete={delProp} />}
          {view === 'create' && current && <CreateView data={current} step={step} contacts={contacts} onChange={setCurrent} onStep={setStep} onSave={async p => { await saveProp(p); setCurrent(p); setView('preview'); showToast('✓ Proposta salva! Código: ' + p.id); }} onCancel={() => setView('list')} showToast={showToast} />}
          {view === 'preview' && current && <ProposalView proposal={current} onCopy={id => { navigator.clipboard?.writeText(id); showToast('Código ' + id + ' copiado!'); }} />}
          {view === 'viewer' && <ViewerView code={viewCode} onCode={setViewCode} onSearch={handleViewCode} proposal={viewProp} onCopy={id => { navigator.clipboard?.writeText(id); showToast('Código copiado!'); }} />}
        </div>
      </div>
    </>
  );
}

// ─── LIST ────────────────────────────────────────────────────────────────────────
function ListView({ proposals, loading, onNew, onOpen, onDelete }) {
  if (loading) return <div style={{ textAlign: 'center', padding: 50, color: 'var(--muted)' }}>Carregando...</div>;
  return (
    <div>
      <div className="pg-title">Propostas</div>
      <div className="pg-sub" style={{ marginBottom: 14 }}>{proposals.length} proposta{proposals.length !== 1 ? 's' : ''}</div>
      {proposals.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
          <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 14 }}>Nenhuma proposta ainda</div>
          <button className="btn btn-gold" onClick={onNew}>+ Criar Proposta</button>
        </div>
      ) : proposals.map(p => (
        <div key={p.id} className="li" onClick={() => onOpen(p)}>
          <div className="li-icon">{PRODUTOS[p.produto.tipo]?.icon || '📄'}</div>
          <div className="li-info">
            <div className="li-name">{p.cliente.nome || 'Cliente sem nome'}</div>
            <div className="li-meta">{p.administradora || '—'} · {PRODUTOS[p.produto.tipo]?.label || '—'} · {p.grupos?.[0]?.prazo || '—'}m · {p.grupos?.length > 1 ? `${p.grupos.length} grupos · ` : ''}{p.id} · {fmt(p.createdAt)}</div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div className="li-val">{R((p.grupos || []).reduce((s, g) => s + (g.credito || 0), 0))}</div>
            <button className="btn btn-danger btn-sm" style={{ marginTop: 4, width: '100%' }}
              onClick={e => { e.stopPropagation(); if (window.confirm('Excluir esta proposta?')) onDelete(p.id); }}>Excluir</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── CREATE (5 steps: Cliente → Administradora → Produto → Grupo/Simulação → Formato) ─
function CreateView({ data, step, contacts, onChange, onStep, onSave, onCancel, showToast }) {
  const upd = (path, val) => {
    const d = JSON.parse(JSON.stringify(data));
    const keys = path.split('.');
    let o = d;
    for (let i = 0; i < keys.length - 1; i++) o = o[keys[i]];
    o[keys[keys.length - 1]] = val;
    onChange(d);
  };
  const canNext = [
    !!(data.cliente.nome),
    !!(data.administradora),
    !!(data.produto.tipo && data.produto.subtipo),
    !!(data.grupos?.[0]?.credito && data.grupos?.[0]?.prazo && data.grupos?.[0]?.taxa),
    true
  ];
  const STEPS = ['Cliente', 'Administradora', 'Produto', 'Simulação', 'Formato'];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div className="pg-title">Nova Proposta</div>
        <div className="pg-sub">Código: <strong style={{ color: 'var(--gold)' }}>{data.id}</strong></div>
      </div>
      <div className="stpr">
        {STEPS.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
            <div className={`st-dot ${i < step ? 'done' : i === step ? 'active' : 'idle'}`}>{i < step ? '✓' : i + 1}</div>
            {i < STEPS.length - 1 && <div className={`st-line ${i < step ? 'done' : ''}`} />}
          </div>
        ))}
      </div>
      {step === 0 && <StepCliente data={data} upd={upd} contacts={contacts} onChange={onChange} />}
      {step === 1 && <StepAdministradora data={data} upd={upd} />}
      {step === 2 && <StepProduto data={data} upd={upd} onChange={onChange} />}
      {step === 3 && <StepSimulacao data={data} upd={upd} onChange={onChange} />}
      {step === 4 && <StepFormato data={data} upd={upd} onChange={onChange} />}
      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 7 }}>
        <button className="btn btn-gold btn-full" disabled={!canNext[step]}
          onClick={() => { if (step < 4) onStep(step + 1); else onSave(data); }}>
          {step < 4 ? 'Continuar →' : '✓ Gerar Proposta'}
        </button>
        {step > 0 && <button className="btn btn-dim btn-full" onClick={() => onStep(step - 1)}>← Voltar</button>}
        <button className="btn btn-dim btn-full" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

// ─── STEP 0: CLIENTE (with contact selection) ────────────────────────────────────
function StepCliente({ data, upd, contacts, onChange }) {
  const [search, setSearch] = useState('');
  const filtered = contacts.filter(c => {
    if (!search) return false;
    const q = search.toLowerCase();
    return (c.name || '').toLowerCase().includes(q) || (c.phone || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q);
  }).slice(0, 6);

  const selectContact = (c) => {
    const d = JSON.parse(JSON.stringify(data));
    d.contactId = c.id;
    d.cliente.nome = c.name || '';
    d.cliente.telefone = c.phone || '';
    d.cliente.email = c.email || '';
    onChange(d);
    setSearch('');
  };

  return (
    <div>
      <div className="sec-title">Cliente</div>
      <div className="sec-sub">Dados do cliente para a proposta</div>

      {/* Contact search */}
      {contacts.length > 0 && (
        <div className="field" style={{ position: 'relative' }}>
          <label className="lbl">Vincular Contato do CRM</label>
          <input className="inp" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, telefone ou email..." />
          {filtered.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0F1928', border: '1px solid rgba(201,168,76,.18)', borderRadius: 8, zIndex: 20, maxHeight: 180, overflowY: 'auto' }}>
              {filtered.map(c => (
                <div key={c.id} style={{ padding: '8px 11px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid rgba(255,255,255,.05)' }}
                  onClick={() => selectContact(c)}>
                  <div style={{ fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>{c.phone}{c.email ? ` · ${c.email}` : ''}</div>
                </div>
              ))}
            </div>
          )}
          {data.contactId && <div style={{ fontSize: 10, color: 'var(--green)', marginTop: 4 }}>✓ Vinculado ao contato do CRM</div>}
        </div>
      )}

      <div className="g2">
        <div className="field"><label className="lbl">Nome *</label><input className="inp" value={data.cliente.nome} onChange={e => upd('cliente.nome', e.target.value)} placeholder="Nome completo" /></div>
        <div className="field"><label className="lbl">Telefone</label><input className="inp" value={data.cliente.telefone} onChange={e => upd('cliente.telefone', e.target.value)} placeholder="(00) 00000-0000" /></div>
      </div>
      <div className="field"><label className="lbl">E-mail</label><input className="inp" value={data.cliente.email} onChange={e => upd('cliente.email', e.target.value)} placeholder="email@exemplo.com" /></div>
    </div>
  );
}

// ─── STEP 1: ADMINISTRADORA ──────────────────────────────────────────────────────
function StepAdministradora({ data, upd }) {
  return (
    <div>
      <div className="sec-title">Administradora</div>
      <div className="sec-sub">Selecione a administradora do consórcio</div>
      <div className="g2" style={{ marginBottom: 12 }}>
        {ADMINISTRADORAS.map(a => (
          <div key={a} className={`card card-click${data.administradora === a ? ' card-sel' : ''}`}
            style={{ textAlign: 'center', padding: '14px 8px' }}
            onClick={() => upd('administradora', a)}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{a}</div>
          </div>
        ))}
      </div>
      <div className="field">
        <label className="lbl">Ou digite outra</label>
        <input className="inp" value={ADMINISTRADORAS.includes(data.administradora) ? '' : data.administradora} onChange={e => upd('administradora', e.target.value)} placeholder="Nome da administradora..." />
      </div>
    </div>
  );
}

// ─── STEP 2: PRODUTO ─────────────────────────────────────────────────────────────
function StepProduto({ data, upd, onChange }) {
  return (
    <div>
      <div className="sec-title">Produto</div>
      <div className="sec-sub">Selecione o ramo e finalidade do crédito</div>
      <div className="g4" style={{ marginBottom: 12 }}>
        {Object.entries(PRODUTOS).map(([k, v]) => (
          <div key={k} className={`card card-click${data.produto.tipo === k ? ' card-sel' : ''}`}
            style={{ textAlign: 'center', padding: '12px 6px' }}
            onClick={() => {
              const d = JSON.parse(JSON.stringify(data));
              d.produto.tipo = k;
              d.produto.subtipo = '';
              onChange(d);
            }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{v.icon}</div>
            <div style={{ fontSize: 10, fontWeight: 600, lineHeight: 1.3 }}>{v.label}</div>
          </div>
        ))}
      </div>
      {data.produto.tipo && (
        <div className="field">
          <label className="lbl">Finalidade</label>
          <select className="sel" value={data.produto.subtipo} onChange={e => upd('produto.subtipo', e.target.value)}>
            <option value="">Selecione...</option>
            {PRODUTOS[data.produto.tipo].subtipos.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}

// ─── STEP 3: SIMULAÇÃO (múltiplos grupos / plano estruturado) ────────────────────
function StepSimulacao({ data, upd, onChange }) {
  const grupos = data.grupos || [];
  const tot = calcTotais(grupos);

  const updGrupo = (idx, field, val) => {
    const gs = grupos.map((g, i) => i === idx ? { ...g, [field]: val } : g);
    onChange({ ...data, grupos: gs });
  };
  const addGrupo = () => onChange({ ...data, grupos: [...grupos, newGrupo({ taxa: grupos[0]?.taxa || 18, fundoReserva: grupos[0]?.fundoReserva || 2 })] });
  const dupGrupo = idx => {
    const gs = [...grupos];
    gs.splice(idx + 1, 0, { ...grupos[idx], _id: gid() });
    onChange({ ...data, grupos: gs });
  };
  const removeGrupo = idx => {
    if (grupos.length === 1) return;
    onChange({ ...data, grupos: grupos.filter((_, i) => i !== idx) });
  };

  return (
    <div>
      <div className="sec-title">Simulação</div>
      <div className="sec-sub">Configure os grupos — adicione quantos precisar para o Plano Estruturado</div>

      {grupos.map((g, idx) => {
        const sim = calcSim(g);
        return (
          <div key={g._id} className="sec-block" style={{ marginBottom: 12, border: grupos.length > 1 ? '1px solid rgba(201,168,76,.2)' : undefined }}>
            {grupos.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '.7px' }}>
                  Grupo {idx + 1}{g.nome ? ` — ${g.nome}` : ''}
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                  <button className="btn btn-ghost btn-sm" style={{ padding: '4px 9px', fontSize: 10 }} onClick={() => dupGrupo(idx)}>⧉ Dup.</button>
                  {grupos.length > 1 && <button className="btn btn-danger btn-sm" style={{ padding: '4px 9px', fontSize: 10 }} onClick={() => removeGrupo(idx)}>✕</button>}
                </div>
              </div>
            )}

            <div className="g2">
              <div className="field"><label className="lbl">Nº do Grupo</label><input className="inp" value={g.nome} onChange={e => updGrupo(idx, 'nome', e.target.value)} placeholder="Ex: 1234" /></div>
              <div className="field"><label className="lbl">Valor do Bem (R$)</label><input className="inp" type="number" value={g.credito} onChange={e => updGrupo(idx, 'credito', Number(e.target.value))} /></div>
            </div>
            <div className="g2">
              <div className="field"><label className="lbl">Prazo (meses)</label><input className="inp" type="number" value={g.prazo} onChange={e => updGrupo(idx, 'prazo', Number(e.target.value))} /></div>
              <div className="field"><label className="lbl">Taxa de Administração (%)</label><input className="inp" type="number" step="0.01" value={g.taxa} onChange={e => updGrupo(idx, 'taxa', Number(e.target.value))} /></div>
            </div>
            <div className="g2">
              <div className="field"><label className="lbl">Fundo de Reserva (%)</label><input className="inp" type="number" step="0.01" value={g.fundoReserva || 0} onChange={e => updGrupo(idx, 'fundoReserva', Number(e.target.value))} /></div>
              <div className="field"><label className="lbl">Lance Recursos Próprios (%)</label><input className="inp" type="number" step="0.1" value={g.lanceProprio || 0} onChange={e => updGrupo(idx, 'lanceProprio', Number(e.target.value))} /></div>
            </div>
            <div className="g2">
              <div className="field"><label className="lbl">Lance Embutido (%)</label><input className="inp" type="number" step="0.1" value={g.lanceEmbutido || 0} onChange={e => updGrupo(idx, 'lanceEmbutido', Number(e.target.value))} /></div>
              <div className="field" />
            </div>

            <div className="tog-row">
              <div><div className="tog-label">Redução de parcela até contemplação</div></div>
              <button className={`tog ${g.reducao ? 'on' : ''}`} onClick={() => updGrupo(idx, 'reducao', !g.reducao)} />
            </div>
            {g.reducao && (
              <div className="field" style={{ marginTop: 8 }}>
                <label className="lbl">Percentual de Redução (%)</label>
                <input className="inp" type="number" step="0.1" value={g.reducaoPct || 0} onChange={e => updGrupo(idx, 'reducaoPct', Number(e.target.value))} />
              </div>
            )}

            {g.credito > 0 && g.prazo > 0 && (
              <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(255,255,255,.03)', borderRadius: 7, fontSize: 11 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, textAlign: 'center' }}>
                  <div><div style={{ color: 'var(--muted)', marginBottom: 2 }}>Parcela</div><div style={{ color: 'var(--gold)', fontWeight: 600 }}>{R(sim.ps)}</div></div>
                  {sim.lancePct > 0 && <div><div style={{ color: 'var(--muted)', marginBottom: 2 }}>Pós-lance</div><div style={{ color: 'var(--green)', fontWeight: 600 }}>{R(sim.pl)}</div></div>}
                  {sim.lancePct > 0 && <div><div style={{ color: 'var(--muted)', marginBottom: 2 }}>Lance</div><div style={{ fontWeight: 600 }}>{R(sim.lv)}</div></div>}
                  {!sim.lancePct && <div><div style={{ color: 'var(--muted)', marginBottom: 2 }}>Custo Total</div><div style={{ fontWeight: 600 }}>{R(sim.tl)}</div></div>}
                  {sim.cetAnual > 0 && <div><div style={{ color: 'var(--muted)', marginBottom: 2 }}>CET a.a.</div><div style={{ color: 'var(--gold)', fontWeight: 600 }}>{Pt(sim.cetAnual, 2)}</div></div>}
                </div>
              </div>
            )}
          </div>
        );
      })}

      <button className="btn btn-ghost" style={{ width: '100%', marginTop: 4, marginBottom: 14 }} onClick={addGrupo}>
        + Adicionar Grupo
      </button>

      {grupos.length > 1 && (
        <div className="sec-block" style={{ border: '1px solid rgba(201,168,76,.25)' }}>
          <div className="sec-block-title">Totais do Plano Estruturado</div>
          <div className="kv"><span className="kv-l">Crédito Total</span><span className="kv-r" style={{ color: 'var(--gold)', fontSize: 14, fontWeight: 700 }}>{R(tot.credito)}</span></div>
          <div className="kv"><span className="kv-l">Parcela Total (sem lance)</span><span className="kv-r">{R(tot.parcelaSL)}</span></div>
          {tot.lance > 0 && <>
            <div className="kv"><span className="kv-l">Lance Total</span><span className="kv-r">{R(tot.lance)}</span></div>
            <div className="kv"><span className="kv-l">Parcela Total (após lance)</span><span className="kv-r" style={{ color: 'var(--green)' }}>{R(tot.parcelaAL)}</span></div>
          </>}
          <div className="kv"><span className="kv-l">Custo Total do Projeto</span><span className="kv-r">{R(tot.custoTotal)}</span></div>
        </div>
      )}
    </div>
  );
}

// ─── STEP 4: FORMATO ─────────────────────────────────────────────────────────────
function StepFormato({ data, upd, onChange }) {
  const op = data.opcoes;
  const isSimple = data.tipoProposta === 'simplificada';
  const isAnalytic = data.tipoProposta === 'analitica';
  const hasLance = (data.grupos || []).some(g => (g.lanceProprio || 0) + (g.lanceEmbutido || 0) > 0);

  // Quando muda tipo de proposta, ajusta defaults de CET
  const setTipo = (id) => {
    const d = JSON.parse(JSON.stringify(data));
    d.tipoProposta = id;
    if (id === 'simplificada') {
      d.opcoes.cetReal = false;
      d.opcoes.taxaAdm = false;
      d.opcoes.comparativo = false;
      d.opcoes.incc = false;
    } else if (id === 'analitica') {
      d.opcoes.cetReal = true;
      d.opcoes.taxaAdm = true;
      d.opcoes.comparativo = true;
      d.opcoes.incc = true;
    }
    onChange(d);
  };

  const PeriodoSelector = ({ value, onChange }) => (
    <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
      {[['mensal','Mensal'],['anual','Anual'],['ambos','Ambos']].map(([v, label]) => (
        <button key={v}
          style={{ flex: 1, padding: '5px 0', fontSize: 10, fontWeight: 600, borderRadius: 6, border: '1px solid', cursor: 'pointer', fontFamily: 'Inter,sans-serif',
            background: value === v ? 'rgba(201,168,76,.15)' : 'transparent',
            borderColor: value === v ? 'rgba(201,168,76,.6)' : 'rgba(255,255,255,.1)',
            color: value === v ? '#C9A84C' : 'rgba(255,255,255,.4)' }}
          onClick={() => onChange(v)}>{label}</button>
      ))}
    </div>
  );

  return (
    <div>
      <div className="sec-title">Formato da Proposta</div>
      <div className="sec-sub">Escolha o nível de detalhe</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 18 }}>
        {TIPOS_PROP.map(t => (
          <div key={t.id} className={`card card-click${data.tipoProposta === t.id ? ' card-sel' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}
            onClick={() => setTipo(t.id)}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{t.label}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>{t.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {!isSimple && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 10 }}>
            Indicadores de Custo {!hasLance && <span style={{ color: 'var(--muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(disponíveis com lance)</span>}
          </div>

          {/* CET Real */}
          <div className="sec-block" style={{ marginBottom: 8, opacity: hasLance ? 1 : 0.4, pointerEvents: hasLance ? 'auto' : 'none' }}>
            <div className="tog-row" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <div>
                <div className="tog-label">CET Real (TIR)</div>
                <div className="tog-desc">Custo efetivo real via Taxa Interna de Retorno — padrão Banco Central. Parcela calculada pelo saldo devedor após abatimento do lance.</div>
              </div>
              <button className={`tog ${op.cetReal ? 'on' : ''}`} onClick={() => upd('opcoes.cetReal', !op.cetReal)} />
            </div>
            {op.cetReal && (
              <PeriodoSelector value={op.cetRealPeriodo} onChange={v => upd('opcoes.cetRealPeriodo', v)} />
            )}
          </div>

          {/* Taxa Administrativa */}
          <div className="sec-block" style={{ marginBottom: 8, opacity: hasLance ? 1 : 0.4, pointerEvents: hasLance ? 'auto' : 'none' }}>
            <div className="tog-row" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <div>
                <div className="tog-label">Taxa Administrativa (TIR Proporcional)</div>
                <div className="tog-desc">TIR com parcela reduzida proporcionalmente ao lance — reflete a prática de administradoras como BB Consórcios.</div>
              </div>
              <button className={`tog ${op.taxaAdm ? 'on' : ''}`} onClick={() => upd('opcoes.taxaAdm', !op.taxaAdm)} />
            </div>
            {op.taxaAdm && (
              <PeriodoSelector value={op.taxaAdmPeriodo} onChange={v => upd('opcoes.taxaAdmPeriodo', v)} />
            )}
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '.7px', margin: '14px 0 10px' }}>Outros Indicadores</div>
          <div className="tog-row"><div><div className="tog-label">Comparativo com Financiamento</div><div className="tog-desc">Parcela e custo total vs CEF e banco</div></div><button className={`tog ${op.comparativo?'on':''}`} onClick={()=>upd('opcoes.comparativo',!op.comparativo)}/></div>
          <div className="tog-row"><div><div className="tog-label">Valorização INCC</div><div className="tog-desc">Projeção de valorização do bem</div></div><button className={`tog ${op.incc?'on':''}`} onClick={()=>upd('opcoes.incc',!op.incc)}/></div>
        </>
      )}

      {isSimple && (
        <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,.03)', borderRadius: 8, fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
          A proposta <strong style={{ color: 'rgba(255,255,255,.5)' }}>Simplificada</strong> exibe apenas os dados essenciais sem indicadores de custo. Para incluir CET Real ou Taxa Administrativa, escolha Padrão ou Analítica.
        </div>
      )}
    </div>
  );
}

// ─── PROPOSAL VIEW ───────────────────────────────────────────────────────────────
function ProposalView({ proposal: p, onCopy }) {
  const grupos   = p.grupos || (p.grupo ? [p.grupo] : []);
  const isMulti  = grupos.length > 1;
  const tot      = calcTotais(grupos);
  const sim0     = calcSim(grupos[0] || {});
  const prod     = PRODUTOS[p.produto.tipo];
  const isAnalytic = p.tipoProposta === 'analitica';
  const isSimple   = p.tipoProposta === 'simplificada';
  const op = p.opcoes || {};

  // Bloco de indicador de custo (CET Real ou Taxa Administrativa)
  const CETBlock = ({ sim, tipo }) => {
    const isCetReal = tipo === 'cetReal';
    const ativo = isCetReal ? op.cetReal : op.taxaAdm;
    if (!ativo || isSimple || sim.lv <= 0) return null;
    const periodo = isCetReal ? (op.cetRealPeriodo || 'anual') : (op.taxaAdmPeriodo || 'anual');
    const mensal  = isCetReal ? sim.cetRealMensal  : sim.taxaAdmMensal;
    const anual   = isCetReal ? sim.cetRealAnual   : sim.taxaAdmAnual;
    const plLabel = isCetReal ? sim.plCetReal : sim.plTaxaAdm;
    const cor     = isCetReal ? 'var(--gold)' : 'var(--green)';
    const titulo  = isCetReal ? 'CET Real (TIR — Saldo Devedor)' : 'Taxa Administrativa (TIR Proporcional)';
    const desc    = isCetReal
      ? 'Custo efetivo real via TIR · padrão Banco Central · parcela pelo saldo devedor'
      : 'TIR com parcela proporcional ao lance · prática de algumas administradoras';

    return (
      <div className="sec-block" style={{ borderLeft: `3px solid ${cor}` }}>
        <div className="sec-block-title" style={{ color: cor }}>{titulo}</div>
        <div style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 8 }}>{desc}</div>
        <div className="kv"><span className="kv-l">Crédito Líquido (Crédito − Lance)</span><span className="kv-r">{R(sim.creditoLiquido)}</span></div>
        <div className="kv"><span className="kv-l">Parcela base do cálculo</span><span className="kv-r">{R(plLabel)}</span></div>
        {(periodo === 'mensal' || periodo === 'ambos') && (
          <div className="kv">
            <span className="kv-l">{isCetReal ? 'CET Real' : 'Taxa Adm.'} Mensal</span>
            <span className="kv-r" style={{ color: cor, fontWeight: 700 }}>{Pt(mensal, 4)} a.m.</span>
          </div>
        )}
        {(periodo === 'anual' || periodo === 'ambos') && (
          <div className="kv">
            <span className="kv-l">{isCetReal ? 'CET Real' : 'Taxa Adm.'} Anual</span>
            <span className="kv-r" style={{ color: cor, fontWeight: 700, fontSize: 15 }}>{Pt(anual, 2)} a.a.</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-.3px' }}>My Broker</div>
        <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1.5, textTransform: 'uppercase' }}>Proposta de Crédito Patrimonial Programado</div>
      </div>

      <div className="sec-block">
        <div className="sec-block-title">Cliente</div>
        <div className="kv"><span className="kv-l">Nome</span><span className="kv-r">{p.cliente.nome}</span></div>
        {p.cliente.telefone && <div className="kv"><span className="kv-l">Telefone</span><span className="kv-r">{p.cliente.telefone}</span></div>}
        {p.cliente.email && <div className="kv"><span className="kv-l">E-mail</span><span className="kv-r">{p.cliente.email}</span></div>}
      </div>

      <div className="sec-block">
        <div className="sec-block-title">{p.administradora || 'Consórcio'} — {prod?.label || ''}</div>
        <div className="kv"><span className="kv-l">Administradora</span><span className="kv-r">{p.administradora}</span></div>
        <div className="kv"><span className="kv-l">Produto</span><span className="kv-r">{prod?.label} — {p.produto.subtipo}</span></div>
      </div>

      {/* PLANO ESTRUTURADO */}
      {isMulti ? (
        <>
          <div className="sec-block">
            <div className="sec-block-title">Plano Estruturado — {grupos.length} Grupos</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(201,168,76,.3)' }}>
                    {['Grupo','Bem','Prazo','Parcela','Pós-Lance','Lance'].map(h => (
                      <th key={h} style={{ padding: '5px 6px', textAlign: h === 'Grupo' ? 'left' : 'right', color: 'var(--muted)', fontWeight: 600, fontSize: 9, textTransform: 'uppercase', letterSpacing: '.5px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grupos.map((g, idx) => {
                    const s = calcSim(g);
                    return (
                      <tr key={g._id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                        <td style={{ padding: '7px 6px', fontWeight: 600, color: 'var(--gold)' }}>{g.nome || `G${idx + 1}`}</td>
                        <td style={{ padding: '7px 6px', textAlign: 'right' }}>{R(g.credito)}</td>
                        <td style={{ padding: '7px 6px', textAlign: 'right' }}>{g.prazo}m</td>
                        <td style={{ padding: '7px 6px', textAlign: 'right', color: 'var(--gold)' }}>{R(s.ps)}</td>
                        <td style={{ padding: '7px 6px', textAlign: 'right', color: s.lv > 0 ? 'var(--green)' : 'var(--muted)' }}>{s.lv > 0 ? R(s.plCetReal) : '—'}</td>
                        <td style={{ padding: '7px 6px', textAlign: 'right' }}>{s.lv > 0 ? R(s.lv) : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '1px solid rgba(201,168,76,.3)', fontWeight: 700 }}>
                    <td style={{ padding: '7px 6px', color: 'var(--gold)', fontSize: 10, textTransform: 'uppercase' }}>Total</td>
                    <td style={{ padding: '7px 6px', textAlign: 'right', color: 'var(--gold)' }}>{R(tot.credito)}</td>
                    <td style={{ padding: '7px 6px', textAlign: 'right', color: 'var(--muted)' }}>—</td>
                    <td style={{ padding: '7px 6px', textAlign: 'right', color: 'var(--gold)' }}>{R(tot.parcelaSL)}</td>
                    <td style={{ padding: '7px 6px', textAlign: 'right', color: 'var(--green)' }}>{tot.lance > 0 ? R(tot.parcelaAL) : '—'}</td>
                    <td style={{ padding: '7px 6px', textAlign: 'right' }}>{tot.lance > 0 ? R(tot.lance) : '—'}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          <CETBlock sim={sim0} tipo="cetReal" />
          <CETBlock sim={sim0} tipo="taxaAdm" />
        </>
      ) : (
        /* GRUPO ÚNICO */
        (() => {
          const g   = grupos[0] || {};
          const sim = calcSim(g);
          return (
            <>
              <div className="sec-block">
                <div className="sec-block-title">{g.nome ? `Grupo ${g.nome}` : 'Simulação'}</div>
                <div className="kv"><span className="kv-l">Valor do Bem</span><span className="kv-r" style={{ color: 'var(--gold)', fontSize: 15 }}>{R(g.credito)}</span></div>
                <div className="kv"><span className="kv-l">Prazo</span><span className="kv-r">{g.prazo} meses{isAnalytic ? ` (${(g.prazo/12).toFixed(1)} anos)` : ''}</span></div>
                <div className="kv"><span className="kv-l">Taxa de Administração</span><span className="kv-r">{Pt(g.taxa)}</span></div>
                {g.fundoReserva > 0 && <div className="kv"><span className="kv-l">Fundo de Reserva</span><span className="kv-r">{Pt(g.fundoReserva)} ({R(sim.fr)})</span></div>}
                <div className="kv"><span className="kv-l">Parcela Mensal</span><span className="kv-r" style={{ color: 'var(--gold)', fontSize: 15 }}>{R(sim.ps)}</span></div>
                {g.reducao && <div className="kv"><span className="kv-l">Parcela Reduzida (até contemplação)</span><span className="kv-r" style={{ color: 'var(--green)' }}>{R(sim.plReduzida)} (-{Pt(g.reducaoPct)})</span></div>}
                {sim.lancePct > 0 && <>
                  <div className="kv"><span className="kv-l">Lance Total</span><span className="kv-r">{R(sim.lv)} ({Pt(sim.lancePct)})</span></div>
                  {sim.lvProprio  > 0 && <div className="kv"><span className="kv-l">  Recursos Próprios</span><span className="kv-r">{R(sim.lvProprio)} ({Pt(g.lanceProprio)})</span></div>}
                  {sim.lvEmbutido > 0 && <div className="kv"><span className="kv-l">  Lance Embutido</span><span className="kv-r">{R(sim.lvEmbutido)} ({Pt(g.lanceEmbutido)})</span></div>}
                  <div className="kv"><span className="kv-l">Parcela Após Lance</span><span className="kv-r" style={{ color: 'var(--green)' }}>{R(sim.plCetReal)}</span></div>
                </>}
                <div className="kv"><span className="kv-l">Custo Total</span><span className="kv-r">{R(sim.tl)}</span></div>
              </div>
              <CETBlock sim={sim} tipo="cetReal" />
              <CETBlock sim={sim} tipo="taxaAdm" />
            </>
          );
        })()
      )}

      {op.comparativo && !isSimple && (
        <div className="sec-block">
          <div className="sec-block-title">Comparativo com Financiamento</div>
          <div className="kv"><span className="kv-l">Financiamento CEF (12,5% a.a.)</span><span className="kv-r">{R(sim0.pmtCEF)}/mês</span></div>
          <div className="kv"><span className="kv-l">Total CEF</span><span className="kv-r">{R(sim0.ttCEF)}</span></div>
          <div className="kv"><span className="kv-l" style={{ color: 'var(--green)' }}>Economia vs CEF</span><span className="kv-r" style={{ color: 'var(--green)' }}>{R(sim0.ecCEF)}</span></div>
          {isAnalytic && <>
            <div className="kv"><span className="kv-l">Financiamento Banco (17,5% a.a.)</span><span className="kv-r">{R(sim0.pmtBco)}/mês</span></div>
            <div className="kv"><span className="kv-l" style={{ color: 'var(--green)' }}>Economia vs Banco</span><span className="kv-r" style={{ color: 'var(--green)' }}>{R(sim0.ecBco)}</span></div>
          </>}
        </div>
      )}

      {op.incc && !isSimple && (
        <div className="sec-block">
          <div className="sec-block-title">Valorização do Bem (INCC 5,8% a.a.)</div>
          <div className="kv"><span className="kv-l">Valor Estimado em {sim0.anos.toFixed(0)} anos</span><span className="kv-r" style={{ color: 'var(--green)' }}>{R(sim0.cf)}</span></div>
          <div className="kv"><span className="kv-l">Valorização</span><span className="kv-r" style={{ color: 'var(--green)' }}>+{Pt(sim0.inccPct)} ({R(sim0.inccGanho)})</span></div>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: 16, padding: 14, background: 'var(--card)', borderRadius: 10, border: '1px solid var(--bo)' }}>
        <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>Código da proposta</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gold)', cursor: 'pointer', letterSpacing: 1 }} onClick={() => onCopy(p.id)}>{p.id}</div>
        <div style={{ fontSize: 9, color: 'var(--dim)', marginTop: 4 }}>Clique para copiar</div>
      </div>
      <div style={{ textAlign: 'center', marginTop: 14, fontSize: 9, color: 'var(--dim)' }}>
        My Broker — Crédito Patrimonial Programado · {fmt(p.createdAt)}
      </div>
    </div>
  );
}

// ─── VIEWER ──────────────────────────────────────────────────────────────────────
function ViewerView({ code, onCode, onSearch, proposal, onCopy }) {
  return (
    <div>
      <div className="pg-title">Ver Proposta</div>
      <div className="pg-sub" style={{ marginBottom: 14 }}>Digite o código recebido</div>
      <div style={{ display: 'flex', gap: 7, marginBottom: 18 }}>
        <input className="inp" value={code} onChange={e => onCode(e.target.value.toUpperCase())} placeholder="Ex: MB-A3F2K1"
          onKeyDown={e => e.key === 'Enter' && onSearch()} style={{ flex: 1, textTransform: 'uppercase', letterSpacing: 1.5, textAlign: 'center', fontSize: 16 }} />
        <button className="btn btn-gold" onClick={onSearch}>Buscar</button>
      </div>
      {proposal && <ProposalView proposal={proposal} onCopy={onCopy} />}
    </div>
  );
}
