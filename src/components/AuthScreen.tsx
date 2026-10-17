import { useState } from "react";
import { Sparkles } from "lucide-react";
import { api, ApiError, setToken, type Me } from "@/lib/api";
import { translations, type Lang } from "@/lib/store";

export function AuthScreen({ lang, onAuthenticated }: { lang: Lang; onAuthenticated: (user: Me) => void }) {
  const tr = translations[lang];
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password || (mode === "register" && !displayName.trim())) {
      setError(tr.fillFields);
      return;
    }
    setLoading(true);
    try {
      const res =
        mode === "login"
          ? await api.login(username.trim(), password)
          : await api.register(username.trim(), displayName.trim(), password);
      setToken(res.token);
      onAuthenticated(res.user);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 0 ? tr.networkError : (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-mark"><Sparkles size={20} /></div>
          <span>{tr.appName}</span>
        </div>
        <p className="auth-tagline">{tr.tagline}</p>

        <form className="auth-form" onSubmit={submit}>
          {mode === "register" && (
            <label className="auth-field">
              <span>{tr.displayName}</span>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Alex Dupont" autoComplete="name" maxLength={40} />
            </label>
          )}
          <label className="auth-field">
            <span>{tr.username}</span>
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="alex" autoComplete="username" maxLength={20} autoCapitalize="none" />
          </label>
          <label className="auth-field">
            <span>{tr.password}</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete={mode === "login" ? "current-password" : "new-password"} />
          </label>

          {error && <div className="auth-error">{error}</div>}
          {loading && <div className="settings-hint">{tr.serverWaking}</div>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {mode === "login" ? tr.loginCta : tr.registerCta}
          </button>
        </form>

        <button className="auth-switch" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}>
          {mode === "login" ? tr.noAccount : tr.haveAccount}
        </button>
      </div>
    </div>
  );
}
