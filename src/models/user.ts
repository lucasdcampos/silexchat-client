export interface User {
  id: number;
  username: string;
  avatarUrl?: string | null;
}

export interface Conversation extends User {
  unreadCount: number;
}