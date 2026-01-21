import React from 'react';
import { Flame, Trophy, MessageSquare, HelpCircle } from 'lucide-react'; // Adicionei HelpCircle

interface NavigationProps {
  // Mantive 'home' e adicionei 'quiz'
  currentTab: 'home' | 'ranking' | 'chat' | 'quiz';
  onTabChange: (tab: 'home' | 'ranking' | 'chat' | 'quiz') => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentTab, onTabChange }) => {
  // Mantive sua função de estilo original
  const getButtonClass = (isActive: boolean) => 
    `flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300 ${
      isActive ? 'text-red-600 dark:text-red-500' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
    }`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pb-4 z-50 transition-colors duration-300">
      <div className="flex justify-around items-center h-full max-w-md mx-auto">
        
        {/* Foguinho (Home) */}
        <button 
          onClick={() => onTabChange('home')}
          className={getButtonClass(currentTab === 'home')}
        >
          <Flame 
            size={24} 
            className={`${currentTab === 'home' ? 'fill-red-100 dark:fill-red-500/20' : ''}`} 
          />
          <span className="text-xs font-medium">Foguinho</span>
        </button>

        {/* NOVO: Quiz */}
        <button 
          onClick={() => onTabChange('quiz')}
          className={getButtonClass(currentTab === 'quiz')}
        >
          <HelpCircle 
            size={24} 
            className={`${currentTab === 'quiz' ? 'fill-red-100 dark:fill-red-500/20' : ''}`} 
          />
          <span className="text-xs font-medium">Quiz</span>
        </button>

        {/* Ranking */}
        <button 
          onClick={() => onTabChange('ranking')}
          className={getButtonClass(currentTab === 'ranking')}
        >
          <Trophy size={24} className={`${currentTab === 'ranking' ? 'fill-red-100 dark:fill-red-500/20' : ''}`} />
          <span className="text-xs font-medium">Ranking</span>
        </button>

        {/* Chat */}
        <button 
          onClick={() => onTabChange('chat')}
          className={getButtonClass(currentTab === 'chat')}
        >
          <MessageSquare size={24} className={`${currentTab === 'chat' ? 'fill-red-100 dark:fill-red-500/20' : ''}`} />
          <span className="text-xs font-medium">Chat</span>
        </button>

      </div>
    </nav>
  );
};

export default Navigation;