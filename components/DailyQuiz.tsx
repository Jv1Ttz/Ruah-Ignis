import React, { useEffect, useState } from 'react';
import { storageService } from '../services/storage';
import { Trophy, HelpCircle, CheckCircle, XCircle } from 'lucide-react';

interface QuizData {
  id: number;
  question: string;
  options: string[];
  xp: number;
  answered: boolean;
  correct?: boolean;
  correctIndex?: number;
}

const DailyQuiz: React.FC = () => {
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Estado local para a animação
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const [correctIdx, setCorrectIdx] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      const data = await storageService.getTodayQuiz();
      setQuiz(data);
      
      if (data?.answered) {
        setResult(data.correct ? 'correct' : 'wrong');
        // Se já respondeu, define qual era a certa para mostrar o feedback visual
        if (typeof data.correctIndex === 'number') {
           setCorrectIdx(data.correctIndex);
        }
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleOptionClick = async (index: number) => {
    if (result || !quiz) return;
    
    setSelectedIdx(index); // Marca qual eu cliquei
    
    const response = await storageService.submitQuizAnswer(quiz.id, index);
    
    if (response.success) {
      setResult(response.isCorrect ? 'correct' : 'wrong');
      if (typeof response.correctIndex === 'number') {
        setCorrectIdx(response.correctIndex);
      }
      setQuiz({ ...quiz, answered: true, correct: response.isCorrect });
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-slate-400 animate-pulse">Carregando pergunta...</div>;
  }

  if (!quiz) {
    return (
      <div className="p-6 m-4 bg-yellow-50 border border-yellow-200 rounded-xl text-center">
        <h3 className="text-yellow-800 font-bold mb-2">Ops! Sem pergunta.</h3>
        <p className="text-sm text-yellow-700 mb-2">
          Não encontrei um quiz para a data de hoje:
        </p>
        <code className="bg-yellow-100 px-2 py-1 rounded text-xs font-mono block mb-2">
          {new Date().toISOString().split('T')[0]} (Data do seu PC)
        </code>
        <p className="text-xs text-slate-500">
          Verifique se você rodou o script SQL de inserção no Supabase.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-6 mt-4 mb-2 z-20 relative">
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200 dark:border-slate-800 shadow-lg rounded-2xl overflow-hidden relative">
        
        {/* Faixa de XP */}
        <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-sm flex items-center gap-1 z-10">
          <Trophy size={10} /> +{quiz.xp} XP
        </div>

        <div className="p-5">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2 flex items-center gap-1">
            <HelpCircle size={12} /> Quiz do Dia
          </h3>
          
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-5 leading-relaxed">
            {quiz.question}
          </p>

          <div className="space-y-2.5">
            {quiz.options.map((option, idx) => {
              // Lógica de Cores dos Botões
              let btnClass = "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300";
              let icon = null;

              if (result) {
                // Se for a opção CORRETA (sempre fica verde)
                if (idx === correctIdx) {
                    btnClass = "bg-green-50 border-green-500 text-green-700 dark:bg-green-900/20 dark:border-green-500/50 dark:text-green-400 font-bold shadow-[0_0_10px_rgba(34,197,94,0.2)]";
                    icon = <CheckCircle size={16} className="text-green-600 dark:text-green-400"/>;
                }
                // Se for a opção que eu ERREI (fica vermelha)
                else if (idx === selectedIdx && result === 'wrong') {
                    btnClass = "bg-red-50 border-red-300 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 opacity-80";
                    icon = <XCircle size={16} className="text-red-500"/>;
                }
                // As outras opções ficam apagadinhas
                else {
                    btnClass = "opacity-40 grayscale border-transparent";
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleOptionClick(idx)}
                  disabled={!!result}
                  className={`w-full text-left px-4 py-3.5 rounded-xl border text-sm font-medium transition-all duration-300 flex items-center justify-between group active:scale-[0.98] ${btnClass}`}
                >
                  <span className="flex-1 pr-2">{option}</span>
                  {icon}
                </button>
              );
            })}
          </div>

          {/* Feedback Final */}
          {result === 'correct' && (
            <div className="mt-4 text-xs text-center text-green-600 dark:text-green-400 font-bold animate-bounce-small bg-green-50 dark:bg-green-900/20 py-2 rounded-lg">
              Boa! Ganhaste +{quiz.xp} pontos! 🎉
            </div>
          )}
          {result === 'wrong' && (
            <div className="mt-4 text-xs text-center text-red-500 dark:text-red-400 font-medium bg-red-50 dark:bg-red-900/20 py-2 rounded-lg">
              Ah não! A resposta certa era outra. Amanhã tem mais!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DailyQuiz;