export type Theme = "light" | "dark" | "auto";
export type Lang = "fr" | "en";
export type { Permission } from "./api";

// Réglages purement locaux (thème / langue), gardés dans le navigateur
export type LocalSettings = { theme: Theme; language: Lang };

const SETTINGS_KEY = "nexuschat.settings";

export function loadLocalSettings(): LocalSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return { theme: "auto", language: "fr", ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    return { theme: "auto", language: "fr" };
  }
}

export function saveLocalSettings(s: LocalSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function timeOf(iso: string | number | Date) {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
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
    searchPlaceholder: "Rechercher...",
    directMessages: "Messages privés",
    friends: "Amis",
    addFriend: "Ajouter un ami",
    friendUsername: "Identifiant de ton ami",
    friendRequests: "Demandes reçues",
    sentRequests: "Demandes envoyées",
    accept: "Accepter",
    decline: "Refuser",
    removeFriend: "Retirer",
    noFriends: "Pas encore d'amis. Ajoute quelqu'un avec son identifiant !",
    requestSent: "Demande envoyée !",
    nowFriends: "Vous êtes maintenant amis !",
    newFriendRequest: "Nouvelle demande d'ami de",
    serverWaking: "Connexion au serveur… (le premier démarrage peut prendre jusqu'à une minute)",
    networkError: "Impossible de joindre le serveur. Réessaie dans un instant.",
    assistantName: "Nexus Assistant",
    pickConversation: "Choisis une conversation dans la liste.",
    noMessages: "Aucun message pour l'instant. Dis bonjour !",
    blockedByYou: "Tu as bloqué cet utilisateur.",
    close: "Fermer",
    messageHim: "Écrire",
    newChannelTitle: "Nouveau salon",

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
    searchPlaceholder: "Search...",
    directMessages: "Direct messages",
    friends: "Friends",
    addFriend: "Add a friend",
    friendUsername: "Your friend's username",
    friendRequests: "Received requests",
    sentRequests: "Sent requests",
    accept: "Accept",
    decline: "Decline",
    removeFriend: "Remove",
    noFriends: "No friends yet. Add someone with their username!",
    requestSent: "Request sent!",
    nowFriends: "You are now friends!",
    newFriendRequest: "New friend request from",
    serverWaking: "Connecting to the server… (first start can take up to a minute)",
    networkError: "Can't reach the server. Try again in a moment.",
    assistantName: "Nexus Assistant",
    pickConversation: "Pick a conversation from the list.",
    noMessages: "No messages yet. Say hello!",
    blockedByYou: "You blocked this user.",
    close: "Close",
    messageHim: "Message",
    newChannelTitle: "New channel",

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
