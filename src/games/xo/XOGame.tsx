import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { soundEngine } from '../../audio/audioEngine';
import { GameResultModal } from '../../components/GameResultModal';
import { RotateCcw, Bot, Users, Globe, ArrowLeft, Trophy, Sparkles } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useWhotStore } from '../../store/useWhotStore';
import { saveMatchResult } from '../../lib/offlineSync';

type CellValue = 'X' | 'O' | null;
type GameMode = 'ai' | 'pass' | 'online';
type AIDifficulty = 'easy' | 'odogwu';

interface XOGameProps {
  onBack: () => void;
}

export const XOGame: React.FC<XOGameProps> = ({ onBack }) => {
  const { user } = useWhotStore();
  const [board, setBoard] = useState<CellValue[]>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState<boolean>(true);
  const [mode, setMode] = useState<GameMode>('ai');
  const [difficulty, setDifficulty] = useState<AIDifficulty>('odogwu');
  const [winner, setWinner] = useState<string | null>(null);
  const [winningLine, setWinningLine] = useState<number[] | null>(null);
  const [score, setScore] = useState({ x: 0, o: 0, ties: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [onlineJoined, setOnlineJoined] = useState(false);
  const [playerSymbol, setPlayerSymbol] = useState<'X' | 'O'>('X');

  const WINNING_COMBOS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6],             // Diagonals
  ];

  const checkWinner = (currentBoard: CellValue[]) => {
    for (const combo of WINNING_COMBOS) {
      const [a, b, c] = combo;
      if (currentBoard[a] && currentBoard[a] === currentBoard[b] && currentBoard[a] === currentBoard[c]) {
        return { winner: currentBoard[a], line: combo };
      }
    }
    if (currentBoard.every((cell) => cell !== null)) {
      return { winner: 'Draw', line: null };
    }
    return null;
  };

  const handleCellClick = (index: number) => {
    if (board[index] || winner) return;

    if (mode === 'online' && ((isXNext && playerSymbol !== 'X') || (!isXNext && playerSymbol !== 'O'))) {
      return; // Not your turn in online mode
    }

    const currentSymbol = isXNext ? 'X' : 'O';
    const newBoard = [...board];
    newBoard[index] = currentSymbol;
    setBoard(newBoard);
    soundEngine.playMove(isXNext ? 540 : 420);

    const winResult = checkWinner(newBoard);
    if (winResult) {
      handleGameOver(winResult.winner, winResult.line);
    } else {
      setIsXNext(!isXNext);
    }
  };

  // AI Turn Logic
  useEffect(() => {
    if (mode === 'ai' && !isXNext && !winner) {
      const timer = setTimeout(() => {
        makeAIMove();
      }, 450);
      return () => clearTimeout(timer);
    }
  }, [isXNext, mode, winner, board]);

  const makeAIMove = () => {
    const available = board.map((val, idx) => (val === null ? idx : null)).filter((val) => val !== null) as number[];
    if (available.length === 0) return;

    let move: number;

    if (difficulty === 'easy') {
      // Random move
      move = available[Math.floor(Math.random() * available.length)];
    } else {
      // Odogwu AI (Minimax / Strategic)
      // 1. Check if AI can win this turn
      for (const idx of available) {
        const testBoard = [...board];
        testBoard[idx] = 'O';
        if (checkWinner(testBoard)?.winner === 'O') {
          move = idx;
          executeAIMove(move);
          return;
        }
      }
      // 2. Block player if player can win
      for (const idx of available) {
        const testBoard = [...board];
        testBoard[idx] = 'X';
        if (checkWinner(testBoard)?.winner === 'X') {
          move = idx;
          executeAIMove(move);
          return;
        }
      }
      // 3. Take center
      if (board[4] === null) {
        move = 4;
      } else {
        // 4. Take corners or random
        const corners = [0, 2, 6, 8].filter((c) => board[c] === null);
        if (corners.length > 0) {
          move = corners[Math.floor(Math.random() * corners.length)];
        } else {
          move = available[Math.floor(Math.random() * available.length)];
        }
      }
    }

    executeAIMove(move);
  };

  const executeAIMove = (moveIndex: number) => {
    const newBoard = [...board];
    newBoard[moveIndex] = 'O';
    setBoard(newBoard);
    soundEngine.playMove(420);

    const winResult = checkWinner(newBoard);
    if (winResult) {
      handleGameOver(winResult.winner, winResult.line);
    } else {
      setIsXNext(true);
    }
  };

  const handleGameOver = (winningSymbol: string, line: number[] | null) => {
    setWinningLine(line);
    setWinner(winningSymbol);
    const isWin = winningSymbol === 'X';
    const isDraw = winningSymbol === 'Draw';
    const outcome: 'win' | 'loss' | 'draw' = isWin ? 'win' : isDraw ? 'draw' : 'loss';

    if (isWin) {
      setScore((prev) => ({ ...prev, x: prev.x + 1 }));
    } else if (winningSymbol === 'O') {
      setScore((prev) => ({ ...prev, o: prev.o + 1 }));
    } else {
      setScore((prev) => ({ ...prev, ties: prev.ties + 1 }));
    }

    // Persist match result to offline IndexedDB / sync queue with unique ID
    const xpEarned = isWin ? 150 : isDraw ? 50 : 25;
    const coinsEarned = isWin ? 30 : 10;

    saveMatchResult({
      userId: user?.id || 'guest',
      gameId: 'xo',
      gameName: 'X & O',
      mode: mode === 'ai' ? 'ai' : mode === 'pass' ? 'pass' : 'online',
      outcome,
      xpEarned,
      coinsEarned,
    }).catch(() => {});

    // Instantly update stats in Zustand store & localStorage for zero-lag offline display
    const currentStats = useWhotStore.getState().stats;
    const updatedStats = {
      ...currentStats,
      gamesPlayed: currentStats.gamesPlayed + 1,
      gamesWon: isWin ? currentStats.gamesWon + 1 : currentStats.gamesWon,
      streak: isWin ? (currentStats.streak || 0) + 1 : 0,
    };
    useWhotStore.setState({ stats: updatedStats });
    try {
      localStorage.setItem('gbedu_stats', JSON.stringify(updatedStats));
    } catch {
      // ignore
    }

    setTimeout(() => {
      setIsModalOpen(true);
    }, 500);
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
    setWinner(null);
    setWinningLine(null);
    setIsModalOpen(false);
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-6 flex flex-col items-center select-none">
      {/* Header Bar */}
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
            X & O <span className="text-amber-400">ARENA</span>
          </h2>
          <p className="text-[11px] font-bold text-gray-400">Naija Tic-Tac-Toe Showdown</p>
        </div>

        <button
          onClick={() => {
            soundEngine.playClick();
            resetGame();
          }}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 cursor-pointer border border-white/10 transition-colors"
          title="Reset Board"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Mode Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full mb-4">
        <button
          onClick={() => {
            soundEngine.playClick();
            setMode('ai');
            resetGame();
          }}
          className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
            mode === 'ai'
              ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
              : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'
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
          className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
            mode === 'pass'
              ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
              : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Pass & Play</span>
        </button>

        <button
          onClick={() => {
            soundEngine.playClick();
            setMode('online');
            resetGame();
          }}
          className={`col-span-2 sm:col-span-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
            mode === 'online'
              ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
              : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Online Room</span>
        </button>
      </div>

      {/* AI Difficulty Switcher */}
      {mode === 'ai' && (
        <div className="flex items-center gap-2 mb-4 bg-black/40 px-3 py-1.5 rounded-xl border border-white/10 text-xs">
          <span className="text-gray-400 font-bold">AI Skill:</span>
          <button
            onClick={() => {
              soundEngine.playClick();
              setDifficulty('easy');
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
              difficulty === 'easy' ? 'bg-emerald-500 text-black' : 'text-gray-400 hover:text-white'
            }`}
          >
            Easy
          </button>
          <button
            onClick={() => {
              soundEngine.playClick();
              setDifficulty('odogwu');
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
              difficulty === 'odogwu' ? 'bg-rose-500 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Odogwu 🔥
          </button>
        </div>
      )}

      {/* Turn & Score Banner */}
      <div className="grid grid-cols-3 gap-2 w-full mb-5">
        <div
          className={`p-2.5 rounded-2xl border text-center transition-all ${
            isXNext && !winner
              ? 'bg-amber-500/20 border-amber-400 shadow-md shadow-amber-500/20 scale-[1.02]'
              : 'bg-white/5 border-white/10'
          }`}
        >
          <p className="text-[10px] uppercase font-bold text-amber-300">Player X</p>
          <p className="text-lg font-black text-white">{score.x}</p>
        </div>

        <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-center">
          <p className="text-[10px] uppercase font-bold text-gray-400">Ties</p>
          <p className="text-lg font-black text-gray-300">{score.ties}</p>
        </div>

        <div
          className={`p-2.5 rounded-2xl border text-center transition-all ${
            !isXNext && !winner
              ? 'bg-rose-500/20 border-rose-400 shadow-md shadow-rose-500/20 scale-[1.02]'
              : 'bg-white/5 border-white/10'
          }`}
        >
          <p className="text-[10px] uppercase font-bold text-rose-300">
            {mode === 'ai' ? 'Computer (O)' : 'Player O'}
          </p>
          <p className="text-lg font-black text-white">{score.o}</p>
        </div>
      </div>

      {/* 3x3 Tic Tac Toe Grid */}
      <div className="relative w-72 h-72 sm:w-80 sm:h-80 bg-gradient-to-br from-[#121a2c] to-[#0c1220] rounded-3xl p-3 border-2 border-white/15 shadow-2xl grid grid-cols-3 gap-2.5">
        {board.map((cell, index) => {
          const isWinningCell = winningLine?.includes(index);
          return (
            <motion.button
              key={index}
              whileHover={{ scale: cell || winner ? 1 : 1.04 }}
              whileTap={{ scale: cell || winner ? 1 : 0.94 }}
              onClick={() => handleCellClick(index)}
              className={`rounded-2xl flex items-center justify-center text-4xl sm:text-5xl font-black font-display transition-all cursor-pointer ${
                cell === 'X'
                  ? 'text-amber-400'
                  : cell === 'O'
                  ? 'text-rose-400'
                  : 'hover:bg-white/5'
              } ${
                isWinningCell
                  ? 'bg-amber-400/30 border-2 border-amber-400 shadow-lg shadow-amber-500/40 animate-pulse'
                  : 'bg-black/30 border border-white/10'
              }`}
            >
              {cell && (
                <motion.span
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 220 }}
                >
                  {cell}
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Game Result Modal */}
      <GameResultModal
        isOpen={isModalOpen}
        winner={winner === 'Draw' ? 'Draw' : winner === 'X' ? 'Player X' : 'Player O'}
        isWin={winner === 'X'}
        scoreText={`Current Score: X (${score.x}) - O (${score.o}) - Ties (${score.ties})`}
        onPlayAgain={resetGame}
        onBackToLobby={onBack}
      />
    </div>
  );
};
