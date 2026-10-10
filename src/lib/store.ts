export type Theme = "light" | "dark" | "auto";
export type Lang = "fr" | "en";
export type Permission = "everyone" | "contacts" | "none";

export type ChatMessage = {
  id: number;
  text: string;
  mine: boolean;
  time: string;
};

export type Contact = {
  id: string;
  name: string;
  initials: string;
  kind: "assistant" | "team" | "direct";
  status: "online" | "offline";
  archived: boolean;
  deletable: boolean;
  messages: ChatMessage[];
  preview: string;
  unread: number;
};

export type Channel = {
  id: string;
  name: string;
  emoji: string;
  archived: boolean;
  messages: ChatMessage[];
  preview: string;
  unread: number;
};

export type Settings = {
  theme: Theme;
  language: Lang;
  messagingPermission: Permission;
  notificationsEnabled: boolean;
  notificationsSound: boolean;
};

export type AppNotification = {
  id: number;
  text: string;
  time: string;
  read: boolean;
};

export type Account = {
  id: string;
  username: string;
  password: string;
  displayName: string;
  initials: string;
};

export type AccountData = {
  contacts: Contact[];
  channels: Channel[];
  blocked: string[];
  settings: Settings;
  notifications: AppNotification[];
};

const ACCOUNTS_KEY = "nexuschat.accounts";
const SESSION_KEY = "nexuschat.session";
const dataKey = (accountId: string) => `nexuschat.data.${accountId}`;

export function timeNow() {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

export function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function loadAccounts(): Account[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    return raw ? (JSON.parse(raw) as Account[]) : [];
  } catch {
    return [];
  }
}

