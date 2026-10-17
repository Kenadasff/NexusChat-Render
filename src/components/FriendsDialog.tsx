import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Ban, Check, MessageSquare, UserMinus, X } from "lucide-react";
import type { FriendEntry } from "@/lib/api";
import { initialsFrom, translations, type Lang } from "@/lib/store";

export function FriendsDialog({
  open, onOpenChange, lang, friends, incoming, outgoing, online,
  onAdd, onAccept, onRemove, onMessage, onBlock,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: Lang;
  friends: FriendEntry[];
  incoming: FriendEntry[];
  outgoing: FriendEntry[];
  online: Set<number>;
  onAdd: (username: string) => Promise<{ ok: boolean; message: string }>;
  onAccept: (friendshipId: number) => void;
  onRemove: (friendshipId: number) => void;
  onMessage: (userId: number) => void;
  onBlock: (userId: number) => void;
}) {
  const tr = translations[lang];
  const [username, setUsername] = useState("");
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || busy) return;
    setBusy(true);
    const res = await onAdd(username.trim());
    setBusy(false);
    setFeedback(res);
    if (res.ok) setUsername("");
  }

  const row = (entry: FriendEntry, actions: React.ReactNode, sub?: string) => (
    <div key={entry.friendshipId} className="contact-row">
      <div className="contact-avatar">{initialsFrom(entry.user.displayName)}</div>
      <div className="contact-info">
        <span className="contact-name">{entry.user.displayName}</span>
        <span className="contact-preview">{sub ?? `@${entry.user.username}${online.has(entry.user.id) ? " · " + tr.online : ""}`}</span>
      </div>
      <div className="contact-actions">{actions}</div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="contacts-dialog">
        <DialogHeader><DialogTitle>{tr.friends}</DialogTitle></DialogHeader>

        <form onSubmit={add} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <label className="auth-field" style={{ flex: 1 }}>
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder={tr.friendUsername} autoCapitalize="none" />
          </label>
          <button type="submit" className="auth-submit" style={{ width: "auto", padding: "0 16px" }} disabled={busy}>{tr.addContactCta}</button>
        </form>
        {feedback && <div className={feedback.ok ? "settings-hint" : "auth-error"}>{feedback.message}</div>}

        <div className="contacts-list">
          {incoming.length > 0 && <div className="section-title">{tr.friendRequests}</div>}
          {incoming.map((e) => row(e, <>
            <button className="icon-button" title={tr.accept} onClick={() => onAccept(e.friendshipId)}><Check size={16} /></button>
            <button className="icon-button icon-button-danger" title={tr.decline} onClick={() => onRemove(e.friendshipId)}><X size={16} /></button>
          </>))}

          <div className="section-title">{tr.friends}</div>
          {friends.length === 0 && <div className="empty-search">{tr.noFriends}</div>}
          {friends.map((e) => row(e, <>
            <button className="icon-button" title={tr.messageHim} onClick={() => { onMessage(e.user.id); onOpenChange(false); }}><MessageSquare size={16} /></button>
            <button className="icon-button" title={tr.block} onClick={() => onBlock(e.user.id)}><Ban size={16} /></button>
            <button className="icon-button icon-button-danger" title={tr.removeFriend} onClick={() => onRemove(e.friendshipId)}><UserMinus size={16} /></button>
          </>))}

          {outgoing.length > 0 && <div className="section-title">{tr.sentRequests}</div>}
          {outgoing.map((e) => row(e, <button className="icon-button icon-button-danger" title={tr.cancel} onClick={() => onRemove(e.friendshipId)}><X size={16} /></button>, `@${e.user.username}`))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
