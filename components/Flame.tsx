import React, { useEffect, useState } from 'react';
import { storageService } from '../services/storage';
import { User } from '../types';
import { GROUP_MEMBERS } from '../constants';
import { Sparkles, Flame, CloudFog, Wind } from 'lucide-react';

interface FlameProps {
  user: User;
  onUpdateUser: (u: User) => void;
}

const FlameComponent: React.FC<FlameProps> = ({ user, onUpdateUser }) => {
  const [prayedToday, setPrayedToday] = useState(false);
  const [targetName, setTargetName] = useState('Amigo Secreto');
  const [animating, setAnimating] = useState(false);
  const [loading, setLoading] = useState(true);

  // Verifica se o fogo apagou (streak 0)
  const isExtinguished = user.streak === 0;

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const hasPrayed = await storageService.hasPrayedToday();
        setPrayedToday(hasPrayed);
        
        // Lógica para pegar o nome do alvo
        const friend = GROUP_MEMBERS.find(m => m.id === user.targetId);
        if (friend) setTargetName(friend.name);
        
        if (!friend && user.targetId) {
            const allProfiles = await storageService.getAllProfiles();
            const targetProfile = allProfiles.find(p => p.id === user.targetId);
            if (targetProfile) setTargetName(targetProfile.name);
        }
      } catch (error) {
        console.error("Erro ao verificar oração:", error);
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
  }, [user.targetId]);

  const handleIgnite = async () => {
    if (prayedToday || loading) return;

    setAnimating(true);
    
    const { success, streak } = await storageService.logPrayer();
    
    if (success) {
      // Recarrega o usuário para obter também o maxStreak atualizado
      const refreshed = await storageService.getUser();
      if (refreshed) {
        onUpdateUser(refreshed);
      } else {
        const updatedUser = { ...user, streak };
        onUpdateUser(updatedUser);
      }
      setPrayedToday(true);
    }
    
    setTimeout(() => setAnimating(false), 2000);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-10 relative overflow-hidden w-full">
      
      {/* Background Glow (Vermelho se aceso, Cinza se apagado) */}
      <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full blur-[100px] transition-all duration-1000 
        ${prayedToday ? 'bg-red-500/10 dark:bg-red-600/20 opacity-100' : isExtinguished ? 'bg-slate-500/10 opacity-50' : 'bg-transparent opacity-0'}`} 
      />

      <div className="z-10 text-center mb-12 relative w-full">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight transition-colors">
          {isExtinguished ? "A Chama Apagou..." : "Mantenha a Chama"}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm transition-colors">
          {loading ? "Verificando..." : (
            prayedToday 
              ? `Você já orou por ${targetName} hoje.`
              : isExtinguished 
                ? `Reze agora para reacender o fogo!` 
                : `Reze por ${targetName} para acender.`
          )}
        </p>
      </div>

      <button
        onClick={handleIgnite}
        disabled={prayedToday || loading}
        className={`relative group transition-all duration-300 ease-in-out transform outline-none
          ${(prayedToday || loading) ? 'cursor-default' : 'cursor-pointer active:scale-95'}
        `}
      >
        {/* Circle Container */}
        <div className={`w-64 h-64 rounded-full flex items-center justify-center transition-all duration-700 border-4 relative
          ${prayedToday 
            ? 'bg-red-50 border-red-200 dark:bg-red-500/5 dark:border-red-500/30 shadow-[0_0_40px_rgba(239,68,68,0.2)]' 
            : isExtinguished
              ? 'bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-600' // Estilo cinza/morto
              : 'bg-white border-slate-200 hover:border-slate-300 dark:bg-slate-900 dark:border-slate-800 dark:hover:border-slate-700'
          }
        `}>
          
          {/* LÓGICA DE ÍCONE: Se apagado (streak 0) mostra Nuvem, senão mostra Chama */}
          {isExtinguished && !prayedToday ? (
             <div className="relative">
                <CloudFog 
                  size={120} 
                  strokeWidth={1}
                  className="text-slate-400 dark:text-slate-500 animate-pulse"
                />
                <Wind 
                  size={40} 
                  strokeWidth={1.5}
                  className="absolute -right-4 top-0 text-slate-300 dark:text-slate-600 animate-bounce"
                />
             </div>
          ) : (
            <Flame 
              size={140} 
              strokeWidth={1}
              className={`transition-all duration-1000 ease-in-out
                ${prayedToday 
                  ? 'text-red-600 fill-red-600 animate-breathing-glow' 
                  : 'text-slate-300 dark:text-slate-700 fill-transparent group-hover:text-slate-400 dark:group-hover:text-slate-600'
                }
              `}
            />
          )}

        </div>

        {/* Particles (Só aparecem se estiver animando ou já aceso) */}
        {animating && (
           <>
             <span className="absolute top-4 left-10 text-yellow-500 animate-[bounce_1s_infinite] opacity-80"><Sparkles size={24}/></span>
             <span className="absolute bottom-10 right-8 text-red-400 animate-[bounce_1.2s_infinite] delay-100 opacity-80"><Sparkles size={20}/></span>
             <span className="absolute -top-2 right-1/2 text-orange-500 animate-[bounce_0.8s_infinite] delay-75 opacity-80"><Sparkles size={28}/></span>
           </>
        )}
      </button>

      {/* Streak Counter (Só mostra se a chama NÃO estiver extinta OU se acabou de reacender) */}
      {(!isExtinguished || prayedToday) && (
        <div className="mt-12 bg-white/60 dark:bg-slate-900/80 backdrop-blur border border-slate-200 dark:border-slate-800 rounded-2xl py-3 px-8 flex flex-col items-center gap-1 shadow-lg transition-colors">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ofensiva</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-800 dark:text-white font-mono tracking-tighter transition-colors">{user.streak}</span>
            <span className="text-sm text-red-600 dark:text-red-500 font-medium">dias</span>
          </div>
          {/* Recorde máximo */}
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Recorde: <span className="font-semibold text-slate-700 dark:text-white">{user.maxStreak || 0} dias</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlameComponent;