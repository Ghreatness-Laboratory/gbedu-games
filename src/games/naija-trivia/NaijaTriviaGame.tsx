import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { soundEngine } from '../../audio/audioEngine';
import { GameResultModal } from '../../components/GameResultModal';
import { useWhotStore } from '../../store/useWhotStore';
import {
  ArrowLeft,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Clock,
  Flame,
  Trophy,
  Users,
  Bot,
  Coins,
  CheckCircle2,
  XCircle,
  Share2,
  Zap,
  Percent,
  PlusCircle,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import {
  NAIJA_TRIVIA_QUESTIONS,
  TriviaQuestion,
  getDailyTriviaQuestions,
  getRandomTriviaRound,
} from '../../data/naijaTriviaData';

type TriviaMode = 'daily' | 'quick' | 'ai' | 'pass';

interface NaijaTriviaGameProps {
  onBack: () => void;
  initialMode?: TriviaMode;
}

export const NaijaTriviaGame: React.FC<NaijaTriviaGameProps> = ({
  onBack,
  initialMode = 'daily',
}) => {
  const { user, stats } = useWhotStore();

  const [mode, setMode] = useState<TriviaMode>(initialMode);
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Answering state
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [timer, setTimer] = useState<number>(15);
  const [isTimerPaused, setIsTimerPaused] = useState(false);

  // Scores & streaks
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [turn, setTurn] = useState<'p1' | 'p2'>('p1');

  // Lifelines (used status per match)
  const [used5050, setUsed5050] = useState(false);
  const [usedHint, setUsedHint] = useState(false);
  const [usedExtraTime, setUsedExtraTime] = useState(false);
  const [hiddenOptions, setHiddenOptions] = useState<number[]>([]);
  const [crowdStats, setCrowdStats] = useState<Record<number, number> | null>(null);

  // Coins & share
  const [coins, setCoins] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gbedu_coins');
      return saved ? Number(saved) : 150;
    }
    return 150;
  });
  const [copiedShare, setCopiedShare] = useState(false);

  // Game Result Modal
  const [resultModal, setResultModal] = useState<{
    isOpen: boolean;
    outcome: 'win' | 'lose' | 'draw';
    title: string;
    description: string;
    score: number;
    coinsEarned: number;
    xpEarned: number;
  }>({
    isOpen: false,
    outcome: 'win',
    title: '',
    description: '',
    score: 0,
    coinsEarned: 0,
    xpEarned: 0,
  });

  const activeQuestion = questions[currentIndex] || NAIJA_TRIVIA_QUESTIONS[0];

  // Initialize round based on mode
  const initRound = (targetMode = mode) => {
    setMode(targetMode);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
    setScore(0);
    setStreak(0);
    setAiScore(0);
    setP2Score(0);
    setTurn('p1');
    setUsed5050(false);
    setUsedHint(false);
    setUsedExtraTime(false);
    setHiddenOptions([]);
    setCrowdStats(null);
    setTimer(15);
    setIsTimerPaused(false);

    if (targetMode === 'daily') {
      setQuestions(getDailyTriviaQuestions());
    } else {
      setQuestions(getRandomTriviaRound(10));
    }
  };

  useEffect(() => {
    initRound(mode);
  }, [mode]);

  // Question countdown timer
  useEffect(() => {
    if (isAnswerSubmitted || isTimerPaused || timer <= 0) return;

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleTimeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timer, isAnswerSubmitted, isTimerPaused, currentIndex]);

  const handleTimeOut = () => {
    soundEngine.playWrongSound();
    setIsAnswerSubmitted(true);
    setStreak(0);

    // AI answer if in AI mode
    if (mode === 'ai') {
      const aiCorrect = Math.random() > 0.35;
      if (aiCorrect) setAiScore((prev) => prev + 100);
    }
  };

  const handleSelectOption = (index: number) => {
    if (isAnswerSubmitted || hiddenOptions.includes(index)) return;
    soundEngine.playClick();
    setSelectedAnswer(index);
    setIsAnswerSubmitted(true);
    setIsTimerPaused(true);

    const isCorrect = index === activeQuestion.correctIndex;

    if (isCorrect) {
      soundEngine.playCorrectSound();
      const multiplier = streak >= 3 ? 2.5 : streak >= 2 ? 2.0 : streak >= 1 ? 1.5 : 1.0;
      const pts = Math.round((100 + timer * 5) * multiplier);

      if (mode === 'pass' && turn === 'p2') {
        setP2Score((prev) => prev + pts);
      } else {
        setScore((prev) => prev + pts);
      }
      setStreak((prev) => prev + 1);
    } else {
      soundEngine.playWrongSound();
      setStreak(0);
    }

    // Odogwu AI simulation
    if (mode === 'ai') {
      const aiAccuracy = activeQuestion.difficulty === 'easy' ? 0.8 : activeQuestion.difficulty === 'medium' ? 0.65 : 0.5;
      if (Math.random() < aiAccuracy) {
        setAiScore((prev) => prev + 100 + Math.floor(Math.random() * 30));
      }
    }
  };

  const handleNextQuestion = () => {
    soundEngine.playClick();
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);
      setHiddenOptions([]);
      setCrowdStats(null);
      setTimer(15);
      setIsTimerPaused(false);

      if (mode === 'pass') {
        setTurn((prev) => (prev === 'p1' ? 'p2' : 'p1'));
      }
    } else {
      // Round Complete!
      soundEngine.playWin();
      let outcome: 'win' | 'lose' | 'draw' = 'win';
      let title = 'True Odogwu! You Sabi Nigeria! 🇳🇬';
      let desc = `You finished the round with a grand score of ${score} points!`;

      if (mode === 'ai') {
        if (score > aiScore) {
          outcome = 'win';
          title = 'Odogwu Defeated! 🏆';
          desc = `You scored ${score} pts vs Odogwu AI's ${aiScore} pts!`;
        } else if (score < aiScore) {
          outcome = 'lose';
          title = 'Odogwu AI Won This Round! 🤖';
          desc = `Odogwu AI scored ${aiScore} pts vs your ${score} pts. Rematch to claim victory!`;
        } else {
          outcome = 'draw';
          title = 'Draw Game! Two Legends! 🤝';
          desc = `Both tied at ${score} points!`;
        }
      } else if (mode === 'pass') {
        title = score > p2Score ? 'Player 1 Wins!' : p2Score > score ? 'Player 2 Wins!' : 'Tied Match!';
        desc = `Final: Player 1 (${score} pts) vs Player 2 (${p2Score} pts)`;
      }

      const coinsEarned = Math.floor(score / 50) + 15;
      const xpEarned = Math.floor(score / 4) + 50;

      setCoins((prev) => {
        const next = prev + coinsEarned;
        localStorage.setItem('gbedu_coins', String(next));
        return next;
      });

      setResultModal({
        isOpen: true,
        outcome,
        title,
        description: desc,
        score,
        coinsEarned,
        xpEarned,
      });
    }
  };

  // 1. Lifeline: 50/50 (removes 2 incorrect answers)
  const handleUse5050 = () => {
    if (used5050 || isAnswerSubmitted) return;
    soundEngine.playAgogo(true);
    setUsed5050(true);

    const wrongIndexes = activeQuestion.options
      .map((_, i) => i)
      .filter((i) => i !== activeQuestion.correctIndex);

    // Pick 2 random wrong options to eliminate
    const shuffledWrong = wrongIndexes.sort(() => Math.random() - 0.5);
    setHiddenOptions([shuffledWrong[0], shuffledWrong[1]]);
  };

  // 2. Lifeline: Odogwu Hint / Ask Crowd
  const handleUseHint = () => {
    if (usedHint || isAnswerSubmitted) return;
    soundEngine.playAgogo(true);
    setUsedHint(true);

    // Generate biased crowd stats with correct answer highest
    const statsObj: Record<number, number> = {};
    const correctPercent = Math.floor(55 + Math.random() * 25);
    statsObj[activeQuestion.correctIndex] = correctPercent;

    const remaining = 100 - correctPercent;
    const others = [0, 1, 2, 3].filter((i) => i !== activeQuestion.correctIndex);
    const p1 = Math.floor(remaining * 0.5);
    const p2 = Math.floor(remaining * 0.3);
    const p3 = remaining - p1 - p2;

    statsObj[others[0]] = p1;
    statsObj[others[1]] = p2;
    statsObj[others[2]] = p3;

    setCrowdStats(statsObj);
  };

  // 3. Lifeline: Extra Time (+15 seconds)
  const handleUseExtraTime = () => {
    if (usedExtraTime || isAnswerSubmitted) return;
    soundEngine.playAgogo(true);
    setUsedExtraTime(true);
    setTimer((prev) => prev + 15);
  };

  const handleShareQuiz = () => {
    soundEngine.playClick();
    const shareText = `🇳🇬 Gbedu Games: Naija Trivia\nI scored ${score} pts with a streak of ${streak}! 🔥\nCan you beat my Nigeria general knowledge?\nPlay at: gbedu.app`;
    navigator.clipboard.writeText(shareText);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2200);
  };

  return (
    <div className="w-full max-w-md mx-auto px-3 sm:px-4 py-3 flex flex-col gap-3 selection:bg-[#ffb703] select-none min-h-[calc(100vh-60px)]">
      {/* 1. TOP HEADER & STATS */}
      <div className="flex items-center justify-between gap-2 border-b border-[#26314d] pb-2.5">
        <button
          onClick={onBack}
          className="min-h-[44px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141d33] hover:bg-[#1a2540] border border-[#26314d] text-gray-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Lobby</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Streak pill */}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#ff7a00]/15 border border-[#ff7a00]/30 text-[#ff7a00] text-xs font-black">
            <Flame className="w-3.5 h-3.5 fill-[#ff7a00]" />
            <span>x{streak >= 3 ? '2.5' : streak >= 2 ? '2.0' : streak >= 1 ? '1.5' : '1.0'}</span>
          </div>

          {/* Score badge */}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#ffb703]/15 border border-[#ffb703]/30 text-[#ffb703] text-xs font-black">
            <Trophy className="w-3.5 h-3.5" />
            <span>{score}</span>
          </div>
        </div>
      </div>

      {/* 2. MODE SWITCHER TABS */}
      <div className="grid grid-cols-4 gap-1.5 p-1 rounded-2xl bg-[#141d33] border border-[#26314d]">
        <button
          onClick={() => initRound('daily')}
          className={`min-h-[38px] py-1 px-1.5 rounded-xl text-center font-display font-black text-[10px] sm:text-[11px] transition-all cursor-pointer ${
            mode === 'daily'
              ? 'bg-[#ffb703] text-black shadow-md'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Daily Quiz
        </button>

        <button
          onClick={() => initRound('quick')}
          className={`min-h-[38px] py-1 px-1.5 rounded-xl text-center font-display font-black text-[10px] sm:text-[11px] transition-all cursor-pointer ${
            mode === 'quick'
              ? 'bg-[#ffb703] text-black shadow-md'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          10-Question
        </button>

        <button
          onClick={() => initRound('ai')}
          className={`min-h-[38px] py-1 px-1.5 rounded-xl text-center font-display font-black text-[10px] sm:text-[11px] transition-all cursor-pointer ${
            mode === 'ai'
              ? 'bg-[#ffb703] text-black shadow-md'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          vs Odogwu AI
        </button>

        <button
          onClick={() => initRound('pass')}
          className={`min-h-[38px] py-1 px-1.5 rounded-xl text-center font-display font-black text-[10px] sm:text-[11px] transition-all cursor-pointer ${
            mode === 'pass'
              ? 'bg-[#ffb703] text-black shadow-md'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Pass & Play
        </button>
      </div>

      {/* vs AI or Pass & Play Live Scoreboard */}
      {mode === 'ai' && (
        <div className="px-3 py-1.5 rounded-xl bg-[#141d33] border border-[#26314d] flex items-center justify-between text-xs font-bold">
          <div className="flex items-center gap-1.5 text-white">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1fd1a0]" />
            <span>You: {score} pts</span>
          </div>
          <span className="text-gray-500 font-mono text-[10px]">VS</span>
          <div className="flex items-center gap-1.5 text-purple-400">
            <Bot className="w-3.5 h-3.5" />
            <span>Odogwu AI: {aiScore} pts</span>
          </div>
        </div>
      )}

      {mode === 'pass' && (
        <div className="px-3 py-1.5 rounded-xl bg-[#141d33] border border-[#26314d] flex items-center justify-between text-xs font-bold">
          <div className={`flex items-center gap-1.5 ${turn === 'p1' ? 'text-[#ffb703]' : 'text-gray-400'}`}>
            <span>P1: {score} pts</span>
            {turn === 'p1' && <span className="text-[9px] px-1 rounded bg-[#ffb703]/20">Turn</span>}
          </div>
          <div className={`flex items-center gap-1.5 ${turn === 'p2' ? 'text-[#1fd1a0]' : 'text-gray-400'}`}>
            <span>P2: {p2Score} pts</span>
            {turn === 'p2' && <span className="text-[9px] px-1 rounded bg-[#1fd1a0]/20">Turn</span>}
          </div>
        </div>
      )}

      {/* 3. LIFELINES ROW (50/50, Odogwu Hint, Extra Time) */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={handleUse5050}
          disabled={used5050 || isAnswerSubmitted}
          className={`min-h-[40px] py-1.5 px-2 rounded-xl border flex items-center justify-center gap-1 text-[11px] font-black transition-all cursor-pointer ${
            used5050
              ? 'opacity-40 bg-[#121929] border-gray-800 text-gray-500'
              : 'bg-[#141d33] hover:bg-[#1f2b4a] border-[#26314d] text-amber-300'
          }`}
        >
          <Percent className="w-3.5 h-3.5" />
          <span>50 / 50</span>
        </button>

        <button
          onClick={handleUseHint}
          disabled={usedHint || isAnswerSubmitted}
          className={`min-h-[40px] py-1.5 px-2 rounded-xl border flex items-center justify-center gap-1 text-[11px] font-black transition-all cursor-pointer ${
            usedHint
              ? 'opacity-40 bg-[#121929] border-gray-800 text-gray-500'
              : 'bg-[#141d33] hover:bg-[#1f2b4a] border-[#26314d] text-[#1fd1a0]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Odogwu Hint</span>
        </button>

        <button
          onClick={handleUseExtraTime}
          disabled={usedExtraTime || isAnswerSubmitted}
          className={`min-h-[40px] py-1.5 px-2 rounded-xl border flex items-center justify-center gap-1 text-[11px] font-black transition-all cursor-pointer ${
            usedExtraTime
              ? 'opacity-40 bg-[#121929] border-gray-800 text-gray-500'
              : 'bg-[#141d33] hover:bg-[#1f2b4a] border-[#26314d] text-[#ff7a00]'
          }`}
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>+15s Time</span>
        </button>
      </div>

      {/* 4. QUESTION CARD & TIMER BAR */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[#141d33] border border-[#26314d] shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[160px]">
        {/* Category tag & timer */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#ffb703]/15 text-[#ffb703] border border-[#ffb703]/30">
            {activeQuestion.category} • Q{currentIndex + 1}/{questions.length}
          </span>

          <div
            className={`flex items-center gap-1 font-mono font-black text-xs ${
              timer <= 5 ? 'text-rose-400 animate-pulse' : 'text-gray-300'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{timer}s</span>
          </div>
        </div>

        {/* Question Text */}
        <h2 className="text-sm sm:text-base font-bold text-white leading-snug">
          {activeQuestion.question}
        </h2>

        {/* Audience consensus breakdown if hint activated */}
        {crowdStats && (
          <div className="mt-2.5 p-2 rounded-xl bg-black/40 border border-[#1fd1a0]/30 text-[10px] text-gray-300">
            <p className="font-black text-[#1fd1a0] mb-1">
              💡 Odogwu Hint: "{activeQuestion.hint}"
            </p>
            <div className="flex items-center justify-between gap-1 text-[9px] font-mono">
              {activeQuestion.options.map((_, idx) => (
                <span key={idx}>
                  {String.fromCharCode(65 + idx)}: {crowdStats[idx] || 0}%
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Progress bar */}
        <div className="w-full h-1.5 rounded-full bg-black/40 overflow-hidden mt-3 border border-white/5">
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: `${(timer / 15) * 100}%` }}
            transition={{ ease: 'linear', duration: 1 }}
            className={`h-full rounded-full ${
              timer <= 5 ? 'bg-rose-500' : 'bg-gradient-to-r from-[#ff7a00] to-[#ffb703]'
            }`}
          />
        </div>
      </div>

      {/* 5. MULTIPLE CHOICE OPTIONS */}
      <div className="flex flex-col gap-2">
        {activeQuestion.options.map((option, idx) => {
          const isHidden = hiddenOptions.includes(idx);
          if (isHidden) {
            return (
              <div
                key={idx}
                className="min-h-[46px] p-3 rounded-2xl bg-[#0e1628]/40 border border-dashed border-gray-800/60 opacity-30 flex items-center text-xs text-gray-600"
              >
                <span>50/50 Eliminated</span>
              </div>
            );
          }

          let btnColor = 'bg-[#141d33] hover:bg-[#1a2540] border-[#26314d] text-white';

          if (isAnswerSubmitted) {
            if (idx === activeQuestion.correctIndex) {
              btnColor = 'bg-[#1fd1a0] border-[#1fd1a0] text-black font-black shadow-lg shadow-[#1fd1a0]/20';
            } else if (idx === selectedAnswer) {
              btnColor = 'bg-rose-500 border-rose-500 text-white font-black shadow-lg shadow-rose-500/20';
            } else {
              btnColor = 'bg-[#101728] border-gray-800 text-gray-500';
            }
          }

          return (
            <motion.button
              key={idx}
              onClick={() => handleSelectOption(idx)}
              whileTap={!isAnswerSubmitted ? { scale: 0.98 } : {}}
              disabled={isAnswerSubmitted}
              className={`min-h-[48px] p-3.5 rounded-2xl border flex items-center justify-between text-left transition-all cursor-pointer ${btnColor}`}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-lg bg-black/30 flex items-center justify-center font-display font-black text-xs shrink-0">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="text-xs sm:text-sm font-semibold">{option}</span>
              </div>

              {isAnswerSubmitted && idx === activeQuestion.correctIndex && (
                <CheckCircle2 className="w-5 h-5 text-black shrink-0" />
              )}
              {isAnswerSubmitted && idx === selectedAnswer && idx !== activeQuestion.correctIndex && (
                <XCircle className="w-5 h-5 text-white shrink-0" />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* 6. POST-ANSWER CULTURAL FUN FACT CARD */}
      <AnimatePresence>
        {isAnswerSubmitted && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-3.5 rounded-2xl bg-[#141d33] border border-[#ffb703]/40 shadow-xl space-y-2"
          >
            <div className="flex items-center gap-1.5 text-xs font-black text-[#ffb703]">
              <Sparkles className="w-4 h-4" />
              <span>Cultural Backstory &amp; Fact:</span>
            </div>
            <p className="text-xs text-gray-200 leading-relaxed">{activeQuestion.funFact}</p>

            <button
              onClick={handleNextQuestion}
              className="w-full min-h-[44px] mt-2 py-2.5 rounded-xl bg-gradient-to-r from-[#ff7a00] to-[#ffb703] text-black font-display font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md cursor-pointer hover:brightness-105 active:scale-98"
            >
              <span>{currentIndex + 1 < questions.length ? 'Next Question' : 'View Results'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 7. RESULT MODAL */}
      <GameResultModal
        isOpen={resultModal.isOpen}
        onClose={() => setResultModal((prev) => ({ ...prev, isOpen: false }))}
        outcome={resultModal.outcome}
        title={resultModal.title}
        description={resultModal.description}
        score={resultModal.score}
        coinsEarned={resultModal.coinsEarned}
        xpEarned={resultModal.xpEarned}
        onPlayAgain={() => {
          setResultModal((prev) => ({ ...prev, isOpen: false }));
          initRound();
        }}
      />
    </div>
  );
};
