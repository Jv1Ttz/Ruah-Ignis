import { supabase } from './supabase';
import { User, Message } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';

const LOCAL_ID_KEY = 'ruah_user_id';

// Helper para mapear dados do banco
const mapProfileToUser = (data: any): User => ({
  id: data.id,
  name: data.name,
  avatarUrl: data.avatar_url,
  targetId: data.target_id,
  streak: data.streak,
  score: data.score || 0,
});

export const storageService = {
  // ... (Mantenha as funções de Auth: checkUserExists, login, register, getUser, updateUserTarget, updateAvatar, getAllProfiles)
  // Vou reimprimir as essenciais abaixo, mas você pode manter as de Auth iguais ao passo anterior.

  // --- REPETINDO AUTH (Para garantir que você tenha o arquivo completo) ---
  checkUserExists: async (name: string): Promise<boolean> => {
    const { data } = await supabase.from('profiles').select('id').ilike('name', name).maybeSingle();
    return !!data;
  },

  login: async (name: string, password: string): Promise<User | null> => {
    const { data } = await supabase.from('profiles').select('*').ilike('name', name).eq('password', password).maybeSingle();
    if (!data) return null;
    localStorage.setItem(LOCAL_ID_KEY, data.id);
    return mapProfileToUser(data);
  },

  register: async (name: string, password: string): Promise<User | null> => {
    const { data } = await supabase.from('profiles').insert({ name, password, streak: 0 }).select().single();
    if (!data) return null;
    localStorage.setItem(LOCAL_ID_KEY, data.id);
    return mapProfileToUser(data);
  },

  getUser: async (): Promise<User | null> => {
    const storedId = localStorage.getItem(LOCAL_ID_KEY);
    if (!storedId) return null;
    const { data } = await supabase.from('profiles').select('*').eq('id', storedId).single();
    if (!data) { localStorage.removeItem(LOCAL_ID_KEY); return null; }
    return mapProfileToUser(data);
  },
  
  updateUserTarget: async (targetId: string) => {
    const storedId = localStorage.getItem(LOCAL_ID_KEY);
    if (!storedId) return null;
    const { data } = await supabase.from('profiles').update({ target_id: targetId }).eq('id', storedId).select().single();
    return data ? mapProfileToUser(data) : null;
  },

  updateAvatar: async (base64: string) => {
    const storedId = localStorage.getItem(LOCAL_ID_KEY);
    if (!storedId) return null;
    const { data } = await supabase.from('profiles').update({ avatar_url: base64 }).eq('id', storedId).select().single();
    return data ? mapProfileToUser(data) : null;
  },

  getAllProfiles: async () => {
    const { data } = await supabase.from('profiles').select('*').order('name');
    return data ? data.map(mapProfileToUser) : [];
  },

  getLeaderboard: async () => {
    const { data } = await supabase.from('profiles').select('*').order('streak', { ascending: false }).limit(50);
    return data ? data.map(mapProfileToUser) : [];
  },

  hasPrayedToday: async () => {
    const storedId = localStorage.getItem(LOCAL_ID_KEY);
    if (!storedId) return false;
    const today = new Date().toISOString().split('T')[0];
    const { count } = await supabase.from('prayers').select('*', { count: 'exact', head: true }).eq('user_id', storedId).eq('date', today);
    return (count || 0) > 0;
  },

  logPrayer: async () => {
    const storedId = localStorage.getItem(LOCAL_ID_KEY);
    if (!storedId) return { success: false, streak: 0 };
    const today = new Date().toISOString().split('T')[0];
    
    if (await storageService.hasPrayedToday()) {
      const user = await storageService.getUser();
      return { success: false, streak: user?.streak || 0 };
    }

    const { error } = await supabase.from('prayers').insert({ user_id: storedId, date: today });
    if (error) return { success: false, streak: 0 };

    const user = await storageService.getUser();
    const newStreak = (user?.streak || 0) + 1;
    await supabase.from('profiles').update({ streak: newStreak }).eq('id', storedId);
    return { success: true, streak: newStreak };
  },

  // --- QUIZ & SCORE ---

  getTodayQuiz: async (): Promise<{ id: number; question: string; options: string[]; xp: number; answered: boolean; correct?: boolean; correctIndex?: number } | null> => {
    const storedId = localStorage.getItem(LOCAL_ID_KEY);
    if (!storedId) return null;

    const today = new Date().toISOString().split('T')[0];

    // 1. Busca o quiz de hoje
    const { data: quiz } = await supabase
      .from('daily_quiz')
      .select('*')
      .eq('date', today)
      .maybeSingle();

    if (!quiz) return null;

    // 2. Verifica se o usuário já respondeu
    const { data: answer } = await supabase
      .from('quiz_answers')
      .select('correct')
      .eq('user_id', storedId)
      .eq('quiz_id', quiz.id)
      .maybeSingle();

    return {
      id: quiz.id,
      question: quiz.question,
      options: quiz.options,
      xp: quiz.xp,
      answered: !!answer,
      correct: answer?.correct,
      correctIndex: quiz.correct_index // Necessário para mostrar qual era a certa se errar
    };
  },

  submitQuizAnswer: async (quizId: number, selectedIndex: number): Promise<{ success: boolean; isCorrect: boolean; correctIndex?: number }> => {
    const storedId = localStorage.getItem(LOCAL_ID_KEY);
    if (!storedId) return { success: false, isCorrect: false };

    // 1. Busca o gabarito
    const { data: quiz } = await supabase
      .from('daily_quiz')
      .select('correct_index, xp')
      .eq('id', quizId)
      .single();

    if (!quiz) return { success: false, isCorrect: false };

    const isCorrect = quiz.correct_index === selectedIndex;

    // 2. Registra a resposta
    const { error } = await supabase
      .from('quiz_answers')
      .insert({ 
        user_id: storedId, 
        quiz_id: quizId,
        correct: isCorrect
      });

    if (error) return { success: false, isCorrect, correctIndex: quiz.correct_index };

    // 3. Se acertou, dá os pontos!
    if (isCorrect) {
      const { data: user } = await supabase.from('profiles').select('score').eq('id', storedId).single();
      const currentScore = user?.score || 0;
      await supabase.from('profiles').update({ score: currentScore + quiz.xp }).eq('id', storedId);
    }

    return { success: true, isCorrect, correctIndex: quiz.correct_index };
  },

  getScoreLeaderboard: async (): Promise<User[]> => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('score', { ascending: false })
      .limit(50);

    if (!data) return [];
    return data.map(mapProfileToUser);
  },

  // --- CHAT REALTIME (AQUI ESTÁ A MÁGICA) ---

  getMessages: async (): Promise<Message[]> => {
    const storedId = localStorage.getItem(LOCAL_ID_KEY);
    if (!storedId) return [];
    
    const user = await storageService.getUser();
    // Se eu não tenho alvo, não tenho com quem falar nesta aba
    if (!user || !user.targetId) return [];

    // Busca mensagens onde:
    // 1. EU mandei para meu ALVO (sender = me, receiver = target)
    // 2. MEU ALVO mandou para MIM (sender = target, receiver = me)
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${storedId},receiver_id.eq.${user.targetId}),and(sender_id.eq.${user.targetId},receiver_id.eq.${storedId})`)
      .order('created_at', { ascending: true })
      .limit(50);

    if (error || !data) return [];

    return data.map(m => ({
      id: m.id,
      senderId: m.sender_id === storedId ? 'me' : 'friend',
      text: m.text,
      timestamp: new Date(m.created_at).getTime(),
      isRead: true
    }));
  },

  sendMessage: async (text: string): Promise<Message> => {
    const storedId = localStorage.getItem(LOCAL_ID_KEY);
    if (!storedId) throw new Error("Not logged in");

    const user = await storageService.getUser();
    if (!user?.targetId) throw new Error("Sem Amigo Secreto selecionado");

    const { data, error } = await supabase
      .from('messages')
      .insert({ 
        sender_id: storedId, 
        receiver_id: user.targetId, // <--- Importante: define quem recebe
        text: text 
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      senderId: 'me',
      text: data.text,
      timestamp: new Date(data.created_at).getTime(),
      isRead: true
    };
  },

  // Função para ouvir novas mensagens em tempo real
  subscribeToChat: (onNewMessage: () => void): RealtimeChannel => {
    return supabase
      .channel('chat_updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          // Quando chegar mensagem nova, avisa a tela para recarregar
          console.log('Nova mensagem!', payload);
          onNewMessage();
        }
      )
      .subscribe();
  },

  // --- NOVAS FUNÇÕES PARA CHAT DUPLO ---

  // Descobre quem é o meu "Anjo" (quem me tirou) para eu poder responder
  getMyAngelId: async (): Promise<string | null> => {
    const storedId = localStorage.getItem(LOCAL_ID_KEY);
    if (!storedId) return null;

    // Procura na tabela profiles quem tem target_id igual ao MEU id
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('target_id', storedId)
      .maybeSingle();

    return data ? data.id : null;
  },

  // --- CHAT DUPLO SEPARADO POR CONTEXTO ---

  // 1. Busca mensagens onde EU sou o Anjo (Aba "Quem eu Tirei")
  getMessagesWithTarget: async (): Promise<Message[]> => {
    const storedId = localStorage.getItem(LOCAL_ID_KEY);
    const user = await storageService.getUser();
    
    if (!storedId || !user?.targetId) return [];

    const { data } = await supabase
      .from('messages')
      .select('*')
      // FILTRO NOVO: Só traz mensagens onde a "missão" é MINHA (angel_id = Eu)
      .eq('angel_id', storedId) 
      .order('created_at', { ascending: true });

    if (!data) return [];
    
    return data.map(m => ({
      id: m.id,
      senderId: m.sender_id === storedId ? 'me' : 'friend',
      text: m.text,
      timestamp: new Date(m.created_at).getTime(),
      isRead: true
    }));
  },

  // 2. Busca mensagens onde O OUTRO é o Anjo (Aba "Meu Anjo")
  getMessagesWithAngel: async (): Promise<Message[]> => {
    const storedId = localStorage.getItem(LOCAL_ID_KEY);
    if (!storedId) return [];

    const angelId = await storageService.getMyAngelId();
    if (!angelId) return [];

    const { data } = await supabase
      .from('messages')
      .select('*')
      // FILTRO NOVO: Só traz mensagens onde a "missão" é DELE (angel_id = Ele)
      .eq('angel_id', angelId)
      .order('created_at', { ascending: true });

    if (!data) return [];

    return data.map(m => ({
      id: m.id,
      senderId: m.sender_id === storedId ? 'me' : 'friend',
      text: m.text,
      timestamp: new Date(m.created_at).getTime(),
      isRead: true
    }));
  },

  // 3. Envia mensagem "carimbando" quem é o Anjo da conversa
  sendMessageTo: async (text: string, receiverId: string, currentAngelId: string): Promise<Message> => {
    const storedId = localStorage.getItem(LOCAL_ID_KEY);
    if (!storedId) throw new Error("Not logged in");

    const { data, error } = await supabase
      .from('messages')
      .insert({ 
        sender_id: storedId, 
        receiver_id: receiverId,
        angel_id: currentAngelId, // <--- O carimbo mágico
        text: text 
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      senderId: 'me',
      text: data.text,
      timestamp: new Date(data.created_at).getTime(),
      isRead: true
    };
  },
  
  receiveAutoReply: (text: string) => ({ id: '0', senderId: 'friend', text, timestamp: Date.now(), isRead: false })
};