import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Bot,
  Users,
  Plus,
  Play,
  RotateCcw,
  Sparkles,
  Share2,
  Copy,
  Check,
  Shield,
  Layers,
  HelpCircle,
  Flame,
} from 'lucide-react';
import { getGameById, GAMES_CATALOG } from '../data/gamesCatalog';
import { soundEngine } from '../audio/audioEngine';
import { useWhotStore } from '../store/useWhotStore';
import { Avatar } from './Avatar';

// Import all playable game components
import { XOGame } from '../games/xo/XOGame';
import { AyoGame } from '../games/ayo/AyoGame';
import { LudoGame } from '../games/ludo/LudoGame';
import { BiroSoccerGame } from '../games/biro-soccer/BiroSoccerGame';
import { ChessGame } from '../games/chess/ChessGame';
import { RPSGame } from '../games/rps/RPSGame';
import { SnakesLaddersGame } from '../games/snakes-ladders/SnakesLaddersGame';
import { TycoonGame } from '../games/tycoon/TycoonGame';
import { WordGbeduGame } from '../games/word-gbedu/WordGbeduGame';
import { WordPlayGame } from '../games/word-play/WordPlayGame';
import { NaijaTriviaGame } from '../games/naija-trivia/NaijaTriviaGame';
import { JackpotGame } from '../games/jackpot/JackpotGame';
import { PoolGame } from '../games/pool/PoolGame';
import { GameBoard } from './GameBoard';
import { LobbyScreen } from './LobbyScreen';

interface GameLobbyScreenProps {
  onOpenPicker: () => void;
}

