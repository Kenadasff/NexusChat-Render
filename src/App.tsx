import { useEffect, useRef, useState } from "react";
import { Menu, Search, Plus, Settings, LogOut, Send, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AuthScreen } from "@/components/AuthScreen";
import { SettingsDialog } from "@/components/SettingsDialog";
import { Label } from "@/components/ui/label";
import {
  Account,
  AccountData,
  Channel,
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

import { io } from "socket.io-client";
const socket = io("https://onrender.com", {
  autoConnect: true,
});

type Selected = { type: "contact"; id: string } | { type: "channel"; id: string };
const EMOJI_CHOICES = ["💬", "🏠", "🎮", "🎬", "🎵", "📚", "⚽", "🧑‍💻"];

function Avatar({ initials, online = false }: { initials: string; online?: boolean }) {
  return (
    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
      {initials}
      {online && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-emerald-500" />}
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
  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelEmoji, setNewChannelEmoji] = useState(EMOJI_CHOICES[0]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    socket.on("receive_message", (msgData: { text: string; sender: string; room: string; type: "contact" | "channel" }) => {
      if (!data) return;
      const incomingMessage = {
        id: Date.now(),
        text: `${msgData.sender}: ${msgData.text}`,
        mine: false,
        time: timeNow(),
      };
      setData((prev) => {
        if (!prev) return prev;
        if (msgData.type === "contact") {
          return {
            ...prev,
            contacts: prev.contacts.map((c) =>
              c.id === msgData.room ? { ...c, preview: msgData.text, messages: [...c.messages, incomingMessage] } : c
            ),
          };
        } else {
          return {
            ...prev,
            channels: prev.channels.map((c) =>
              c.id === msgData.room ? { ...c, preview: msgData.text, messages: [...c.messages, incomingMessage] } : c
            ),
          };
        }
      });
    });
    return () => { socket.off("receive_message"); };
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

  const tr = translations[data.settings.language || "fr"];
  const activeContact = selected.type === "contact" ? data.contacts.find((c) => c.id === selected.id) : undefined;
  const activeChannel = selected.type === "channel" ? data.channels.find((c) => c.id === selected.id) : undefined;
  const visibleContacts = data.contacts.filter((c) => !c.archived && c.name.toLowerCase().includes(search.toLowerCase()));
  const visibleChannels = data.channels.filter((c) => !c.archived && c.name.toLowerCase().includes(search.toLowerCase()));

  function sendMessage() {
    const value = text.trim();
    if (!value) return;
    const message = { id: Date.now(), text: value, mine: true, time: timeNow() };

    socket.emit("send_message", {
      text: value,
      sender: account.displayName,
      room: selected.id,
      type: selected.type
    });

    setData((prev) => {
      if (!prev) return prev;
      if (selected.type === "contact") {
        return {
          ...prev,
          contacts: prev.contacts.map((c) =>
            c.id === selected.id ? { ...c, preview: value, messages: [...c.messages, message] } : c
          ),
        };
      } else {
        return {
          ...prev,
          channels: prev.channels.map((c) =>
            c.id === selected.id ? { ...c, preview: value, messages: [...c.messages, message] } : c
          ),
        };
      }
    });

    if (activeContact?.kind === "assistant") {
      const reply = assistantReply(value, data.settings.language);
      setTimeout(() => {
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            contacts: prev.contacts.map((c) =>
              c.id === "assistant" ? { ...c, preview: reply, messages: [...c.messages, { id: Date.now() + 1, text: reply, mine: false, time: timeNow() }] } : c
            ),
          };
        });
      }, 500);
    }
    setText("");
  }

  function createChannel() {
    const name = newChannelName.trim();
    if (!name) return;
    const id = `salon-${Date.now()}`;
    const channel: Channel = { id, name, emoji: newChannelEmoji, archived: false, unread: 0, preview: "", messages: [] };
    setData((prev) => prev ? { ...prev, channels: [...prev.channels, channel] } : prev);
    setNewChannelName("");
    setCreateChannelOpen(false);
    setSelected({ type: "channel", id });
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground font-sans antialiased">
      <div className={`fixed inset-y-0 left-0 z-40 flex w-80 flex-col border-r bg-card transition-transform lg:static lg:translate-x-0 ${mobileSidebar ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-16 items-center justify-between px-4 border-b">
          <span className="text-xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Sparkles className="h-5 w-5" /> NexusChat
          </span>
          <button className="lg:hidden p-1.5 hover:bg-muted rounded-md" onClick={() => setMobileSidebar(false)}><Menu className="h-5 w-5" /></button>
        </div>
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input type="text" placeholder={tr.searchPlaceholder} className="w-full rounded-md border bg-muted/50 py-2 pl-9 pr-4 text-sm focus:outline-none" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2 text-xs font-semibold uppercase text-muted-foreground">
              <span>{tr.channels}</span>
              <button onClick={() => setCreateChannelOpen(true)} className="p-1 hover:bg-muted rounded"><Plus className="h-4 w-4" /></button>
            </div>
            <div className="space-y-1">
              {visibleChannels.map((c) => (
                <button key={c.id} onClick={() => { setSelected({ type: "channel", id: c.id }); setMobileSidebar(false); }} className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${selected.type === "channel" && selected.id === c.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                  <span>{c.emoji}</span><span className="truncate">{c.name}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground"><span>{tr.directMessages}</span></div>
            <div className="space-y-1">
              {visibleContacts.map((c) => (
                <button key={c.id} onClick={() => { setSelected({ type: "contact", id: c.id }); setMobileSidebar(false); }} className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${selected.type === "contact" && selected.id === c.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                  <Avatar initials={initialsFrom(c.name)} online={c.kind === "assistant"} /><span className="truncate">{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="p-4 border-t flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3 truncate">
            <Avatar initials={initialsFrom(account.displayName)} />
            <div className="flex flex-col truncate">
              <span className="text-sm font-medium leading-none">{account.displayName}</span>
              <span className="text-xs text-muted-foreground">@{account.username}</span>
            </div>
          </div>
