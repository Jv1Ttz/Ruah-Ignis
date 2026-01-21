import React, { useEffect, useState } from 'react';
import { User } from './types';
import { storageService } from './services/storage';

// --- Imports do Capacitor (Apenas Core e StatusBar) ---
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

// --- Seus Componentes ---
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

  // --- EFEITO: Inicialização, Tema e Status Bar (Sem Notificações) ---
  useEffect(() => {
    const initApp = async () => {
      // 1. Carrega Tema
      const storedTheme = localStorage.getItem('ruah_theme') as 'light' | 'dark';
      setTheme(storedTheme || 'light');

      // 2. Configurações Visuais Nativas (Android/iOS)
      if (Capacitor.isNativePlatform()) {
        try {
           // Deixa a barra de status transparente (conteúdo passa por baixo)
           await StatusBar.setOverlaysWebView({ overlay: true });
           // Define a cor dos ícones da barra (Dark = ícones pretos, Light = brancos)
           await StatusBar.setStyle({ style: storedTheme === 'dark' ? Style.Dark : Style.Light });
        } catch (e) {
          console.error("Erro native visual init:", e);
        }
      }

      // 3. Carrega Usuário do Supabase
      try {
        const storedUser = await storageService.getUser();
        setUser(storedUser);
      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
      } finally {
        setLoading(false);
      }
    };

    initApp();

    const splashTimer = setTimeout(() => setShowSplash(false), 4000);
    return () => clearTimeout(splashTimer);
  }, []);

  // Aplica o tema no HTML
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    
    // Atualiza a cor da StatusBar se o tema mudar
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

  // --- LAYOUT PRINCIPAL (Mantido o ajuste de Safe Area) ---
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
      
      {/* HEADER FIXO */}
      <div className="fixed top-0 left-0 right-0 z-50 pt-safe bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
         <Header user={user} onUpdateUser={handleUpdateUser} toggleTheme={toggleTheme} currentTheme={theme} />
      </div>
      
      {/* CONTEÚDO COM SCROLL */}
      <main className="pt-28 pb-28 min-h-screen max-w-md mx-auto relative px-4 overflow-y-auto">
        {activeTab === 'home' && <FlameComponent user={user} onUpdateUser={handleUpdateUser} />}
        {activeTab === 'ranking' && <Ranking />}
        {activeTab === 'chat' && <Chat user={user} />}
        {activeTab === 'quiz' && (
          <div className="flex flex-col items-center pt-4">
             <h2 className="text-xl font-bold mb-4 text-indigo-600 dark:text-indigo-400">Desafio Diário</h2>
             <DailyQuiz />
          </div>
        )}
      </main>

      {/* NAVEGAÇÃO FIXA EM BAIXO */}
      <div className="fixed bottom-0 left-0 right-0 z-50 pb-safe bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <Navigation currentTab={activeTab} onTabChange={setActiveTab} />
      </div>

    </div>
  );
};

export default App;