import { useState } from "react";
import { auth } from "../utils/storage";

export function LoginScreen({ onLogin }) {
  const [mode, setMode]       = useState("login"); // login | signup | forgot
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]     = useState("");
  const [info, setInfo]       = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setInfo("");
    if (!email || !password) { setError("Preencha e-mail e senha."); return; }
    setLoading(true);

    if (mode === "login") {
      const { user, error: err } = await auth.signIn(email, password);
      if (err) { setError(err); setLoading(false); return; }
      onLogin(user);
    } else {
      const { error: err } = await auth.signUp(email, password);
      if (err) { setError(err); setLoading(false); return; }
      setInfo("Conta criada! Verifique seu e-mail para confirmar e depois faça login.");
      setMode("login");
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg)", fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{
        width: 380, padding: "36px 32px", background: "var(--s1)",
        border: "1px solid var(--brd)", borderRadius: 14,
        boxShadow: "0 24px 64px rgba(0,0,0,.35)",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.3px", color: "var(--tx1)" }}>
            My Broker
          </div>
          <div style={{ fontSize: 11, color: "var(--ac)", letterSpacing: "1.5px", textTransform: "uppercase", marginTop: 3 }}>
            CRM
          </div>
        </div>

        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: "var(--tx1)" }}>
          {mode === "login" ? "Entrar na sua conta" : "Criar nova conta"}
        </div>

        {error && (
          <div style={{ padding: "9px 12px", background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.25)", borderRadius: 7, color: "#F87171", fontSize: 12, marginBottom: 14 }}>
            {error}
          </div>
        )}
        {info && (
          <div style={{ padding: "9px 12px", background: "rgba(52,211,153,.1)", border: "1px solid rgba(52,211,153,.25)", borderRadius: 7, color: "#34D399", fontSize: 12, marginBottom: 14 }}>
            {info}
          </div>
        )}

        <form onSubmit={submit}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".7px", display: "block", marginBottom: 5 }}>
              E-mail
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              autoFocus placeholder="seu@email.com"
              style={{ width: "100%", padding: "9px 11px", background: "var(--s2)", border: "1px solid var(--brd)", borderRadius: 7, color: "var(--tx1)", fontSize: 13, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".7px", display: "block", marginBottom: 5 }}>
              Senha
            </label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width: "100%", padding: "9px 11px", background: "var(--s2)", border: "1px solid var(--brd)", borderRadius: 7, color: "var(--tx1)", fontSize: 13, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          <button
            type="submit" disabled={loading}
            style={{ width: "100%", padding: "10px", background: "linear-gradient(135deg,#C9A84C,#E8C56E)", border: "none", borderRadius: 8, color: "#0A0F1A", fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? .7 : 1 }}>
            {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 18, fontSize: 12, color: "var(--tx3)" }}>
          {mode === "login" ? (
            <>Não tem conta?{" "}
              <button onClick={() => { setMode("signup"); setError(""); setInfo(""); }}
                style={{ background: "none", border: "none", color: "var(--ac)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                Criar conta
              </button>
            </>
          ) : (
            <>Já tem conta?{" "}
              <button onClick={() => { setMode("login"); setError(""); setInfo(""); }}
                style={{ background: "none", border: "none", color: "var(--ac)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                Entrar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
