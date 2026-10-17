import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserX } from "lucide-react";
import type { Me, User } from "@/lib/api";
import { translations, type Lang, type LocalSettings, type Permission, type Theme } from "@/lib/store";

export function SettingsDialog({
  open, onOpenChange, me, settings, blocked, onUpdateSettings, onSaveName, onSetPermission, onUnblock,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  me: Me;
  settings: LocalSettings;
  blocked: User[];
  onUpdateSettings: (next: Partial<LocalSettings>) => void;
  onSaveName: (displayName: string) => void;
  onSetPermission: (p: Permission) => void;
  onUnblock: (userId: number) => void;
}) {
  const tr = translations[settings.language];
  const [displayName, setDisplayName] = useState(me.displayName);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="settings-dialog">
        <DialogHeader><DialogTitle>{tr.settings}</DialogTitle></DialogHeader>
        <Tabs defaultValue="theme" className="settings-tabs">
          <TabsList className="settings-tabs-list">
            <TabsTrigger value="theme">{tr.settingsTheme}</TabsTrigger>
            <TabsTrigger value="language">{tr.settingsLanguage}</TabsTrigger>
            <TabsTrigger value="account">{tr.settingsAccount}</TabsTrigger>
            <TabsTrigger value="permissions">{tr.settingsPermissions}</TabsTrigger>
            <TabsTrigger value="blocked">{tr.settingsBlocked}</TabsTrigger>
          </TabsList>

          <TabsContent value="theme" className="settings-panel">
            <div className="option-row">
              {(["light", "dark", "auto"] as Theme[]).map((o) => (
                <button key={o} className={`option-chip ${settings.theme === o ? "option-chip-active" : ""}`} onClick={() => onUpdateSettings({ theme: o })}>
                  {o === "light" ? tr.themeLight : o === "dark" ? tr.themeDark : tr.themeAuto}
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="language" className="settings-panel">
            <div className="option-row">
              {(["fr", "en"] as Lang[]).map((o) => (
                <button key={o} className={`option-chip ${settings.language === o ? "option-chip-active" : ""}`} onClick={() => onUpdateSettings({ language: o })}>
                  {o === "fr" ? "Français" : "English"}
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="account" className="settings-panel">
            <label className="auth-field">
              <span>{tr.displayName}</span>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40} />
            </label>
            <label className="auth-field">
              <span>{tr.username}</span>
              <input value={me.username} disabled />
            </label>
            <button className="new-chat settings-save" onClick={() => displayName.trim() && onSaveName(displayName.trim())}>{tr.save}</button>
          </TabsContent>

          <TabsContent value="permissions" className="settings-panel">
            <p className="settings-hint">{tr.messagingWho}</p>
            <div className="option-row option-row-vertical">
              {(["everyone", "contacts", "none"] as Permission[]).map((o) => (
                <button key={o} className={`option-chip ${me.permission === o ? "option-chip-active" : ""}`} onClick={() => onSetPermission(o)}>
                  {o === "everyone" ? tr.permEveryone : o === "contacts" ? tr.permContacts : tr.permNone}
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="blocked" className="settings-panel">
            {blocked.length === 0 ? (
              <div className="empty-search">{tr.blockedListEmpty}</div>
            ) : (
              <div className="blocked-list">
                {blocked.map((u) => (
                  <div key={u.id} className="blocked-row">
                    <div className="blocked-info"><UserX size={16} /><span>{u.displayName} (@{u.username})</span></div>
                    <button className="footer-button blocked-unblock" onClick={() => onUnblock(u.id)}>{tr.unblock}</button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
