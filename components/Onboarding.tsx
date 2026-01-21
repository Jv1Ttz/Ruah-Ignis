import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { storageService } from '../services/storage';
import { ChevronRight, Check, Users, Lock, LogIn, UserPlus } from 'lucide-react';

interface OnboardingProps {
  onComplete: (user: User) => void;
  currentUser: User | null;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete, currentUser }) => {
  const [step, setStep] = useState<'identify' | 'auth' | 'target'>(currentUser ? 'target' : 'identify');
  
  // Form States
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false); // True = Novo Usuário, False = Login
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  
  // UI States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [members, setMembers] = useState<User[]>([]);

  // Carrega lista de membros para o dropdown
  useEffect(() => {
    if (step === 'target') {
      const loadMembers = async () => {
        const list = await storageService.getAllProfiles();
        const others = list.filter(u => u.id !== currentUser?.id);
        setMembers(others);
      };
      loadMembers();
    }
  }, [step, currentUser]);

  // --- Passo 1: Identificar (Verifica se nome existe) ---
  const handleIdentify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');

    try {
      const exists = await storageService.checkUserExists(name.trim());
      setIsRegistering(!exists); // Se não existe, vamos registrar
      setStep('auth');
    } catch (err) {
      setError('Erro ao verificar usuário.');
    } finally {
      setLoading(false);
    }
  };

  // --- Passo 2: Autenticação (Login ou Cadastro) ---
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError('');

    try {
      let user: User | null = null;

      if (isRegistering) {
        user = await storageService.register(name.trim(), password.trim());
      } else {
        user = await storageService.login(name.trim(), password.trim());
      }

      if (user) {
        onComplete(user); // Atualiza o App.tsx
        // Se o usuário já tem target (login antigo), o App.tsx vai redirecionar sozinho.
        // Se não tem (novo cadastro), vamos forçar o passo target aqui:
        if (!user.targetId) {
          setStep('target'); 
        }
      } else {
        setError(isRegistering ? 'Erro ao criar conta.' : 'Senha incorreta.');
      }
    } catch (err) {
      setError('Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // --- Passo 3: Selecionar Amigo ---
  const handleTargetSubmit = async () => {
    if (!selectedTarget) return;
    setLoading(true);
    const updated = await storageService.updateUserTarget(selectedTarget);
    setLoading(false);
    if (updated) onComplete(updated);
  };

  // RENDERIZAÇÃO
  
  // Tela 1: Digitar Nome
  if (step === 'identify') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50 dark:bg-slate-950 text-center">
        <div className="mb-8 p-4 rounded-full bg-red-100 dark:bg-red-500/10">
          <svg className="w-16 h-16 text-red-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 23C6.48 23 2 18.52 2 13C2 7.48 6.48 3 12 3s10 4.48 10 10c0 5.52-4.48 10-10 10zm0-2c4.41 0 8-3.59 8-8 0-4.41-3.59-8-8-8s-8 3.59-8 8 3.59 8 8 8z" fill="none"/></svg>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-8 font-cinzel">Ruah Ignis</h1>
        
        <form onSubmit={handleIdentify} className="w-full max-w-sm">
          <label className="block text-left text-sm font-medium text-slate-500 mb-1 ml-1">Qual seu nome?</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: João Silva"
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-5 py-4 mb-4 focus:ring-2 focus:ring-red-500 outline-none"
            autoFocus
          />
          <button 
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"
          >
            {loading ? 'Verificando...' : <>Continuar <ChevronRight size={20} /></>}
          </button>
        </form>
      </div>
    );
  }

  // Tela 2: Senha (Login ou Cadastro)
  if (step === 'auth') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50 dark:bg-slate-950 text-center">
        <div className="mb-6 p-3 bg-red-50 dark:bg-slate-900 rounded-full">
          {isRegistering ? <UserPlus className="text-red-500" size={32}/> : <LogIn className="text-red-500" size={32}/>}
        </div>
        
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          {isRegistering ? `Olá, ${name}!` : `Bem-vindo de volta, ${name}!`}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm">
          {isRegistering 
            ? 'Crie uma senha simples para proteger sua conta.' 
            : 'Digite sua senha para entrar.'}
        </p>

        <form onSubmit={handleAuth} className="w-full max-w-sm">
          <div className="relative mb-4">
            <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua senha"
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl pl-12 pr-5 py-4 focus:ring-2 focus:ring-red-500 outline-none"
              autoFocus
            />
          </div>

          {error && <p className="text-red-500 text-sm mb-4 bg-red-50 dark:bg-red-900/20 p-2 rounded">{error}</p>}
          
          <div className="flex gap-2">
            <button 
              type="button"
              onClick={() => setStep('identify')}
              className="px-4 py-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900"
            >
              Voltar
            </button>
            <button 
              type="submit"
              disabled={loading || !password.trim()}
              className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"
            >
              {loading ? 'Processando...' : (isRegistering ? 'Criar Conta' : 'Entrar')}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Tela 3: Seleção (Target) - Igual a anterior
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50 dark:bg-slate-950 text-center">
      <div className="mb-6 p-3 bg-red-50 dark:bg-slate-900 rounded-full">
        <Users className="text-red-500" size={32} />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Quem você tirou?</h2>
      <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm">Selecione seu amigo secreto na lista.</p>

      <div className="w-full max-w-sm space-y-4">
        <select
          value={selectedTarget}
          onChange={(e) => setSelectedTarget(e.target.value)}
          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-5 py-4 outline-none focus:border-red-500 appearance-none"
        >
          <option value="" disabled>Selecione um membro...</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <button 
          onClick={handleTargetSubmit}
          disabled={loading || !selectedTarget}
          className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"
        >
          {loading ? 'Salvando...' : <>Confirmar <Check size={20} /></>}
        </button>
      </div>
    </div>
  );
};

export default Onboarding;