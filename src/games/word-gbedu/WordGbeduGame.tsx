import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { soundEngine } from '../../audio/audioEngine';
import { GameResultModal } from '../../components/GameResultModal';
import { ArrowLeft, RotateCcw, Check, RefreshCw, Trophy, Sparkles } from 'lucide-react';
import { useWhotStore } from '../../store/useWhotStore';

const LETTER_POINTS: Record<string, number> = {
  A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8, K: 5, L: 1,
  M: 3, N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1, U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10,
};

// Curated Nigerian, African, and standard English words
const VALID_WORDS = new Set([
  'GBEDU', 'AFRO', 'WHOT', 'AYO', 'LUDO', 'ODOGWU', 'VIBE', 'BEAT', 'DRUM', 'LOG',
  'PARTY', 'LAGOS', 'ACCRA', 'NAIRA', 'DANCE', 'CHOP', 'JOLLOF', 'SUYA', 'OWAMBE',
  'ZANKU', 'LEGWORK', 'MUSIC', 'SONG', 'KING', 'QUEEN', 'FIRE', 'STAR', 'GOLD',
  'GAME', 'PLAY', 'WIN', 'SCORE', 'JAM', 'GROOVE', 'SHRINE', 'ROOT', 'RHYTHM',
  'AFROBEATS', 'AMAPIANO', 'SHOKI', 'KULA', 'ASHOEBI', 'BABA', 'MAMA', 'CHEF',
  'COOL', 'HOT', 'TOP', 'BEST', 'LOVE', 'LIFE', 'PEACE', 'BOYS', 'GIRLS', 'HOME',
  'ROAD', 'CITY', 'TOWN', 'TEAM', 'CHAMP', 'HERO', 'LEGEND', 'BOSS', 'LION', 'BIRD',
]);

const INITIAL_RACK = ['G', 'B', 'E', 'D', 'U', 'A', 'O'];

