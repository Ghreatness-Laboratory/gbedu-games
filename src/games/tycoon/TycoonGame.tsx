import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { soundEngine } from '../../audio/audioEngine';
import { GameResultModal } from '../../components/GameResultModal';
import { ArrowLeft, RotateCcw, Dices, Building2, Coins, Sparkles } from 'lucide-react';
import { useWhotStore } from '../../store/useWhotStore';

interface Property {
  id: number;
  name: string;
  city: string;
  price: number;
  rent: number;
  color: string;
  owner: 'p1' | 'ai' | null;
}

const PROPERTIES: Property[] = [
  { id: 0, name: 'GO (Start)', city: 'Gbedu Hub', price: 0, rent: 0, color: 'bg-emerald-600', owner: null },
  { id: 1, name: 'Osu Oxford St', city: 'Accra 🇬🇭', price: 120, rent: 25, color: 'bg-amber-600', owner: null },
  { id: 2, name: 'Street Hustle', city: 'Special', price: 0, rent: 0, color: 'bg-purple-600', owner: null },
  { id: 3, name: 'Labadi Beach', city: 'Accra 🇬🇭', price: 140, rent: 30, color: 'bg-amber-600', owner: null },
  { id: 4, name: 'Westlands', city: 'Nairobi 🇰🇪', price: 180, rent: 40, color: 'bg-blue-600', owner: null },
  { id: 5, name: 'Kilimani Road', city: 'Nairobi 🇰🇪', price: 200, rent: 45, color: 'bg-blue-600', owner: null },
  { id: 6, name: 'Gbedu Concert', city: 'Party Zone', price: 0, rent: 0, color: 'bg-pink-600', owner: null },
  { id: 7, name: 'Sandton City', city: 'Joburg 🇿🇦', price: 260, rent: 60, color: 'bg-rose-600', owner: null },
  { id: 8, name: 'Soweto Heights', city: 'Joburg 🇿🇦', price: 280, rent: 65, color: 'bg-rose-600', owner: null },
  { id: 9, name: 'Ikeja GRA', city: 'Lagos 🇳🇬', price: 350, rent: 85, color: 'bg-emerald-600', owner: null },
  { id: 10, name: 'Lekki Phase 1', city: 'Lagos 🇳🇬', price: 400, rent: 100, color: 'bg-emerald-600', owner: null },
  { id: 11, name: 'Victoria Island', city: 'Lagos 🇳🇬', price: 500, rent: 130, color: 'bg-emerald-600', owner: null },
];

