import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { UserX } from "lucide-react";
import {
  Account,
  Contact,
  Settings,
  translations,
  type Lang,
  type Permission,
  type Theme,
} from "@/lib/store";

export function SettingsDialog({
  open,
  onOpenChange,
  account,
  settings,
  blockedContacts,
  onUpdateSettings,
  onUpdateAccount,
  onUnblock,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: Account;
  settings: Settings;
  blockedContacts: Contact[];
  onUpdateSettings: (next: Partial<Settings>) => void;
  onUpdateAccount: (next: Partial<Account>) => void;
  onUnblock: (contactId: string) => void;
}) {
  const tr = translations[settings.language];
  const [displayName, setDisplayName] = useState(account.displayName);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="settings-dialog">
        <DialogHeader>
          <DialogTitle>{tr.settings}</DialogTitle>
        </DialogHeader>

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
              {(["light", "dark", "auto"] as Theme[]).map((option) => (
                <button
                  key={option}
                  className={`option-chip ${settings.theme === option ? "option-chip-active" : ""}`}
                  onClick={() => onUpdateSettings({ theme: option })}
                >
                  {option === "light" ? tr.themeLight : option === "dark" ? tr.themeDark : tr.themeAuto}
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="language" className="settings-panel">
            <div className="option-row">
              {(["fr", "en"] as Lang[]).map((option) => (
                <button
                  key={option}
                  className={`option-chip ${settings.language === option ? "option-chip-active" : ""}`}
                  onClick={() => onUpdateSettings({ language: option })}
                >
                  {option === "fr" ? "Français" : "English"}
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="account" className="settings-panel">
            <label className="auth-field">
              <span>{tr.displayName}</span>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </label>
            <label className="auth-field">
              <span>{tr.username}</span>
              <input value={account.username} disabled />
            </label>
            <button
              className="new-chat settings-save"
              onClick={() => onUpdateAccount({ displayName })}
            >
              {tr.save}
            </button>
          </TabsContent>

          <TabsContent value="permissions" className="settings-panel">
            <p className="settings-hint">{tr.messagingWho}</p>
            <div className="option-row option-row-vertical">
              {(["everyone", "contacts", "none"] as Permission[]).map((option) => (
                <button
                  key={option}
                  className={`option-chip ${settings.messagingPermission === option ? "option-chip-active" : ""}`}
                  onClick={() => onUpdateSettings({ messagingPermission: option })}
                >
                  {option === "everyone"
                    ? tr.permEveryone
                    : option === "contacts"
                      ? tr.permContacts
                      : tr.permNone}
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="blocked" className="settings-panel">
            <BlockedList contacts={blockedContacts} tr={tr} onUnblock={onUnblock} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function BlockedList({
  contacts,
  tr,
  onUnblock,
}: {
  contacts: Contact[];
  tr: (typeof translations)["fr"];
  onUnblock: (id: string) => void;
}) {
  if (contacts.length === 0) {
    return <div className="empty-search">{tr.blockedListEmpty}</div>;
  }
  return (
    <div className="blocked-list">
      {contacts.map((contact) => (
        <div key={contact.id} className="blocked-row">
          <div className="blocked-info">
            <UserX size={16} />
            <span>{contact.name}</span>
          </div>
          <button className="footer-button blocked-unblock" onClick={() => onUnblock(contact.id)}>
            {tr.unblock}
          </button>
        </div>
      ))}
    </div>
  );
}
