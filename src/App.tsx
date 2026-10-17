import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { Ban, CheckCircle2, Menu, Plus, Search, Send, Settings as SettingsIcon, Sparkles, UserPlus, LogOut } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AuthScreen } from "@/components/AuthScreen";
import { SettingsDialog } from "@/components/SettingsDialog";
import { FriendsDialog } from "@/components/FriendsDialog";
import {
  api, ApiError, connectSocket, getToken, setToken,
  type Channel, type FriendEntry, type Me, type Msg, type Permission, type User,
} from "@/lib/api";
import {
  assistantReply, initialsFrom, loadLocalSettings, saveLocalSettings, timeOf, translations,
  type LocalSettings,
} from "@/lib/store";

type Sel = { type: "assistant" } | { type: "dm"; id: number } | { type: "channel"; id: number };
type ViewMsg = { id: string | number; mine: boolean; author?: string; text: string; time: string };

const EMOJI_CHOICES = ["💬", "🏠", "🎮", "🎬", "🎵", "📚", "⚽", "🧑‍💻"];
const keyOf = (s: Sel) => (s.type === "assistant" ? "assistant" : `${s.type}:${s.id}`);

function Avatar({ initials, online = false }: { initials: string; online?: boolean }) {
  return (
    <div className="contact-avatar" style={{ position: "relative" }}>
      {initials}
      {online && <span className="status-dot" />}
    </div>
  );
}

