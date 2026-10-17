import { io, type Socket } from "socket.io-client";

// URL du backend : définie dans Render (Static Site → Environment → VITE_API_URL)
export const API_URL =
  ((import.meta.env.VITE_API_URL as string | undefined) || "http://localhost:3001").replace(/\/$/, "");

export type User = { id: number; username: string; displayName: string };
export type Permission = "everyone" | "contacts" | "none";
export type Me = User & { permission: Permission };
export type Msg = {
  id: number;
  kind: "dm" | "channel";
  room: string;
  senderId: number;
  senderName: string;
  text: string;
  createdAt: string;
};
export type Channel = { id: number; name: string; emoji: string };
export type FriendEntry = { friendshipId: number; user: User };
export type FriendsData = { friends: FriendEntry[]; incoming: FriendEntry[]; outgoing: FriendEntry[] };

const TOKEN_KEY = "nexuschat.token";
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "network");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error || "Erreur du serveur.");
  return data as T;
}

export const api = {
  register: (username: string, displayName: string, password: string) =>
    request<{ token: string; user: Me }>("/api/register", "POST", { username, displayName, password }),
  login: (username: string, password: string) =>
    request<{ token: string; user: Me }>("/api/login", "POST", { username, password }),
  me: () => request<{ user: Me }>("/api/me"),
  updateMe: (patch: { displayName?: string; permission?: Permission }) =>
    request<{ user: Me }>("/api/me", "PATCH", patch),
  friends: () => request<FriendsData>("/api/friends"),
  requestFriend: (username: string) =>
    request<{ status: "pending" | "accepted" }>("/api/friends/request", "POST", { username }),
  acceptFriend: (id: number) => request<{ ok: true }>(`/api/friends/${id}/accept`, "POST"),
  removeFriend: (id: number) => request<{ ok: true }>(`/api/friends/${id}`, "DELETE"),
  blocks: () => request<{ users: User[] }>("/api/blocks"),
  block: (userId: number) => request<{ ok: true }>(`/api/blocks/${userId}`, "POST"),
  unblock: (userId: number) => request<{ ok: true }>(`/api/blocks/${userId}`, "DELETE"),
  conversations: () => request<{ conversations: { user: User; last: Msg }[] }>("/api/conversations"),
  dm: (userId: number) => request<{ messages: Msg[] }>(`/api/dm/${userId}`),
  sendDm: (userId: number, text: string) => request<{ message: Msg }>(`/api/dm/${userId}`, "POST", { text }),
  channels: () => request<{ channels: Channel[] }>("/api/channels"),
  createChannel: (name: string, emoji: string) =>
    request<{ channel: Channel }>("/api/channels", "POST", { name, emoji }),
  channelMessages: (id: number) => request<{ messages: Msg[] }>(`/api/channels/${id}/messages`),
  sendChannel: (id: number, text: string) =>
    request<{ message: Msg }>(`/api/channels/${id}/messages`, "POST", { text }),
};

export function connectSocket(token: string): Socket {
  return io(API_URL, { auth: { token }, transports: ["websocket", "polling"] });
}
