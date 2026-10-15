import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWhotStore } from '../store/useWhotStore';
import { FriendsModal } from './FriendsModal';
import {
  Gamepad2,
  Zap,
  Flame,
  Coins,
  Sparkles,
  Trophy,
  ArrowRight,
  Users,
  Play,
  RotateCcw,
} from 'lucide-react';
import { soundEngine } from '../audio/audioEngine';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Avatar } from './Avatar';
import { getRandomPlayableGame } from '../data/gamesCatalog';

interface DashboardScreenProps {
  onOpenPicker: () => void;
  onQuickPlay: (gameId: string) => void;
  isPickerOpen: boolean;
}

interface GameInvite {
  id: string;
  roomId: string;
  roomCode: string;
  senderName: string;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onOpenPicker,
  onQuickPlay,
  isPickerOpen,
}) => {
  const { user, stats, currentRoom, joinRoom, loginDemo } = useWhotStore();

  const [isFriendsOpen, setIsFriendsOpen] = useState(false);
  const [invites, setInvites] = useState<GameInvite[]>([]);

  // Calculate XP & Level dynamically from games played & won
  const totalGames = stats.gamesPlayed || 0;
  const totalWins = stats.gamesWon || 0;
  const currentXP = totalGames * 120 + totalWins * 350 + 450;
  const userLevel = Math.floor(currentXP / 1000) + 1;
  const levelXP = currentXP % 1000;
  const xpPercentage = Math.min(100, Math.max(15, (levelXP / 1000) * 100));
  const coinsCount = 1250 + totalWins * 150 + (stats.streak || 0) * 80;

  const fetchInvites = async () => {
    if (!user) return;
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('game_invitations')
          .select('id, room_id, sender_id, receiver_id, status, expires_at, sender:sender_id(username), room:game_rooms(code)')
          .eq('receiver_id', user.id)
          .eq('status', 'pending');

        if (!error && data) {
          const formatted: GameInvite[] = data.map((inv: any) => ({
            id: inv.id,
            roomId: inv.room_id,
            roomCode: inv.room?.code || 'WHOT',
            senderName: inv.sender?.username || 'Friend',
          }));
          setInvites(formatted);
        }
      } catch {
        // Ignore in offline/mock
      }
    }
  };

  useEffect(() => {
    fetchInvites();
    const interval = setInterval(fetchInvites, 6000);
    return () => clearInterval(interval);
  }, [user]);

  const handleSelectGameTap = () => {
    soundEngine.playAgogo(true);
    onOpenPicker();
  };

  const handleQuickPlayTap = () => {
    soundEngine.playAgogo(true);
    const randomGame = getRandomPlayableGame();
    onQuickPlay(randomGame.id);
  };

  if (!user) return null;

  return (
    <div className="relative w-full max-w-4xl mx-auto px-4 py-4 sm:py-6 flex flex-col justify-between min-h-[calc(100dvh-130px)]">
      {/* Background Floating Game Pieces (Paused when Picker is open) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
        <div
          style={{ animationPlayState: isPickerOpen ? 'paused' : 'running' }}
          className="absolute top-12 left-[4%] text-3xl opacity-20 filter drop-shadow-[0_0_12px_rgba(245,158,11,0.3)] animate-float-1"
        >
          🎲
        </div>
        <div
          style={{ animationPlayState: isPickerOpen ? 'paused' : 'running' }}
          className="absolute top-28 right-[6%] text-3xl opacity-20 filter drop-shadow-[0_0_12px_rgba(16,185,129,0.3)] animate-float-2"
        >
          ♞
        </div>
        <div
          style={{ animationPlayState: isPickerOpen ? 'paused' : 'running' }}
          className="absolute bottom-28 left-[8%] text-3xl opacity-20 filter drop-shadow-[0_0_12px_rgba(239,68,68,0.3)] animate-float-3"
        >
          🟤
        </div>
        <div
          style={{ animationPlayState: isPickerOpen ? 'paused' : 'running' }}
          className="absolute bottom-16 right-[10%] text-3xl opacity-20 filter drop-shadow-[0_0_12px_rgba(59,130,246,0.3)] animate-float-1"
        >
          ⚽
        </div>
        <div
          style={{ animationPlayState: isPickerOpen ? 'paused' : 'running' }}
          className="absolute top-1/2 left-[1%] text-2xl opacity-15 filter drop-shadow-[0_0_12px_rgba(245,158,11,0.3)] animate-float-2"
        >
          ❌
        </div>
        <div
          style={{ animationPlayState: isPickerOpen ? 'paused' : 'running' }}
          className="absolute top-1/2 right-[2%] text-2xl opacity-15 filter drop-shadow-[0_0_12px_rgba(16,185,129,0.3)] animate-float-3"
        >
          ⭕
        </div>
      </div>

      {/* Main Content (Z-10) */}
      <div className="relative z-10 space-y-6">
        {/* 1. GREETING HEADER */}
        <div className="bg-gradient-to-r from-[#0d1628] via-[#111c33] to-[#0d1628] rounded-3xl p-5 sm:p-7 border border-white/10 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-5">
          {/* Avatar with Aura & Name */}
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative shrink-0">
              <Avatar
                avatarUrl={user.avatarUrl}
                avatarId={user.avatarId}
                config={user.avatarConfig as any}
                username={user.username}
                size={68}
                showAura={true}
                interactive={true}
              />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  GBEDU CONTENDER
                </span>
                <span className="text-xs text-gray-400">@{user.username}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black font-display text-white mt-0.5">
                Hey, {user.displayName || user.username}!
              </h2>

              {/* XP / Level Progress Bar */}
              <div className="mt-2.5 max-w-xs">
                <div className="flex items-center justify-between text-[10px] font-extrabold text-gray-300 mb-1">
                  <span className="text-amber-400">LEVEL {userLevel}</span>
                  <span>{levelXP} / 1,000 XP</span>
                </div>
                <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden border border-white/10">
                  <div
                    style={{ width: `${xpPercentage}%` }}
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Coins & Streak Badges */}
          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
            {/* Coins Badge */}
            <div className="flex-1 md:flex-none flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-black/40 border border-amber-500/30 shadow-inner justify-center">
              <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-sm font-black">
                🪙
              </div>
              <div className="text-left">
                <p className="text-[9px] uppercase font-bold text-gray-400">COINS</p>
                <p className="text-xs sm:text-sm font-black text-amber-300 font-mono">
                  {coinsCount.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Streak Badge */}
            <div className="flex-1 md:flex-none flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-black/40 border border-orange-500/30 shadow-inner justify-center">
              <div className="w-6 h-6 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center text-sm">
                🔥
              </div>
              <div className="text-left">
                <p className="text-[9px] uppercase font-bold text-gray-400">STREAK</p>
                <p className="text-xs sm:text-sm font-black text-orange-300 font-mono">
                  {Math.max(1, stats.streak || 0)} Days
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. CENTER STAGE: BIG ANIMATED 'SELECT GAME' BUTTON */}
        <div className="py-6 sm:py-10 flex flex-col items-center justify-center text-center">
          <p className="text-xs uppercase font-extrabold tracking-widest text-amber-400 mb-3 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            <span>Ready for the next round?</span>
          </p>

          {/* BIG 'SELECT GAME' BUTTON */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            animate={{
              y: isPickerOpen ? 0 : [0, -5, 0],
            }}
            transition={{
              y: {
                repeat: Infinity,
                duration: 3,
                ease: 'easeInOut',
              },
            }}
            onClick={handleSelectGameTap}
            className="w-full max-w-lg h-16 sm:h-18 px-8 rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:via-orange-400 hover:to-amber-500 text-black font-display font-black text-lg sm:text-xl tracking-wider uppercase shadow-2xl glow-pulse-gold flex items-center justify-center gap-3.5 cursor-pointer border-2 border-amber-300/60 select-none group transition-all"
          >
            <Gamepad2 className="w-7 h-7 sm:w-8 sm:h-8 fill-black/10 group-hover:rotate-6 transition-transform" />
            <span>SELECT GAME</span>
            <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3] group-hover:translate-x-1 transition-transform" />
          </motion.button>

          <p className="text-xs text-gray-400 mt-3">
            Choose from Chess, Biro Soccer, Ludo, Ayo, X & O, Whot and more!
          </p>

          {/* 3. QUICK PLAY & CONTINUE PLAYING SECTION */}
          <div className="w-full max-w-lg mt-6 space-y-3">
            {/* Quick Play Button */}
            <button
              onClick={handleQuickPlayTap}
              className="w-full min-h-[48px] py-3 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-98 border border-white/10 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md group"
            >
              <Zap className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <span>QUICK PLAY (Random Game vs Computer)</span>
            </button>

            {/* Continue Playing Row (Only if active room or invitation exists) */}
            {(currentRoom || invites.length > 0) && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 animate-pulse">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <div className="text-left">
                    <p className="text-xs font-black text-white">Active Match Ready</p>
                    <p className="text-[10px] text-gray-300">
                      Room Code:{' '}
                      <span className="font-mono text-emerald-300 font-bold">
                        {currentRoom?.code || invites[0]?.roomCode}
                      </span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (currentRoom) {
                      soundEngine.playAgogo(true);
                    } else if (invites[0]) {
                      joinRoom(invites[0].roomCode);
                    }
                  }}
                  className="min-h-[40px] px-4 py-1.5 rounded-xl bg-emerald-500 text-black font-black text-xs hover:bg-emerald-400 transition-colors cursor-pointer"
                >
                  REJOIN
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Subtle Equalizer Animation at Bottom (Paused when Picker is open) */}
      <div className="relative z-10 pt-4 flex flex-col items-center justify-center gap-2 opacity-60">
        <div
          style={{ animationPlayState: isPickerOpen ? 'paused' : 'running' }}
          className="flex items-end justify-center gap-1.5 h-6 select-none"
        >
          <div className="w-1 bg-amber-400 rounded-full animate-eq-1" />
          <div className="w-1 bg-orange-400 rounded-full animate-eq-2" />
          <div className="w-1 bg-rose-400 rounded-full animate-eq-3" />
          <div className="w-1 bg-emerald-400 rounded-full animate-eq-4" />
          <div className="w-1 bg-cyan-400 rounded-full animate-eq-5" />
          <div className="w-1 bg-amber-400 rounded-full animate-eq-2" />
          <div className="w-1 bg-purple-400 rounded-full animate-eq-4" />
        </div>
        <p className="text-[10px] font-bold text-gray-500 tracking-wider">
          GBEDU NEVER STOPS • NIGERIAN PARTY & BOARD GAMES
        </p>
      </div>

      {/* Friends Modal */}
      {isFriendsOpen && (
        <FriendsModal isOpen={isFriendsOpen} onClose={() => setIsFriendsOpen(false)} />
      )}
    </div>
  );
};
