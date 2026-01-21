import React, { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';

const VERSES = [
  { text: "Alegrai-vos na esperança, sede pacientes na tribulação, perseverai na oração.", ref: "Romanos 12:12" },
  { text: "Orai sem cessar.", ref: "1 Tessalonicenses 5:17" },
  { text: "Tudo o que pedirdes na oração, crede que o recebestes, e ser-vos-á dado.", ref: "Marcos 11:24" },
  { text: "A oração de um justo é poderosa e eficaz.", ref: "Tiago 5:16" },
  { text: "Busquei o Senhor, e ele me respondeu; livrou-me de todos os meus temores.", ref: "Salmos 34:4" },
  { text: "Vigiai e orai, para que não entreis em tentação.", ref: "Mateus 26:41" },
  { text: "Perto está o Senhor de todos os que o invocam em verdade.", ref: "Salmos 145:18" }
];

const SplashScreen: React.FC = () => {
  const [verse, setVerse] = useState(VERSES[0]);

  useEffect(() => {
    // Select a random verse on mount
    const randomIndex = Math.floor(Math.random() * VERSES.length);
    setVerse(VERSES[randomIndex]);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 transition-colors duration-300">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-100/50 via-slate-50 to-slate-50 dark:from-red-900/20 dark:via-slate-950 dark:to-slate-950 pointer-events-none"></div>
      
      <div className="relative flex flex-col items-center w-full max-w-md">
        {/* Animated Icon */}
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-red-500 blur-2xl opacity-20 animate-pulse-slow rounded-full"></div>
          <Flame 
            size={80} 
            className="text-red-600 animate-breathing-glow drop-shadow-[0_0_15px_rgba(220,38,38,0.5)]" 
            strokeWidth={1.5}
            fill="currentColor"
            fillOpacity={0.1}
          />
        </div>

        {/* Title with Fade In */}
        <h1 className="font-cinzel text-4xl text-slate-900 dark:text-white font-bold tracking-wider mb-8 animate-[pulse_3s_ease-in-out_infinite]">
          RUAH <span className="text-red-600">IGNIS</span>
        </h1>
        
        {/* Biblical Verse */}
        <div className="mb-10 text-center animate-[flicker_4s_infinite_alternate]">
          <p className="font-serif italic text-lg text-slate-700 dark:text-slate-300 mb-2 leading-relaxed">
            "{verse.text}"
          </p>
          <span className="text-xs font-bold text-red-600 dark:text-red-500 uppercase tracking-widest">
            {verse.ref}
          </span>
        </div>

        {/* Loading Bar */}
        <div className="w-full max-w-[200px] h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative mb-4">
          <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-600 to-orange-500 rounded-full animate-progress shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
        </div>
      </div>
      
      {/* Footer Text */}
      <div className="absolute bottom-8 text-slate-400 dark:text-slate-600 text-[10px] uppercase tracking-widest">
        Quaresma 2026
      </div>
    </div>
  );
};

export default SplashScreen;