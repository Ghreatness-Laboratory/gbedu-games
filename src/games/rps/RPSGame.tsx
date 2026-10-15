import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { soundEngine } from '../../audio/audioEngine';
import { GameResultModal } from '../../components/GameResultModal';
import { RotateCcw, Bot, Users, Globe, ArrowLeft, Trophy, Sparkles, Flame } from 'lucide-react';
import { useWhotStore } from '../../store/useWhotStore';

type Choice = 'rock' | 'paper' | 'scissors';
type GameMode = 'ai' | 'pass';

const CHOICES: { id: Choice; label: string; icon: string; afroName: string; color: string }[] = [
  { id: 'rock', label: 'Rock', icon: '🪨', afroName: 'Stone', color: 'from-amber-500 to-orange-600' },
  { id: 'paper', label: 'Paper', icon: '📜', afroName: 'Paper', color: 'from-emerald-500 to-teal-600' },
  { id: 'scissors', label: 'Scissors', icon: '✂️', afroName: 'Cutlass', color: 'from-rose-500 to-pink-600' },
];

const AFRO_BANTERS = {
  win: ['No shaking!', 'Odogwu moves!', 'Clear road!', 'Na so we dey do am!', 'E choke!'],
  lose: ['Wahala dey o!', 'Dem swear for you?', 'Computer get juju!', 'Try again bro!'],
  draw: ['Two masters meet!', 'Draw soup!', 'Same frequency!'],
};

interface RPSGameProps {
  onBack: () => void;
}

