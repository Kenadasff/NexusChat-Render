import { useState } from "react";
import { Sparkles } from "lucide-react";
import {
  Account,
  initialsFrom,
  loadAccounts,
  saveAccounts,
  translations,
  type Lang,
} from "@/lib/store";

export function AuthScreen({
  lang,
  onAuthenticated,
}: {
  lang: Lang;
  onAuthenticated: (account: Account) => void;
}) {
  const tr = translations[lang];
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const accounts = loadAccounts();

    if (mode === "login") {
      const found = accounts.find(
        (a) => a.username.toLowerCase() === username.trim().toLowerCase() && a.password === password,
      );
      if (!found) {
        setError(tr.invalidCreds);
        return;
      }
      onAuthenticated(found);
      return;
    }

    if (!username.trim() || !password || !displayName.trim()) {
      setError(tr.fillFields);
      return;
    }
    if (accounts.some((a) => a.username.toLowerCase() === username.trim().toLowerCase())) {
      setError(tr.userExists);
      return;
    }
    const newAccount: Account = {
      id: `user-${Date.now()}`,
      username: username.trim(),
      password,
      displayName: displayName.trim(),
      initials: initialsFrom(displayName.trim()),
    };
    saveAccounts([...accounts, newAccount]);
    onAuthenticated(newAccount);
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-mark">
            <Sparkles size={20} />
          </div>
          <span>{tr.appName}</span>
        </div>
        <p className="auth-tagline">{tr.tagline}</p>

        <form className="auth-form" onSubmit={submit}>
          {mode === "register" && (
            <label className="auth-field">
              <span>{tr.displayName}</span>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Alex Dupont"
                autoComplete="name"
              />
            </label>
          )}
          <label className="auth-field">
            <span>{tr.username}</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="alex"
              autoComplete="username"
            />
          </label>
          <label className="auth-field">
            <span>{tr.password}</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-submit">
            {mode === "login" ? tr.loginCta : tr.registerCta}
          </button>
        </form>

        <button
          className="auth-switch"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError(null);
          }}
        >
          {mode === "login" ? tr.noAccount : tr.haveAccount}
        </button>
      </div>
    </div>
  );
}