export default function App() {
  const [booting, setBooting] = useState(true);
  const [me, setMe] = useState<Me | null>(null);
  const [settings, setSettings] = useState<LocalSettings>(loadLocalSettings);
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [incoming, setIncoming] = useState<FriendEntry[]>([]);
  const [outgoing, setOutgoing] = useState<FriendEntry[]>([]);
  const [blocked, setBlocked] = useState<User[]>([]);
  const [partners, setPartners] = useState<User[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<Record<string, Msg[]>>({});
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [online, setOnline] = useState<Set<number>>(new Set());
  const [assistantMsgs, setAssistantMsgs] = useState<ViewMsg[]>([]);
  const [selected, setSelected] = useState<Sel>({ type: "assistant" });
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelEmoji, setNewChannelEmoji] = useState(EMOJI_CHOICES[0]);

  const tr = translations[settings.language];
  const endRef = useRef<HTMLDivElement>(null);
  const selRef = useRef<Sel>(selected);
  const incomingIdsRef = useRef<number[] | null>(null);
  const socketRef = useRef<Socket | null>(null);
  selRef.current = selected;

  const notify = useCallback((msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice((n) => (n === msg ? null : n)), 4000);
  }, []);
  const errText = useCallback(
    (e: unknown) => (e instanceof ApiError && e.status === 0 ? translations[loadLocalSettings().language].networkError : (e as Error).message),
    [],
  );

  // ----- Thème & réglages locaux
  useEffect(() => {
    saveLocalSettings(settings);
    const dark = settings.theme === "dark" || (settings.theme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  }, [settings]);

  // ----- Chargements depuis le serveur
  const refreshFriends = useCallback(async () => {
    const [f, b] = await Promise.all([api.friends(), api.blocks()]);
    const prev = incomingIdsRef.current;
    if (prev) {
      const fresh = f.incoming.find((e) => !prev.includes(e.friendshipId));
      if (fresh) notify(`${translations[loadLocalSettings().language].newFriendRequest} ${fresh.user.displayName}`);
    }
    incomingIdsRef.current = f.incoming.map((e) => e.friendshipId);
    setFriends(f.friends); setIncoming(f.incoming); setOutgoing(f.outgoing); setBlocked(b.users);
  }, [notify]);

  const refreshConversations = useCallback(async () => {
    const { conversations } = await api.conversations();
    setPartners(conversations.map((c) => c.user));
    setPreviews((p) => {
      const next = { ...p };
      for (const c of conversations) if (!next[`dm:${c.user.id}`]) next[`dm:${c.user.id}`] = c.last.text;
      return next;
    });
  }, []);

  const loadAll = useCallback(async () => {
    const [ch] = await Promise.all([api.channels(), refreshFriends(), refreshConversations()]);
    setChannels(ch.channels);
  }, [refreshFriends, refreshConversations]);

  const logout = useCallback(() => {
    socketRef.current?.disconnect();
    setToken(null);
    setMe(null); setFriends([]); setIncoming([]); setOutgoing([]); setBlocked([]); setPartners([]);
    setChannels([]); setMessages({}); setPreviews({}); setUnread({}); setAssistantMsgs([]);
    setSelected({ type: "assistant" }); setSettingsOpen(false); setFriendsOpen(false);
    incomingIdsRef.current = null;
  }, []);

  // ----- Démarrage : reconnexion automatique si un token existe
  useEffect(() => {
    (async () => {
      if (getToken()) {
        try {
          const { user } = await api.me();
          setMe(user);
        } catch (e) {
          if (e instanceof ApiError && e.status === 401) setToken(null);
        }
      }
      setBooting(false);
    })();
  }, []);

  useEffect(() => {
    if (me) loadAll().catch((e) => notify(errText(e)));
  }, [me?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ----- Ajout d'un message (sans doublon) + aperçu + non-lus
  const addMessage = useCallback((key: string, msg: Msg, meId: number) => {
    setMessages((prev) => {
      const list = prev[key] || [];
      if (list.some((m) => m.id === msg.id)) return prev;
      return { ...prev, [key]: [...list, msg] };
    });
    setPreviews((p) => ({ ...p, [key]: msg.text }));
    if (msg.senderId !== meId && keyOf(selRef.current) !== key) {
      setUnread((u) => ({ ...u, [key]: (u[key] || 0) + 1 }));
    }
  }, []);

  // ----- Temps réel (Socket.IO)
  useEffect(() => {
    const token = getToken();
    if (!me || !token) return;
    const meId = me.id;
    const s = connectSocket(token);
    socketRef.current = s;

    s.on("dm:new", (msg: Msg) => {
      const [a, b] = msg.room.split(":").map(Number);
      const partner = a === meId ? b : a;
      addMessage(`dm:${partner}`, msg, meId);
      refreshConversations().catch(() => undefined);
    });
    s.on("channel:new", (msg: Msg) => addMessage(`channel:${msg.room}`, msg, meId));
    s.on("channel:created", (c: Channel) => setChannels((p) => (p.some((x) => x.id === c.id) ? p : [...p, c])));
    s.on("friends:update", () => { refreshFriends().catch(() => undefined); });
    s.on("presence:list", (ids: number[]) => setOnline(new Set(ids)));
    s.on("presence:update", ({ userId, online: on }: { userId: number; online: boolean }) =>
      setOnline((prev) => { const n = new Set(prev); if (on) n.add(userId); else n.delete(userId); return n; }));
    s.on("connect_error", (err) => { if (err.message === "unauthorized") logout(); });

    return () => { s.disconnect(); socketRef.current = null; };
  }, [me?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ----- Historique à l'ouverture d'une conversation
  useEffect(() => {
    if (!me || selected.type === "assistant") return;
    const key = keyOf(selected);
    setUnread((u) => (u[key] ? { ...u, [key]: 0 } : u));
    const req = selected.type === "dm" ? api.dm(selected.id) : api.channelMessages(selected.id);
    req.then(({ messages: list }) => {
      setMessages((prev) => {
        const merged = [...list];
        for (const m of prev[key] || []) if (!merged.some((x) => x.id === m.id)) merged.push(m);
        merged.sort((x, y) => x.id - y.id);
        return { ...prev, [key]: merged };
      });
    }).catch((e) => notify(errText(e)));
  }, [selected.type, (selected as { id?: number }).id, me?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, assistantMsgs, selected]);

  // ----- Données dérivées
  const people = useMemo(() => {
    const map = new Map<number, User>();
    friends.forEach((f) => map.set(f.user.id, f.user));
    partners.forEach((u) => { if (!map.has(u.id)) map.set(u.id, u); });
    return [...map.values()];
  }, [friends, partners]);
  const blockedIds = useMemo(() => new Set(blocked.map((u) => u.id)), [blocked]);

  if (booting) return <div className="auth-shell"><div className="auth-card"><p className="auth-tagline">{tr.serverWaking}</p></div></div>;
  if (!me) return <AuthScreen lang={settings.language} onAuthenticated={(u) => setMe(u)} />;

  const term = search.toLowerCase();
  const visiblePeople = people.filter((u) => u.displayName.toLowerCase().includes(term) || u.username.includes(term));
  const visibleChannels = channels.filter((c) => c.name.toLowerCase().includes(term));
  const activeUser = selected.type === "dm" ? people.find((u) => u.id === selected.id) : undefined;
  const activeChannel = selected.type === "channel" ? channels.find((c) => c.id === selected.id) : undefined;
  const key = keyOf(selected);

  const viewMessages: ViewMsg[] =
    selected.type === "assistant"
      ? assistantMsgs
      : (messages[key] || []).map((m) => ({
          id: m.id, mine: m.senderId === me.id, author: selected.type === "channel" ? m.senderName : undefined,
          text: m.text, time: timeOf(m.createdAt),
        }));

  const title = selected.type === "assistant" ? tr.assistantName : activeUser ? activeUser.displayName : activeChannel ? `${activeChannel.emoji} ${activeChannel.name}` : "";
  const subtitle = selected.type === "dm" && activeUser ? (online.has(activeUser.id) ? tr.online : tr.offline) : "";
  const isBlocked = activeUser ? blockedIds.has(activeUser.id) : false;

  function pick(s: Sel) { setSelected(s); setMobileSidebar(false); }

  async function send() {
    const value = text.trim();
    if (!value || !me) return;
    if (selected.type === "assistant") {
      setAssistantMsgs((p) => [...p, { id: `u${Date.now()}`, mine: true, text: value, time: timeOf(Date.now()) }]);
      const reply = assistantReply(value, settings.language);
      window.setTimeout(() => setAssistantMsgs((p) => [...p, { id: `a${Date.now()}`, mine: false, text: reply, time: timeOf(Date.now()) }]), 500);
      setText("");
      return;
    }
    setText("");
    try {
      const { message } = selected.type === "dm" ? await api.sendDm(selected.id, value) : await api.sendChannel(selected.id, value);
      addMessage(key, message, me.id);
    } catch (e) {
      setText(value);
      notify(errText(e));
    }
  }

  async function addFriend(username: string) {
    try {
      const { status } = await api.requestFriend(username);
      await refreshFriends();
      return { ok: true, message: status === "accepted" ? tr.nowFriends : tr.requestSent };
    } catch (e) { return { ok: false, message: errText(e) }; }
  }
  const act = (fn: () => Promise<unknown>) => fn().then(() => refreshFriends()).catch((e) => notify(errText(e)));

  async function createChannel() {
    const name = newChannelName.trim();
    if (!name) return;
    try {
      const { channel } = await api.createChannel(name, newChannelEmoji);
      setChannels((p) => (p.some((c) => c.id === channel.id) ? p : [...p, channel]));
      setNewChannelName(""); setCreateChannelOpen(false);
      pick({ type: "channel", id: channel.id });
    } catch (e) { notify(errText(e)); }
  }

  async function saveProfile(patch: { displayName?: string; permission?: Permission }) {
    try { const { user } = await api.updateMe(patch); setMe(user); } catch (e) { notify(errText(e)); }
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileSidebar ? "sidebar-open" : ""}`}>
        <div className="sidebar-header">
          <div className="brand"><div className="brand-mark"><Sparkles size={18} /></div>{tr.appName}</div>
        </div>

        <button className="new-chat" onClick={() => setFriendsOpen(true)}>
          <UserPlus size={17} /> {tr.addFriend}{incoming.length > 0 && <span className="unread">{incoming.length}</span>}
        </button>
        <div className="search-box"><Search size={16} /><input placeholder={tr.searchPlaceholder} value={search} onChange={(e) => setSearch(e.target.value)} /></div>

        <div className="section-title-row">
          <span className="section-title">{tr.channels}</span>
          <button className="icon-button" onClick={() => setCreateChannelOpen(true)} title={tr.createChannel}><Plus size={16} /></button>
        </div>
        <div className="conversation-list conversation-list-compact">
          {visibleChannels.map((c) => (
            <button key={c.id} className={`conversation ${selected.type === "channel" && selected.id === c.id ? "conversation-active" : ""}`} onClick={() => pick({ type: "channel", id: c.id })}>
              <div className="contact-avatar">{c.emoji}</div>
              <div className="conversation-copy">
                <span className="conversation-name">{c.name}</span>
                <span className="conversation-preview">{previews[`channel:${c.id}`] || ""}</span>
              </div>
              {unread[`channel:${c.id}`] > 0 && <span className="unread">{unread[`channel:${c.id}`]}</span>}
            </button>
          ))}
        </div>

        <div className="section-title" style={{ marginTop: 12 }}>{tr.directMessages}</div>
        <div className="conversation-list" style={{ flex: 1 }}>
          <button className={`conversation ${selected.type === "assistant" ? "conversation-active" : ""}`} onClick={() => pick({ type: "assistant" })}>
            <Avatar initials="N" online />
            <div className="conversation-copy"><span className="conversation-name">{tr.assistantName}</span></div>
          </button>
          {visiblePeople.map((u) => (
            <button key={u.id} className={`conversation ${selected.type === "dm" && selected.id === u.id ? "conversation-active" : ""}`} onClick={() => pick({ type: "dm", id: u.id })}>
              <Avatar initials={initialsFrom(u.displayName)} online={online.has(u.id)} />
              <div className="conversation-copy">
                <span className="conversation-name">{u.displayName}</span>
                <span className="conversation-preview">{previews[`dm:${u.id}`] || `@${u.username}`}</span>
              </div>
              {unread[`dm:${u.id}`] > 0 && <span className="unread">{unread[`dm:${u.id}`]}</span>}
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="conversation" style={{ cursor: "default" }}>
            <Avatar initials={initialsFrom(me.displayName)} online />
            <div className="conversation-copy">
              <span className="conversation-name">{me.displayName}</span>
              <span className="conversation-preview">@{me.username}</span>
            </div>
          </div>
          <button className="footer-button" onClick={() => setSettingsOpen(true)}><SettingsIcon size={16} /> {tr.settings}</button>
          <button className="footer-button" onClick={logout}><LogOut size={16} /> {tr.logout}</button>
        </div>
      </aside>
      {mobileSidebar && <button className="backdrop" aria-label={tr.close} onClick={() => setMobileSidebar(false)} />}

      <main className="chat-panel">
        <header className="chat-header">
          <button className="icon-button mobile-only" onClick={() => setMobileSidebar(true)}><Menu size={20} /></button>
          <div className="chat-title">
            <strong>{title}</strong>
            {subtitle && <span className="contact-preview">{subtitle}</span>}
          </div>
          <div className="header-actions">
            {activeUser && (
              <button className="icon-button" title={isBlocked ? tr.unblock : tr.block}
                onClick={() => act(() => (isBlocked ? api.unblock(activeUser.id) : api.block(activeUser.id)))}>
                {isBlocked ? <CheckCircle2 size={18} /> : <Ban size={18} />}
              </button>
            )}
            <button className="icon-button" title={tr.friends} onClick={() => setFriendsOpen(true)}><UserPlus size={18} /></button>
          </div>
        </header>

        {notice && <div className="auth-error" style={{ margin: "8px 16px 0" }}>{notice}</div>}

        <div className="messages">
          {viewMessages.length === 0 && (
            <div className="welcome-card">
              <div className="welcome-icon"><Sparkles size={20} /></div>
              <div><h2>{tr.welcomeTitle} {title}</h2><p>{selected.type === "assistant" ? tr.welcomeText : tr.noMessages}</p></div>
            </div>
          )}
          {viewMessages.map((m) => (
            <div key={m.id} className={`message-row ${m.mine ? "message-row-mine" : ""}`}>
              <div className={`message ${m.mine ? "message-mine" : ""}`}>
                {m.author && !m.mine && <strong style={{ display: "block", fontSize: 12 }}>{m.author}</strong>}
                <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.text}</span>
                <div className="message-meta">{m.time}</div>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <div className="composer-wrap">
          {isBlocked ? (
            <div className="blocked-composer-notice">{tr.blockedByYou}</div>
          ) : (
            <>
              <div className="composer">
                <textarea rows={1} value={text} placeholder={tr.writeMessage} onChange={(e) => setText(e.target.value)} maxLength={2000}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
                <button className="send-button" onClick={send} disabled={!text.trim()}><Send size={18} /></button>
              </div>
              <div className="composer-hint">{tr.sendHint}</div>
            </>
          )}
        </div>
      </main>

      <FriendsDialog open={friendsOpen} onOpenChange={setFriendsOpen} lang={settings.language}
        friends={friends} incoming={incoming} outgoing={outgoing} online={online}
        onAdd={addFriend}
        onAccept={(id) => act(() => api.acceptFriend(id))}
        onRemove={(id) => act(() => api.removeFriend(id))}
        onMessage={(id) => pick({ type: "dm", id })}
        onBlock={(id) => act(() => api.block(id))} />

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} me={me} settings={settings} blocked={blocked}
        onUpdateSettings={(next) => setSettings((s) => ({ ...s, ...next }))}
        onSaveName={(displayName) => saveProfile({ displayName })}
        onSetPermission={(permission) => saveProfile({ permission })}
        onUnblock={(id) => act(() => api.unblock(id))} />

      <Dialog open={createChannelOpen} onOpenChange={setCreateChannelOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{tr.createChannel}</DialogTitle></DialogHeader>
          <div className="emoji-picker">
            {EMOJI_CHOICES.map((e) => (
              <button key={e} className={`emoji-picker-item ${newChannelEmoji === e ? "option-chip-active" : ""}`} onClick={() => setNewChannelEmoji(e)}>{e}</button>
            ))}
          </div>
          <label className="auth-field">
            <span>{tr.channelName}</span>
            <input value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)} maxLength={30} onKeyDown={(e) => e.key === "Enter" && createChannel()} />
          </label>
          <div className="dialog-actions">
            <button className="footer-button" onClick={() => setCreateChannelOpen(false)}>{tr.cancel}</button>
            <button className="new-chat" style={{ margin: 0 }} onClick={createChannel}>{tr.create}</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
