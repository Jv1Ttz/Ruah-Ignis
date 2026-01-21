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
      <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400">
        <Loader2 className="animate-spin mb-2" />
        <p className="text-sm">Carregando conversa...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col relative w-full -mt-4">
      {/* Header Fixo */}
      {/* --- SELETOR DE ABAS (FIXO) --- */}
      <div className="fixed top-16 left-0 right-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-2 shadow-sm flex gap-2">
        <button
          onClick={() => setActiveTab('sent')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors border ${
            activeTab === 'sent' 
              ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/50' 
              : 'bg-transparent text-slate-500 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          Quem eu tirei
        </button>
        <button
          onClick={() => setActiveTab('received')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors border ${
            activeTab === 'received' 
              ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/50' 
              : 'bg-transparent text-slate-500 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          Meu Anjo 🕵️
        </button>
      </div>
      
      {/* Espaçador invisível para não esconder o conteúdo atrás das abas fixas */}
      <div className="mt-14"></div>

      {/* Lista de Mensagens */}
      <div className="flex-1 px-4 pt-2 pb-24 space-y-4"> {/* Ajustei padding */}
        {messages.length === 0 && !loading && (
          <div className="text-center text-slate-600 dark:text-slate-600 text-sm mt-10 p-6 bg-white/50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800/50">
            <p className="font-medium text-slate-500 dark:text-slate-400">Comece a conversa!</p>
            <p className="mt-2 text-slate-700 dark:text-slate-300">Seu amigo não saberá quem é você.</p>
          </div>
        )}

        {messages.map((msg, index) => {
          const isMe = msg.senderId === 'me';
          const prevMsg = messages[index - 1];
          const isNewDay = !prevMsg || new Date(msg.timestamp).toDateString() !== new Date(prevMsg.timestamp).toDateString();

          return (
            <React.Fragment key={msg.id}>
              {isNewDay && (
                <div className="flex justify-center my-6">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full shadow-sm border border-slate-200 dark:border-slate-700 uppercase tracking-widest">
                    {getFormattedDate(msg.timestamp)}
                  </span>
                </div>
              )}

              {/* Container da Mensagem */}
              <div className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`
                    relative max-w-[80%] px-4 py-2 text-sm shadow-md transition-all
                    ${isMe 
                      ? 'bg-red-600 text-white rounded-2xl rounded-tr-none ml-auto' // Estilo PARA MIM (Direita, Vermelho)
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-2xl rounded-tl-none mr-auto border border-slate-100 dark:border-slate-700' // Estilo PARA AMIGO (Esquerda, Branco)
                    }
                  `}
                >
                  <p className="leading-relaxed whitespace-pre-wrap break-words">
                      {formatMessage(msg.text)}
                  </p>
                  
                  <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? 'text-red-200' : 'text-slate-400'}`}>
                    <span className="text-[10px]">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {/* Ícone de check para mensagem enviada */}
                    {isMe && <CheckCheck size={12} className="opacity-80" />}
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Fixo */}
      <div className="fixed bottom-20 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-3 shadow-2xl transition-colors duration-300">
        <div className="max-w-md mx-auto w-full">
          <form onSubmit={handleSend} className="relative flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Digite sua mensagem..."
              disabled={sending}
              className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-full pl-5 pr-12 py-3 focus:ring-1 focus:ring-red-500 outline-none transition-all shadow-inner disabled:opacity-70"
            />
            <button 
              type="submit" 
              disabled={!inputText.trim() || sending} 
              className="absolute right-2 p-2 bg-red-600 rounded-full text-white hover:bg-red-500 disabled:opacity-50 transition-all shadow-lg active:scale-95 flex items-center justify-center"
            >
              {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Chat;