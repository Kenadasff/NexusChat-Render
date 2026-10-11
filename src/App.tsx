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

// 🟢 LE CLIENT SOCKET.IO CONNECTÉ À VOTRE SERVEUR RENDER
import { io } from "socket.io-client";
const socket = io("https://onrender.com", {
  autoConnect: true,
});

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

  // 🟢 ECOUTER LES MESSAGES DISTANTS EN TEMPS RÉEL
  useEffect(() => {
    socket.on("receive_message", (msgData: { text: string; sender: string; room: string; type: "contact" | "channel" }) => {
      if (!data) return;

      const incomingMessage = {
        id: Date.now(),
        text: msgData.text,
        mine: false,
        time: timeNow(),
      };

      updateData((d) => {
        if (msgData.type === "contact") {
          return {
            ...d,
            contacts: d.contacts.map((c) =>
              c.id === msgData.room ? { ...c, preview: msgData.text, messages: [...c.messages, incomingMessage] } : c
            ),
          };
        } else {
          return {
            ...d,
            channels: d.channels.map((c) =>
              c.id === msgData.room ? { ...c, preview: msgData.text, messages: [...c.messages, incomingMessage] } : c
            ),
          };
        }
      });
    });

    return () => {
      socket.off("receive_message");
    };
  }, [data, selected]);

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

    // 🟢 TRANSMISSION EN DIRECT AU SERVEUR WEB
    socket.emit("send_message", {
      text: value,
      sender: account.displayName,
      room: selected.id,
      type: selected.type
    });

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
      unread: 0,
      preview: "",
      messages: [],
    };
    updateData((d) => ({ ...d, channels: [...d.channels, channel] }));
    setNewChannelName("");
    setCreateChannelOpen(false);
    setSelected({ type: "channel", id });
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground font-sans antialiased">
