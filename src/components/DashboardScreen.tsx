import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWhotStore } from '../store/useWhotStore';
import {
  Gamepad2,
  Zap,
  Flame,
  Hash,
  Trophy,
  Sparkles,
} from 'lucide-react';
import { soundEngine } from '../audio/audioEngine';
import { Avatar } from './Avatar';
import { getRandomPlayableGame } from '../data/gamesCatalog';
import { JoinRoomModal } from './JoinRoomModal';

interface DashboardScreenProps {
  onOpenPicker: () => void;
  onQuickPlay: (gameId: string) => void;
  isPickerOpen: boolean;
}

// Smooth requestAnimationFrame count-up hook
const CountUp: React.FC<{ end: number; duration?: number }> = ({ end, duration = 800 }) => {
  const [val, setVal] = useState(0);

  useEffect(() => {
    let animId: number;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // easeOutExpo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setVal(Math.floor(ease * end));

      if (progress < 1) {
        animId = requestAnimationFrame(tick);
      } else {
        setVal(end);
      }
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [end, duration]);

  return <>{val.toLocaleString()}</>;
};

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onOpenPicker,
  onQuickPlay,
  isPickerOpen,
}) => {
  const { user, stats, isAuthLoading } = useWhotStore();

  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isTabHidden, setIsTabHidden] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  // Monitor visibility state
  useEffect(() => {
    const handleVisibility = () => {
      setIsTabHidden(document.visibilityState === 'hidden');
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Monitor prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(media.matches);
    const listener = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  const isPaused = isPickerOpen || isTabHidden || isReducedMotion;

  // Calculate XP & Level dynamically from stats
  const totalGames = stats.gamesPlayed || 0;
  const totalWins = stats.gamesWon || 0;
  const currentXP = totalGames * 120 + totalWins * 350 + 450;
  const userLevel = Math.max(1, Math.floor(currentXP / 1000) + 1);
  const levelXP = currentXP % 1000;
  const xpPercentage = Math.min(100, Math.max(15, (levelXP / 1000) * 100));

  const handleSelectGameTap = () => {
    soundEngine.playAgogo(true);
    onOpenPicker();
  };

  const handleQuickPlayTap = () => {
    soundEngine.playAgogo(true);
    const randomGame = getRandomPlayableGame();
    onQuickPlay(randomGame.id);
  };

  // 1. SKELETON LOADER STATE
  if (isAuthLoading || !user) {
    return (
      <div className="relative w-full min-h-full flex flex-col justify-between py-2 sm:py-3 px-3 sm:px-4 max-w-sm sm:max-w-md mx-auto select-none gap-2.5 sm:gap-3">
        {/* Welcome Card Skeleton */}
        <div className="p-4 rounded-2xl bg-[#141d33] border border-[#26314d] animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-white/10" />
            <div className="flex-1 space-y-2">
              <div className="w-24 h-3 bg-white/10 rounded" />
              <div className="w-36 h-5 bg-white/10 rounded" />
              <div className="w-20 h-4 bg-white/10 rounded-full" />
            </div>
          </div>
          <div className="mt-3 w-full h-2 rounded-full bg-white/10" />
        </div>

        {/* Stats Row Skeleton */}
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-[#141d33] border border-[#26314d] animate-pulse" />
          ))}
        </div>

        {/* Button Skeletons */}
        <div className="space-y-2.5">
          <div className="h-[58px] rounded-2xl bg-white/10 animate-pulse" />
          <div className="grid grid-cols-2 gap-2.5">
            <div className="h-11 rounded-xl bg-white/10 animate-pulse" />
            <div className="h-11 rounded-xl bg-white/10 animate-pulse" />
          </div>
          <div className="w-48 h-3 mx-auto bg-white/10 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-full flex flex-col justify-between py-2 sm:py-3 px-3 sm:px-4 max-w-sm sm:max-w-md mx-auto select-none gap-2.5 sm:gap-3">
      {/* 8. SLOW-FLOATING, LOW-OPACITY GAME PIECES (Paused when picker is open, tab hidden, or reduced motion) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
        <div
          style={{ animationPlayState: isPaused ? 'paused' : 'running' }}
          className="absolute top-4 left-[3%] text-2xl opacity-10 filter drop-shadow-[0_0_8px_rgba(255,183,3,0.3)] animate-float-1"
        >
          🎲
        </div>
        <div
          style={{ animationPlayState: isPaused ? 'paused' : 'running' }}
          className="absolute top-16 right-[4%] text-2xl opacity-10 filter drop-shadow-[0_0_8px_rgba(31,209,160,0.3)] animate-float-2"
        >
          ♞
        </div>
        <div
          style={{ animationPlayState: isPaused ? 'paused' : 'running' }}
          className="absolute top-1/2 left-[2%] text-2xl opacity-10 filter drop-shadow-[0_0_8px_rgba(255,122,0,0.3)] animate-float-3"
        >
          🟤
        </div>
        <div
          style={{ animationPlayState: isPaused ? 'paused' : 'running' }}
          className="absolute top-1/2 right-[2%] text-2xl opacity-10 filter drop-shadow-[0_0_8px_rgba(59,130,246,0.3)] animate-float-1"
        >
          ⚽
        </div>
        <div
          style={{ animationPlayState: isPaused ? 'paused' : 'running' }}
          className="absolute bottom-16 left-[5%] text-2xl opacity-10 filter drop-shadow-[0_0_8px_rgba(255,122,0,0.3)] animate-float-2"
        >
          ❌
        </div>
        <div
          style={{ animationPlayState: isPaused ? 'paused' : 'running' }}
          className="absolute bottom-16 right-[6%] text-2xl opacity-10 filter drop-shadow-[0_0_8px_rgba(31,209,160,0.3)] animate-float-3"
        >
          ⭕
        </div>
      </div>

      {/* 2. WELCOME CARD */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="relative z-10 p-3.5 sm:p-4 rounded-2xl bg-[#141d33] border border-[#26314d] shadow-xl shrink-0"
      >
        <div className="flex items-center gap-3">
          {/* Avatar with Gold Aura Ring & Lv N Badge */}
          <div className="relative shrink-0">
            <div className="rounded-full ring-2 ring-[#ffb703] ring-offset-2 ring-offset-[#141d33] shadow-md">
              <Avatar
                avatarUrl={user.avatarUrl}
                avatarId={user.avatarId}
                config={user.avatarConfig as any}
                username={user.username}
                size={54}
                showAura={false}
                interactive={false}
              />
            </div>
            {/* Lv N Badge */}
            <span className="absolute -bottom-1 -right-1 bg-[#ffb703] text-black font-black text-[9px] px-1.5 py-0.5 rounded-full shadow-md border border-[#ffb703] leading-none">
              Lv {userLevel}
            </span>
          </div>

          {/* User Details & Rank Chip */}
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-gray-400 font-medium leading-none">
              Welcome back
            </p>
            <h2 className="text-[20px] font-black text-white leading-tight mt-0.5 truncate font-display">
              {user.displayName || user.username}
            </h2>

            {/* Whot master rank chip */}
            <div className="mt-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#1fd1a0]/15 text-[#1fd1a0] border border-[#1fd1a0]/30 text-[10px] font-black uppercase tracking-wider">
                <Sparkles className="w-2.5 h-2.5" />
                <span>Whot master</span>
              </span>
            </div>
          </div>
        </div>

        {/* XP Bar with Animated Fill and Count-Up Numbers */}
        <div className="mt-3 pt-2.5 border-t border-[#26314d]/60">
          <div className="flex items-center justify-between text-[10px] font-bold text-gray-300 mb-1">
            <span className="text-[#ffb703] font-black">XP PROGRESS</span>
            <span className="font-mono text-gray-300">
              <CountUp end={levelXP} /> / 1,000 XP
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#0d1426] overflow-hidden border border-[#26314d]">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: xpPercentage / 100 }}
              style={{ transformOrigin: 'left' }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="w-full h-full bg-gradient-to-r from-[#ff7a00] to-[#ffb703] rounded-full"
            />
          </div>
        </div>
      </motion.div>

      {/* 3. STATS ROW: 3 Equal Compact Tiles with Count-Up Animation on Load */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05 }}
        className="relative z-10 grid grid-cols-3 gap-2 sm:gap-2.5 shrink-0"
      >
        {/* Played */}
        <div className="p-2 sm:p-2.5 rounded-xl bg-[#141d33] border border-[#26314d] text-center shadow-md">
          <p className="text-[9px] uppercase font-bold text-gray-400">Played</p>
          <p className="text-lg sm:text-xl font-black text-white font-display mt-0.5">
            <CountUp end={stats.gamesPlayed} />
          </p>
        </div>

        {/* Won */}
        <div className="p-2 sm:p-2.5 rounded-xl bg-[#141d33] border border-[#26314d] text-center shadow-md">
          <p className="text-[9px] uppercase font-bold text-gray-400">Won</p>
          <p className="text-lg sm:text-xl font-black text-[#1fd1a0] font-display mt-0.5">
            <CountUp end={stats.gamesWon} />
          </p>
        </div>

        {/* Streak with flame icon */}
        <div className="p-2 sm:p-2.5 rounded-xl bg-[#141d33] border border-[#26314d] text-center shadow-md">
          <p className="text-[9px] uppercase font-bold text-gray-400">Streak</p>
          <p className="text-lg sm:text-xl font-black text-[#ff7a00] font-display mt-0.5 flex items-center justify-center gap-0.5">
            <CountUp end={stats.streak || 1} />
            <Flame className="w-4 h-4 fill-[#ff7a00] text-[#ff7a00]" />
          </p>
        </div>
      </motion.div>

      {/* 4. BIG "SELECT GAME" BUTTON (58px, Orange, Pulsing Glow, Animated Equalizer Bars) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, delay: 0.1 }}
        className="relative z-10 w-full shrink-0"
      >
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleSelectGameTap}
          className="w-full h-[58px] min-h-[58px] rounded-2xl bg-gradient-to-r from-[#ff7a00] via-[#ff8800] to-[#ff7a00] hover:brightness-105 active:scale-[0.98] text-black font-display font-black text-lg tracking-wider uppercase shadow-[0_0_24px_rgba(255,122,0,0.45)] glow-pulse-gold flex items-center justify-between px-5 cursor-pointer border border-[#ffb703]/60 transition-all select-none group"
        >
          <div className="flex items-center gap-3">
            <Gamepad2 className="w-6 h-6 fill-black/10 text-black group-hover:rotate-6 transition-transform" />
            <span>Select game</span>
          </div>

          {/* Animated Equalizer Bars inside button (Paused when picker is open or reduced motion) */}
          <div
            style={{ animationPlayState: isPaused ? 'paused' : 'running' }}
            className="flex items-end gap-1 h-4 shrink-0"
          >
            <span className="w-1 h-full bg-black/85 rounded-full animate-eq-1" />
            <span className="w-1 h-full bg-black/85 rounded-full animate-eq-2" />
            <span className="w-1 h-full bg-black/85 rounded-full animate-eq-3" />
            <span className="w-1 h-full bg-black/85 rounded-full animate-eq-4" />
          </div>
        </motion.button>
      </motion.div>

      {/* 5. TWO SMALL BUTTONS: "Quick play" and "Join room" */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.15 }}
        className="relative z-10 grid grid-cols-2 gap-2 sm:gap-2.5 shrink-0"
      >
        {/* Quick play */}
        <button
          onClick={handleQuickPlayTap}
          className="h-[44px] min-h-[44px] rounded-xl bg-[#141d33] hover:bg-[#1a2540] active:scale-98 border border-[#26314d] text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md group"
        >
          <Zap className="w-4 h-4 text-[#ffb703] group-hover:scale-110 transition-transform" />
          <span>Quick play</span>
        </button>

        {/* Join room */}
        <button
          onClick={() => {
            soundEngine.playClick();
            setIsJoinModalOpen(true);
          }}
          className="h-[44px] min-h-[44px] rounded-xl bg-[#141d33] hover:bg-[#1a2540] active:scale-98 border border-[#26314d] text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md group"
        >
          <Hash className="w-4 h-4 text-[#1fd1a0] group-hover:scale-110 transition-transform" />
          <span>Join room</span>
        </button>
      </motion.div>

      {/* 6. ONE-LINE MUTED CAPTION */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, delay: 0.2 }}
        className="relative z-10 text-[11px] text-gray-400 text-center font-medium leading-none shrink-0"
      >
        Real-time multiplayer for 2 to 6 players
      </motion.p>

      {/* Join Room Modal */}
      {isJoinModalOpen && (
        <JoinRoomModal
          isOpen={isJoinModalOpen}
          onClose={() => setIsJoinModalOpen(false)}
          onSelectGamePrompt={onOpenPicker}
        />
      )}
    </div>
  );
};
