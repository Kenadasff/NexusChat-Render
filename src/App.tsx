import { useEffect, useRef, useState } from "react";
import {
  Archive,
  Bell,
  BellOff,
  Check,
  ChevronDown,
  Flag,
  LogOut,
  Menu,
  MoreHorizontal,
  Paperclip,
  Plus,
  Search,
  Send,
  Settings,
  ShieldOff,
  Smile,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { AuthScreen } from "@/components/AuthScreen";
import { SettingsDialog } from "@/components/SettingsDialog";
import { ContactsDialog } from "@/components/ContactsDialog";
import {
  Account,
  AccountData,
  Channel,
  Contact,
  getSession,
  initialsFrom,
  loadAccountData,
  loadAccounts,
  saveAccountData,
  saveAccounts,
  setSession,
  assistantReply,
  timeNow,
  translations,
} from "@/lib/store";

type Selected = { type: "contact"; id: string } | { type: "channel"; id: string };

const EMOJI_CHOICES = ["💬", "🏠", "🎮", "🎬", "🎵", "📚", "⚽", "🧑‍💻"];

const EMOJI_PICKER_SET = [
  "😀", "😂", "😍", "😉", "😎", "🤔", "😅", "😢",
  "😡", "😱", "🥳", "😴", "🙄", "😇", "🤗", "🤩",
  "👍", "👎", "👌", "🙏", "👏", "💪", "🤝", "👋",
  "❤️", "🔥", "✨", "🎉", "🎯", "💯", "⭐", "✅",
  "😊", "😜", "🤯", "😭", "🥶", "🤫", "👀", "💡",
];

function Avatar({ initials, online = false }: { initials: string; online?: boolean }) {
  return (
    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
      {initials}
      {online && <span className="status-dot" aria-label="En ligne" />}
    </div>
  );
}

export default function App() {
  const [account, setAccount] = useState<Account | null>(null);
  const [booting, setBooting] = useState(true);
  const [data, setData] = useState<AccountData | null>(null);

  const [selected, setSelected] = useState<Selected>({ type: "contact", id: "assistant" });
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [mobileSidebar, setMobileSidebar] = useState(false);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [contactsOpen, setContactsOpen] = useState(false);
  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [addContactOpen, setAddContactOpen] = useState(false);

  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelEmoji, setNewChannelEmoji] = useState(EMOJI_CHOICES[0]);
  const [reportText, setReportText] = useState("");
  const [addContactUsername, setAddContactUsername] = useState("");
  const [addContactError, setAddContactError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const sessionId = getSession();
    if (sessionId) {
      const accounts = loadAccounts();
      const found = accounts.find((a) => a.id === sessionId);
      if (found) {
        setAccount(found);
        setData(loadAccountData(found.id, found.displayName));
      }
    }
    setBooting(false);
  }, []);

  useEffect(() => {
    if (account && data) saveAccountData(account.id, data);
  }, [account, data]);

  useEffect(() => {
    if (account) setSession(account.id);
  }, [account?.id]);

  function logout() {
    setSession(null);
    setAccount(null);
    setData(null);
    setSettingsOpen(false);
  }

  useEffect(() => {
    if (!data) return;
    const root = document.documentElement;
    const apply = (dark: boolean) => root.classList.toggle("dark", dark);
    if (data.settings.theme === "dark") apply(true);
    else if (data.settings.theme === "light") apply(false);
    else {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      apply(mq.matches);
      const listener = (e: MediaQueryListEvent) => apply(e.matches);
      mq.addEventListener("change", listener);
      return () => mq.removeEventListener("change", listener);
    }
  }, [data?.settings.theme]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected, data]);

  if (booting) return null;

  if (!account || !data) {
    return (
      <AuthScreen
        lang="fr"
        onAuthenticated={(acc) => {
          setAccount(acc);
          setData(loadAccountData(acc.id, acc.displayName));
        }}
      />
    );
  }

  const tr = translations[data.settings.language];

  function updateData(mutator: (draft: AccountData) => AccountData) {
    setData((prev) => (prev ? mutator(prev) : prev));
  }

  function updateSettings(patch: Partial<AccountData["settings"]>) {
    updateData((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  }

  function updateAccountInfo(patch: Partial<Account>) {
    if (!account) return;
    const updated = { ...account, ...patch };
    setAccount(updated);
    const accounts = loadAccounts().map((a) => (a.id === updated.id ? updated : a));
    saveAccounts(accounts);
  }

  function pushNotification(msg: string) {
    if (!data!.settings.notificationsEnabled) return;
    updateData((d) => ({
      ...d,
      notifications: [{ id: Date.now(), text: msg, time: timeNow(), read: false }, ...d.notifications].slice(0, 30),
    }));
  }

  const activeContact = selected.type === "contact" ? data.contacts.find((c) => c.id === selected.id) : undefined;
  const activeChannel = selected.type === "channel" ? data.channels.find((c) => c.id === selected.id) : undefined;
  const isBlocked = activeContact ? data.blocked.includes(activeContact.id) : false;

  const visibleContacts = data.contacts.filter(
    (c) => !c.archived && c.name.toLocaleLowerCase("fr-FR").includes(search.toLocaleLowerCase("fr-FR")),
  );
  const visibleChannels = data.channels.filter(
    (c) => !c.archived && c.name.toLocaleLowerCase("fr-FR").includes(search.toLocaleLowerCase("fr-FR")),
  );

  function selectContact(id: string) {
    setSelected({ type: "contact", id });
    setMobileSidebar(false);
    updateData((d) => ({
      ...d,
      contacts: d.contacts.map((c) => (c.id === id ? { ...c, unread: 0 } : c)),
    }));
  }

  function selectChannel(id: string) {
    setSelected({ type: "channel", id });
    setMobileSidebar(false);
    updateData((d) => ({
      ...d,
      channels: d.channels.map((c) => (c.id === id ? { ...c, unread: 0 } : c)),
    }));
  }

  function sendMessage() {
    const value = text.trim();
    if (!value) return;
    if (activeContact && isBlocked) return;

    const message = { id: Date.now(), text: value, mine: true, time: timeNow() };

    if (selected.type === "contact") {
      const contactId = selected.id;
      updateData((d) => ({
        ...d,
        contacts: d.contacts.map((c) =>
          c.id === contactId ? { ...c, preview: value, messages: [...c.messages, message] } : c,
        ),
      }));

      if (activeContact?.kind === "assistant") {
        const reply = assistantReply(value, data.settings.language);
        setTimeout(() => {
          updateData((d) => ({
            ...d,
            contacts: d.contacts.map((c) =>
              c.id === "assistant"
                ? {
                    ...c,
                    preview: reply,
                    messages: [...c.messages, { id: Date.now() + 1, text: reply, mine: false, time: timeNow() }],
                  }
                : c,
            ),
          }));
        }, 500);
      }
    } else if (selected.type === "channel") {
      const channelId = selected.id;
      updateData((d) => ({
        ...d,
        channels: d.channels.map((c) =>
          c.id === channelId ? { ...c, preview: value, messages: [...c.messages, message] } : c,
        ),
      }));
    }
    setText("");
  }

  function createChannel() {
    const name = newChannelName.trim();
    if (!name) return;
    const id = `salon-${Date.now()}`;
    const channel: Channel = {
      id,
      name,
      emoji: newChannelEmoji,
      archived: false,
      preview: tr.createChannel,
      unread: 0,
      messages: [],
    };
    updateData((d) => ({ ...d, channels: [channel, ...d.channels] }));
    setSelected({ type: "channel", id });
    setNewChannelName("");
    setNewChannelEmoji(EMOJI_CHOICES[0]);
    setCreateChannelOpen(false);
  }

  function sendReport() {
    const value = reportText.trim();
    if (!value) return;
    const flagged = `🚩 ${tr.reportProblem} — ${account!.displayName} : ${value}`;
    updateData((d) => ({
      ...d,
      contacts: d.contacts.map((c) =>
        c.id === "team-nexus"
          ? {
              ...c,
              preview: flagged,
              messages: [...c.messages, { id: Date.now(), text: flagged, mine: true, time: timeNow() }],
            }
          : c,
      ),
    }));
    pushNotification(tr.reportSentToTeam);
    setReportText("");
    setReportOpen(false);
    setMoreOpen(false);
    setSelected({ type: "contact", id: "team-nexus" });
  }

  function insertEmoji(emoji: string) {
    const el = textareaRef.current;
    if (!el) {
      setText((t) => t + emoji);
      return;
    }
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const next = text.slice(0, start) + emoji + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + emoji.length;
      el.setSelectionRange(pos, pos);
    });
  }

  function addContactByUsername() {
    setAddContactError(null);
    const username = addContactUsername.trim();
    if (!username) return;
    if (username.toLowerCase() === account!.username.toLowerCase()) {
      setAddContactError(tr.contactIsYou);
      return;
    }
    const found = loadAccounts().find((a) => a.username.toLowerCase() === username.toLowerCase());
    if (!found) {
      setAddContactError(tr.contactNotFound);
      return;
    }
    const existing = data.contacts.find((c) => c.id === `user-${found.id}`);
    if (existing) {
      setAddContactError(tr.contactAlreadyAdded);
      return;
    }
    const newContact: Contact = {
      id: `user-${found.id}`,
      name: found.displayName,
      initials: found.initials || initialsFrom(found.displayName),
      kind: "direct",
      status: "offline",
      archived: false,
      deletable: true,
      preview: tr.addContact,
      unread: 0,
      messages: [],
    };
    updateData((d) => ({ ...d, contacts: [...d.contacts, newContact] }));
    setSelected({ type: "contact", id: newContact.id });
    setAddContactUsername("");
    setAddContactOpen(false);
  }

  function toggleBlockContact(id: string) {
    updateData((d) => ({
      ...d,
      blocked: d.blocked.includes(id) ? d.blocked.filter((b) => b !== id) : [...d.blocked, id],
    }));
  }

  function renameContact(id: string, name: string) {
    updateData((d) => ({ ...d, contacts: d.contacts.map((c) => (c.id === id ? { ...c, name } : c)) }));
  }

  function archiveContactToggle(id: string) {
    updateData((d) => ({
      ...d,
      contacts: d.contacts.map((c) => (c.id === id ? { ...c, archived: !c.archived } : c)),
    }));
  }

  function deleteContact(id: string) {
    updateData((d) => ({ ...d, contacts: d.contacts.filter((c) => c.id !== id) }));
    if (selected.type === "contact" && selected.id === id) {
      setSelected({ type: "contact", id: "assistant" });
    }
  }

  const blockedContacts = data.contacts.filter((c) => data.blocked.includes(c.id));
  const unreadNotifCount = data.notifications.filter((n) => !n.read).length;

  const title = activeContact ? activeContact.name : activeChannel ? `${activeChannel.emoji} ${activeChannel.name}` : "";
  const messages = activeContact ? activeContact.messages : activeChannel ? activeChannel.messages : [];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileSidebar ? "sidebar-open" : ""}`}>
        <div className="sidebar-header">
          <div className="brand">
            <div className="brand-mark">
              <Sparkles size={18} />
            </div>
            <span>{tr.appName}</span>
          </div>
          <button className="icon-button mobile-only" onClick={() => setMobileSidebar(false)} aria-label="Fermer">
            <ChevronDown size={20} />
          </button>
        </div>

        <div className="search-box">
          <Search size={17} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tr.search}
            aria-label={tr.search}
          />
        </div>

        <div className="section-title-row">
          <span className="section-title">{tr.channels}</span>
          <button className="icon-button" aria-label={tr.createChannel} onClick={() => setCreateChannelOpen(true)}>
            <Plus size={16} />
          </button>
        </div>
        <div className="conversation-list conversation-list-compact">
          {visibleChannels.map((channel) => (
            <button
              key={channel.id}
              className={`conversation ${selected.type === "channel" && selected.id === channel.id ? "conversation-active" : ""}`}
              onClick={() => selectChannel(channel.id)}
            >
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-lg">
                {channel.emoji}
              </div>
              <span className="conversation-copy">
                <span className="conversation-name">{channel.name}</span>
                <span className="conversation-preview">{channel.preview}</span>
              </span>
              {channel.unread ? <span className="unread">{channel.unread}</span> : null}
            </button>
          ))}
        </div>

        <div className="section-title-row">
          <span className="section-title">{tr.conversations}</span>
          <button className="icon-button" aria-label={tr.addContact} onClick={() => setAddContactOpen(true)}>
            <UserPlus size={16} />
          </button>
        </div>
        <div className="conversation-list">
          {visibleContacts.map((contact) => (
            <button
              key={contact.id}
              className={`conversation ${selected.type === "contact" && selected.id === contact.id ? "conversation-active" : ""}`}
              onClick={() => selectContact(contact.id)}
            >
              <Avatar initials={contact.initials} online={contact.status === "online"} />
              <span className="conversation-copy">
                <span className="conversation-name">
                  {contact.name}
                  {data.blocked.includes(contact.id) && <UserX size={12} className="inline-block ml-1 align-middle" />}
                </span>
                <span className="conversation-preview">{contact.preview}</span>
              </span>
              {contact.unread ? <span className="unread">{contact.unread}</span> : null}
            </button>
          ))}
          {visibleContacts.length === 0 && visibleChannels.length === 0 && (
            <div className="empty-search">{tr.emptySearch}</div>
          )}
        </div>

        <div className="sidebar-footer">
          <button className="footer-button" onClick={() => setContactsOpen(true)}>
            <Users size={18} /> {tr.contacts}
          </button>
          <button className="footer-button" onClick={() => setSettingsOpen(true)}>
            <Settings size={18} /> {tr.settings}
          </button>
          <button className="footer-button" onClick={logout}>
            <LogOut size={18} /> {tr.logout}
          </button>
        </div>
      </aside>

      {mobileSidebar && (
        <button className="backdrop" onClick={() => setMobileSidebar(false)} aria-label="Fermer le menu" />
      )}

      <main className="chat-panel">
        <header className="chat-header">
          <button className="icon-button mobile-only" onClick={() => setMobileSidebar(true)} aria-label="Ouvrir le menu">
            <Menu size={21} />
          </button>
          {activeContact && <Avatar initials={activeContact.initials} online={activeContact.status === "online"} />}
          {activeChannel && (
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-lg">
              {activeChannel.emoji}
            </div>
          )}
          <div className="chat-title">
            <strong>{title}</strong>
            <span>
              {activeContact
                ? activeContact.status === "online"
                  ? tr.online
                  : tr.offline
                : `${activeChannel?.messages.length ?? 0} messages`}
            </span>
          </div>
          <div className="header-actions">
            <div style={{ position: "relative" }}>
              <button
                className="icon-button"
                aria-label={tr.notifications}
                onClick={() => {
                  setNotifOpen((v) => !v);
                  setMoreOpen(false);
                }}
              >
                {data.settings.notificationsSound ? <Bell size={19} /> : <BellOff size={19} />}
                {unreadNotifCount > 0 && <span className="notif-dot" />}
              </button>
              {notifOpen && (
                <>
                  <button className="dropdown-backdrop" onClick={() => setNotifOpen(false)} aria-label="Fermer" />
                  <div className="dropdown-panel">
                    <div className="dropdown-panel-header">{tr.notifications}</div>
                    <div className="dropdown-toggle-row">
                      <span>{tr.muteSound}</span>
                      <Switch
                        checked={!data.settings.notificationsSound}
                        onCheckedChange={(checked) => updateSettings({ notificationsSound: !checked })}
                      />
                    </div>
                    <div className="dropdown-toggle-row">
                      <span>{tr.enableNotifications}</span>
                      <Switch
                        checked={data.settings.notificationsEnabled}
                        onCheckedChange={(checked) => updateSettings({ notificationsEnabled: checked })}
                      />
                    </div>
                    <div className="notif-list">
                      {data.notifications.length === 0 && <div className="notif-empty">{tr.noNotifications}</div>}
                      {data.notifications.map((n) => (
                        <div key={n.id} className={`notif-item ${!n.read ? "notif-item-unread" : ""}`}>
                          <span>{n.text}</span>
                          <span className="notif-time">{n.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div style={{ position: "relative" }}>
              <button
                className="icon-button"
                aria-label="Plus d'options"
                onClick={() => {
                  setMoreOpen((v) => !v);
                  setNotifOpen(false);
                }}
              >
                <MoreHorizontal size={20} />
              </button>
              {moreOpen && (
                <>
                  <button className="dropdown-backdrop" onClick={() => setMoreOpen(false)} aria-label="Fermer" />
                  <div className="dropdown-panel dropdown-panel-narrow">
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setReportOpen(true);
                        setMoreOpen(false);
                      }}
                    >
                      <Flag size={15} /> {tr.reportProblem}
                    </button>
                    {activeContact?.kind === "direct" && (
                      <button
                        className="dropdown-item"
                        onClick={() => {
                          toggleBlockContact(activeContact.id);
                          setMoreOpen(false);
                        }}
                      >
                        <ShieldOff size={15} /> {isBlocked ? tr.unblock : tr.block}
                      </button>
                    )}
                    {activeContact && activeContact.kind === "direct" && (
                      <button
                        className="dropdown-item"
                        onClick={() => {
                          archiveContactToggle(activeContact.id);
                          setMoreOpen(false);
                        }}
                      >
                        <Archive size={15} /> {activeContact.archived ? tr.unarchive : tr.archive}
                      </button>
                    )}
                    {activeChannel && (
                      <button
                        className="dropdown-item dropdown-item-danger"
                        onClick={() => {
                          updateData((d) => ({ ...d, channels: d.channels.filter((c) => c.id !== activeChannel.id) }));
                          setSelected({ type: "contact", id: "assistant" });
                          setMoreOpen(false);
                        }}
                      >
                        <Trash2 size={15} /> {tr.delete}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <section className="messages" aria-live="polite">
          {isBlocked && activeContact && (
            <div className="welcome-card blocked-banner">
              <div className="welcome-icon">
                <UserX size={20} />
              </div>
              <div>
                <h2>{activeContact.name}</h2>
                <p>
                  {tr.block} — {tr.unblock} : {tr.settingsBlocked} / {tr.contacts}
                </p>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className={`message-row ${message.mine ? "message-row-mine" : ""}`}>
              {!message.mine && (
                <Avatar initials={activeContact ? activeContact.initials : (activeChannel?.emoji ?? "")} />
              )}
              <div className={`message ${message.mine ? "message-mine" : ""}`}>
                <div>{message.text}</div>
                <span className="message-meta">
                  {message.time} {message.mine && <Check size={14} />}
                </span>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </section>

        <div className="composer-wrap">
          {isBlocked ? (
            <div className="blocked-composer-notice">{tr.block} · {tr.unblock}</div>
          ) : (
            <>
              <div className="composer">
                <button className="composer-icon" aria-label="Joindre un fichier">
                  <Paperclip size={19} />
                </button>
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder={tr.writeMessage}
                  rows={1}
                  aria-label="Message"
                />
                <div style={{ position: "relative" }}>
                  <button
                    className="composer-icon"
                    aria-label="Emoji"
                    onClick={() => setEmojiOpen((v) => !v)}
                  >
                    <Smile size={19} />
                  </button>
                  {emojiOpen && (
                    <>
                      <button className="dropdown-backdrop" onClick={() => setEmojiOpen(false)} aria-label="Fermer" />
                      <div className="emoji-picker">
                        {EMOJI_PICKER_SET.map((emoji) => (
                          <button
                            key={emoji}
                            className="emoji-picker-item"
                            onClick={() => insertEmoji(emoji)}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <button className="send-button" onClick={sendMessage} disabled={!text.trim()} aria-label={tr.send}>
                  <Send size={18} />
                </button>
              </div>
              <div className="composer-hint">{tr.sendHint}</div>
            </>
          )}
        </div>
      </main>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        account={account}
        settings={data.settings}
        blockedContacts={blockedContacts}
        onUpdateSettings={updateSettings}
        onUpdateAccount={updateAccountInfo}
        onUnblock={toggleBlockContact}
      />

      <ContactsDialog
        open={contactsOpen}
        onOpenChange={setContactsOpen}
        lang={data.settings.language}
        contacts={data.contacts}
        blocked={data.blocked}
        onRename={renameContact}
        onArchiveToggle={archiveContactToggle}
        onDelete={deleteContact}
        onBlockToggle={toggleBlockContact}
      />

      <Dialog open={createChannelOpen} onOpenChange={setCreateChannelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tr.createChannel}</DialogTitle>
          </DialogHeader>
          <label className="auth-field">
            <span>{tr.channelName}</span>
            <input
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              placeholder="Musique"
              autoFocus
            />
          </label>
          <div className="option-row">
            {EMOJI_CHOICES.map((emoji) => (
              <button
                key={emoji}
                className={`option-chip emoji-chip ${newChannelEmoji === emoji ? "option-chip-active" : ""}`}
                onClick={() => setNewChannelEmoji(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
          <div className="dialog-actions">
            <button className="footer-button" onClick={() => setCreateChannelOpen(false)}>
              {tr.cancel}
            </button>
            <button className="new-chat" onClick={createChannel}>
              {tr.create}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={addContactOpen}
        onOpenChange={(o) => {
          setAddContactOpen(o);
          if (!o) {
            setAddContactUsername("");
            setAddContactError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tr.addContact}</DialogTitle>
          </DialogHeader>
          <label className="auth-field">
            <span>{tr.enterUsername}</span>
            <input
              value={addContactUsername}
              onChange={(e) => setAddContactUsername(e.target.value)}
              placeholder="kenan"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") addContactByUsername();
              }}
            />
          </label>
          {addContactError && <div className="auth-error">{addContactError}</div>}
          <p className="settings-hint">{tr.addContactHint}</p>
          <div className="dialog-actions">
            <button className="footer-button" onClick={() => setAddContactOpen(false)}>
              {tr.cancel}
            </button>
            <button className="new-chat" onClick={addContactByUsername}>
              {tr.addContactCta}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tr.reportProblem}</DialogTitle>
          </DialogHeader>
          <textarea
            className="report-textarea"
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            placeholder={tr.reportPlaceholder}
            rows={5}
            autoFocus
          />
          <div className="dialog-actions">
            <button className="footer-button" onClick={() => setReportOpen(false)}>
              {tr.cancel}
            </button>
            <button className="new-chat" onClick={sendReport}>
              {tr.send}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
