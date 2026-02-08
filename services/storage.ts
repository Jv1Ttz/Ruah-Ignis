import { supabase } from './supabase';
import { User, Message } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';

const LOCAL_ID_KEY = 'ruah_user_id';
const LOCAL_USER_KEY = 'ruah_user_data';

// Helper para garantir a data LOCAL (YYYY-MM-DD) e não UTC
const getLocalDate = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper para mapear dados do banco
const mapProfileToUser = (data: any): User => ({
  id: data.id,
  name: data.name,
  avatarUrl: data.avatar_url,
  targetId: data.target_id,
  angelId: data.angel_id,
  streak: data.streak,
  score: data.score || 0,
  isAdmin: data.is_admin || false
});

async function validateStreak(userId: string, currentStreak: number): Promise<number> {
  if (currentStreak === 0) return 0;

  // 1. Calcular "Ontem" baseado na data LOCAL do dispositivo
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDate(yesterday);
  
  console.log(`[Streak] A verificar orações desde: ${yesterdayStr}`);

  // 2. Verifica se existe oração de "Ontem" para frente
  const { data } = await supabase
    .from('prayers')
    .select('date')
    .eq('user_id', userId)
    .gte('date', yesterdayStr) 
    .limit(1);

  // Se não achou nada (nem ontem, nem hoje), zera tudo
  if (!data || data.length === 0) {
    console.log("[Streak] Quebrou! Resetando para 0.");
    await supabase.from('profiles').update({ streak: 0 }).eq('id', userId);
    return 0;
  }

  console.log("[Streak] Mantido!");
  return currentStreak;
}

export const storageService = {
  
  // 1. Busca APENAS quem está disponível para ser escolhido
  async getAvailableTargets(): Promise<User[]> {
    const currentUserId = localStorage.getItem(LOCAL_ID_KEY);
    
    // Passo A: Descobrir quem JÁ foi escolhido por alguém
    // (Busca todos os target_id que não são nulos)
    const { data: takenData } = await supabase
      .from('profiles')
      .select('target_id')
      .not('target_id', 'is', null);
      
    // Cria uma lista simples de IDs ocupados: ['id-do-joao', 'id-da-maria']
    const takenIds = takenData?.map(d => d.target_id) || [];

    // Passo B: Buscar todos os usuários (exceto eu mesmo)
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', currentUserId || '') // Não posso me escolher
      .order('name');
      
    if (!allProfiles) return [];

    // Passo C: Filtrar -> Só retorna quem NÃO está na lista de ocupados
    const available = allProfiles.filter(profile => !takenIds.includes(profile.id));

    // Reutilizamos o teu helper de mapeamento
    return available.map(mapProfileToUser);
  },

  // 2. Tenta escolher um alvo com SEGURANÇA (Trava de duplicação)
  async confirmTargetSelection(targetId: string): Promise<{ success: boolean; message?: string }> {
     const userId = localStorage.getItem(LOCAL_ID_KEY);
     if (!userId) return { success: false, message: "Erro: Usuário não logado." };

     // TRAVA DE SEGURANÇA:
     // Verifica no banco se alguém já escolheu esse alvo antes de eu salvar
     const { data: isTaken } = await supabase
        .from('profiles')
        .select('id')
        .eq('target_id', targetId)
        .maybeSingle();

     if (isTaken) {
        // Se encontrou alguém, aborta a missão!
        return { success: false, message: "Puxa! Essa pessoa acabou de ser escolhida por outro." };
     }

     // Se passou na trava, salva a escolha
     const { error } = await supabase
        .from('profiles')
        .update({ target_id: targetId })
        .eq('id', userId);

     if (error) return { success: false, message: "Erro ao salvar escolha." };

     // Atualiza o cache local do usuário para refletir a nova escolha
     await storageService.getUser(); 

     return { success: true };
  },

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

  async getUser(): Promise<User | null> {
    const localId = localStorage.getItem(LOCAL_ID_KEY);
    if (!localId) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', localId)
        .single();

      if (error || !data) {
        const localData = localStorage.getItem(LOCAL_USER_KEY);
        return localData ? JSON.parse(localData) : null;
      }

      // --- VALIDAÇÃO DE STREAK ---
      // Verifica se o usuário perdeu o streak antes de devolver os dados
      let validatedStreak = data.streak || 0;
      if (validatedStreak > 0) {
        validatedStreak = await validateStreak(data.id, validatedStreak);
      }
      // ---------------------------

      const user: User = {
        id: data.id,
        name: data.name,
        avatarUrl: data.avatar_url,
        streak: validatedStreak, // Usa o valor validado
        score: data.score || 0,
        targetId: data.target_id,
        angelId: data.angel_id,
        isAdmin: data.is_admin || false
      };

      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
      return user;
    } catch (e) {
      console.error("Erro ao buscar user:", e);
      return null;
    }
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

  // Renomeei de 'getLeaderboard' para 'getStreakLeaderboard'
  getStreakLeaderboard: async (): Promise<User[]> => {
    const { data } = await supabase.from('profiles').select('*').order('streak', { ascending: false }).limit(50);
    return data ? data.map(mapProfileToUser) : [];
  },

  // Dentro de hasPrayedToday:
  hasPrayedToday: async () => {
    const storedId = localStorage.getItem(LOCAL_ID_KEY);
    if (!storedId) return false;
    
    const today = getLocalDate(); // <--- USAR O HELPER AQUI
    
    const { count } = await supabase.from('prayers').select('*', { count: 'exact', head: true }).eq('user_id', storedId).eq('date', today);
    return (count || 0) > 0;
  },

  // Dentro de logPrayer:
  logPrayer: async () => {
    const storedId = localStorage.getItem(LOCAL_ID_KEY);
    if (!storedId) return { success: false, streak: 0 };
    
    const today = getLocalDate(); // <--- USAR O HELPER AQUI
    
    // ... o resto da função continua igual ...
    
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

 // --- Adicione no storage.ts ---
  
  getScoreLeaderboard: async (): Promise<User[]> => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('score', { ascending: false }) // Ordena por pontos
      .limit(50);
      
    // Importante: mapProfileToUser deve incluir o 'score'
    return data ? data.map(mapProfileToUser) : [];
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