export const WordGbeduGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { user } = useWhotStore();

  const [rack, setRack] = useState<string[]>(INITIAL_RACK);
  const [boardWord, setBoardWord] = useState<{ letter: string; rackIndex: number }[]>([]);
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [statusMsg, setStatusMsg] = useState('Spell an African or English word using your letter tiles!');
  const [wordsPlayed, setWordsPlayed] = useState<string[]>([]);
  const [winner, setWinner] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const selectTile = (letter: string, index: number) => {
    soundEngine.playTile();
    setBoardWord((prev) => [...prev, { letter, rackIndex: index }]);
  };

  const removeTileFromWord = (idxInWord: number) => {
    soundEngine.playClick();
    setBoardWord((prev) => prev.filter((_, i) => i !== idxInWord));
  };

  const handlePlayWord = () => {
    const word = boardWord.map((b) => b.letter).join('');
    if (word.length < 2) {
      soundEngine.playWrongSound();
      setStatusMsg('Words must be at least 2 letters long!');
      return;
    }

    if (!VALID_WORDS.has(word)) {
      soundEngine.playWrongSound();
      setStatusMsg(`"${word}" is not recognized in the Gbedu dictionary! Try another.`);
      return;
    }

    // Calculate score
    let points = 0;
    for (const char of word) {
      points += LETTER_POINTS[char] || 1;
    }
    // Gbedu bonus for African vocabulary!
    if (['GBEDU', 'AFRO', 'ODOGWU', 'AMAPIANO', 'JOLLOF', 'SUYA', 'OWAMBE'].includes(word)) {
      points *= 2;
      setStatusMsg(`🔥 GBEDU BONUS! "${word}" scored DOUBLE (${points} pts)!`);
    } else {
      setStatusMsg(`Great! "${word}" played for ${points} points.`);
    }

    soundEngine.playWin();
    const newPlayerScore = playerScore + points;
    setPlayerScore(newPlayerScore);
    setWordsPlayed((prev) => [word, ...prev]);

    // Remove used letters from rack and draw fresh ones
    const usedIndices = new Set(boardWord.map((b) => b.rackIndex));
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const newRack = rack.map((l, i) =>
      usedIndices.has(i) ? alphabet[Math.floor(Math.random() * alphabet.length)] : l
    );
    setRack(newRack);
    setBoardWord([]);

    // Check game end at 80 points
    if (newPlayerScore >= 80) {
      setWinner(user?.displayName || 'Player 1');
      setTimeout(() => setIsModalOpen(true), 600);
      return;
    }

    // AI takes turn
    setTimeout(() => {
      runAITurn();
    }, 1000);
  };

  const runAITurn = () => {
    const aiWords = ['VIBE', 'BEAT', 'DRUM', 'STAR', 'AFRO', 'FIRE', 'GOLD', 'SONG'];
    const chosen = aiWords[Math.floor(Math.random() * aiWords.length)];
    let pts = 0;
    for (const char of chosen) {
      pts += LETTER_POINTS[char] || 1;
    }
    soundEngine.playMove(440);
    const newAiScore = aiScore + pts;
    setAiScore(newAiScore);
    setStatusMsg(`Opponent spelled "${chosen}" for ${pts} points. Your turn!`);

    if (newAiScore >= 80) {
      setWinner('Computer AI');
      soundEngine.playLose();
      setTimeout(() => setIsModalOpen(true), 600);
    }
  };

  const handleShuffleRack = () => {
    soundEngine.playDiceRoll();
    const shuffled = [...rack].sort(() => Math.random() - 0.5);
    setRack(shuffled);
    setBoardWord([]);
  };

  const resetGame = () => {
    setRack(['G', 'B', 'E', 'D', 'U', 'A', 'O']);
    setBoardWord([]);
    setPlayerScore(0);
    setAiScore(0);
    setWordsPlayed([]);
    setWinner(null);
    setIsModalOpen(false);
    setStatusMsg('New Word Gbedu match! First to 80 points wins.');
  };

  const usedIndices = new Set(boardWord.map((b) => b.rackIndex));

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-6 flex flex-col items-center select-none">
      {/* Header */}
      <div className="w-full flex items-center justify-between mb-4">
        <button
          onClick={() => {
            soundEngine.playClick();
            onBack();
          }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs cursor-pointer border border-white/10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Hub</span>
        </button>

        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-black font-display text-white tracking-wide">
            WORD <span className="text-amber-400">GBEDU</span>
          </h2>
          <p className="text-[11px] font-bold text-emerald-400">Afrobeats & Scrabble Tile Battle</p>
        </div>

        <button
          onClick={() => {
            soundEngine.playClick();
            resetGame();
          }}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 cursor-pointer border border-white/10 transition-colors"
          title="Reset Match"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Scoreboard */}
      <div className="grid grid-cols-2 gap-3 w-full mb-4">
        <div className="p-3 rounded-2xl bg-amber-500/20 border-2 border-amber-400 text-center shadow-lg">
          <p className="text-[10px] uppercase font-black text-amber-300">
            {user?.displayName || 'Player 1'} (You)
          </p>
          <p className="text-2xl font-black text-white font-mono mt-0.5">{playerScore} pts</p>
        </div>

        <div className="p-3 rounded-2xl bg-rose-500/20 border-2 border-rose-400 text-center shadow-lg">
          <p className="text-[10px] uppercase font-black text-rose-300">Computer AI</p>
          <p className="text-2xl font-black text-white font-mono mt-0.5">{aiScore} pts</p>
        </div>
      </div>

      {/* Status banner */}
      <div className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-center mb-4 text-xs font-bold text-amber-300">
        {statusMsg}
      </div>

      {/* Word Composition Area (The Placed Word) */}
      <div className="w-full bg-[#121927] border-2 border-white/15 rounded-3xl p-5 mb-5 shadow-2xl flex flex-col items-center justify-center min-h-[120px]">
        <p className="text-[10px] uppercase font-black text-gray-400 tracking-wider mb-2">
          Constructed Word (Tap to return tile)
        </p>

        <div className="flex items-center gap-2 min-h-[56px] flex-wrap justify-center">
          {boardWord.length === 0 ? (
            <span className="text-xs text-gray-500 italic">Select letters from your rack below...</span>
          ) : (
            boardWord.map((item, idx) => (
              <motion.button
                key={idx}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                onClick={() => removeTileFromWord(idx)}
                className="w-12 h-14 rounded-xl bg-gradient-to-b from-amber-200 to-amber-400 text-black font-black text-2xl font-display flex flex-col items-center justify-center shadow-lg border-2 border-amber-500 cursor-pointer hover:scale-105 active:scale-95"
              >
                <span>{item.letter}</span>
                <span className="text-[9px] font-mono leading-none font-bold">
                  {LETTER_POINTS[item.letter] || 1}
                </span>
              </motion.button>
            ))
          )}
        </div>
      </div>

      {/* Letter Rack (7 Tiles) */}
      <div className="w-full bg-[#0a0f18] border-2 border-amber-500/30 rounded-3xl p-4 shadow-xl mb-4">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider">
            Your Letter Rack
          </span>
          <button
            onClick={handleShuffleRack}
            className="flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Shuffle</span>
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 flex-wrap">
          {rack.map((letter, idx) => {
            const isUsed = usedIndices.has(idx);
            return (
              <motion.button
                key={idx}
                whileHover={{ scale: isUsed ? 1 : 1.08 }}
                whileTap={{ scale: isUsed ? 1 : 0.94 }}
                disabled={isUsed}
                onClick={() => selectTile(letter, idx)}
                className={`w-12 h-14 rounded-xl font-black text-2xl font-display flex flex-col items-center justify-center shadow-lg border-2 transition-all cursor-pointer ${
                  isUsed
                    ? 'opacity-25 bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-b from-amber-100 to-amber-300 text-black border-amber-400 hover:scale-105'
                }`}
              >
                <span>{letter}</span>
                <span className="text-[9px] font-mono leading-none font-bold">
                  {LETTER_POINTS[letter] || 1}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Submit Word Action Button */}
      <motion.button
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        disabled={boardWord.length === 0}
        onClick={handlePlayWord}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-sm uppercase tracking-wider shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
      >
        <Check className="w-5 h-5 stroke-[3]" />
        <span>Play Word</span>
      </motion.button>

      {/* Played Words History */}
      {wordsPlayed.length > 0 && (
        <div className="mt-4 w-full text-center">
          <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1">
            Words Played This Match:
          </p>
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            {wordsPlayed.slice(0, 8).map((w, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-amber-300 font-mono"
              >
                {w}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Result Modal */}
      <GameResultModal
        isOpen={isModalOpen}
        winner={winner}
        isWin={winner !== 'Computer AI'}
        scoreText={`Final Score: You (${playerScore}) - AI (${aiScore})`}
        onPlayAgain={resetGame}
        onBackToLobby={onBack}
      />
    </div>
  );
};
