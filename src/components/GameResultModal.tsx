import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Home, Sparkles, Frown } from 'lucide-react';
import { soundEngine } from '../audio/audioEngine';

interface GameResultModalProps {
  isOpen: boolean;
  winner: string | null; // e.g. 'You', 'Player 1', 'Computer', or 'Draw'
  isWin?: boolean;
  scoreText?: string;
  onPlayAgain: () => void;
  onBackToLobby: () => void;
}

export const GameResultModal: React.FC<GameResultModalProps> = ({
  isOpen,
  winner,
  isWin = false,
  scoreText,
  onPlayAgain,
  onBackToLobby,
}) => {
  useEffect(() => {
    if (isOpen) {
      if (isWin) {
        soundEngine.playWin();
        try {
          confetti({
            particleCount: 100,
            spread: 80,
            origin: { y: 0.5 },
            colors: ['#f59e0b', '#009a49', '#ff7900', '#ec4899', '#3b82f6'],
          });
        } catch {
          // ignore
        }
      } else {
        soundEngine.playLose();
      }
    }
  }, [isOpen, isWin]);

  if (!isOpen) return null;

  const isDraw = winner?.toLowerCase().includes('draw') || winner?.toLowerCase().includes('tie');

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
          className="w-full max-w-sm rounded-3xl p-6 bg-gradient-to-b from-[#141d30] to-[#0c1220] border-2 border-amber-500/40 shadow-2xl text-center space-y-4 glow-gold"
        >
          {/* Animated Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
            transition={{ delay: 0.1, type: 'spring' }}
            className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center text-4xl shadow-xl ${
              isWin
                ? 'bg-gradient-to-tr from-amber-400 to-orange-500 text-black shadow-amber-500/30'
                : isDraw
                ? 'bg-gray-700 text-white'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
            }`}
          >
            {isWin ? <Trophy className="w-10 h-10 stroke-[2.5]" /> : isDraw ? '🤝' : <Frown className="w-10 h-10" />}
          </motion.div>

          {/* Big Animated Text */}
          <div>
            <motion.h2
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white uppercase"
            >
              {isWin ? 'Odogwu Victory!' : isDraw ? 'Honorable Draw!' : 'Gbedu Defeat!'}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-sm font-bold text-amber-400 mt-1"
            >
              {isDraw ? 'Nobody wins this round!' : `${winner} runs the yard!`}
            </motion.p>

            {scoreText && (
              <p className="text-xs text-gray-400 font-mono mt-1 bg-black/40 py-1 px-3 rounded-lg inline-block border border-white/10">
                {scoreText}
              </p>
            )}
          </div>

          {/* Buttons with Chunky Touch Targets */}
          <div className="pt-2 flex flex-col gap-2.5">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                soundEngine.playClick();
                onPlayAgain();
              }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 stroke-[3]" />
              <span>Play Again</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                soundEngine.playClick();
                onBackToLobby();
              }}
              className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer border border-white/10"
            >
              <Home className="w-4 h-4" />
              <span>Back to Games Hub</span>
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
