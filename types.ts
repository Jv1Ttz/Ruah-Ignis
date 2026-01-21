export interface User {
  id: string;
  name: string;
  avatarUrl?: string; // Base64
  targetId: string | null; // The ID of the person they are praying for
  streak: number; // Current calculated streak
  score?: number;
  isMock?: boolean; // To distinguish real user from mock data
}

export interface PrayerLog {
  id: string;
  userId: string;
  date: string; // ISO Date YYYY-MM-DD
  timestamp: number;
}

export interface Message {
  id: string;
  senderId: string; // 'me' or 'friend' (friend is the simulated anonymous partner)
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