export function saveAccounts(accounts: Account[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function getSession(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export function setSession(accountId: string | null) {
  if (accountId) localStorage.setItem(SESSION_KEY, accountId);
  else localStorage.removeItem(SESSION_KEY);
}

export function defaultSettings(): Settings {
  return {
    theme: "auto",
    language: "fr",
    messagingPermission: "contacts",
    notificationsEnabled: true,
    notificationsSound: true,
  };
}

export function seedData(displayName: string): AccountData {
  return {
    contacts: [
      {
        id: "assistant",
        name: "Nexus Assistant",
        initials: "N",
        kind: "assistant",
        status: "online",
        archived: false,
        deletable: false,
        preview: "Bienvenue sur NexusChat 👋",
        unread: 0,
        messages: [
          { id: 1, text: "Bienvenue sur NexusChat 👋", mine: false, time: timeNow() },
          {
            id: 2,
            text: "Je suis Nexus Assistant, je suis là pour aider les membres. Pose-moi une question sur les paramètres, les salons, les contacts ou le blocage.",
            mine: false,
            time: timeNow(),
          },
        ],
      },
      {
        id: "kenan",
        name: "Kenan",
        initials: "KE",
        kind: "direct",
        status: "online",
        archived: false,
        deletable: true,
        preview: "Salut, tout est prêt de mon côté.",
        unread: 1,
        messages: [
          { id: 1, text: "Salut, tout est prêt de mon côté.", mine: false, time: timeNow() },
        ],
      },
      {
        id: "team-nexus",
        name: "Équipe Nexus",
        initials: "EN",
        kind: "team",
        status: "online",
        archived: false,
        deletable: false,
        preview: `${displayName} et Kenan`,
        unread: 0,
        messages: [
          {
            id: 1,
            text: "Ce salon d'équipe ne contient que toi (administrateur) et Kenan.",
            mine: false,
            time: timeNow(),
          },
        ],
      },
    ],
    channels: [
      {
        id: "accueil",
        name: "Accueil",
        emoji: "🏠",
        archived: false,
        preview: "Bienvenue dans le salon Accueil.",
        unread: 0,
        messages: [
          { id: 1, text: "Bienvenue dans le salon Accueil.", mine: false, time: timeNow() },
        ],
      },
      {
        id: "gaming",
        name: "Gaming",
        emoji: "🎮",
        archived: false,
        preview: "On joue ce soir ?",
        unread: 0,
        messages: [
          { id: 1, text: "On joue ce soir ?", mine: false, time: timeNow() },
        ],
      },
    ],
    blocked: [],
    settings: defaultSettings(),
    notifications: [
      { id: 1, text: "Bienvenue sur NexusChat 👋", time: timeNow(), read: false },
    ],
  };
}

export function loadAccountData(accountId: string, displayName: string): AccountData {
  try {
    const raw = localStorage.getItem(dataKey(accountId));
    if (!raw) return seedData(displayName);
    const parsed = JSON.parse(raw) as AccountData;
    // fill defaults for any missing fields (forward-compat)
    return {
      contacts: parsed.contacts ?? seedData(displayName).contacts,
      channels: parsed.channels ?? seedData(displayName).channels,
      blocked: parsed.blocked ?? [],
      settings: { ...defaultSettings(), ...(parsed.settings ?? {}) },
      notifications: parsed.notifications ?? [],
    };
  } catch {
    return seedData(displayName);
  }
}

export function saveAccountData(accountId: string, data: AccountData) {
  localStorage.setItem(dataKey(accountId), JSON.stringify(data));
}

// --- Nexus Assistant reply logic (local, rule-based) ---
export function assistantReply(userText: string, lang: Lang): string {
  const t = userText.toLocaleLowerCase("fr-FR");
  const has = (...words: string[]) => words.some((w) => t.includes(w));

  if (lang === "en") {
    if (has("theme", "dark", "light")) return "You can change the theme in Settings → Theme (light, dark or automatic).";
    if (has("language", "lang")) return "You can switch the language in Settings → Language.";
    if (has("block", "blocked")) return "Open a contact's menu or Settings → Blocked users to manage blocking.";
    if (has("channel", "room", "salon")) return "Use the + button next to \"Salons\" to create a new channel, like Gaming or Accueil.";
    if (has("contact")) return "Tap the Contacts button to see, rename, archive or delete your contacts.";
    if (has("notification", "sound", "mute")) return "Open the bell icon to mute notification sounds or disable notifications entirely.";
    if (has("report", "bug", "issue", "problem")) return "Use the ⋯ menu in a conversation and choose \"Report a problem\" — it goes straight to Équipe Nexus.";
    if (has("bonjour", "hello", "hi", "salut")) return "Hello! I'm Nexus Assistant. Ask me about settings, channels, contacts or blocking.";
    return "I'm a lightweight local assistant built into NexusChat. Ask me about settings, channels, contacts, notifications or blocking, and I'll point you in the right direction.";
  }

  if (has("thème", "theme", "sombre", "clair", "dark", "light")) return "Tu peux changer le thème dans Paramètres → Thème (clair, sombre ou automatique).";
  if (has("langue", "language")) return "Tu peux changer la langue dans Paramètres → Langue.";
  if (has("bloqu")) return "Ouvre le menu d'un contact ou Paramètres → Utilisateurs bloqués pour gérer les blocages.";
  if (has("salon", "channel", "canal")) return "Utilise le bouton + à côté de « Salons » pour créer un nouveau salon, comme Gaming ou Accueil.";
  if (has("contact")) return "Ouvre le bouton Contacts pour voir, renommer, archiver ou supprimer tes contacts.";
  if (has("notification", "son", "silencieux", "muet")) return "Ouvre la cloche de notifications pour couper le son ou désactiver complètement les notifications.";
  if (has("signal", "bug", "problème", "probleme")) return "Utilise le menu ⋯ dans une conversation puis « Signaler un problème » : ça part directement vers Équipe Nexus.";
  if (has("permission", "qui peut m'écrire", "qui peut m'ecrire")) return "Dans Paramètres → Permissions de messagerie, choisis qui peut t'envoyer un message : tout le monde, tes contacts seulement, ou personne.";
  if (has("bonjour", "salut", "hello", "coucou")) return "Salut ! Je suis Nexus Assistant, je suis là pour aider les membres. Pose-moi une question sur les paramètres, les salons, les contacts ou le blocage.";
  return "Je suis un assistant local intégré à NexusChat. Demande-moi comment changer le thème, la langue, gérer tes contacts, tes salons, tes notifications ou bloquer quelqu'un.";
}

export const translations = {
  fr: {
    appName: "NexusChat",
    newChat: "Nouvelle conversation",
    search: "Rechercher",
    conversations: "Conversations",
    channels: "Salons",
    contacts: "Contacts",
    archives: "Archives",
    settings: "Paramètres",
    online: "En ligne",
    offline: "Hors ligne",
    writeMessage: "Écrire un message...",
    sendHint: "Entrée pour envoyer · Maj + Entrée pour une nouvelle ligne",
    welcomeTitle: "Bienvenue dans",
    welcomeText: "Vos messages sont affichés ici. Écrivez un message pour commencer.",
    createChannel: "Créer un salon",
    channelName: "Nom du salon",
    create: "Créer",
    cancel: "Annuler",
    rename: "Renommer",
    archive: "Archiver",
    unarchive: "Désarchiver",
    delete: "Supprimer",
    block: "Bloquer",
    unblock: "Débloquer",
    reportProblem: "Signaler un problème",
    reportPlaceholder: "Décris le problème rencontré...",
    send: "Envoyer",
    notifications: "Notifications",
    muteSound: "Couper le son des notifications",
    enableNotifications: "Activer les notifications",
    noNotifications: "Aucune notification.",
    settingsTheme: "Thème",
    settingsLanguage: "Langue",
    settingsAccount: "Compte",
    settingsPermissions: "Permissions",
    settingsBlocked: "Bloqués",
    themeLight: "Clair",
    themeDark: "Sombre",
    themeAuto: "Automatique",
    displayName: "Nom affiché",
    username: "Identifiant",
    save: "Enregistrer",
    messagingWho: "Qui peut t'envoyer un message ?",
    permEveryone: "Tout le monde",
    permContacts: "Mes contacts seulement",
    permNone: "Personne",
    blockedListEmpty: "Aucun utilisateur bloqué.",
    logout: "Se déconnecter",
    login: "Connexion",
    register: "Créer un compte",
    haveAccount: "Déjà un compte ? Se connecter",
    noAccount: "Pas de compte ? En créer un",
    password: "Mot de passe",
    loginCta: "Se connecter",
    registerCta: "Créer mon compte",
    tagline: "Chat P2P simple, sécurisé et sous ton contrôle.",
    invalidCreds: "Identifiant ou mot de passe incorrect.",
    userExists: "Ce nom d'utilisateur existe déjà.",
    fillFields: "Merci de remplir tous les champs.",
    reportSentToTeam: "Ton signalement a été envoyé à Équipe Nexus.",
    you: "Toi",
    admin: "Administrateur",
    member: "Membre",
    emptySearch: "Aucune conversation.",
    allContacts: "Tous les contacts",
    addContact: "Ajouter un contact",
    addContactCta: "Ajouter",
    enterUsername: "Identifiant de la personne",
    contactNotFound: "Aucun compte NexusChat ne correspond à cet identifiant sur cet appareil.",
    contactAlreadyAdded: "Ce contact est déjà dans ta liste.",
    contactIsYou: "Tu ne peux pas t'ajouter toi-même.",
    addContactHint: "Fonctionne uniquement avec un compte déjà créé sur cet appareil (voir note ci-dessous).",
  },
  en: {
    appName: "NexusChat",
    newChat: "New conversation",
    search: "Search",
    conversations: "Conversations",
    channels: "Channels",
    contacts: "Contacts",
    archives: "Archives",
    settings: "Settings",
    online: "Online",
    offline: "Offline",
    writeMessage: "Write a message...",
    sendHint: "Enter to send · Shift + Enter for a new line",
    welcomeTitle: "Welcome to",
    welcomeText: "Your messages appear here. Write a message to get started.",
    createChannel: "Create a channel",
    channelName: "Channel name",
    create: "Create",
    cancel: "Cancel",
    rename: "Rename",
    archive: "Archive",
    unarchive: "Unarchive",
    delete: "Delete",
    block: "Block",
    unblock: "Unblock",
    reportProblem: "Report a problem",
    reportPlaceholder: "Describe the issue...",
    send: "Send",
    notifications: "Notifications",
    muteSound: "Mute notification sounds",
    enableNotifications: "Enable notifications",
    noNotifications: "No notifications.",
    settingsTheme: "Theme",
    settingsLanguage: "Language",
    settingsAccount: "Account",
    settingsPermissions: "Permissions",
    settingsBlocked: "Blocked",
    themeLight: "Light",
    themeDark: "Dark",
    themeAuto: "Automatic",
    displayName: "Display name",
    username: "Username",
    save: "Save",
    messagingWho: "Who can message you?",
    permEveryone: "Everyone",
    permContacts: "My contacts only",
    permNone: "No one",
    blockedListEmpty: "No blocked users.",
    logout: "Log out",
    login: "Login",
    register: "Create an account",
    haveAccount: "Already have an account? Log in",
    noAccount: "No account? Create one",
    password: "Password",
    loginCta: "Log in",
    registerCta: "Create my account",
    tagline: "Simple, secure P2P chat, fully under your control.",
    invalidCreds: "Incorrect username or password.",
    userExists: "This username already exists.",
    fillFields: "Please fill in all fields.",
    reportSentToTeam: "Your report was sent to Équipe Nexus.",
    you: "You",
    admin: "Admin",
    member: "Member",
    emptySearch: "No conversation.",
    allContacts: "All contacts",
    addContact: "Add a contact",
    addContactCta: "Add",
    enterUsername: "Their username",
    contactNotFound: "No NexusChat account on this device matches that username.",
    contactAlreadyAdded: "This contact is already in your list.",
    contactIsYou: "You can't add yourself.",
    addContactHint: "Only works with an account already created on this device (see note below).",
  },
} as const;

export type TranslationKey = keyof typeof translations.fr;
