import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Archive, ArchiveRestore, Ban, CheckCircle2, Pencil, Trash2 } from "lucide-react";
import { Contact, translations, type Lang } from "@/lib/store";

export function ContactsDialog({
  open,
  onOpenChange,
  lang,
  contacts,
  blocked,
  onRename,
  onArchiveToggle,
  onDelete,
  onBlockToggle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: Lang;
  contacts: Contact[];
  blocked: string[];
  onRename: (id: string, name: string) => void;
  onArchiveToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onBlockToggle: (id: string) => void;
}) {
  const tr = translations[lang];
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  function startRename(contact: Contact) {
    setRenamingId(contact.id);
    setRenameValue(contact.name);
  }

  function commitRename() {
    if (renamingId && renameValue.trim()) {
      onRename(renamingId, renameValue.trim());
    }
    setRenamingId(null);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="contacts-dialog">
        <DialogHeader>
          <DialogTitle>{tr.allContacts}</DialogTitle>
        </DialogHeader>

        <div className="contacts-list">
          {contacts.map((contact) => {
            const isBlocked = blocked.includes(contact.id);
            const isManageable = contact.kind === "direct";
            return (
              <div key={contact.id} className="contact-row">
                <div className="contact-avatar">{contact.initials}</div>
                <div className="contact-info">
                  {renamingId === contact.id ? (
                    <input
                      autoFocus
                      className="contact-rename-input"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename();
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      onBlur={commitRename}
                    />
                  ) : (
                    <>
                      <span className="contact-name">
                        {contact.name}
                        {contact.archived && <span className="contact-tag">{tr.archives}</span>}
                        {isBlocked && <span className="contact-tag contact-tag-blocked">{tr.block}</span>}
                      </span>
                      <span className="contact-preview">{contact.preview}</span>
                    </>
                  )}
                </div>
                <div className="contact-actions">
                  {isManageable ? (
                    <>
                      <button
                        className="icon-button"
                        title={tr.rename}
                        onClick={() => startRename(contact)}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="icon-button"
                        title={contact.archived ? tr.unarchive : tr.archive}
                        onClick={() => onArchiveToggle(contact.id)}
                      >
                        {contact.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                      </button>
                      <button
                        className="icon-button"
                        title={isBlocked ? tr.unblock : tr.block}
                        onClick={() => onBlockToggle(contact.id)}
                      >
                        {isBlocked ? <CheckCircle2 size={16} /> : <Ban size={16} />}
                      </button>
                      <button
                        className="icon-button icon-button-danger"
                        title={tr.delete}
                        onClick={() => onDelete(contact.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  ) : (
                    <button
                      className="icon-button"
                      title={contact.archived ? tr.unarchive : tr.archive}
                      onClick={() => onArchiveToggle(contact.id)}
                    >
                      {contact.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
