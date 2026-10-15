import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { soundEngine } from '../../audio/audioEngine';
import { GameResultModal } from '../../components/GameResultModal';
import { ArrowLeft, RotateCcw, Dices, Bot, Users } from 'lucide-react';
import { useWhotStore } from '../../store/useWhotStore';

interface Token {
  id: number;
  step: number; // -1: In Base, 0-51: Main Track, 52-57: Home stretch, 58: Completed
}

export const LudoGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { user } = useWhotStore();

  const [playerTokens, setPlayerTokens] = useState<Token[]>([
    { id: 1, step: -1 },
    { id: 2, step: -1 },
  ]);
  const [aiTokens, setAiTokens] = useState<Token[]>([
    { id: 1, step: -1 },
    { id: 2, step: -1 },
  ]);

  const [currentTurn, setCurrentTurn] = useState<'p1' | 'ai'>('p1');
  const [dice, setDice] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [statusMsg, setStatusMsg] = useState('Roll a 6 to bring your token out of base!');
  const [winner, setWinner] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const rollDice = async () => {
    if (isRolling || winner) return;

    setIsRolling(true);
    soundEngine.playDiceRoll();

    for (let i = 0; i < 7; i++) {
      setDice(Math.floor(Math.random() * 6) + 1);
      await new Promise((r) => setTimeout(r, 60));
    }

    const finalRoll = Math.floor(Math.random() * 6) + 1;
    setDice(finalRoll);
    setIsRolling(false);

    handleRollOutcome(finalRoll);
  };

  const handleRollOutcome = (roll: number) => {
    if (currentTurn === 'p1') {
      // Check if p1 can move any token
      const canMoveAny = playerTokens.some(
        (t) => (t.step === -1 && roll === 6) || (t.step >= 0 && t.step + roll <= 58)
      );

      if (!canMoveAny) {
        setStatusMsg(`Rolled a ${roll}. No valid moves available. Passing turn!`);
        setTimeout(() => switchTurn(), 900);
      } else {
        setStatusMsg(`Rolled a ${roll}! Click a token to move.`);
      }
    } else {
      // AI automove
      setTimeout(() => executeAIMove(roll), 800);
    }
  };

  const handleTokenClick = (tokenId: number) => {
    if (currentTurn !== 'p1' || !dice || isRolling || winner) return;

    const token = playerTokens.find((t) => t.id === tokenId);
    if (!token) return;

    if (token.step === -1) {
      if (dice === 6) {
        // Bring out
        soundEngine.playWin();
        setPlayerTokens((prev) =>
          prev.map((t) => (t.id === tokenId ? { ...t, step: 0 } : t))
        );
        setStatusMsg('Token brought out to track! You get another roll!');
        setDice(null);
        // Roll again on 6
        return;
      } else {
        soundEngine.playWrongSound();
        setStatusMsg('You must roll a 6 to bring a token out of base!');
        return;
      }
    }

    // Move token along track
    const nextStep = token.step + dice;
    if (nextStep > 58) {
      soundEngine.playWrongSound();
      setStatusMsg('Too high! You must roll the exact number to finish.');
      return;
    }

    soundEngine.playMove(500 + dice * 30);
    const updated = playerTokens.map((t) => (t.id === tokenId ? { ...t, step: nextStep } : t));
    setPlayerTokens(updated);

    // Check Win
    if (updated.every((t) => t.step >= 58)) {
      setWinner(user?.displayName || 'Player 1');
      soundEngine.playWin();
      setTimeout(() => setIsModalOpen(true), 600);
      return;
    }

    if (dice === 6) {
      setStatusMsg('Rolled a 6! You earn another roll.');
      setDice(null);
    } else {
      setDice(null);
      switchTurn();
    }
  };

  const executeAIMove = (roll: number) => {
    let moved = false;
    const nextTokens = [...aiTokens];

    // Priority 1: bring out if rolled 6
    if (roll === 6) {
      const inBase = nextTokens.find((t) => t.step === -1);
      if (inBase) {
        inBase.step = 0;
        soundEngine.playMove(450);
        moved = true;
      }
    }

    // Priority 2: move token on track
    if (!moved) {
      const onTrack = nextTokens.find((t) => t.step >= 0 && t.step + roll <= 58);
      if (onTrack) {
        onTrack.step += roll;
        soundEngine.playMove(450);
        moved = true;
      }
    }

    setAiTokens(nextTokens);

    if (nextTokens.every((t) => t.step >= 58)) {
      setWinner('Computer AI');
      soundEngine.playLose();
      setTimeout(() => setIsModalOpen(true), 600);
      return;
    }

    if (roll === 6 && moved) {
      setStatusMsg('AI rolled a 6 and rolls again!');
      setTimeout(() => rollDice(), 800);
    } else {
      setDice(null);
      setCurrentTurn('p1');
      setStatusMsg('Your turn! Roll the dice.');
    }
  };

  const switchTurn = () => {
    setCurrentTurn('ai');
    setDice(null);
    setStatusMsg('AI is taking turn...');
    setTimeout(() => {
      rollDice();
    }, 800);
  };

  const resetGame = () => {
    setPlayerTokens([
      { id: 1, step: -1 },
      { id: 2, step: -1 },
    ]);
    setAiTokens([
      { id: 1, step: -1 },
      { id: 2, step: -1 },
    ]);
    setCurrentTurn('p1');
    setDice(null);
    setWinner(null);
    setIsModalOpen(false);
    setStatusMsg('New match! Roll a 6 to bring token out.');
  };

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
            NAIJA <span className="text-amber-400">LUDO</span>
          </h2>
          <p className="text-[11px] font-bold text-gray-400">African 4-Quadrant Board Race</p>
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

      {/* Players Header */}
      <div className="grid grid-cols-2 gap-3 w-full mb-4">
        <div
          className={`p-3 rounded-2xl border-2 transition-all flex items-center justify-between ${
            currentTurn === 'p1' && !winner
              ? 'bg-amber-500/20 border-amber-400 shadow-lg shadow-amber-500/20'
              : 'bg-white/5 border-white/10'
          }`}
        >
          <div>
            <p className="text-xs font-black text-amber-300">
              {user?.displayName || 'Player 1'} (Yellow)
            </p>
            <p className="text-[10px] text-gray-400">
              Tokens Home: {playerTokens.filter((t) => t.step >= 58).length}/2
            </p>
          </div>
          <span className="text-2xl">🟡</span>
        </div>

        <div
          className={`p-3 rounded-2xl border-2 transition-all flex items-center justify-between ${
            currentTurn === 'ai' && !winner
              ? 'bg-rose-500/20 border-rose-400 shadow-lg shadow-rose-500/20'
              : 'bg-white/5 border-white/10'
          }`}
        >
          <div>
            <p className="text-xs font-black text-rose-300">Computer (Red)</p>
            <p className="text-[10px] text-gray-400">
              Tokens Home: {aiTokens.filter((t) => t.step >= 58).length}/2
            </p>
          </div>
          <span className="text-2xl">🔴</span>
        </div>
      </div>

      {/* Status banner */}
      <div className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-center mb-4 text-xs font-bold text-amber-300">
        {statusMsg}
      </div>

      {/* Ludo Board Visual Mockup */}
      <div className="relative w-full max-w-sm aspect-square bg-[#0e1626] border-4 border-amber-500/40 rounded-3xl p-3 shadow-2xl grid grid-cols-3 gap-1 overflow-hidden">
        {/* Red Home Base (Top Left) */}
        <div className="bg-rose-600/30 border-2 border-rose-500 rounded-2xl p-2 flex flex-col items-center justify-center">
          <p className="text-[10px] font-black text-rose-300 uppercase">RED BASE</p>
          <div className="flex gap-2 mt-2">
            {aiTokens.map((t) => (
              <span key={t.id} className="text-xl">
                {t.step === -1 ? '🔴' : '⭕'}
              </span>
            ))}
          </div>
        </div>

        {/* Top Track */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-1 flex items-center justify-center text-[10px] font-bold text-gray-400">
          Track
        </div>

        {/* Green Base (Top Right) */}
        <div className="bg-emerald-600/30 border-2 border-emerald-500 rounded-2xl p-2 flex flex-col items-center justify-center">
          <p className="text-[10px] font-black text-emerald-300 uppercase">GREEN BASE</p>
          <span className="text-2xl mt-1">🟢</span>
        </div>

        {/* Left Track */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-1 flex items-center justify-center text-[10px] font-bold text-gray-400">
          Track
        </div>

        {/* Center Victory Home Triangle */}
        <div className="bg-gradient-to-tr from-amber-500 via-rose-500 to-emerald-500 rounded-2xl flex items-center justify-center text-3xl font-black shadow-lg">
          🏆
        </div>

        {/* Right Track */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-1 flex items-center justify-center text-[10px] font-bold text-gray-400">
          Track
        </div>

        {/* Blue Base (Bottom Left) */}
        <div className="bg-blue-600/30 border-2 border-blue-500 rounded-2xl p-2 flex flex-col items-center justify-center">
          <p className="text-[10px] font-black text-blue-300 uppercase">BLUE BASE</p>
          <span className="text-2xl mt-1">🔵</span>
        </div>

        {/* Bottom Track */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-1 flex items-center justify-center text-[10px] font-bold text-gray-400">
          Track
        </div>

        {/* Yellow Base (Player 1, Bottom Right) */}
        <div className="bg-amber-500/30 border-2 border-amber-400 rounded-2xl p-2 flex flex-col items-center justify-center">
          <p className="text-[10px] font-black text-amber-300 uppercase">YELLOW BASE</p>
          <div className="flex gap-2 mt-2">
            {playerTokens.map((t) => (
              <button
                key={t.id}
                onClick={() => handleTokenClick(t.id)}
                className="cursor-pointer hover:scale-125 transition-transform"
              >
                <span className="text-xl">{t.step === -1 ? '🟡' : '⭐'}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Player Tokens Action Buttons */}
      <div className="mt-4 flex items-center gap-3">
        {playerTokens.map((t) => (
          <button
            key={t.id}
            onClick={() => handleTokenClick(t.id)}
            className="px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-400 text-amber-300 font-bold text-xs cursor-pointer hover:bg-amber-500/30 transition-all flex items-center gap-2"
          >
            <span>🟡 Token {t.id}</span>
            <span className="text-[10px] opacity-80">
              ({t.step === -1 ? 'In Base' : t.step >= 58 ? 'Home!' : `Step ${t.step}`})
            </span>
          </button>
        ))}
      </div>

      {/* Dice & Roll Button */}
      <div className="mt-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 border-2 border-amber-300 shadow-xl flex items-center justify-center text-3xl font-black text-black font-display">
          {dice || '🎲'}
        </div>

        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          disabled={isRolling || currentTurn !== 'p1' || Boolean(winner)}
          onClick={rollDice}
          className="py-4 px-8 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-base uppercase tracking-wider shadow-xl shadow-amber-500/25 flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Dices className="w-5 h-5 stroke-[2.5]" />
          <span>{isRolling ? 'Rolling...' : currentTurn === 'p1' ? 'Roll Dice' : 'AI Turn...'}</span>
        </motion.button>
      </div>

      {/* Result Modal */}
      <GameResultModal
        isOpen={isModalOpen}
        winner={winner}
        isWin={winner !== 'Computer AI'}
        scoreText="Ludo tokens safely returned home!"
        onPlayAgain={resetGame}
        onBackToLobby={onBack}
      />
    </div>
  );
};
