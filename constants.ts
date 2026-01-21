import { BadgeType, GroupMember, User } from './types';

export const APP_NAME = "Ruah Ignis";

// Pre-defined list of group members for the "Secret Santa" draw
export const GROUP_MEMBERS: GroupMember[] = [
  { id: 'm1', name: 'João Silva' },
  { id: 'm2', name: 'Maria Souza' },
  { id: 'm3', name: 'Pedro Santos' },
  { id: 'm4', name: 'Ana Oliveira' },
  { id: 'm5', name: 'Lucas Ferreira' },
  { id: 'm6', name: 'Clara Lima' },
  { id: 'm7', name: 'Mateus Costa' },
  { id: 'm8', name: 'Beatriz Rocha' },
  { id: 'm9', name: 'Gabriel Alves' },
  { id: 'm10', name: 'Juliana Dias' },
];

export const MOCK_LEADERBOARD_USERS: User[] = [
  { id: 'm4', name: 'Ana Oliveira', targetId: 'm1', streak: 25, isMock: true, avatarUrl: 'https://picsum.photos/150?random=1' },
  { id: 'm1', name: 'João Silva', targetId: 'm2', streak: 12, isMock: true, avatarUrl: 'https://picsum.photos/150?random=2' },
  { id: 'm7', name: 'Mateus Costa', targetId: 'm3', streak: 4, isMock: true, avatarUrl: 'https://picsum.photos/150?random=3' },
  { id: 'm2', name: 'Maria Souza', targetId: 'm5', streak: 1, isMock: true, avatarUrl: 'https://picsum.photos/150?random=4' },
];

export const getBadgeForStreak = (days: number): { type: BadgeType, color: string } => {
  if (days >= 21) return { type: BadgeType.BLAZE, color: 'text-red-600' };
  if (days >= 11) return { type: BadgeType.TORCH, color: 'text-red-500' };
  if (days >= 4) return { type: BadgeType.EMBER, color: 'text-orange-500' };
  return { type: BadgeType.SPARK, color: 'text-yellow-400' };
};

export const AUTO_REPLIES = [
  "Amém! Obrigado pelas orações! 🙏",
  "Senti a graça daqui. Deus te abençoe!",
  "Que o Espírito Santo nos ilumine.",
  "Continue firme! Estou rezando por você também.",
  "Amém! Foguinho mantido! 🔥"
];