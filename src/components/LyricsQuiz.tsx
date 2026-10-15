import React, { useState, useEffect } from 'react';
import { QuizQuestion } from '../types';
import { TRIVIA_QUESTIONS } from '../data/triviaData';
import { soundEngine } from '../audio/audioEngine';
import { Mic2, CheckCircle2, XCircle, Timer, HelpCircle, Users, Sparkles, RotateCcw, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

interface LyricsQuizProps {
  onScoreUpdate: (score: number) => void;
}

export const LyricsQuiz: React.FC<LyricsQuizProps> = ({ onScoreUpdate }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  // Lifelines
  const [usedFiftyFifty, setUsedFiftyFifty] = useState(false);
  const [eliminatedOptions, setEliminatedOptions] = useState<string[]>([]);
  const [usedCrowd, setUsedCrowd] = useState(false);
  const [crowdVotes, setCrowdVotes] = useState<{ [option: string]: number } | null>(null);

  const currentQ: QuizQuestion = TRIVIA_QUESTIONS[currentIndex];

  // Timer effect
  useEffect(() => {
    if (isAnswerRevealed || isCompleted) return;

    if (timeLeft <= 0) {
      handleTimeOut();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((t) => t - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isAnswerRevealed, isCompleted]);

  const handleTimeOut = () => {
    setIsAnswerRevealed(true);
    setStreak(0);
    soundEngine.playWrongSound();
  };

  const handleSelectOption = (option: string) => {
    if (isAnswerRevealed) return;
    setSelectedOption(option);
    setIsAnswerRevealed(true);

    const isCorrect = option === currentQ.correctAnswer;
    if (isCorrect) {
      soundEngine.playCorrectSound();
      const streakBonus = streak * 50;
      const timeBonus = timeLeft * 10;
      const totalEarned = 250 + streakBonus + timeBonus;
      setScore((s) => s + totalEarned);
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > maxStreak) {
        setMaxStreak(newStreak);
      }
    } else {
      soundEngine.playWrongSound();
      setStreak(0);
    }
  };

  const useFiftyFifty = () => {
    if (usedFiftyFifty || isAnswerRevealed) return;
    setUsedFiftyFifty(true);
    soundEngine.playAgogo(true);

    // Pick 2 wrong answers to eliminate
    const wrongOptions = currentQ.options.filter((opt) => opt !== currentQ.correctAnswer);
    const shuffledWrong = [...wrongOptions].sort(() => 0.5 - Math.random());
    setEliminatedOptions(shuffledWrong.slice(0, 2));
  };

  const useCrowdLifeline = () => {
    if (usedCrowd || isAnswerRevealed) return;
    setUsedCrowd(true);
    soundEngine.playShekere();

    // Generate high probability for correct answer
    const votes: { [option: string]: number } = {};
    const remaining = currentQ.options.filter((opt) => !eliminatedOptions.includes(opt));
    let assigned = 0;

    // Give 60-80% to correct
    const correctVote = Math.floor(Math.random() * 20) + 60;
    votes[currentQ.correctAnswer] = correctVote;
    assigned += correctVote;

    const others = remaining.filter((opt) => opt !== currentQ.correctAnswer);
    others.forEach((opt, idx) => {
      if (idx === others.length - 1) {
        votes[opt] = 100 - assigned;
      } else {
        const portion = Math.floor((100 - assigned) / (others.length - idx));
        votes[opt] = portion;
        assigned += portion;
      }
    });

    setCrowdVotes(votes);
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < TRIVIA_QUESTIONS.length) {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setIsAnswerRevealed(false);
      setTimeLeft(20);
      setEliminatedOptions([]);
      setCrowdVotes(null);
    } else {
      setIsCompleted(true);
      onScoreUpdate(score);
      soundEngine.playCheerSound();
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswerRevealed(false);
    setTimeLeft(20);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setIsCompleted(false);
    setUsedFiftyFifty(false);
    setUsedCrowd(false);
    setEliminatedOptions([]);
    setCrowdVotes(null);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-4">
      {/* Quiz Progress & Stats Bar */}
      <div className="bg-[#121826] rounded-2xl p-4 border border-white/10 flex flex-wrap items-center justify-between gap-4 mb-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-xl text-emerald-400">
            <Mic2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Question {currentIndex + 1} of {TRIVIA_QUESTIONS.length}
              </span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {currentQ.category}
              </span>
            </div>
            <p className="text-base font-extrabold text-white">Afrobeats & Lyrics Arena</p>
          </div>
        </div>

        {/* Live Timer and Streak */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10">
            <Timer className={`w-4 h-4 ${timeLeft <= 5 ? 'text-rose-400 animate-spin' : 'text-amber-400'}`} />
            <span className={`text-base font-black font-mono ${timeLeft <= 5 ? 'text-rose-400' : 'text-white'}`}>
              {timeLeft}s
            </span>
          </div>

          <div className="text-right">
            <p className="text-[10px] font-bold text-gray-400 uppercase">Score</p>
            <p className="text-xl font-black text-amber-400 font-display">{score.toLocaleString()} pts</p>
          </div>

          {streak > 1 && (
            <div className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-rose-500 text-black font-extrabold text-xs flex items-center gap-1 animate-pulse">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{streak}X STREAK</span>
            </div>
          )}
        </div>
      </div>

      {!isCompleted ? (
        <div className="bg-gradient-to-b from-[#131b2e] to-[#0d131f] rounded-3xl border border-white/10 p-6 md:p-8 shadow-2xl relative overflow-hidden">
          {/* Lifelines Toolbar */}
          <div className="flex items-center justify-between pb-6 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400">Lifelines:</span>
              <button
                onClick={useFiftyFifty}
                disabled={usedFiftyFifty || isAnswerRevealed}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  usedFiftyFifty
                    ? 'bg-white/5 text-gray-500 border border-white/5 opacity-50 cursor-not-allowed'
                    : 'bg-white/10 hover:bg-white/15 text-amber-300 border border-amber-500/30 shadow-sm'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>50 / 50</span>
              </button>

              <button
                onClick={useCrowdLifeline}
                disabled={usedCrowd || isAnswerRevealed}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  usedCrowd
                    ? 'bg-white/5 text-gray-500 border border-white/5 opacity-50 cursor-not-allowed'
                    : 'bg-white/10 hover:bg-white/15 text-cyan-300 border border-cyan-500/30 shadow-sm'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Ask Crowd</span>
              </button>
            </div>

            <div className="text-xs text-gray-400 font-medium">
              Song: <span className="text-gray-200 font-bold">{currentQ.trackName}</span> ({currentQ.year})
            </div>
          </div>

          {/* Question Title & Snippet Box */}
          <div className="py-6 text-center">
            <h3 className="text-xl md:text-2xl font-black font-display text-white mb-4">
              {currentQ.title}
            </h3>

            <div className="inline-block max-w-2xl px-6 py-5 rounded-2xl bg-black/40 border border-amber-500/20 shadow-inner">
              <p className="text-lg md:text-xl font-medium text-amber-100 italic leading-relaxed">
                "{currentQ.snippet}"
              </p>
              <p className="text-xs text-gray-400 mt-2 font-semibold">
                — {currentQ.artist}
              </p>
            </div>
          </div>

          {/* Multiple Choice Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 my-4">
            {currentQ.options.map((option, idx) => {
              const isEliminated = eliminatedOptions.includes(option);
              const isSelected = selectedOption === option;
              const isCorrect = option === currentQ.correctAnswer;

              let style = 'bg-white/5 hover:bg-white/10 border-white/10 text-white';

              if (isAnswerRevealed) {
                if (isCorrect) {
                  style = 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-500/20';
                } else if (isSelected) {
                  style = 'bg-rose-500/20 border-rose-500 text-rose-300';
                } else {
                  style = 'bg-white/5 border-transparent text-gray-500 opacity-60';
                }
              }

              if (isEliminated) {
                return (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-white/5 border border-white/5 opacity-30 line-through text-gray-600 text-sm font-semibold select-none"
                  >
                    {option}
                  </div>
                );
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(option)}
                  disabled={isAnswerRevealed}
                  className={`relative p-4 rounded-2xl border-2 text-left font-bold text-sm md:text-base flex items-center justify-between transition-all cursor-pointer ${style}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-black/30 border border-white/10 flex items-center justify-center text-xs text-gray-400 font-mono">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span>{option}</span>
                  </div>

                  {crowdVotes && crowdVotes[option] !== undefined && (
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                      {crowdVotes[option]}%
                    </span>
                  )}

                  {isAnswerRevealed && isCorrect && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  )}
                  {isAnswerRevealed && isSelected && !isCorrect && (
                    <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Answer Explanation & Fun Fact Banner */}
          {isAnswerRevealed && (
            <div className="mt-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in">
              <div className="text-left">
                <p className="text-xs uppercase font-extrabold text-amber-400 tracking-wider">
                  Gbedu Fact & Culture Check
                </p>
                <p className="text-sm text-gray-200 mt-1 leading-relaxed">
                  {currentQ.funFact}
                </p>
              </div>
              <button
                onClick={handleNextQuestion}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-black font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-lg shadow-amber-500/25 shrink-0 cursor-pointer"
              >
                <span>{currentIndex + 1 < TRIVIA_QUESTIONS.length ? 'NEXT QUESTION' : 'SEE RESULTS'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Quiz Completed Screen */
        <div className="bg-gradient-to-b from-[#131b2e] to-[#0d131f] rounded-3xl border border-white/10 p-8 shadow-2xl text-center">
          <div className="w-20 h-20 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center text-4xl mx-auto mb-4 shadow-xl shadow-emerald-500/30">
            🎤
          </div>
          <h2 className="text-3xl font-black font-display text-white mb-2">
            Quiz Champion!
          </h2>
          <p className="text-gray-300 text-sm max-w-md mx-auto mb-6">
            You tested your knowledge of Afrobeats, lyrics, street slang, and Nigerian party culture!
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-lg mx-auto mb-8">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <p className="text-xs text-gray-400 uppercase font-bold">Total Points</p>
              <p className="text-2xl font-black text-amber-400 font-display">{score.toLocaleString()}</p>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <p className="text-xs text-gray-400 uppercase font-bold">Max Streak</p>
              <p className="text-2xl font-black text-emerald-400 font-display">{maxStreak}x</p>
            </div>
            <div className="col-span-2 md:col-span-1 bg-white/5 p-4 rounded-2xl border border-white/5">
              <p className="text-xs text-gray-400 uppercase font-bold">Gbedu Status</p>
              <p className="text-sm font-black text-rose-400 font-display mt-1">
                {score > 2500 ? 'CERTIFIED ODOGWU' : 'AFRO ENTHUSIAST'}
              </p>
            </div>
          </div>

          <button
            onClick={handleRestart}
            className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-amber-500 text-black font-black text-sm mx-auto hover:bg-amber-400 active:scale-95 transition-all shadow-xl shadow-amber-500/30 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>PLAY AGAIN</span>
          </button>
        </div>
      )}
    </div>
  );
};
