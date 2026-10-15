import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { soundEngine } from '../../audio/audioEngine';
import { GameResultModal } from '../../components/GameResultModal';
import { RotateCcw, ArrowLeft, Dices, Sparkles, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useWhotStore } from '../../store/useWhotStore';

// Authentic Naija Ladders & Snakes
const LADDERS: Record<number, { to: number; label: string }> = {
  4: { to: 14, label: 'Free ride in Keke NAPEP! 🛺' },
  9: { to: 31, label: 'Found ₦10,000 in Agbada! 💵' },
  20: { to: 38, label: 'VIP Pass to Burna Boy show! 🎟️' },
  28: { to: 84, label: 'Hit the Gbedu Mega Jackpot! 🎰' },
  40: { to: 59, label: 'Odogwu Bank Alert dropped! 📱' },
  63: { to: 81, label: 'Lekki-Ikoyi Link Bridge express! 🏎️' },
  71: { to: 91, label: 'Private Jet to Amapiano Fest! ✈️' },
};

const SNAKES: Record<number, { to: number; label: string }> = {
  17: { to: 7, label: 'Danfo bus breakdown in Ojuelegba! 🚐' },
  54: { to: 34, label: 'Generator fuel finish at midnight! ⛽' },
  62: { to: 18, label: 'NEPA light take off! ⚡' },
  64: { to: 60, label: 'Heavy traffic at Third Mainland Bridge! 🚗' },
  87: { to: 24, label: 'Lagos Island rain flood! 🌧️' },
  93: { to: 73, label: 'POS network declined your card! 💳' },
  99: { to: 78, label: 'Bitten right at the finish line! 🐍' },
};

interface PlayerState {
  id: string;
  name: string;
  avatar: string;
  color: string;
  position: number;
  isAI: boolean;
}

