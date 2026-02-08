import React, { useEffect, useState, useRef } from 'react';
import { Message, User } from '../types';
import { storageService } from '../services/storage';
import { Send, Loader2, Check, CheckCheck } from 'lucide-react';

interface ChatProps {
  user: User;
}

const getFormattedDate = (timestamp: number) => {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Hoje';
  if (date.toDateString() === yesterday.toDateString()) return 'Ontem';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
};

const Chat: React.FC<ChatProps> = ({ user }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // 'sent' = Conversa com quem eu tirei
  // 'received' = Conversa com meu Anjo
  const [activeTab, setActiveTab] = useState<'sent' | 'received'>('sent'); 
  const [angelId, setAngelId] = useState<string | null>(null); // Guardar o ID do anjo

  // Função que transforma texto em links clicáveis
const formatMessage = (text: string) => {
  // Procura por URLs que começam com http ou https
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  
  return text.split(urlRegex).map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="underline break-all hover:opacity-80 font-medium"
          // O stopPropagation evita que cliques no link disparem outros eventos do chat
          onClick={(e) => e.stopPropagation()} 
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

  const loadMsgs = async () => {
    try {
      let data: Message[] = [];
      
      if (activeTab === 'sent') {
        data = await storageService.getMessagesWithTarget();
      } else {
        // Se for a aba do anjo, precisamos garantir que sabemos o ID dele
        const aId = await storageService.getMyAngelId();
        setAngelId(aId);
        data = await storageService.getMessagesWithAngel();
      }
      
      setMessages(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Recarrega sempre que mudar de aba
  useEffect(() => {
    setLoading(true);
    loadMsgs();
    
    // O Realtime continua o mesmo, ele vai avisar de qualquer msg nova
    const subscription = storageService.subscribeToChat(() => {
      loadMsgs();
    });
    return () => { subscription.unsubscribe(); };
  }, [activeTab]); // <--- Importante: activeTab na dependência

  // Scroll automático para o fim
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    
    let receiverId = '';
    let currentConversationAngelId = ''; // Nova variável

    if (activeTab === 'sent') {
      // Aba "Quem eu Tirei": EU sou o Anjo da conversa
      receiverId = user.targetId || '';
      currentConversationAngelId = user.id; // <--- O anjo sou eu
    } else {
      // Aba "Meu Anjo": O OUTRO é o Anjo da conversa
      receiverId = angelId || '';
      currentConversationAngelId = angelId || ''; // <--- O anjo é ele
    }

    if (!receiverId || !currentConversationAngelId) {
      alert("Destinatário ainda não disponível.");
      return;
    }

    const text = inputText;
    setInputText('');
    setSending(true);

    try {
      // Passamos o 3º parâmetro agora
      await storageService.sendMessageTo(text, receiverId, currentConversationAngelId);
      loadMsgs();
    } catch (error) {
      alert("Erro ao enviar mensagem");
      setInputText(text);
    } finally {
      setSending(false);
    }
  };

  if (loading && messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
        <Loader2 className="animate-spin mb-2" />
        <p className="text-sm">Carregando conversa...</p>
      </div>
    );
  }

  return (
  /* CONTAINER PRINCIPAL: Ocupa o espaço exato entre o Header e o Nav do App */
  /* O h-full aqui é essencial para ele não transbordar */
  <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
    
    {/* 1. SELETOR DE ABAS: Não use 'fixed', use apenas flex-shrink-0 */}
    <div className="flex-shrink-0 px-4 py-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex gap-2 z-10">
      <button
        onClick={() => setActiveTab('sent')}
        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all border ${
          activeTab === 'sent' 
            ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/50 shadow-sm' 
            : 'bg-transparent text-slate-500 border-transparent'
        }`}
      >
        Quem eu tirei
      </button>
      <button
        onClick={() => setActiveTab('received')}
        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all border ${
          activeTab === 'received' 
            ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/50 shadow-sm' 
            : 'bg-transparent text-slate-500 border-transparent'
        }`}
      >
        Quem me Tirou 🕵️
      </button>
    </div>

    {/* 2. ÁREA DE MENSAGENS (Scrollável) */}
<div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth bg-slate-50 dark:bg-slate-900">
  {messages.length === 0 && !loading && (
    <div className="text-center text-slate-400 text-sm mt-10">
      Comece a conversa! Seu amigo não saberá quem é você.
    </div>
  )}

  {messages.map((msg, index) => {
    const isMe = msg.senderId === 'me';
    
    // --- LÓGICA DO DIA (RESTAURADA) ---
    const prevMsg = messages[index - 1];
    const isNewDay = !prevMsg || 
      new Date(msg.timestamp).toDateString() !== new Date(prevMsg.timestamp).toDateString();

    return (
      <React.Fragment key={msg.id}>
        {/* SE FOR UM NOVO DIA, MOSTRA A DATA NO MEIO */}
        {isNewDay && (
          <div className="flex justify-center my-6">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-200/50 dark:bg-slate-800/50 px-3 py-1 rounded-full uppercase tracking-widest">
              {getFormattedDate(msg.timestamp)}
            </span>
          </div>
        )}

        {/* CONTAINER DA MENSAGEM */}
        <div className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
          <div 
            className={`
              relative max-w-[85%] px-4 py-2 text-sm shadow-sm transition-all
              ${isMe 
                ? 'bg-red-600 text-white rounded-2xl rounded-tr-none ml-auto' 
                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-2xl rounded-tl-none mr-auto border border-slate-200 dark:border-slate-700'
              }
            `}
          >
            <p className="leading-relaxed whitespace-pre-wrap break-words">
                {formatMessage(msg.text)}
            </p>
            
            <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? 'text-red-200' : 'text-slate-400'}`}>
              <span className="text-[10px] opacity-70">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {isMe && <CheckCheck size={12} className="opacity-80" />}
            </div>
          </div>
        </div>
      </React.Fragment>
    );
  })}
  <div ref={messagesEndRef} />
</div>

    {/* 3. CAMPO DE INPUT: Também não use 'fixed'. Ele deve ser o rodapé deste container */}
    {/* 3. INPUT (Estilo Premium) */}
<div className="shrink-0 p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
  <form onSubmit={handleSend} className="max-w-2xl mx-auto relative flex items-center gap-2">
    <div className="relative flex-1">
      <input
        type="text"
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        placeholder="Escreva uma mensagem..."
        disabled={sending}
        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl pl-5 pr-12 py-3.5 focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 outline-none transition-all text-base shadow-inner"
      />
      <button 
        type="submit" 
        disabled={!inputText.trim() || sending} 
        className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-red-600 rounded-xl text-white shadow-lg shadow-red-500/30 active:scale-90 transition-all disabled:grayscale disabled:opacity-30"
      >
        {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
      </button>
    </div>
  </form>
</div>
  </div>
);
};

export default Chat;