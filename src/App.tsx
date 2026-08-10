import { useMemo, useState } from "react";
import {
  Archive,
  Bell,
  Bot,
  Check,
  ChevronDown,
  Edit3,
  Menu,
  MoreHorizontal,
  Paperclip,
  Plus,
  Search,
  Send,
  Settings,
  Smile,
  Sparkles,
  User,
  Users,
} from "lucide-react";

type Message = {
  id: number;
  text: string;
  mine: boolean;
  time: string;
};

type Conversation = {
  id: number;
  name: string;
  initials: string;
  status: "online" | "offline";
  preview: string;
  unread?: number;
  messages: Message[];
};

const initialConversations: Conversation[] = [
  {
    id: 1,
    name: "Nexus Assistant",
    initials: "N",
    status: "online",
    preview: "Bienvenue sur NexusChat 👋",
    messages: [
      { id: 1, text: "Bienvenue sur NexusChat 👋", mine: false, time: "13:40" },
      { id: 2, text: "Tu peux commencer une conversation ici.", mine: false, time: "13:40" },
    ],
  },
  {
    id: 2,
    name: "Alex",
    initials: "A",
    status: "online",
    preview: "On se parle plus tard ?",
    unread: 2,
    messages: [
      { id: 1, text: "On se parle plus tard ?", mine: false, time: "12:18" },
    ],
  },
  {
    id: 3,
    name: "Équipe Nexus",
    initials: "EN",
    status: "online",
    preview: "Le projet avance bien.",
    messages: [
      { id: 1, text: "Le projet avance bien.", mine: false, time: "Hier" },
    ],
  },
];

function timeNow() {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

function Avatar({ initials, online = false }: { initials: string; online?: boolean }) {
  return (
    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
      {initials}
      {online && <span className="status-dot" aria-label="En ligne" />}
    </div>
  );
}

export default function App() {
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedId, setSelectedId] = useState(1);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [mobileSidebar, setMobileSidebar] = useState(false);

  const selected = conversations.find((c) => c.id === selectedId) ?? conversations[0];

  const filtered = useMemo(
    () =>
      conversations.filter((c) =>
        c.name.toLocaleLowerCase("fr-FR").includes(search.toLocaleLowerCase("fr-FR")),
      ),
    [conversations, search],
  );

  function selectConversation(id: number) {
    setSelectedId(id);
    setMobileSidebar(false);
    setConversations((items) =>
      items.map((item) => (item.id === id ? { ...item, unread: 0 } : item)),
    );
  }

  function createConversation() {
    const nextId = Math.max(...conversations.map((c) => c.id), 0) + 1;
    const newConversation: Conversation = {
      id: nextId,
      name: `Nouvelle conversation ${nextId}`,
      initials: "NC",
      status: "online",
      preview: "Nouvelle conversation",
      messages: [],
    };
    setConversations((items) => [newConversation, ...items]);
    setSelectedId(nextId);
    setText("");
  }

  function sendMessage() {
    const value = text.trim();
    if (!value) return;
    const message: Message = {
      id: Date.now(),
      text: value,
      mine: true,
      time: timeNow(),
    };
    setConversations((items) =>
      items.map((item) =>
        item.id === selected.id
          ? { ...item, preview: value, messages: [...item.messages, message] }
          : item,
      ),
    );
    setText("");
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileSidebar ? "sidebar-open" : ""}`}>
        <div className="sidebar-header">
          <div className="brand">
            <div className="brand-mark"><Sparkles size={18} /></div>
            <span>NexusChat</span>
          </div>
          <button className="icon-button mobile-only" onClick={() => setMobileSidebar(false)} aria-label="Fermer">
            <ChevronDown size={20} />
          </button>
        </div>

        <button className="new-chat" onClick={createConversation}>
          <Plus size={18} /> Nouvelle conversation
        </button>

        <div className="search-box">
          <Search size={17} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher"
            aria-label="Rechercher une conversation"
          />
        </div>

        <div className="section-title">Conversations</div>
        <div className="conversation-list">
          {filtered.map((conversation) => (
            <button
              key={conversation.id}
              className={`conversation ${selected.id === conversation.id ? "conversation-active" : ""}`}
              onClick={() => selectConversation(conversation.id)}
            >
              <Avatar initials={conversation.initials} online={conversation.status === "online"} />
              <span className="conversation-copy">
                <span className="conversation-name">{conversation.name}</span>
                <span className="conversation-preview">{conversation.preview}</span>
              </span>
              {conversation.unread ? <span className="unread">{conversation.unread}</span> : null}
            </button>
          ))}
          {filtered.length === 0 && <div className="empty-search">Aucune conversation.</div>}
        </div>

        <div className="sidebar-footer">
          <button className="footer-button"><Users size={18} /> Contacts</button>
          <button className="footer-button"><Archive size={18} /> Archives</button>
          <button className="footer-button"><Settings size={18} /> Paramètres</button>
        </div>
      </aside>

      {mobileSidebar && <button className="backdrop" onClick={() => setMobileSidebar(false)} aria-label="Fermer le menu" />}

      <main className="chat-panel">
        <header className="chat-header">
          <button className="icon-button mobile-only" onClick={() => setMobileSidebar(true)} aria-label="Ouvrir le menu">
            <Menu size={21} />
          </button>
          <Avatar initials={selected.initials} online={selected.status === "online"} />
          <div className="chat-title">
            <strong>{selected.name}</strong>
            <span>{selected.status === "online" ? "En ligne" : "Hors ligne"}</span>
          </div>
          <div className="header-actions">
            <button className="icon-button" aria-label="Rechercher"><Search size={19} /></button>
            <button className="icon-button" aria-label="Notifications"><Bell size={19} /></button>
            <button className="icon-button" aria-label="Plus d'options"><MoreHorizontal size={20} /></button>
          </div>
        </header>

        <section className="messages" aria-live="polite">
          <div className="welcome-card">
            <div className="welcome-icon"><Bot size={24} /></div>
            <div>
              <h2>Bienvenue dans {selected.name}</h2>
              <p>Vos messages sont affichés ici. Écrivez un message pour commencer.</p>
            </div>
          </div>

          {selected.messages.map((message) => (
            <div key={message.id} className={`message-row ${message.mine ? "message-row-mine" : ""}`}>
              {!message.mine && <Avatar initials={selected.initials} />}
              <div className={`message ${message.mine ? "message-mine" : ""}`}>
                <div>{message.text}</div>
                <span className="message-meta">
                  {message.time} {message.mine && <Check size={14} />}
                </span>
              </div>
            </div>
          ))}
        </section>

        <div className="composer-wrap">
          <div className="composer">
            <button className="composer-icon" aria-label="Joindre un fichier"><Paperclip size={19} /></button>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Écrire un message..."
              rows={1}
              aria-label="Message"
            />
            <button className="composer-icon" aria-label="Emoji"><Smile size={19} /></button>
            <button className="send-button" onClick={sendMessage} disabled={!text.trim()} aria-label="Envoyer">
              <Send size={18} />
            </button>
          </div>
          <div className="composer-hint">Entrée pour envoyer · Maj + Entrée pour une nouvelle ligne</div>
        </div>
      </main>
    </div>
  );
}
