import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { soundEngine } from '../../audio/audioEngine';
import { GameResultModal } from '../../components/GameResultModal';
import { ArrowLeft, RotateCcw, Bot, Users, Trophy } from 'lucide-react';
import { useWhotStore } from '../../store/useWhotStore';

// Grid size: 8 cols by 10 rows
const COLS = 8;
const ROWS = 10;
const GOAL_MIN_COL = 3;
const GOAL_MAX_COL = 5;

interface Point {
  x: number;
  y: number;
}

interface Edge {
  p1: Point;
  p2: Point;
}

export const BiroSoccerGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { user } = useWhotStore();

  const [currentBall, setCurrentBall] = useState<Point>({ x: 4, y: 5 }); // Center of pitch
  const [drawnEdges, setDrawnEdges] = useState<Edge[]>([]);
  const [visitedPoints, setVisitedPoints] = useState<Point[]>([{ x: 4, y: 5 }]);
  const [currentPlayer, setCurrentPlayer] = useState<'p1' | 'p2'>('p1');
  const [mode, setMode] = useState<'ai' | 'pass'>('ai');
  const [scores, setScores] = useState({ p1: 0, p2: 0 });
  const [winner, setWinner] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusMsg, setStatusMsg] = useState('Player 1 (Green) to kick off from center!');

  const pointsEqual = (a: Point, b: Point) => a.x === b.x && a.y === b.y;

  const edgeExists = (a: Point, b: Point) => {
    return drawnEdges.some(
      (e) =>
        (pointsEqual(e.p1, a) && pointsEqual(e.p2, b)) ||
        (pointsEqual(e.p1, b) && pointsEqual(e.p2, a))
    );
  };

  const isBoundaryPoint = (p: Point) => {
    if (p.x === 0 || p.x === COLS) return true;
    if ((p.y === 0 || p.y === ROWS) && (p.x < GOAL_MIN_COL || p.x > GOAL_MAX_COL)) return true;
    return false;
  };

  const getValidMoves = (from: Point): Point[] => {
    const directions = [
      { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 },
      { x: -1, y: 0 },                   { x: 1, y: 0 },
      { x: -1, y: 1 },  { x: 0, y: 1 },  { x: 1, y: 1 },
    ];

    return directions
      .map((d) => ({ x: from.x + d.x, y: from.y + d.y }))
      .filter((target) => {
        // Must stay inside pitch or enter goal
        if (target.x < 0 || target.x > COLS) return false;
        if (target.y < -1 || target.y > ROWS + 1) return false;

        // Goals allowed only within goal columns
        if (target.y < 0 && (target.x < GOAL_MIN_COL || target.x > GOAL_MAX_COL)) return false;
        if (target.y > ROWS && (target.x < GOAL_MIN_COL || target.x > GOAL_MAX_COL)) return false;

        // Cannot move along perimeter if already drawn
        if (edgeExists(from, target)) return false;

        return true;
      });
  };

  const handlePointClick = (target: Point) => {
    if (winner) return;

    const validMoves = getValidMoves(currentBall);
    const isValid = validMoves.some((p) => pointsEqual(p, target));

    if (!isValid) {
      soundEngine.playWrongSound();
      return;
    }

    executeMove(target, currentPlayer);
  };

  const executeMove = (target: Point, player: 'p1' | 'p2') => {
    soundEngine.playBallKick();

    const newEdge: Edge = { p1: currentBall, p2: target };
    const nextDrawnEdges = [...drawnEdges, newEdge];
    setDrawnEdges(nextDrawnEdges);
    setCurrentBall(target);

    // Goal Check
    if (target.y <= -1) {
      // P1 scores in North Goal!
      soundEngine.playWin();
      setScores((s) => ({ ...s, p1: s.p1 + 1 }));
      setWinner(user?.displayName || 'Player 1');
      setStatusMsg('GOAL! Player 1 scores!');
      setTimeout(() => setIsModalOpen(true), 600);
      return;
    }
    if (target.y >= ROWS + 1) {
      // P2 / AI scores in South Goal!
      soundEngine.playWin();
      setScores((s) => ({ ...s, p2: s.p2 + 1 }));
      setWinner(mode === 'ai' ? 'Computer AI' : 'Player 2');
      setStatusMsg('GOAL! Opponent scores!');
      setTimeout(() => setIsModalOpen(true), 600);
      return;
    }

    // Rebound / Bounce Rule:
    // If target has been visited before OR is on the boundary pitch line, player gets another move!
    const wasVisited = visitedPoints.some((p) => pointsEqual(p, target));
    const isBoundary = isBoundaryPoint(target);
    const getsExtraMove = wasVisited || isBoundary;

    setVisitedPoints((prev) => [...prev, target]);

    if (getsExtraMove) {
      setStatusMsg(`${player === 'p1' ? 'Player 1' : 'Player 2'} bounced! Extra turn.`);
      soundEngine.playTalkingDrum(true);

      if (player === 'p2' && mode === 'ai') {
        setTimeout(() => runAIMove(target, nextDrawnEdges), 600);
      }
    } else {
      const nextPlayer = player === 'p1' ? 'p2' : 'p1';
      setCurrentPlayer(nextPlayer);
      setStatusMsg(`Turn passed to ${nextPlayer === 'p1' ? 'Player 1' : 'Player 2'}`);

      if (nextPlayer === 'p2' && mode === 'ai') {
        setTimeout(() => runAIMove(target, nextDrawnEdges), 600);
      }
    }
  };

  const runAIMove = (from: Point, edges: Edge[]) => {
    const valid = getValidMoves(from);
    if (valid.length === 0) {
      // AI blocked -> Player 1 wins
      setWinner('Player 1');
      setIsModalOpen(true);
      return;
    }

    // AI aims toward South Goal (y = ROWS + 1)
    valid.sort((a, b) => b.y - a.y);
    executeMove(valid[0], 'p2');
  };

  const resetGame = () => {
    setCurrentBall({ x: 4, y: 5 });
    setDrawnEdges([]);
    setVisitedPoints([{ x: 4, y: 5 }]);
    setCurrentPlayer('p1');
    setWinner(null);
    setIsModalOpen(false);
    setStatusMsg('Kick off from center! Aim for the opponent goal.');
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
            BIRO <span className="text-emerald-400">SOCCER</span>
          </h2>
          <p className="text-[11px] font-bold text-amber-400">Nigerian School Notebook Paper Football</p>
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

      {/* Mode & Turn Header */}
      <div className="flex items-center gap-2 mb-4 bg-black/40 px-3 py-1.5 rounded-xl border border-white/10 text-xs">
        <span className="text-gray-400 font-bold">Opponent:</span>
        <button
          onClick={() => {
            soundEngine.playClick();
            setMode('ai');
            resetGame();
          }}
          className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center gap-1 ${
            mode === 'ai' ? 'bg-emerald-500 text-black font-black' : 'text-gray-400 hover:text-white'
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
            mode === 'pass' ? 'bg-emerald-500 text-black font-black' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Pass & Play</span>
        </button>
      </div>

      {/* Status Banner */}
      <div className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-center mb-4 text-xs font-bold text-amber-300">
        {statusMsg}
      </div>

      {/* Biro Soccer Pitch (Notebook Paper SVG + Dots) */}
      <div className="relative w-full max-w-sm aspect-[4/5] bg-[#0c1a14] border-2 border-emerald-500/40 rounded-3xl p-4 shadow-2xl overflow-hidden flex items-center justify-center">
        {/* Pitch Lines & Goals */}
        <svg viewBox="-0.5 -1.5 9 13" className="w-full h-full">
          {/* Pitch boundary */}
          <rect x="0" y="0" width={COLS} height={ROWS} fill="none" stroke="#1b3d2d" strokeWidth="0.1" />
          <line x1="0" y1="5" x2="8" y2="5" stroke="#1b3d2d" strokeWidth="0.08" strokeDasharray="0.2 0.2" />
          <circle cx="4" cy="5" r="1.2" fill="none" stroke="#1b3d2d" strokeWidth="0.08" />

          {/* Top Goalpost */}
          <rect x={GOAL_MIN_COL} y="-1" width={GOAL_MAX_COL - GOAL_MIN_COL} height="1" fill="none" stroke="#009a49" strokeWidth="0.12" />
          {/* Bottom Goalpost */}
          <rect x={GOAL_MIN_COL} y={ROWS} width={GOAL_MAX_COL - GOAL_MIN_COL} height="1" fill="none" stroke="#ff7900" strokeWidth="0.12" />

          {/* Drawn Edges (The Biro ink strokes!) */}
          {drawnEdges.map((edge, i) => (
            <line
              key={i}
              x1={edge.p1.x}
              y1={edge.p1.y}
              x2={edge.p2.x}
              y2={edge.p2.y}
              stroke="#38bdf8"
              strokeWidth="0.14"
              strokeLinecap="round"
            />
          ))}

          {/* Dotted Grid */}
          {Array.from({ length: ROWS + 1 }).map((_, r) =>
            Array.from({ length: COLS + 1 }).map((_, c) => {
              const isBall = currentBall.x === c && currentBall.y === r;
              return (
                <circle
                  key={`${c}-${r}`}
                  cx={c}
                  cy={r}
                  r={isBall ? 0.35 : 0.09}
                  fill={isBall ? '#f59e0b' : '#334155'}
                  onClick={() => handlePointClick({ x: c, y: r })}
                  className="cursor-pointer hover:fill-amber-400"
                />
              );
            })
          )}

          {/* Top & Bottom Goal targets */}
          <circle
            cx="4"
            cy="-1"
            r="0.25"
            fill="#009a49"
            onClick={() => handlePointClick({ x: 4, y: -1 })}
            className="cursor-pointer"
          />
          <circle
            cx="4"
            cy={ROWS + 1}
            r="0.25"
            fill="#ff7900"
            onClick={() => handlePointClick({ x: 4, y: ROWS + 1 })}
            className="cursor-pointer"
          />
        </svg>
      </div>

      <p className="mt-3 text-[11px] text-gray-400 text-center max-w-sm">
        💡 Tap any adjacent dot to draw your biro pass. Rebound off boundaries or existing lines for an extra turn!
      </p>

      {/* Result Modal */}
      <GameResultModal
        isOpen={isModalOpen}
        winner={winner}
        isWin={winner !== 'Computer AI'}
        scoreText={`Final Score: Player 1 (${scores.p1}) - Opponent (${scores.p2})`}
        onPlayAgain={resetGame}
        onBackToLobby={onBack}
      />
    </div>
  );
};