export const RPSGame: React.FC<RPSGameProps> = ({ onBack }) => {
  const { user } = useWhotStore();
  const [mode, setMode] = useState<GameMode>('ai');
  const [playerChoice, setPlayerChoice] = useState<Choice | null>(null);
  const [opponentChoice, setOpponentChoice] = useState<Choice | null>(null);
  const [roundWinner, setRoundWinner] = useState<'player' | 'opponent' | 'draw' | null>(null);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdownText, setCountdownText] = useState('GBEDU...');
  const [scores, setScores] = useState({ player: 0, opponent: 0 });
  const [matchLimit, setMatchLimit] = useState<number>(3); // First to 3
  const [banter, setBanter] = useState<string>('Pick your weapon, make we see!');
  const [isMatchOver, setIsMatchOver] = useState(false);
  const [matchWinner, setMatchWinner] = useState<string | null>(null);

  const getWinner = (p1: Choice, p2: Choice): 'player' | 'opponent' | 'draw' => {
    if (p1 === p2) return 'draw';
    if (
      (p1 === 'rock' && p2 === 'scissors') ||
      (p1 === 'paper' && p2 === 'rock') ||
      (p1 === 'scissors' && p2 === 'paper')
    ) {
      return 'player';
    }
    return 'opponent';
  };

  const handlePick = (choice: Choice) => {
    if (isCountingDown || isMatchOver) return;

    soundEngine.playClick();
    setPlayerChoice(choice);
    setIsCountingDown(true);

    // African rhythmic countdown: "1, 2, 3... GBEDU!"
    const steps = ['ONE...', 'TWO...', 'THREE...', 'GBEDU!'];
    steps.forEach((txt, idx) => {
      setTimeout(() => {
        setCountdownText(txt);
        soundEngine.playTalkingDrum(idx % 2 === 0);
      }, idx * 400);
    });

    setTimeout(() => {
      // AI chooses
      const randomOpponent = CHOICES[Math.floor(Math.random() * CHOICES.length)].id;
      setOpponentChoice(randomOpponent);
      setIsCountingDown(false);

      const result = getWinner(choice, randomOpponent);
      setRoundWinner(result);

      if (result === 'player') {
        soundEngine.playWin();
        const newPlayerScore = scores.player + 1;
        setScores((prev) => ({ ...prev, player: newPlayerScore }));
        const randomBanter = AFRO_BANTERS.win[Math.floor(Math.random() * AFRO_BANTERS.win.length)];
        setBanter(randomBanter);

        if (newPlayerScore >= matchLimit) {
          setMatchWinner(user?.displayName || 'You');
          setTimeout(() => setIsMatchOver(true), 600);
        }
      } else if (result === 'opponent') {
        soundEngine.playLose();
        const newOpponentScore = scores.opponent + 1;
        setScores((prev) => ({ ...prev, opponent: newOpponentScore }));
        const randomBanter = AFRO_BANTERS.lose[Math.floor(Math.random() * AFRO_BANTERS.lose.length)];
        setBanter(randomBanter);

        if (newOpponentScore >= matchLimit) {
          setMatchWinner('Computer Rival');
          setTimeout(() => setIsMatchOver(true), 600);
        }
      } else {
        soundEngine.playMove(440);
        const randomBanter = AFRO_BANTERS.draw[Math.floor(Math.random() * AFRO_BANTERS.draw.length)];
        setBanter(randomBanter);
      }
    }, steps.length * 400 + 200);
  };

  const resetMatch = () => {
    setScores({ player: 0, opponent: 0 });
    setPlayerChoice(null);
    setOpponentChoice(null);
    setRoundWinner(null);
    setIsMatchOver(false);
    setMatchWinner(null);
    setBanter('New round! Who get liver?');
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-6 flex flex-col items-center select-none">
      {/* Top Bar */}
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
            ROCK • PAPER • <span className="text-rose-400">CUTLASS</span>
          </h2>
          <p className="text-[11px] font-bold text-amber-400">Stone • Paper • Scissors Naija Edition</p>
        </div>

        <button
          onClick={() => {
            soundEngine.playClick();
            resetMatch();
          }}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 cursor-pointer border border-white/10 transition-colors"
          title="Reset Match"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Series Selector (First to 3 vs First to 5) */}
      <div className="flex items-center gap-2 mb-4 bg-black/40 px-3 py-1.5 rounded-xl border border-white/10 text-xs">
        <span className="text-gray-400 font-bold">Series Goal:</span>
        <button
          onClick={() => {
            soundEngine.playClick();
            setMatchLimit(3);
            resetMatch();
          }}
          className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
            matchLimit === 3 ? 'bg-amber-500 text-black font-black' : 'text-gray-400 hover:text-white'
          }`}
        >
          First to 3
        </button>
        <button
          onClick={() => {
            soundEngine.playClick();
            setMatchLimit(5);
            resetMatch();
          }}
          className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
            matchLimit === 5 ? 'bg-rose-500 text-white font-black' : 'text-gray-400 hover:text-white'
          }`}
        >
          First to 5
        </button>
      </div>

      {/* Scoreboard */}
      <div className="grid grid-cols-2 gap-3 w-full mb-6">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#131c2e] to-[#0d1422] border-2 border-amber-500/40 text-center shadow-lg">
          <p className="text-xs uppercase font-black text-amber-400">
            {user?.displayName || 'You'} ({user?.avatarUrl || '👑'})
          </p>
          <p className="text-3xl font-black font-display text-white mt-1">{scores.player}</p>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#1f1526] to-[#140d1a] border-2 border-rose-500/40 text-center shadow-lg">
          <p className="text-xs uppercase font-black text-rose-400">Computer Rival (🤖)</p>
          <p className="text-3xl font-black font-display text-white mt-1">{scores.opponent}</p>
        </div>
      </div>

      {/* Live Clash Arena */}
      <div className="relative w-full bg-gradient-to-b from-[#111928] to-[#0c111e] rounded-3xl p-6 border-2 border-white/10 shadow-2xl flex flex-col items-center justify-center min-h-[220px] mb-6">
        {isCountingDown ? (
          <motion.div
            key={countdownText}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            className="text-4xl sm:text-5xl font-black font-display text-amber-400 animate-pulse"
          >
            {countdownText}
          </motion.div>
        ) : playerChoice && opponentChoice ? (
          <div className="w-full flex items-center justify-around">
            {/* Player Choice */}
            <motion.div
              initial={{ x: -40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="text-center"
            >
              <div className="w-20 h-20 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-5xl shadow-xl shadow-amber-500/20">
                {CHOICES.find((c) => c.id === playerChoice)?.icon}
              </div>
              <p className="text-xs font-black text-amber-300 mt-2 uppercase">
                {CHOICES.find((c) => c.id === playerChoice)?.afroName}
              </p>
            </motion.div>

            <span className="text-2xl font-black text-gray-500 font-display">VS</span>

            {/* Opponent Choice */}
            <motion.div
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="text-center"
            >
              <div className="w-20 h-20 rounded-2xl bg-rose-500/20 border-2 border-rose-400 flex items-center justify-center text-5xl shadow-xl shadow-rose-500/20">
                {CHOICES.find((c) => c.id === opponentChoice)?.icon}
              </div>
              <p className="text-xs font-black text-rose-300 mt-2 uppercase">
                {CHOICES.find((c) => c.id === opponentChoice)?.afroName}
              </p>
            </motion.div>
          </div>
        ) : (
          <div className="text-center text-gray-400 space-y-2">
            <Flame className="w-8 h-8 text-amber-400 mx-auto animate-bounce" />
            <p className="text-sm font-bold text-gray-200">Choose your move below to strike!</p>
          </div>
        )}

        {/* African Street Banter Bar */}
        <div className="mt-5 w-full bg-black/40 py-2 px-4 rounded-xl border border-white/10 text-center">
          <p className="text-xs font-black text-amber-300 font-mono italic">"{banter}"</p>
        </div>
      </div>

      {/* Choice Buttons (Mobile-first, 44px+ tap targets) */}
      <div className="grid grid-cols-3 gap-3 w-full">
        {CHOICES.map((item) => (
          <motion.button
            key={item.id}
            whileHover={{ scale: 1.05, y: -4 }}
            whileTap={{ scale: 0.95 }}
            disabled={isCountingDown || isMatchOver}
            onClick={() => handlePick(item.id)}
            className={`py-4 px-3 rounded-2xl bg-gradient-to-b ${item.color} text-white font-black flex flex-col items-center justify-center gap-1.5 shadow-xl transition-all cursor-pointer disabled:opacity-50`}
          >
            <span className="text-4xl">{item.icon}</span>
            <span className="text-sm font-display tracking-wide uppercase">{item.afroName}</span>
            <span className="text-[10px] opacity-80">({item.label})</span>
          </motion.button>
        ))}
      </div>

      {/* Result Modal */}
      <GameResultModal
        isOpen={isMatchOver}
        winner={matchWinner}
        isWin={matchWinner !== 'Computer Rival'}
        scoreText={`Final Series Score: ${scores.player} - ${scores.opponent}`}
        onPlayAgain={resetMatch}
        onBackToLobby={onBack}
      />
    </div>
  );
};
