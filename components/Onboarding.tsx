import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { storageService } from '../services/storage';
import { ChevronRight, Check, Users, Lock, LogIn, UserPlus } from 'lucide-react';

interface OnboardingProps {
  onComplete: (user: User) => void;
  currentUser: User | null;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete, currentUser }) => {
  const [step, setStep] = useState<'identify' | 'auth' | 'target' | 'forceChange'>(currentUser ? 'target' : 'identify');
  
  // Form States
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false); // True = Novo Usuário, False = Login
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [pendingUser, setPendingUser] = useState<User | null>(null); // usuário temporário para troca de senha
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [changeError, setChangeError] = useState('');
  
  // UI States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [members, setMembers] = useState<User[]>([]);

  // ATUALIZAÇÃO 1: Carrega apenas os disponíveis
  useEffect(() => {
    if (step === 'target') {
      const loadMembers = async () => {
        // Trocamos getAllProfiles por getAvailableTargets
        const availableList = await storageService.getAvailableTargets();
        setMembers(availableList);
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
        // Se entrou com a senha padrão, força troca de senha antes de prosseguir
        const DEFAULT_PASSWORD = '12345';
        if (password.trim() === DEFAULT_PASSWORD) {
          setPendingUser(user);
          setStep('forceChange');
        } else {
          onComplete(user); // Atualiza o App.tsx
          // Se o usuário já tem target (login antigo), o App.tsx vai redirecionar sozinho.
          // Se não tem (novo cadastro), vamos forçar o passo target aqui:
          if (!user.targetId) {
            setStep('target'); 
          }
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

  // Força troca de senha quando o usuário entrou com a senha padrão
  const handleChangePassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    console.log('handleChangePassword called', { newPassword, confirmPassword, pendingUser });
    setChangeError('');
    if (!pendingUser) return;
    if (!newPassword.trim() || newPassword.trim().length < 4) {
      setChangeError('Senha muito curta (mínimo 4 caracteres).');
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangeError('Confirmação não coincide.');
      return;
    }

    setChangingPassword(true);
    try {
      const updated = await storageService.updatePassword(newPassword.trim());
      console.log('updatePassword result', updated);
      if (!updated) {
        setChangeError('Erro ao atualizar senha. Tente novamente.');
        setChangingPassword(false);
        return;
      }
      // Recarrega usuário atualizado e segue para seleção de target se ainda não tiver
      onComplete(updated);
      // Força o passo de seleção de target nesta tela caso o componente não seja remontado
      if (!updated.targetId) {
        setStep('target');
      }
    } catch (err) {
      console.error('Erro handleChangePassword', err);
      setChangeError('Erro ao atualizar senha.');
    } finally {
      setChangingPassword(false);
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

  // Tela de troca forçada de senha
  if (step === 'forceChange') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50 dark:bg-slate-950 text-center">
        <div className="mb-6 p-3 bg-red-50 dark:bg-slate-900 rounded-full">
          <UserPlus className="text-red-500" size={32}/>
        </div>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Primeiro acesso</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm">
          Você entrou com a senha padrão. Por favor, escolha uma nova senha para proteger sua conta.
        </p>

        <form onSubmit={handleChangePassword} className="w-full max-w-sm">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Nova senha"
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-5 py-4 mb-4 focus:ring-2 focus:ring-red-500 outline-none"
            autoFocus
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirme a nova senha"
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-5 py-4 mb-4 focus:ring-2 focus:ring-red-500 outline-none"
          />

          {changeError && <p className="text-red-500 text-sm mb-4 bg-red-50 dark:bg-red-900/20 p-2 rounded">{changeError}</p>}

          <div className="flex gap-2">
            <button 
              type="button"
              onClick={() => setStep('auth')}
              className="px-4 py-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900"
            >
              Voltar
            </button>
            <button 
              type="submit"
              onClick={() => handleChangePassword()}
              disabled={changingPassword}
              className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"
            >
              {changingPassword ? 'Alterando...' : 'Alterar senha'}
            </button>
          </div>
        </form>
      </div>
    );
  }
  // Tela 3: Seleção (Target) - Lista rolável para mobile
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50 dark:bg-slate-950 text-center">
      <div className="mb-6 p-3 bg-red-50 dark:bg-slate-900 rounded-full">
        <Users className="text-red-500" size={32} />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Quem você tirou?</h2>
      <p className="text-slate-500 dark:text-slate-400 mb-4 text-sm">Selecione seu amigo secreto na lista.</p>

      <div className="w-full max-w-sm space-y-4 flex flex-col">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 max-h-[45vh] overflow-y-auto">
          {members.length === 0 && (
            <div className="text-sm text-slate-500 p-4">Nenhum membro disponível.</div>
          )}
          {members.map(m => {
            const isSelected = selectedTarget === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setSelectedTarget(m.id)}
                className={`w-full text-left px-4 py-3 my-1 rounded-lg transition-colors flex items-center justify-between ${
                  isSelected
                    ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 font-medium'
                    : 'bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-900 dark:text-white'
                }`}
              >
                <span className="truncate">{m.name}</span>
                {isSelected && <Check size={16} className="text-red-600" />}
              </button>
            );
          })}
        </div>

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