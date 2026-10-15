import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { soundEngine } from '../../audio/audioEngine';
import { GameResultModal } from '../../components/GameResultModal';
import { ArrowLeft, RotateCcw, Bot, Users, Sparkles } from 'lucide-react';
import { useWhotStore } from '../../store/useWhotStore';

type GameMode = 'ai' | 'pass';

interface AyoGameProps {
  onBack: () => void;
}

export const AyoGame: React.FC<AyoGameProps> = ({ onBack }) => {
  const { user } = useWhotStore();

  // Pits: 0-5 (Player 1 / Bottom), 6-11 (Player 2 or AI / Top, arranged right-to-left)
  const INITIAL_PITS = [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4];

  const [pits, setPits] = useState<number[]>(INITIAL_PITS);
  const [banks, setBanks] = useState<{ p1: number; p2: number }>({ p1: 0, p2: 0 });
  const [isP1Turn, setIsP1Turn] = useState(true);
  const [mode, setMode] = useState<GameMode>('ai');
  const [isSowing, setIsSowing] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Pick a pit with seeds to sow counter-clockwise.');

  const handlePitClick = async (pitIndex: number) => {
    if (isSowing || winner) return;

    // Validate turn
    if (isP1Turn && (pitIndex < 0 || pitIndex > 5)) return;
    if (!isP1Turn && (pitIndex < 6 || pitIndex > 11)) return;

    if (pits[pitIndex] === 0) {
      soundEngine.playWrongSound();
      setStatusMessage('That pit is empty! Choose another pit.');
      return;
    }

    await sowSeeds(pitIndex, isP1Turn ? 'p1' : 'p2');
  };

  const sowSeeds = async (startIndex: number, player: 'p1' | 'p2') => {
    setIsSowing(true);
    soundEngine.playClick();

    const currentPits = [...pits];
    let seedsInHand = currentPits[startIndex];
    currentPits[startIndex] = 0;
    setPits([...currentPits]);

    let curr = startIndex;

    while (seedsInHand > 0) {
      curr = (curr + 1) % 12;
      if (curr === startIndex) {
        curr = (curr + 1) % 12; // Skip starting pit if more than 11 seeds
      }
      currentPits[curr] += 1;
      seedsInHand -= 1;
      setPits([...currentPits]);
      soundEngine.playSeedDrop(curr % 4);
      await new Promise((r) => setTimeout(r, 140)); // Smooth seed drop animation
    }

    // Capture Check
    // If the last seed drops into an opponent's pit and leaves it with 2 or 3 seeds, capture them!
    let captured = 0;
    let captureIndex = curr;

    const isOpponentPit = (idx: number, pl: 'p1' | 'p2') => {
      return pl === 'p1' ? idx >= 6 && idx <= 11 : idx >= 0 && idx <= 5;
    };

    while (
      isOpponentPit(captureIndex, player) &&
      (currentPits[captureIndex] === 2 || currentPits[captureIndex] === 3)
    ) {
      captured += currentPits[captureIndex];
      currentPits[captureIndex] = 0;
      captureIndex = (captureIndex - 1 + 12) % 12;
    }

    if (captured > 0) {
      soundEngine.playWin();
      setStatusMessage(`Boom! Captured ${captured} seeds into your house!`);
      setBanks((prev) => ({
        ...prev,
        [player]: prev[player] + captured,
      }));
    } else {
      setStatusMessage(`Turn passed to ${player === 'p1' ? (mode === 'ai' ? 'Computer' : 'Player 2') : 'Player 1'}`);
    }

    setPits([...currentPits]);
    setIsSowing(false);

    // Check game end (25 seeds captured or no moves)
    const newP1Score = player === 'p1' ? banks.p1 + captured : banks.p1;
    const newP2Score = player === 'p2' ? banks.p2 + captured : banks.p2;

    if (newP1Score >= 25) {
      handleGameOver('Player 1');
      return;
    } else if (newP2Score >= 25) {
      handleGameOver(mode === 'ai' ? 'Computer AI' : 'Player 2');
      return;
    }

    const nextIsP1 = !isP1Turn;
    setIsP1Turn(nextIsP1);

    // If AI's turn
    if (!nextIsP1 && mode === 'ai') {
      setTimeout(() => {
        executeAIMove(currentPits);
      }, 700);
    }
  };

  const executeAIMove = (currentPits: number[]) => {
    // Choose pit with seeds between 6 and 11
    const validPits = [6, 7, 8, 9, 10, 11].filter((idx) => currentPits[idx] > 0);
    if (validPits.length === 0) {
      handleGameOver('Player 1');
      return;
    }

    // Heuristic: pick pit that can land on player's side with 2 or 3
    let bestPit = validPits[0];
    for (const p of validPits) {
      const target = (p + currentPits[p]) % 12;
      if (target >= 0 && target <= 5 && (currentPits[target] === 1 || currentPits[target] === 2)) {
        bestPit = p;
        break;
      }
    }

    sowSeeds(bestPit, 'p2');
  };

  const handleGameOver = (winningPlayer: string) => {
    setWinner(winningPlayer);
    setTimeout(() => setIsModalOpen(true), 600);
  };

  const resetGame = () => {
    setPits([...INITIAL_PITS]);
    setBanks({ p1: 0, p2: 0 });
    setIsP1Turn(true);
    setWinner(null);
    setIsModalOpen(false);
    setStatusMessage('New Ayo match! Player 1 goes first.');
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 flex flex-col items-center select-none">
      {/* Top Controls */}
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
            AYO <span className="text-amber-400">OLOPON</span>
          </h2>
          <p className="text-[11px] font-bold text-emerald-400">West African Ancient Mancala (48 Seeds)</p>
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

      {/* Mode Selector */}
      <div className="flex items-center gap-2 mb-4 bg-black/40 px-3 py-1.5 rounded-xl border border-white/10 text-xs">
        <span className="text-gray-400 font-bold">Opponent:</span>
        <button
          onClick={() => {
            soundEngine.playClick();
            setMode('ai');
            resetGame();
          }}
          className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center gap-1 ${
            mode === 'ai' ? 'bg-amber-500 text-black font-black' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>vs Computer</span>
        </button>
        <button
          onClick={() => {
            soundEngine.playClick();
            setMode('pass');
            resetGame();
          }}
          className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center gap-1 ${
            mode === 'pass' ? 'bg-amber-500 text-black font-black' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Pass & Play</span>
        </button>
      </div>

      {/* Score and Turn Banner */}
      <div className="grid grid-cols-2 gap-3 w-full mb-4">
        <div
          className={`p-3 rounded-2xl border-2 transition-all flex items-center justify-between ${
            !isP1Turn && !winner
              ? 'bg-rose-500/20 border-rose-400 shadow-lg shadow-rose-500/20 scale-[1.02]'
              : 'bg-white/5 border-white/10'
          }`}
        >
          <div>
            <p className="text-[10px] uppercase font-black text-rose-300">
              {mode === 'ai' ? 'Computer (North)' : 'Player 2 (North)'}
            </p>
            <p className="text-xl font-black text-white">{banks.p2} Seeds</p>
          </div>
          <span className="text-2xl">🪘</span>
        </div>

        <div
          className={`p-3 rounded-2xl border-2 transition-all flex items-center justify-between ${
            isP1Turn && !winner
              ? 'bg-amber-500/20 border-amber-400 shadow-lg shadow-amber-500/20 scale-[1.02]'
              : 'bg-white/5 border-white/10'
          }`}
        >
          <div>
            <p className="text-[10px] uppercase font-black text-amber-300">
              {user?.displayName || 'Player 1'} (South)
            </p>
            <p className="text-xl font-black text-white">{banks.p1} Seeds</p>
          </div>
          <span className="text-2xl">{user?.avatarUrl || '👑'}</span>
        </div>
      </div>

      {/* Status banner */}
      <div className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-center mb-5 text-xs font-bold text-amber-300">
        {statusMessage}
      </div>

      {/* Authentic Ayo Wooden Board Representation */}
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#3d2412] to-[#241307] border-4 border-[#593418] rounded-[36px] p-4 sm:p-6 shadow-2xl space-y-4">
        {/* Top Row: Opponent Pits 11 downto 6 */}
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          {[11, 10, 9, 8, 7, 6].map((idx) => {
            const count = pits[idx];
            const canClick = !isP1Turn && mode === 'pass' && !isSowing && count > 0;
            return (
              <motion.button
                key={idx}
                whileHover={{ scale: canClick ? 1.08 : 1 }}
                whileTap={{ scale: canClick ? 0.94 : 1 }}
                onClick={() => canClick && handlePitClick(idx)}
                className={`flex-1 aspect-square rounded-full bg-gradient-to-b from-[#190d05] to-[#120803] border-2 border-[#543319] shadow-inner flex flex-col items-center justify-center p-1 sm:p-2 relative transition-all ${
                  canClick ? 'cursor-pointer hover:border-amber-400 ring-2 ring-amber-400/30' : ''
                }`}
              >
                <span className="text-lg sm:text-2xl font-black text-amber-300 font-display">
                  {count}
                </span>
                <div className="flex flex-wrap gap-0.5 justify-center max-w-[28px]">
                  {Array.from({ length: Math.min(count, 6) }).map((_, i) => (
                    <span key={i} className="text-[8px] sm:text-[10px]">
                      🟤
                    </span>
                  ))}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Divider Groove */}
        <div className="w-full h-1.5 bg-[#170c05] rounded-full shadow-inner" />

        {/* Bottom Row: Player 1 Pits 0 to 5 */}
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          {[0, 1, 2, 3, 4, 5].map((idx) => {
            const count = pits[idx];
            const canClick = isP1Turn && !isSowing && count > 0;
            return (
              <motion.button
                key={idx}
                whileHover={{ scale: canClick ? 1.08 : 1 }}
                whileTap={{ scale: canClick ? 0.94 : 1 }}
                onClick={() => canClick && handlePitClick(idx)}
                className={`flex-1 aspect-square rounded-full bg-gradient-to-b from-[#190d05] to-[#120803] border-2 border-[#543319] shadow-inner flex flex-col items-center justify-center p-1 sm:p-2 relative transition-all ${
                  canClick ? 'cursor-pointer hover:border-amber-400 ring-2 ring-amber-400/30' : ''
                }`}
              >
                <span className="text-lg sm:text-2xl font-black text-amber-300 font-display">
                  {count}
                </span>
                <div className="flex flex-wrap gap-0.5 justify-center max-w-[28px]">
                  {Array.from({ length: Math.min(count, 6) }).map((_, i) => (
                    <span key={i} className="text-[8px] sm:text-[10px]">
                      🟤
                    </span>
                  ))}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Result Modal */}
      <GameResultModal
        isOpen={isModalOpen}
        winner={winner}
        isWin={winner === 'Player 1'}
        scoreText={`Final Score: Player 1 (${banks.p1}) vs P2/AI (${banks.p2})`}
        onPlayAgain={resetGame}
        onBackToLobby={onBack}
      />
    </div>
  );
};