export const TycoonGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { user } = useWhotStore();

  const [properties, setProperties] = useState<Property[]>(PROPERTIES);
  const [p1Cash, setP1Cash] = useState(1500);
  const [aiCash, setAiCash] = useState(1500);
  const [p1Pos, setP1Pos] = useState(0);
  const [aiPos, setAiPos] = useState(0);
  const [turn, setTurn] = useState<'p1' | 'ai'>('p1');
  const [dice, setDice] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [eventMsg, setEventMsg] = useState('Roll the dice to tour African cities and buy properties!');
  const [winner, setWinner] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const rollDice = async () => {
    if (isRolling || winner) return;

    setIsRolling(true);
    soundEngine.playDiceRoll();

    for (let i = 0; i < 6; i++) {
      setDice(Math.floor(Math.random() * 6) + 1);
      await new Promise((r) => setTimeout(r, 60));
    }

    const roll = Math.floor(Math.random() * 6) + 1;
    setDice(roll);
    setIsRolling(false);

    if (turn === 'p1') {
      movePlayer(roll);
    } else {
      moveAI(roll);
    }
  };

  const movePlayer = (roll: number) => {
    let nextPos = (p1Pos + roll) % properties.length;
    let earnedGo = false;
    if (p1Pos + roll >= properties.length) {
      earnedGo = true;
      setP1Cash((c) => c + 200);
    }

    setP1Pos(nextPos);
    soundEngine.playMove(540);

    const targetProp = properties[nextPos];

    if (earnedGo) {
      soundEngine.playWin();
      setEventMsg(`Passed GO! Collected ₦200 Gbedu stipend. Landed on ${targetProp.name}.`);
    } else {
      setEventMsg(`Landed on ${targetProp.name} (${targetProp.city}).`);
    }

    // Process tile
    if (targetProp.owner === 'ai') {
      // Pay rent
      soundEngine.playLose();
      const rent = targetProp.rent;
      setP1Cash((c) => c - rent);
      setAiCash((c) => c + rent);
      setEventMsg(`Paid ₦${rent} rent to Computer for ${targetProp.name}!`);
    } else if (targetProp.owner === null && targetProp.price > 0) {
      // Option to buy
      if (p1Cash >= targetProp.price) {
        setEventMsg(`You can buy ${targetProp.name} for ₦${targetProp.price} (Rent: ₦${targetProp.rent}).`);
      }
    }

    // End turn button or pass
  };

  const handleBuyProperty = (propId: number) => {
    const prop = properties[propId];
    if (!prop || prop.owner !== null || p1Cash < prop.price) return;

    soundEngine.playWin();
    setP1Cash((c) => c - prop.price);
    setProperties((prev) =>
      prev.map((p) => (p.id === propId ? { ...p, owner: 'p1' } : p))
    );
    setEventMsg(`Congratulations! You now own ${prop.name}!`);
  };

  const passTurn = () => {
    setTurn('ai');
    setDice(null);
    setEventMsg('Computer AI is rolling the dice...');
    setTimeout(() => {
      rollDice();
    }, 900);
  };

  const moveAI = (roll: number) => {
    let nextPos = (aiPos + roll) % properties.length;
    if (aiPos + roll >= properties.length) {
      setAiCash((c) => c + 200);
    }
    setAiPos(nextPos);
    soundEngine.playMove(460);

    const targetProp = properties[nextPos];

    if (targetProp.owner === 'p1') {
      // AI pays rent to player
      soundEngine.playWin();
      const rent = targetProp.rent;
      setAiCash((c) => c - rent);
      setP1Cash((c) => c + rent);
      setEventMsg(`AI paid you ₦${rent} rent for landing on ${targetProp.name}!`);
    } else if (targetProp.owner === null && targetProp.price > 0 && aiCash >= targetProp.price) {
      // AI buys
      setAiCash((c) => c - targetProp.price);
      setProperties((prev) =>
        prev.map((p) => (p.id === targetProp.id ? { ...p, owner: 'ai' } : p))
      );
      setEventMsg(`Computer purchased ${targetProp.name}!`);
    }

    // Check bankruptcy
    if (p1Cash <= 0) {
      setWinner('Computer AI');
      setIsModalOpen(true);
      return;
    }
    if (aiCash <= 0) {
      setWinner(user?.displayName || 'Player 1');
      setIsModalOpen(true);
      return;
    }

    setTimeout(() => {
      setTurn('p1');
      setDice(null);
      setEventMsg('Your turn! Roll the dice.');
    }, 1200);
  };

  const resetGame = () => {
    setProperties(PROPERTIES);
    setP1Cash(1500);
    setAiCash(1500);
    setP1Pos(0);
    setAiPos(0);
    setTurn('p1');
    setDice(null);
    setWinner(null);
    setIsModalOpen(false);
    setEventMsg('New match! Roll to explore Africa.');
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 flex flex-col items-center select-none">
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
            GBEDU <span className="text-amber-400">TYCOON</span>
          </h2>
          <p className="text-[11px] font-bold text-emerald-400">African Real Estate Empire</p>
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

      {/* Cash Balances */}
      <div className="grid grid-cols-2 gap-3 w-full mb-4">
        <div className="p-3 rounded-2xl bg-amber-500/20 border-2 border-amber-400 text-center shadow-lg">
          <p className="text-[10px] uppercase font-black text-amber-300">
            {user?.displayName || 'Player 1'} (You)
          </p>
          <p className="text-2xl font-black text-white font-mono mt-0.5">₦{p1Cash}</p>
        </div>

        <div className="p-3 rounded-2xl bg-rose-500/20 border-2 border-rose-400 text-center shadow-lg">
          <p className="text-[10px] uppercase font-black text-rose-300">Computer Rival</p>
          <p className="text-2xl font-black text-white font-mono mt-0.5">₦{aiCash}</p>
        </div>
      </div>

      {/* Event Banner */}
      <div className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-center mb-4 text-xs font-bold text-amber-300">
        {eventMsg}
      </div>

      {/* Property Cards Grid Track (12 Tiles) */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 w-full mb-5">
        {properties.map((prop) => {
          const isP1Here = p1Pos === prop.id;
          const isAIHere = aiPos === prop.id;

          return (
            <div
              key={prop.id}
              className={`p-2.5 rounded-2xl border flex flex-col justify-between text-left relative min-h-[90px] transition-all ${
                prop.owner === 'p1'
                  ? 'bg-amber-500/25 border-amber-400 shadow-md shadow-amber-500/20'
                  : prop.owner === 'ai'
                  ? 'bg-rose-500/25 border-rose-400 shadow-md shadow-rose-500/20'
                  : 'bg-white/5 border-white/10'
              }`}
            >
              <div>
                <span className="text-[9px] font-black uppercase text-gray-400 block truncate">
                  {prop.city}
                </span>
                <p className="text-xs font-black text-white leading-tight mt-0.5 truncate">
                  {prop.name}
                </p>
              </div>

              <div className="mt-2 flex items-center justify-between text-[10px] font-bold">
                {prop.price > 0 ? (
                  <>
                    <span className="text-amber-300 font-mono">₦{prop.price}</span>
                    <span className="text-gray-400">Rent ₦{prop.rent}</span>
                  </>
                ) : (
                  <span className="text-emerald-400">Reward Tile</span>
                )}
              </div>

              {/* Player Pawns */}
              <div className="absolute top-1 right-1 flex items-center gap-0.5">
                {isP1Here && <span className="text-sm">👑</span>}
                {isAIHere && <span className="text-sm">🤖</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-3 w-full justify-center">
        {turn === 'p1' && properties[p1Pos].owner === null && properties[p1Pos].price > 0 && (
          <button
            onClick={() => handleBuyProperty(p1Pos)}
            disabled={p1Cash < properties[p1Pos].price}
            className="py-3 px-5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Building2 className="w-4 h-4" />
            <span>Buy ₦{properties[p1Pos].price}</span>
          </button>
        )}

        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          disabled={isRolling || turn !== 'p1' || Boolean(winner)}
          onClick={rollDice}
          className="py-3.5 px-7 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-500/25 flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Dices className="w-4 h-4 stroke-[2.5]" />
          <span>{isRolling ? 'Rolling...' : 'Roll Dice'}</span>
        </motion.button>

        {turn === 'p1' && dice !== null && (
          <button
            onClick={passTurn}
            className="py-3 px-5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider cursor-pointer border border-white/15"
          >
            End Turn
          </button>
        )}
      </div>

      {/* Result Modal */}
      <GameResultModal
        isOpen={isModalOpen}
        winner={winner}
        isWin={winner !== 'Computer AI'}
        scoreText={`Final Wealth: ₦${p1Cash} vs ₦${aiCash}`}
        onPlayAgain={resetGame}
        onBackToLobby={onBack}
      />
    </div>
  );
};
