import React, { useEffect, useState } from 'react';
import { User } from './types';
import { storageService } from './services/storage';
import Header from './components/Header';
import Navigation from './components/Navigation';
import FlameComponent from './components/Flame';
import Ranking from './components/Ranking';
import Chat from './components/Chat';
import Onboarding from './components/Onboarding';
import SplashScreen from './components/SplashScreen';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'ranking' | 'chat'>('home');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const initApp = async () => {
      // 1. Carrega o tema
      const storedTheme = localStorage.getItem('ruah_theme') as 'light' | 'dark';
      setTheme(storedTheme || 'light');

      // 2. Tenta buscar o usuário no Supabase (AGORA COM AWAIT!)
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

    // Timer da Splash Screen
    const splashTimer = setTimeout(() => setShowSplash(false), 4000);
    return () => clearTimeout(splashTimer);
  }, []);

  // Aplica o tema no HTML
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('ruah_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  const handleUpdateUser = (updatedUser: User) => setUser(updatedUser);

  if (loading || showSplash) return <SplashScreen />;

  // Se não tem usuário OU não selecionou o alvo -> Tela de Cadastro/Seleção
  if (!user || !user.targetId) {
    return <Onboarding currentUser={user} onComplete={handleUpdateUser} />;
  }

  // App Principal
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-20 transition-colors duration-300">
      <Header user={user} onUpdateUser={handleUpdateUser} toggleTheme={toggleTheme} currentTheme={theme} />
      
      <main className="pt-20 h-full max-w-md mx-auto relative">
        {activeTab === 'home' && <FlameComponent user={user} onUpdateUser={handleUpdateUser} />}
        {activeTab === 'ranking' && <Ranking />}
        {activeTab === 'chat' && <Chat user={user} />}
      </main>

      <Navigation currentTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default App;