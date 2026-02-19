export interface User {
  id: string;
  name: string;
  avatarUrl?: string;
  streak: number;
  score: number; // Garanta que tem score
  maxStreak?: number; // recorde máximo de streak do usuário
  targetId?: string; // Quem eu tirei
  angelId?: string;  // Quem me tirou (ADICIONADO AGORA)
  isAdmin?: boolean; // Se é admin (ADICIONADO AGORA)
}

export interface PrayerLog {
  id: string;
  userId: string;
  date: string; // ISO Date YYYY-MM-DD
  timestamp: number;
}

export interface Message {
  id: string;
  senderId: 'me' | 'friend';
  text: string;
  timestamp: number;
  isRead: boolean;
}

export enum BadgeType {
  SPARK = 'Faísca', // 1-3
  EMBER = 'Brasa', // 4-10
  TORCH = 'Tocha', // 11-20
  BLAZE = 'Labareda' // 21+
}

export interface GroupMember {
  id: string;
  name: string;
}
