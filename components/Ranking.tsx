import React, { useEffect, useState } from 'react';
import { User, BadgeType } from '../types';
import { storageService } from '../services/storage';
import { getBadgeForStreak } from '../constants';
import { GiSparkles, GiCampfire, GiTorch, GiFireBowl, GiOpenBook } from 'react-icons/gi';
import { FaCrown, FaFire } from 'react-icons/fa6';

// Helper component to render animated icons based on badge type
const BadgeIcon: React.FC<{ type: BadgeType }> = ({ type }) => {
  switch (type) {
    case BadgeType.BLAZE:
      return (
        <div className="relative w-10 h-10 flex items-center justify-center text-red-600 animate-breathing-glow drop-shadow-[0_0_10px_rgba(220,38,38,0.8)]">
          <GiFireBowl size={36} />
        </div>
      );
    case BadgeType.TORCH:
      return (
        <div className="relative w-8 h-8 flex items-center justify-center text-red-500 animate-flicker drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]">
           <GiTorch size={32} />
        </div>
      );
    case BadgeType.EMBER:
      return (
        <div className="relative w-8 h-8 flex items-center justify-center text-orange-500 animate-pulse-slow">
           <GiCampfire size={28} />
        </div>
      );
    case BadgeType.SPARK:
    default:
      return (
        <div className="relative w-8 h-8 flex items-center justify-center text-yellow-500 dark:text-yellow-400 animate-bounce-small">
          <GiSparkles size={24} />
        </div>
      );
  }
};

const Ranking: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'streak' | 'score'>('streak');
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true); // Mostra loading ao trocar aba
      try {
        let list: User[] = [];
        
        // --- AQUI ESTÁ A MUDANÇA FUNCIONAL ---
        if (activeTab === 'streak') {
           list = await storageService.getStreakLeaderboard();
        } else {
           list = await storageService.getScoreLeaderboard();
        }
        setUsers(list);

        const currentUser = await storageService.getUser();
        if (currentUser) {
          setCurrentUserId(currentUser.id);
        }
      } catch (error) {
        console.error("Erro ao carregar ranking", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [activeTab]); // Recarrega quando muda a aba

  if (loading && users.length === 0) { // Loading inicial
    return (
      <div className="p-8 flex justify-center h-full items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 pb-24">
      
      {/* Header com Botões de Troca */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white pl-2 flex items-center gap-2 transition-colors">
          <span className="text-red-600 dark:text-red-500"><FaCrown /></span> Ranking
        </h2>
        
        {/* Botões de Alternância */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('streak')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'streak' 
                ? 'bg-white dark:bg-slate-700 text-red-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <FaFire /> Ofensiva
          </button>
          <button
            onClick={() => setActiveTab('score')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'score' 
                ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <GiOpenBook size={16} /> Quiz
          </button>
        </div>
      </div>
      
      {/* Lista Vazia? */}
      {users.length === 0 && !loading && (
        <div className="text-center text-slate-500 mt-10">
          Ninguém pontuou ainda. Seja o primeiro!
        </div>
      )}
      
      <div className="space-y-3">
        {users.map((user, index) => {
          const badge = getBadgeForStreak(user.streak);
          const isTop3 = index < 3;
          const isMe = user.id === currentUserId;
          
          // Define o que mostrar: Dias ou XP
          const valueDisplay = activeTab === 'streak' ? user.streak : (user.score || 0);
          const labelDisplay = activeTab === 'streak' ? 'Dias' : 'Pts';

          return (
            <div 
              key={user.id}
              className={`flex items-center p-3 sm:p-4 rounded-xl border transition-all relative overflow-hidden group
                ${isMe 
                    ? 'border-red-500 dark:border-red-500 bg-red-50 dark:bg-red-900/20 ring-1 ring-red-500/50' 
                    : isTop3 
                        ? 'bg-gradient-to-r from-white via-slate-50 to-white dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-red-200 dark:border-red-900/40 shadow-sm' 
                        : 'bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }
              `}
            >
              {/* Rank Position */}
              <div className={`w-8 font-bold text-lg mr-3 sm:mr-4 text-center font-cinzel
                ${index === 0 ? 'text-yellow-500 dark:text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)] scale-110' : 
                  index === 1 ? 'text-slate-400 dark:text-slate-300' : 
                  index === 2 ? 'text-orange-600 dark:text-orange-700' : 'text-slate-400 dark:text-slate-600'}
              `}>
                {index + 1}º
              </div>

              {/* Avatar */}
              <div className="relative mr-4 shrink-0">
                 <div className={`rounded-full p-[2px] transition-all duration-500
                   ${index === 0 ? 'bg-gradient-to-tr from-yellow-500 via-red-500 to-purple-600 animate-spin-slow' : 'bg-slate-200 dark:bg-slate-700'}
                 `}>
                   <img 
                     src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff`} 
                     alt={user.name} 
                     className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-white dark:border-slate-900 
                       ${index === 0 ? 'animate-[spin_3s_linear_infinite_reverse]' : ''}
                     `} 
                   />
                 </div>
                 {index === 0 && (
                   <span className="absolute -top-3 -right-2 text-lg animate-bounce-small z-10 filter drop-shadow-lg">👑</span>
                 )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 pr-2">
                <h3 className={`font-medium text-sm sm:text-base truncate transition-colors flex items-center gap-2
                    ${isMe ? 'text-red-700 dark:text-red-400 font-bold' : 'text-slate-900 dark:text-white'}
                `}>
                  {user.name} 
                  {isMe && <span className="text-[10px] bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Você</span>}
                </h3>
                
                {/* Mostra Badge apenas se for Foguinho */}
                {activeTab === 'streak' ? (
                    <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
                      <span className={`${badge.color} font-bold tracking-wide flex items-center gap-1`}>
                        {badge.type}
                      </span>
                    </div>
                ) : (
                    <div className="flex items-center gap-1 text-xs text-indigo-500 dark:text-indigo-400 mt-1">
                      <span className="font-bold tracking-wide">Mestre do Quiz</span>
                    </div>
                )}
              </div>

              {/* Valor (Streak ou XP) */}
              <div className="flex flex-col items-end mr-2 sm:mr-4">
                <span className={`text-xl font-bold leading-none tracking-tight transition-colors 
                    ${activeTab === 'score' ? 'text-indigo-600 dark:text-indigo-400' : (isTop3 ? 'text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400')}
                `}>
                  {valueDisplay}
                </span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-semibold">
                    {labelDisplay}
                </span>
              </div>
              
              {/* Ícone Animado (Só aparece no Foguinho) */}
              {activeTab === 'streak' && (
                  <div className="ml-1 shrink-0 transform group-hover:scale-110 transition-transform duration-300">
                    <BadgeIcon type={badge.type} />
                  </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Ranking;