export const GameLobbyScreen: React.FC<GameLobbyScreenProps> = ({ onOpenPicker }) => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const {
    user,
    currentRoom,
    createRoom,
    joinRoom,
    roomError,
    leaveRoom,
    gameView,
    addBotPlayer,
    startGame,
  } = useWhotStore();

  const game = getGameById(gameId || 'xo') || GAMES_CATALOG[0];

  // Game state: null = showing lobby, 'active' = playing active embedded game
  const [activeGameSession, setActiveGameSession] = useState<'ai' | 'pass' | 'custom' | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleBackHome = () => {
    soundEngine.playClick();
    if (currentRoom) {
      leaveRoom();
    }
    navigate('/home');
  };

  const handleLaunchMode = async (mode: 'ai' | 'pass') => {
    soundEngine.playAgogo(true);
    if (game.id === 'whot') {
      const ok = await createRoom();
      if (ok) {
        if (mode === 'ai') {
          addBotPlayer('Tobi (AI)', '🦁');
        } else {
          addBotPlayer('Player 2 (Local)', '🕶️');
        }
        startGame();
      }
      return;
    }
    setActiveGameSession(mode);
  };

  const handleCreateGameRoom = async () => {
    setIsCreatingRoom(true);
    soundEngine.playAgogo(true);

    if (game.id === 'whot') {
      // Use core Whot multiplayer room
      await createRoom();
    } else {
      // Generate 4-letter room code for this game
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      setCreatedRoomCode(code);
    }
    setIsCreatingRoom(false);
  };

  const handleJoinGameRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = joinCodeInput.trim().toUpperCase();
    if (!cleanCode) return;

    setIsJoiningRoom(true);
    soundEngine.playAgogo(true);

    if (game.id === 'whot') {
      await joinRoom(cleanCode);
    } else {
      // For standalone games, set room and launch
      setCreatedRoomCode(cleanCode);
      setActiveGameSession('pass');
    }
    setIsJoiningRoom(false);
  };

  const handleCopyRoomCode = () => {
    if (!createdRoomCode) return;
    navigator.clipboard.writeText(createdRoomCode);
    setCopiedCode(true);
    soundEngine.playClick();
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // If Whot multiplayer room is active, render Whot GameBoard (if in_progress) or LobbyScreen
  if (game.id === 'whot' && currentRoom) {
    if (currentRoom.status === 'in_progress' && gameView) {
      return (
        <div className="w-full flex-1 flex flex-col items-center justify-center py-2 sm:py-4">
          <GameBoard />
        </div>
      );
    }
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center py-4">
        <div className="w-full max-w-4xl px-4 mb-2 flex items-center justify-between">
          <button
            onClick={() => {
              leaveRoom();
              setActiveGameSession(null);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs font-bold transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Leave Lobby</span>
          </button>
        </div>
        <LobbyScreen />
      </div>
    );
  }

  // If user launched one of the embedded games, render that game component!
  if (activeGameSession !== null) {
    const handleExitGame = () => {
      soundEngine.playClick();
      setActiveGameSession(null);
      setCreatedRoomCode(null);
    };

    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center py-4">
        {game.id === 'xo' && <XOGame onBack={handleExitGame} />}
        {game.id === 'ayo' && <AyoGame onBack={handleExitGame} />}
        {game.id === 'ludo' && <LudoGame onBack={handleExitGame} />}
        {game.id === 'biro-soccer' && <BiroSoccerGame onBack={handleExitGame} />}
        {game.id === 'chess' && <ChessGame onBack={handleExitGame} />}
        {game.id === 'rps' && <RPSGame onBack={handleExitGame} />}
        {game.id === 'snakes-ladders' && <SnakesLaddersGame onBack={handleExitGame} />}
        {game.id === 'tycoon' && <TycoonGame onBack={handleExitGame} />}
        {game.id === 'word-play' && <WordPlayGame onBack={handleExitGame} />}
        {game.id === 'word-gbedu' && <WordPlayGame onBack={handleExitGame} />}
        {game.id === 'naija-trivia' && <NaijaTriviaGame onBack={handleExitGame} />}
        {game.id === 'jackpot' && <JackpotGame onBack={handleExitGame} />}
        {game.id === 'pool' && <PoolGame onBack={handleExitGame} />}
        {game.id === 'whot' && <GameBoard />}
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-4 sm:py-6 space-y-6">
      {/* Top Header Navigation: Back to Home + Change Game button */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={handleBackHome}
          className="min-h-[44px] flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white text-xs sm:text-sm font-extrabold transition-all cursor-pointer border border-white/5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Home</span>
        </button>

        <button
          onClick={() => {
            soundEngine.playClick();
            onOpenPicker();
          }}
          className="min-h-[44px] flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs sm:text-sm font-extrabold transition-all cursor-pointer shadow-md"
        >
          <span>🎮</span>
          <span>Change Game</span>
        </button>
      </div>

      {/* Game Hero Badge Card */}
      <div className={`p-6 sm:p-8 rounded-3xl bg-gradient-to-r ${game.bannerGradient} bg-[#0e1628] border border-white/10 shadow-2xl relative overflow-hidden`}>
        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 flex items-center justify-center text-4xl sm:text-5xl shrink-0 shadow-2xl">
            {game.icon}
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              <span className="text-xs uppercase font-black tracking-wider text-amber-400">
                {game.category} Game
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {game.playerCount}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-gray-300 border border-white/10">
                Playable Now
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black font-display text-white mt-1.5 tracking-tight">
              {game.name}
            </h1>
            <p className="text-sm text-gray-300 mt-1 max-w-xl">
              {game.description}
            </p>
          </div>
        </div>
      </div>

      {/* Created Custom Room Banner (If active) */}
      {createdRoomCode && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border-2 border-amber-400/50 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-scale-up">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-black flex items-center justify-center font-black text-xl shrink-0 shadow-md">
              📢
            </div>
            <div>
              <p className="text-xs uppercase font-bold text-gray-400">YOUR ROOM CODE</p>
              <p className="text-3xl font-black tracking-widest text-amber-400 font-display">
                {createdRoomCode}
              </p>
              <p className="text-[11px] text-gray-300">
                Share this code with your challenger to play!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleCopyRoomCode}
              className="flex-1 sm:flex-none min-h-[44px] px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedCode ? 'COPIED!' : 'COPY'}</span>
            </button>

            <button
              onClick={() => handleLaunchMode('pass')}
              className="flex-1 sm:flex-none min-h-[44px] px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/30"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>START MATCH</span>
            </button>
          </div>
        </div>
      )}

      {/* 4 Scoped Game Mode Cards: vs Computer, Pass & Play, Create Room, Join Room */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. vs Computer / AI */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-6 rounded-3xl bg-[#121927] border border-white/10 hover:border-amber-400/40 shadow-xl flex flex-col justify-between transition-all"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3">
              <Bot className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black font-display text-white">Play vs Computer</h3>
            <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
              Test your skills against the street-smart Gbedu AI bot. Instant start, zero wait.
            </p>
          </div>

          <button
            onClick={() => handleLaunchMode('ai')}
            className="mt-5 w-full min-h-[44px] py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs sm:text-sm tracking-wide transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>PLAY VS COMPUTER</span>
          </button>
        </motion.div>

        {/* 2. Pass & Play (Local 2 Players) */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-6 rounded-3xl bg-[#121927] border border-white/10 hover:border-emerald-400/40 shadow-xl flex flex-col justify-between transition-all"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black font-display text-white">Pass & Play</h3>
            <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
              Play with a friend on the same screen. Take turns right here on your phone or laptop!
            </p>
          </div>

          <button
            onClick={() => handleLaunchMode('pass')}
            className="mt-5 w-full min-h-[44px] py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs sm:text-sm tracking-wide transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>PLAY PASS & PLAY</span>
          </button>
        </motion.div>

        {/* 3. Create Multiplayer Room */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-6 rounded-3xl bg-[#121927] border border-white/10 hover:border-cyan-400/40 shadow-xl flex flex-col justify-between transition-all"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3">
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </div>
            <h3 className="text-lg font-black font-display text-white">Create Room</h3>
            <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
              Host a dedicated match room for {game.name}. Get a 4-letter code to share with opponents.
            </p>
          </div>

          <button
            onClick={handleCreateGameRoom}
            disabled={isCreatingRoom}
            className="mt-5 w-full min-h-[44px] py-3.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs sm:text-sm tracking-wide transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>{isCreatingRoom ? 'CREATING...' : 'CREATE ROOM'}</span>
          </button>
        </motion.div>

        {/* 4. Join with 4-Letter Code */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-6 rounded-3xl bg-[#121927] border border-white/10 hover:border-purple-400/40 shadow-xl flex flex-col justify-between transition-all"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-3">
              <Share2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black font-display text-white">Join Room</h3>
            <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
              Enter a 4-letter room code from your friend to join their {game.name} lobby.
            </p>
          </div>

          <form onSubmit={handleJoinGameRoom} className="mt-5 space-y-2">
            <input
              type="text"
              placeholder="e.g. K7Q2"
              maxLength={6}
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
              className="w-full min-h-[44px] bg-black/40 border border-white/15 rounded-xl px-4 text-center font-mono font-black text-base text-amber-400 tracking-widest focus:outline-none focus:border-purple-400"
            />
            <button
              type="submit"
              disabled={isJoiningRoom || !joinCodeInput.trim()}
              className="w-full min-h-[44px] py-3 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-black text-xs sm:text-sm tracking-wide transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50 cursor-pointer"
            >
              <span>{isJoiningRoom ? 'JOINING...' : 'JOIN WITH CODE'}</span>
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};
