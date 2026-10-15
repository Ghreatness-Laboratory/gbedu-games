import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { soundEngine } from '../../audio/audioEngine';
import { GameResultModal } from '../../components/GameResultModal';
import { ArrowLeft, RotateCcw, Bot, Users } from 'lucide-react';
import { useWhotStore } from '../../store/useWhotStore';

type PieceType = 'p' | 'r' | 'n' | 'b' | 'q' | 'k';
type PieceColor = 'w' | 'b';

interface Piece {
  type: PieceType;
  color: PieceColor;
}

type BoardState = (Piece | null)[][];

const PIECE_SYMBOLS: Record<PieceColor, Record<PieceType, string>> = {
  w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
};

const INITIAL_BOARD = (): BoardState => {
  const b: BoardState = Array(8).fill(null).map(() => Array(8).fill(null));
  // Black pieces (top, rows 0-1)
  const backRow: PieceType[] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  for (let c = 0; c < 8; c++) {
    b[0][c] = { type: backRow[c], color: 'b' };
    b[1][c] = { type: 'p', color: 'b' };
    b[6][c] = { type: 'p', color: 'w' };
    b[7][c] = { type: backRow[c], color: 'w' };
  }
  return b;
};

export const ChessGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { user } = useWhotStore();

  const [board, setBoard] = useState<BoardState>(INITIAL_BOARD);
  const [selectedPos, setSelectedPos] = useState<{ r: number; c: number } | null>(null);
  const [legalMoves, setLegalMoves] = useState<{ r: number; c: number }[]>([]);
  const [turn, setTurn] = useState<PieceColor>('w'); // White starts
  const [mode, setMode] = useState<'ai' | 'pass'>('ai');
  const [winner, setWinner] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [capturedPieces, setCapturedPieces] = useState<{ w: string[]; b: string[] }>({ w: [], b: [] });

  const getLegalMovesForPiece = (r: number, c: number, currentBoard: BoardState): { r: number; c: number }[] => {
    const piece = currentBoard[r][c];
    if (!piece) return [];
    const moves: { r: number; c: number }[] = [];
    const color = piece.color;
    const oppColor = color === 'w' ? 'b' : 'w';

    const addMoveIfValid = (nr: number, nc: number) => {
      if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) return false;
      const dest = currentBoard[nr][nc];
      if (!dest) {
        moves.push({ r: nr, c: nc });
        return true;
      }
      if (dest.color === oppColor) {
        moves.push({ r: nr, c: nc });
        return false; // Hit opponent, can't jump further
      }
      return false; // Hit friendly piece
    };

    if (piece.type === 'p') {
      const dir = color === 'w' ? -1 : 1;
      const startRow = color === 'w' ? 6 : 1;
      // Step 1
      if (!currentBoard[r + dir]?.[c]) {
        moves.push({ r: r + dir, c });
        // Step 2 from initial
        if (r === startRow && !currentBoard[r + 2 * dir]?.[c]) {
          moves.push({ r: r + 2 * dir, c });
        }
      }
      // Diagonal capture
      [-1, 1].forEach((dc) => {
        const dest = currentBoard[r + dir]?.[c + dc];
        if (dest && dest.color === oppColor) {
          moves.push({ r: r + dir, c: c + dc });
        }
      });
    } else if (piece.type === 'n') {
      const knightOffsets = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1],
      ];
      knightOffsets.forEach(([dr, dc]) => addMoveIfValid(r + dr, c + dc));
    } else if (piece.type === 'k') {
      const kingOffsets = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1],
      ];
      kingOffsets.forEach(([dr, dc]) => addMoveIfValid(r + dr, c + dc));
    } else {
      // Sliders: r, b, q
      const dirs: [number, number][] = [];
      if (piece.type === 'r' || piece.type === 'q') {
        dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
      }
      if (piece.type === 'b' || piece.type === 'q') {
        dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
      }
      dirs.forEach(([dr, dc]) => {
        let step = 1;
        while (step < 8) {
          const ok = addMoveIfValid(r + dr * step, c + dc * step);
          if (!ok) break;
          step++;
        }
      });
    }

    return moves;
  };

  const handleSquareClick = (r: number, c: number) => {
    if (winner) return;

    if (selectedPos) {
      // Check if clicked square is a legal move
      const isLegal = legalMoves.some((m) => m.r === r && m.c === c);
      if (isLegal) {
        executeMove(selectedPos.r, selectedPos.c, r, c);
        setSelectedPos(null);
        setLegalMoves([]);
        return;
      }
    }

    // Select piece
    const piece = board[r][c];
    if (piece && piece.color === turn) {
      soundEngine.playClick();
      setSelectedPos({ r, c });
      setLegalMoves(getLegalMovesForPiece(r, c, board));
    } else {
      setSelectedPos(null);
      setLegalMoves([]);
    }
  };

  const executeMove = (fromR: number, fromC: number, toR: number, toC: number) => {
    const nextBoard = board.map((row) => [...row]);
    const movingPiece = nextBoard[fromR][fromC]!;
    const captured = nextBoard[toR][toC];

    nextBoard[toR][toC] = movingPiece;
    nextBoard[fromR][fromC] = null;

    // Pawn Promotion
    if (movingPiece.type === 'p' && (toR === 0 || toR === 7)) {
      movingPiece.type = 'q';
    }

    if (captured) {
      soundEngine.playHitSound('perfect');
      const symbol = PIECE_SYMBOLS[captured.color][captured.type];
      setCapturedPieces((prev) => ({
        ...prev,
        [captured.color]: [...prev[captured.color], symbol],
      }));
      // Check King Capture
      if (captured.type === 'k') {
        soundEngine.playWin();
        const winningColor = movingPiece.color === 'w' ? 'White (Player)' : 'Black (AI)';
        setWinner(winningColor);
        setTimeout(() => setIsModalOpen(true), 600);
        setBoard(nextBoard);
        return;
      }
    } else {
      soundEngine.playMove(500);
    }

    setBoard(nextBoard);
    const nextTurn = turn === 'w' ? 'b' : 'w';
    setTurn(nextTurn);

    // AI Turn trigger
    if (mode === 'ai' && nextTurn === 'b') {
      setTimeout(() => {
        makeAIMove(nextBoard);
      }, 600);
    }
  };

  const makeAIMove = (currentBoard: BoardState) => {
    const allAIMoves: { fromR: number; fromC: number; toR: number; toC: number; score: number }[] = [];

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = currentBoard[r][c];
        if (piece && piece.color === 'b') {
          const moves = getLegalMovesForPiece(r, c, currentBoard);
          moves.forEach((m) => {
            let score = 0;
            const dest = currentBoard[m.r][m.c];
            if (dest) {
              const values: Record<PieceType, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
              score = values[dest.type];
            }
            allAIMoves.push({ fromR: r, fromC: c, toR: m.r, toC: m.c, score });
          });
        }
      }
    }

    if (allAIMoves.length === 0) {
      setWinner('White');
      setIsModalOpen(true);
      return;
    }

    // Sort by best capture or random
    allAIMoves.sort((a, b) => b.score - a.score);
    const bestMove = allAIMoves[0];
    executeMove(bestMove.fromR, bestMove.fromC, bestMove.toR, bestMove.toC);
  };

  const resetGame = () => {
    setBoard(INITIAL_BOARD());
    setSelectedPos(null);
    setLegalMoves([]);
    setTurn('w');
    setWinner(null);
    setCapturedPieces({ w: [], b: [] });
    setIsModalOpen(false);
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
            AFRICAN <span className="text-amber-400">CHESS</span>
          </h2>
          <p className="text-[11px] font-bold text-gray-400">Grandmaster Royal Showdown</p>
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

      {/* Mode Switcher */}
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

      {/* Turn indicator */}
      <div className="w-full flex items-center justify-between mb-3 px-2">
        <div className="flex items-center gap-2">
          <span
            className={`w-3 h-3 rounded-full ${
              turn === 'w' ? 'bg-amber-400 ring-2 ring-amber-400/30' : 'bg-gray-600'
            }`}
          />
          <span className="text-xs font-black text-white">
            {turn === 'w' ? `${user?.displayName || 'White'} to Move` : 'Black (Opponent) to Move'}
          </span>
        </div>

        {/* Captured row */}
        <div className="flex items-center gap-1 text-sm">
          <span>{capturedPieces.w.join('')}</span>
          <span>{capturedPieces.b.join('')}</span>
        </div>
      </div>

      {/* 8x8 Chessboard */}
      <div className="w-full max-w-sm sm:max-w-md aspect-square bg-[#101826] border-4 border-amber-600/40 rounded-3xl p-2 shadow-2xl grid grid-cols-8 gap-0.5 overflow-hidden">
        {board.map((row, r) =>
          row.map((cell, c) => {
            const isDark = (r + c) % 2 === 1;
            const isSelected = selectedPos?.r === r && selectedPos?.c === c;
            const isLegal = legalMoves.some((m) => m.r === r && m.c === c);

            return (
              <button
                key={`${r}-${c}`}
                onClick={() => handleSquareClick(r, c)}
                className={`aspect-square flex items-center justify-center text-2xl sm:text-3xl font-black relative cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-amber-500/40 border-2 border-amber-400'
                    : isDark
                    ? 'bg-[#1b263b]'
                    : 'bg-[#2b3a55]'
                }`}
              >
                {cell && (
                  <span
                    className={
                      cell.color === 'w'
                        ? 'text-amber-300 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]'
                        : 'text-gray-900 filter drop-shadow-[0_2px_4px_rgba(255,255,255,0.4)]'
                    }
                  >
                    {PIECE_SYMBOLS[cell.color][cell.type]}
                  </span>
                )}
                {isLegal && (
                  <span className="w-3 h-3 rounded-full bg-emerald-400/80 animate-pulse" />
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Result Modal */}
      <GameResultModal
        isOpen={isModalOpen}
        winner={winner}
        isWin={winner?.includes('White') ?? false}
        scoreText={`King was captured!`}
        onPlayAgain={resetGame}
        onBackToLobby={onBack}
      />
    </div>
  );
};
