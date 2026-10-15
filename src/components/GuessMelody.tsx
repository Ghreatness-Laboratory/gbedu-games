import React, { useState } from 'react';
import { MELODY_CHALLENGES } from '../data/melodyData';
import { soundEngine } from '../audio/audioEngine';
import { Music, Play, CheckCircle2, XCircle, ArrowRight, RotateCcw, Volume2, Sparkles, Lightbulb } from 'lucide-react';
import confetti from 'canvas-confetti';

interface GuessMelodyProps {
  onScoreUpdate: (score: number) => void;
}

export const GuessMelody: React.FC<GuessMelodyProps> = ({ onScoreUpdate }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlayingMelody, setIsPlayingMelody] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [score, setScore] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const currentChallenge = MELODY_CHALLENGES[currentIndex];

  const playTune = () => {
    if (isPlayingMelody) return;
    soundEngine.init();
    setIsPlayingMelody(true);

    const ctx = soundEngine.getAudioContext();
    if (!ctx) {
      setIsPlayingMelody(false);
      return;
    }

    let offset = 0;
    currentChallenge.notes.forEach((note, index) => {
      setTimeout(() => {
        soundEngine.playSynthNote(note.freq, note.duration);
        if (index === currentChallenge.notes.length - 1) {
          setTimeout(() => setIsPlayingMelody(false), note.duration * 1000 + 100);
        }
      }, offset * 1000);
      offset += note.duration;
    });
  };

  const handleSelect = (option: string) => {
    if (isAnswerRevealed) return;
    setSelectedAnswer(option);
    setIsAnswerRevealed(true);

    const isCorrect = option === currentChallenge.correctAnswer;
    if (isCorrect) {
      soundEngine.playCorrectSound();
      const points = showHint ? 150 : 300;
      setScore((s) => s + points);
    } else {
      soundEngine.playWrongSound();
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 < MELODY_CHALLENGES.length) {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setIsAnswerRevealed(false);
      setShowHint(false);
    } else {
      setIsCompleted(true);
      onScoreUpdate(score);
      soundEngine.playCheerSound();
      confetti({
        particleCount: 90,
        spread: 60,
        origin: { y: 0.6 }
      });
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setIsAnswerRevealed(false);
    setShowHint(false);
    setScore(0);
    setIsCompleted(false);
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-4">
      {/* Header card */}
      <div className="bg-[#121826] rounded-2xl p-4 border border-white/10 flex items-center justify-between mb-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Music className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-extrabold text-cyan-400 tracking-wider">
                Whot & Tune • Ear Challenge
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-gray-300">
                {currentIndex + 1} / {MELODY_CHALLENGES.length}
              </span>
            </div>
            <p className="text-sm font-bold text-gray-200">Guess the Afrobeats anthem from synthesizer notes!</p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-[10px] font-bold text-gray-400 uppercase">Score</p>
          <p className="text-xl font-black text-amber-400 font-display">{score.toLocaleString()} pts</p>
        </div>
      </div>

      {!isCompleted ? (
        <div className="bg-gradient-to-b from-[#131b2e] to-[#0c121d] rounded-3xl border border-white/10 p-6 md:p-8 shadow-2xl text-center space-y-6">
          <div>
            <span className="text-xs font-extrabold text-amber-400 uppercase tracking-widest px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30">
              {currentChallenge.genre}
            </span>
            <h3 className="text-2xl font-black font-display text-white mt-3">
              {currentChallenge.title}
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Listen carefully to the melody notes and choose the matching song!
            </p>
          </div>

          {/* Interactive Play Button with Audio Wave Simulation */}
          <div className="py-4">
            <button
              onClick={playTune}
              disabled={isPlayingMelody}
              className={`inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-base shadow-xl transition-all cursor-pointer ${
                isPlayingMelody
                  ? 'bg-cyan-500 text-black animate-pulse shadow-cyan-500/40 ring-4 ring-cyan-400/50'
                  : 'bg-gradient-to-r from-cyan-500 via-amber-500 to-rose-500 text-black hover:scale-105 active:scale-95 shadow-cyan-500/20'
              }`}
            >
              <Volume2 className="w-5 h-5 fill-current" />
              <span>{isPlayingMelody ? 'PLAYING MELODY...' : 'PLAY TUNE HOOK 🎵'}</span>
            </button>

            {/* Visualizer bars */}
            <div className="flex items-center justify-center gap-1.5 mt-5 h-8">
              {[4, 12, 8, 16, 24, 10, 18, 6, 20, 14, 8, 4].map((h, i) => (
                <div
                  key={i}
                  style={{ height: isPlayingMelody ? `${h}px` : '4px' }}
                  className="w-1.5 bg-cyan-400 rounded-full transition-all duration-150"
                />
              ))}
            </div>
          </div>

          {/* Hint Trigger */}
          {!showHint && !isAnswerRevealed && (
            <button
              onClick={() => {
                setShowHint(true);
                soundEngine.playAgogo(false);
              }}
              className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-semibold cursor-pointer underline underline-offset-4"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>Need a clue? (-150 pts penalty)</span>
            </button>
          )}

          {showHint && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200">
              💡 <strong>Clue:</strong> {currentChallenge.hint}
            </div>
          )}

          {/* Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {currentChallenge.options.map((opt, i) => {
              const isSelected = selectedAnswer === opt;
              const isCorrect = opt === currentChallenge.correctAnswer;

              let style = 'bg-white/5 hover:bg-white/10 border-white/10 text-white';
              if (isAnswerRevealed) {
                if (isCorrect) {
                  style = 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/20';
                } else if (isSelected) {
                  style = 'bg-rose-500/20 border-rose-500 text-rose-300';
                } else {
                  style = 'bg-white/5 opacity-50 border-transparent';
                }
              }

              return (
                <button
                  key={i}
                  onClick={() => handleSelect(opt)}
                  disabled={isAnswerRevealed}
                  className={`p-4 rounded-2xl border-2 font-bold text-sm text-left flex items-center justify-between transition-all cursor-pointer ${style}`}
                >
                  <span>{opt}</span>
                  {isAnswerRevealed && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                  {isAnswerRevealed && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-rose-400" />}
                </button>
              );
            })}
          </div>

          {/* Next Button */}
          {isAnswerRevealed && (
            <div className="pt-4 flex justify-center">
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-8 py-3 rounded-xl bg-amber-500 text-black font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-lg shadow-amber-500/30 cursor-pointer"
              >
                <span>{currentIndex + 1 < MELODY_CHALLENGES.length ? 'NEXT MELODY' : 'SEE FINAL SCORE'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Completed Screen */
        <div className="bg-gradient-to-b from-[#131b2e] to-[#0c121d] rounded-3xl border border-white/10 p-8 shadow-2xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-3xl mx-auto mb-3">
            🎵
          </div>
          <h2 className="text-2xl font-black font-display text-white mb-2">Ear Master Completed!</h2>
          <p className="text-sm text-gray-300 mb-6">You recognized iconic Afrobeats hooks strictly by ear!</p>
          <p className="text-3xl font-black text-amber-400 font-display mb-6">{score.toLocaleString()} Points</p>
          <button
            onClick={handleRestart}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-black font-black text-sm mx-auto hover:bg-amber-400 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>PLAY AGAIN</span>
          </button>
        </div>
      )}
    </div>
  );
};