export const SnakesLaddersGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { user } = useWhotStore();

  const [players, setPlayers] = useState<PlayerState[]>([
    { id: 'p1', name: user?.displayName || 'Player 1', avatar: user?.avatarUrl || '👑', color: 'bg-amber-500 border-amber-300', position: 1, isAI: false },
    { id: 'p2', name: 'Computer AI', avatar: '🤖', color: 'bg-rose-500 border-rose-300', position: 1, isAI: true },
  ]);

  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [eventMessage, setEventMessage] = useState<string | null>('Roll the dice to start the Naija journey!');
  const [winner, setWinner] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const rollDice = async () => {
    if (isRolling || winner) return;

    setIsRolling(true);
    soundEngine.playDiceRoll();

    // Visual roll animation cycle
    const rollCycles = 8;
    for (let i = 0; i < rollCycles; i++) {
      setDiceValue(Math.floor(Math.random() * 6) + 1);
      await new Promise((r) => setTimeout(r, 60));
    }

    const finalRoll = Math.floor(Math.random() * 6) + 1;
    setDiceValue(finalRoll);
    setIsRolling(false);

    moveCurrentPlayer(finalRoll);
  };

  const moveCurrentPlayer = (roll: number) => {
    const player = players[currentPlayerIdx];
    let nextPos = player.position + roll;

    soundEngine.playMove(500 + roll * 40);

    if (nextPos > 100) {
      // Must land exactly on 100
      setEventMessage(`${player.name} needed ${100 - player.position} to win! Stay put.`);
      soundEngine.playWrongSound();
      finishTurn(player.position);
      return;
    }

    let finalPos = nextPos;
    let msg = `${player.name} rolled a ${roll}!`;

    // Check Ladder
    if (LADDERS[nextPos]) {
      finalPos = LADDERS[nextPos].to;
      msg = `🎉 LADDER! ${LADDERS[nextPos].label} (${nextPos} ➔ ${finalPos})`;
      soundEngine.playWin();
    }
    // Check Snake
    else if (SNAKES[nextPos]) {
      finalPos = SNAKES[nextPos].to;
      msg = `🐍 OUCH! ${SNAKES[nextPos].label} (${nextPos} ➔ ${finalPos})`;
      soundEngine.playLose();
    }

    setEventMessage(msg);

    // Update positions
    setPlayers((prev) =>
      prev.map((p, idx) => (idx === currentPlayerIdx ? { ...p, position: finalPos } : p))
    );

    // Win check
    if (finalPos === 100) {
      setWinner(player.name);
      setTimeout(() => setIsModalOpen(true), 600);
      return;
    }

    finishTurn(finalPos);
  };

  const finishTurn = (pos: number) => {
    const nextIdx = (currentPlayerIdx + 1) % players.length;
    setCurrentPlayerIdx(nextIdx);

    // If next player is AI, trigger automatic roll
    if (players[nextIdx].isAI && !winner) {
      setTimeout(() => {
        rollDice();
      }, 1000);
    }
  };

  const resetGame = () => {
    setPlayers((prev) => prev.map((p) => ({ ...p, position: 1 })));
    setCurrentPlayerIdx(0);
    setDiceValue(null);
    setEventMessage('New match! Roll the dice to begin.');
    setWinner(null);
    setIsModalOpen(false);
  };

  // Generate 100 to 1 in alternating snake order
  const generateBoardGrid = () => {
    const grid: number[] = [];
    for (let row = 9; row >= 0; row--) {
      const rowNumbers: number[] = [];
      for (let col = 1; col <= 10; col++) {
        rowNumbers.push(row * 10 + col);
      }
      if (row % 2 === 1) {
        rowNumbers.reverse(); // Boustrophedon snake pattern
      }
      grid.push(...rowNumbers);
    }
    return grid;
  };

  const boardCells = generateBoardGrid();

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 flex flex-col items-center select-none">
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
            SNAKES & <span className="text-amber-400">LADDERS</span>
          </h2>
          <p className="text-[11px] font-bold text-emerald-400">Naija Traffic & Hustle Edition (100 Tiles)</p>
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

      {/* Players Bar & Current Turn Indicator */}
      <div className="grid grid-cols-2 gap-3 w-full mb-4">
        {players.map((p, idx) => (
          <div
            key={p.id}
            className={`p-3 rounded-2xl border-2 transition-all flex items-center justify-between ${
              currentPlayerIdx === idx && !winner
                ? 'bg-amber-500/20 border-amber-400 shadow-lg shadow-amber-500/20 scale-[1.02]'
                : 'bg-white/5 border-white/10'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">{p.avatar}</span>
              <div>
                <p className="text-xs font-black text-white">{p.name}</p>
                <p className="text-[10px] text-gray-400">Tile: {p.position}/100</p>
              </div>
            </div>
            {currentPlayerIdx === idx && !winner && (
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400 text-black animate-pulse">
                Rolling
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Event Banner */}
      <div className="w-full bg-black/40 border border-white/10 rounded-2xl p-2.5 text-center mb-4 min-h-[42px] flex items-center justify-center">
        <p className="text-xs sm:text-sm font-bold text-amber-300">{eventMessage}</p>
      </div>

      {/* 10x10 Board Grid (Responsive & Mobile-optimized) */}
      <div className="w-full max-w-lg aspect-square bg-[#0c1322] border-2 border-white/15 rounded-3xl p-2 sm:p-3 shadow-2xl grid grid-cols-10 gap-1 sm:gap-1.5 relative overflow-hidden">
        {boardCells.map((num) => {
          const isLadder = Boolean(LADDERS[num]);
          const isSnake = Boolean(SNAKES[num]);
          const playersHere = players.filter((p) => p.position === num);

          return (
            <div
              key={num}
              className={`relative rounded-lg sm:rounded-xl flex flex-col items-center justify-center p-0.5 sm:p-1 text-[8px] sm:text-[10px] font-black transition-colors ${
                num === 100
                  ? 'bg-gradient-to-tr from-amber-500 to-yellow-300 text-black shadow-lg font-black'
                  : isLadder
                  ? 'bg-emerald-500/25 border border-emerald-400/40 text-emerald-300'
                  : isSnake
                  ? 'bg-rose-500/25 border border-rose-400/40 text-rose-300'
                  : num % 2 === 0
                  ? 'bg-white/5 text-gray-400'
                  : 'bg-black/40 text-gray-500'
              }`}
            >
              <span className="leading-none">{num}</span>
              {isLadder && <span className="text-[9px] sm:text-xs">🪜</span>}
              {isSnake && <span className="text-[9px] sm:text-xs">🐍</span>}

              {/* Player Pawns */}
              <div className="absolute inset-0 flex items-center justify-center gap-0.5 pointer-events-none">
                {playersHere.map((p) => (
                  <motion.span
                    key={p.id}
                    layoutId={`pawn-${p.id}`}
                    transition={{ type: 'spring', damping: 14, stiffness: 200 }}
                    className="text-xs sm:text-base filter drop-shadow-md"
                  >
                    {p.avatar}
                  </motion.span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dice & Roll Controls */}
      <div className="mt-6 flex flex-col sm:flex-row items-center gap-4">
        {/* Animated 3D Dice Display */}
        <motion.div
          animate={isRolling ? { rotate: [0, 90, 180, 270, 360], scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 0.3, repeat: isRolling ? Infinity : 0 }}
          className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 border-2 border-amber-300 shadow-xl flex items-center justify-center text-3xl font-black text-black font-display"
        >
          {diceValue || '🎲'}
        </motion.div>

        {/* Big Touch-Friendly Roll Button */}
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          disabled={isRolling || Boolean(winner) || players[currentPlayerIdx].isAI}
          onClick={rollDice}
          className="py-4 px-8 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-base uppercase tracking-wider shadow-xl shadow-amber-500/25 flex items-center gap-2.5 cursor-pointer disabled:opacity-50"
        >
          <Dices className="w-5 h-5 stroke-[2.5]" />
          <span>{isRolling ? 'Rolling...' : players[currentPlayerIdx].isAI ? 'AI Rolling...' : 'Roll Dice!'}</span>
        </motion.button>
      </div>

      {/* Result Modal */}
      <GameResultModal
        isOpen={isModalOpen}
        winner={winner}
        isWin={winner !== 'Computer AI'}
        scoreText={`Winner reached the finish line on tile 100!`}
        onPlayAgain={resetGame}
        onBackToLobby={onBack}
      />
    </div>
  );
};
