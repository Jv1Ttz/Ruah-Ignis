import React, { useRef } from 'react';
import { User } from '../types';
import { Camera, Upload, Sun, Moon } from 'lucide-react';
import { storageService } from '../services/storage';

interface HeaderProps {
  user: User;
  onUpdateUser: (u: User) => void;
  toggleTheme: () => void;
  currentTheme: 'light' | 'dark';
}

const Header: React.FC<HeaderProps> = ({ user, onUpdateUser, toggleTheme, currentTheme }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        // CORREÇÃO: await na atualização do avatar
        const updated = await storageService.updateAvatar(base64);
        if (updated) onUpdateUser(updated);
      };
      
      reader.readAsDataURL(file);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center px-4 z-50 transition-colors duration-300">
      
      <button 
        onClick={toggleTheme}
        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors z-20"
      >
        {currentTheme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full text-center pointer-events-none">
        <span className="text-red-600 font-cinzel font-bold text-lg sm:text-xl tracking-wide pointer-events-auto drop-shadow-sm">Grupo Jovem RUAH</span>
      </div>

      <div className="flex items-center gap-3 ml-auto z-10 relative">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{user.name}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Streak: {user.streak} dias</p>
        </div>
        
        <div 
          className="relative group cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-slate-200 dark:border-slate-700 group-hover:border-red-500 transition-colors">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500">
                <Camera size={18} />
              </div>
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 bg-slate-100 dark:bg-slate-800 rounded-full p-1 border border-slate-200 dark:border-slate-700">
             <Upload size={10} className="text-red-500 dark:text-red-400" />
          </div>
        </div>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*"
          onChange={handleFileChange}
        />
      </div>
    </header>
  );
};

export default Header;