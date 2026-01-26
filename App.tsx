import React, { useEffect, useState } from 'react';
import { User } from './types';
import { storageService } from './services/storage';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

import Header from './components/Header';
import Navigation from './components/Navigation';
import FlameComponent from './components/Flame';
import Ranking from './components/Ranking';
import Chat from './components/Chat';
import Onboarding from './components/Onboarding';
import SplashScreen from './components/SplashScreen';
import DailyQuiz from './components/DailyQuiz'; 

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'ranking' | 'chat' | 'quiz'>('home');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const initApp = async () => {
      const storedTheme = localStorage.getItem('ruah_theme') as 'light' | 'dark';
      setTheme(storedTheme || 'light');

      if (Capacitor.isNativePlatform()) {
        try {
           await StatusBar.setOverlaysWebView({ overlay: true });
           await StatusBar.setStyle({ style: storedTheme === 'dark' ? Style.Dark : Style.Light });
        } catch (e) { console.error(e); }
      }

      try {
        const storedUser = await storageService.getUser();
        setUser(storedUser);
      } catch (error) { console.error(error); } 
      finally { setLoading(false); }
    };
    initApp();
    const timer = setTimeout(() => setShowSplash(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    
    if (Capacitor.isNativePlatform()) {
       StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light }).catch(() => {});
    }
    localStorage.setItem('ruah_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  const handleUpdateUser = (updatedUser: User) => setUser(updatedUser);

  if (loading || showSplash) return <SplashScreen />;

  if (!user || !user.targetId) {
    return <Onboarding currentUser={user} onComplete={handleUpdateUser} />;
  }

  // --- ESTRUTURA FLEXBOX (A SOLUÇÃO) ---
  return (
    // Container Principal: Ocupa a tela toda, sem scroll na janela principal
    <div className="flex flex-col h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300 overflow-hidden">
      
      {/* 1. Header Wrapper:
          - pt-[env(...)]: Adiciona padding automático no topo (atrás do relógio)
          - z-50: Fica em cima
      */}
      <div className="flex-none z-50 pt-[env(safe-area-inset-top)] bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
         <Header user={user} onUpdateUser={handleUpdateUser} toggleTheme={toggleTheme} currentTheme={theme} />
      </div>
      
      {/* 2. Conteúdo (Main):
          - flex-1: Cresce para ocupar todo o espaço do meio
          - overflow-y-auto: O scroll acontece SÓ AQUI dentro
      */}
      <main className="flex-1 overflow-y-auto relative px-4 py-4 scroll-smooth">
        {activeTab === 'home' && <FlameComponent user={user} onUpdateUser={handleUpdateUser} />}
        {activeTab === 'ranking' && <Ranking />}
        {activeTab === 'chat' && <Chat user={user} />}
        {activeTab === 'quiz' && (
          <div className="flex flex-col items-center">
             <h2 className="text-xl font-bold mb-4 text-indigo-600 dark:text-indigo-400">Desafio Diário</h2>
             <DailyQuiz />
          </div>
        )}
      </main>

      {/* 3. Navigation Wrapper:
          - pb-[env(...)]: Adiciona padding automático em baixo (barra de gestos)
      */}
      <div className="flex-none z-50 pb-[env(safe-area-inset-bottom)] bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <Navigation currentTab={activeTab} onTabChange={setActiveTab} />
      </div>

    </div>
  );
};

export default App;