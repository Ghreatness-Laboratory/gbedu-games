import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useWhotStore } from '../store/useWhotStore';
import {
  Gamepad2,
  Zap,
  Flame,
  Hash,
  Trophy,
  Sparkles,
  Users,
  MessageCircle,
  Download,
  X,
  Play,
  RotateCcw,
  CheckCircle2,
  Gift,
  Coins,
  ChevronRight,
  Bot,
} from 'lucide-react';
import { soundEngine } from '../audio/audioEngine';
import { Avatar } from './Avatar';
import { GAMES_CATALOG, getRandomPlayableGame } from '../data/gamesCatalog';
import { JoinRoomModal } from './JoinRoomModal';
import {
  getLastPlayedGame,
  getDailyChallenge,
  claimDailyReward,
  LastPlayedGame,
  DailyChallengeState,
} from '../lib/offlineSync';

interface DashboardScreenProps {
  onOpenPicker: () => void;
  onQuickPlay: (gameId: string) => void;
  isPickerOpen: boolean;
  isMenuOpen?: boolean;
  isInstalled?: boolean;
  onInstall?: () => void;
}

// Smooth count-up animation component
const CountUp: React.FC<{ end: number; duration?: number }> = ({ end, duration = 800 }) => {
  const [val, setVal] = useState(0);

  useEffect(() => {
    let animId: number;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
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
  isMenuOpen = false,
  isInstalled = false,
  onInstall,
}) => {
  const navigate = useNavigate();
  const { user, stats, isAuthLoading } = useWhotStore();

  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isTabHidden, setIsTabHidden] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  // Install Banner 7-day dismissal state
  const [isBannerDismissed, setIsBannerDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const dismissedUntil = localStorage.getItem('gbedu_install_banner_dismissed_until');
    if (!dismissedUntil) return false;
    return Date.now() < Number(dismissedUntil);
  });

  // Last played game & Daily challenge state
  const [lastPlayed, setLastPlayed] = useState<LastPlayedGame | null>(null);
  const [challenge, setChallenge] = useState<DailyChallengeState>(getDailyChallenge());
  const [claimedReward, setClaimedReward] = useState(false);

  useEffect(() => {
    setLastPlayed(getLastPlayedGame());
    setChallenge(getDailyChallenge());
  }, []);

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

  // Pause floating elements when modals are open, tab is hidden, or reduced motion
  const isPaused = isPickerOpen || isMenuOpen || isTabHidden || isReducedMotion;

  // Consistent stats & Rank logic:
  // Zero contradiction: If played is 0, XP is 0. If won > 0, played >= won.
  const rawPlayed = stats.gamesPlayed || 0;
  const rawWon = stats.gamesWon || 0;
  const totalGames = Math.max(rawPlayed, rawWon);
  const totalWins = rawWon;

  const currentXP = totalGames > 0 ? totalGames * 100 + totalWins * 250 : 0;
  const userLevel = Math.max(1, Math.floor(currentXP / 1000) + 1);
  const levelXP = currentXP % 1000;
  const xpPercentage = totalGames > 0 ? Math.min(100, Math.max(8, (levelXP / 1000) * 100)) : 0;

  // Rank Title matching real progress:
  // Level 1 & 0 wins -> Rookie
  // 1-4 wins -> Challenger
  // 5-14 wins -> Pro
  // 15+ wins -> Whot Master
  let rankTitle = 'Rookie';
  let nextRankGoal = 'Win 1 game to reach Challenger';
  let rankColor = 'text-gray-300 border-gray-600/40 bg-gray-500/15';

  if (totalWins >= 15) {
    rankTitle = 'Whot Master';
    nextRankGoal = 'Max rank reached! True Odogwu 👑';
    rankColor = 'text-[#ffb703] border-[#ffb703]/40 bg-[#ffb703]/15';
  } else if (totalWins >= 5) {
    rankTitle = 'Pro';
    const remaining = 15 - totalWins;
    nextRankGoal = `Win ${remaining} more ${remaining === 1 ? 'game' : 'games'} to reach Whot Master`;
    rankColor = 'text-[#ff7a00] border-[#ff7a00]/40 bg-[#ff7a00]/15';
  } else if (totalWins >= 1) {
    rankTitle = 'Challenger';
    const remaining = 5 - totalWins;
    nextRankGoal = `Win ${remaining} more ${remaining === 1 ? 'game' : 'games'} to reach Pro`;
    rankColor = 'text-[#1fd1a0] border-[#1fd1a0]/40 bg-[#1fd1a0]/15';
  } else {
    rankTitle = 'Rookie';
    nextRankGoal = 'Win 1 game to reach Challenger';
    rankColor = 'text-gray-300 border-gray-600/40 bg-gray-500/15';
  }

  const handleDismissBanner = () => {
    soundEngine.playClick();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem('gbedu_install_banner_dismissed_until', String(Date.now() + sevenDaysMs));
    setIsBannerDismissed(true);
  };

  const handleSelectGameTap = () => {
    soundEngine.playAgogo(true);
    onOpenPicker();
  };

  const handleQuickPlayTap = () => {
    soundEngine.playAgogo(true);
    const randomGame = getRandomPlayableGame();
    onQuickPlay(randomGame.id);
  };

  const handleClaimReward = () => {
    const ok = claimDailyReward();
    if (ok) {
      soundEngine.playWin();
      setClaimedReward(true);
      setChallenge((prev) => ({ ...prev, claimed: true }));
      // Award XP
      const currentStats = useWhotStore.getState().stats;
      const updated = {
        ...currentStats,
        streak: (currentStats.streak || 0) + 1,
      };
      useWhotStore.setState({
        stats: updated,
        notification: {
          title: 'Daily Reward Claimed! 🎁',
          body: `You received +${challenge.rewardXP} XP and ${challenge.rewardCoins} coins!`,
          type: 'success',
        },
      });
      try {
        localStorage.setItem('gbedu_stats', JSON.stringify(updated));
      } catch {}
    }
  };

  // Popular games strip (including Word Play and Naija Trivia among top hits)
  const popularGameIds = ['xo', 'word-play', 'naija-trivia', 'whot', 'ludo', 'ayo'];
  const popularGames = popularGameIds
    .map((id) => GAMES_CATALOG.find((g) => g.id === id))
    .filter((g): g is NonNullable<typeof g> => Boolean(g && g.status === 'playable'));

  // SKELETON LOADER STATE
  if (isAuthLoading || !user) {
    return (
      <div className="relative w-full min-h-full flex flex-col py-3 px-4 max-w-sm sm:max-w-md mx-auto select-none gap-3">
        {/* Install Banner Skeleton */}
        <div className="h-16 rounded-2xl bg-[#141d33] border border-[#26314d] animate-pulse" />
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
        <div className="grid grid-cols-3 gap-2.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-[#141d33] border border-[#26314d] animate-pulse" />
          ))}
        </div>
        {/* Button Skeletons */}
        <div className="h-[58px] rounded-2xl bg-white/10 animate-pulse" />
        <div className="grid grid-cols-2 gap-2.5">
          <div className="h-11 rounded-xl bg-white/10 animate-pulse" />
          <div className="h-11 rounded-xl bg-white/10 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-full flex flex-col py-3 px-4 max-w-sm sm:max-w-md mx-auto select-none gap-3">
      {/* 1. SLIM INSTALL APP BANNER CARD (Directly under Header, 40px orange button, 7-day close) */}
      <AnimatePresence>
        {!isBannerDismissed && !isInstalled && onInstall && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 w-full p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-[#141d33] via-[#1a2544] to-[#141d33] border border-[#ff7a00]/40 shadow-xl flex items-center justify-between gap-2.5 shrink-0"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#ff7a00]/15 border border-[#ff7a00]/30 flex items-center justify-center shrink-0 text-[#ff7a00]">
                <Download className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-black text-white font-display truncate">
                  Install Gbedu Games
                </h4>
                <p className="text-[10px] text-gray-300 truncate">
                  Play faster, even offline
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => {
                  soundEngine.playClick();
                  onInstall();
                }}
                className="h-10 px-3 rounded-xl bg-gradient-to-r from-[#ff7a00] to-[#ff9e00] hover:brightness-105 active:scale-95 text-black font-black text-xs font-display uppercase tracking-wider flex items-center justify-center cursor-pointer shadow-md transition-all"
              >
                Install
              </button>
              <button
                onClick={handleDismissBanner}
                aria-label="Dismiss install banner for 7 days"
                className="w-8 h-8 rounded-lg text-gray-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. WELCOME PROFILE & XP CARD */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
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

            {/* Rank Chip matching real progress */}
            <div className="mt-1">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider ${rankColor}`}
              >
                <Sparkles className="w-2.5 h-2.5" />
                <span>{rankTitle}</span>
              </span>
            </div>
          </div>
        </div>

        {/* XP Bar with Next Rank Caption */}
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
          {/* Next rank requirement caption */}
          <div className="flex items-center justify-between text-[10px] mt-1.5 font-medium text-gray-400">
            <span>Next Rank:</span>
            <span className="text-[#ffb703] font-bold">{nextRankGoal}</span>
          </div>
        </div>
      </motion.div>

      {/* 3. STATS ROW: 3 Equal Tiles (No contradictions: XP > 0 never shows Played 0) */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, delay: 0.04 }}
        className="relative z-10 grid grid-cols-3 gap-2.5 shrink-0"
      >
        {/* Played */}
        <div className="p-2 sm:p-2.5 rounded-xl bg-[#141d33] border border-[#26314d] text-center shadow-md">
          <p className="text-[9px] uppercase font-bold text-gray-400">Played</p>
          <p className="text-lg sm:text-xl font-black text-white font-display mt-0.5">
            <CountUp end={totalGames} />
          </p>
        </div>

        {/* Won */}
        <div className="p-2 sm:p-2.5 rounded-xl bg-[#141d33] border border-[#26314d] text-center shadow-md">
          <p className="text-[9px] uppercase font-bold text-gray-400">Won</p>
          <p className="text-lg sm:text-xl font-black text-[#1fd1a0] font-display mt-0.5">
            <CountUp end={totalWins} />
          </p>
        </div>

        {/* Streak with flame icon */}
        <div className="p-2 sm:p-2.5 rounded-xl bg-[#141d33] border border-[#26314d] text-center shadow-md">
          <p className="text-[9px] uppercase font-bold text-gray-400">Streak</p>
          <p className="text-lg sm:text-xl font-black text-[#ff7a00] font-display mt-0.5 flex items-center justify-center gap-0.5">
            <CountUp end={totalGames > 0 ? (stats.streak || 0) : 0} />
            <Flame className="w-4 h-4 fill-[#ff7a00] text-[#ff7a00]" />
          </p>
        </div>
      </motion.div>

      {/* 4. BIG "SELECT GAME" BUTTON (Pulse with box-shadow ring only, never grows wider than cards) */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, delay: 0.08 }}
        className="relative z-10 w-full shrink-0"
      >
        <button
          onClick={handleSelectGameTap}
          className="w-full h-[58px] min-h-[58px] rounded-2xl bg-gradient-to-r from-[#ff7a00] via-[#ff8800] to-[#ff7a00] hover:brightness-105 active:scale-[0.98] text-black font-display font-black text-lg tracking-wider uppercase glow-pulse-gold flex items-center justify-between px-5 cursor-pointer border border-[#ffb703]/60 transition-all select-none group"
        >
          <div className="flex items-center gap-3">
            <Gamepad2 className="w-6 h-6 fill-black/10 text-black group-hover:rotate-6 transition-transform" />
            <span>Select game</span>
          </div>

          {/* Animated Equalizer Bars inside button */}
          <div
            style={{ animationPlayState: isPaused ? 'paused' : 'running' }}
            className="flex items-end gap-1 h-4 shrink-0"
          >
            <span className="w-1 h-full bg-black/85 rounded-full animate-eq-1" />
            <span className="w-1 h-full bg-black/85 rounded-full animate-eq-2" />
            <span className="w-1 h-full bg-black/85 rounded-full animate-eq-3" />
            <span className="w-1 h-full bg-black/85 rounded-full animate-eq-4" />
          </div>
        </button>
      </motion.div>

      {/* 5. TWO ACTION BUTTONS: "Quick play" and "Join room" */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, delay: 0.12 }}
        className="relative z-10 grid grid-cols-2 gap-2.5 shrink-0"
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
      <p className="relative z-10 text-[11px] text-gray-400 text-center font-medium leading-none shrink-0 py-0.5">
        Real-time multiplayer for 2 to 6 players
      </p>

      {/* 7. COMPACT ENTRY CARDS: "Meet the creators" & "Contact us" */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, delay: 0.16 }}
        className="relative z-10 grid grid-cols-2 gap-2.5 shrink-0"
      >
        {/* Meet the creators */}
        <button
          onClick={() => {
            soundEngine.playClick();
            navigate('/creators');
          }}
          className="min-h-[46px] p-2.5 rounded-xl bg-[#141d33] hover:bg-[#1a2540] active:scale-[0.98] border border-[#26314d] hover:border-[#ff7a00]/40 text-left transition-all cursor-pointer shadow-md flex items-center gap-2.5 group focus:outline-none focus:ring-1 focus:ring-[#ff7a00]"
        >
          <div className="w-8 h-8 rounded-lg bg-[#ff7a00]/15 border border-[#ff7a00]/30 flex items-center justify-center shrink-0 text-[#ff7a00] group-hover:scale-105 transition-transform">
            <Users className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] sm:text-xs font-black text-white truncate font-display">
              Meet the creators
            </p>
            <p className="text-[9px] sm:text-[10px] text-gray-400 truncate">
              Ghreatness Laboratory
            </p>
          </div>
        </button>

        {/* Contact us */}
        <button
          onClick={() => {
            soundEngine.playClick();
            navigate('/contact');
          }}
          className="min-h-[46px] p-2.5 rounded-xl bg-[#141d33] hover:bg-[#1a2540] active:scale-[0.98] border border-[#26314d] hover:border-[#1fd1a0]/40 text-left transition-all cursor-pointer shadow-md flex items-center gap-2.5 group focus:outline-none focus:ring-1 focus:ring-[#1fd1a0]"
        >
          <div className="w-8 h-8 rounded-lg bg-[#1fd1a0]/15 border border-[#1fd1a0]/30 flex items-center justify-center shrink-0 text-[#1fd1a0] group-hover:scale-105 transition-transform">
            <MessageCircle className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] sm:text-xs font-black text-white truncate font-display">
              Contact us
            </p>
            <p className="text-[9px] sm:text-[10px] text-gray-400 truncate">
              We reply fast
            </p>
          </div>
        </button>
      </motion.div>

      {/* 8. EMPTY SPACE FILLERS: In exact requested order:
          a) "Continue playing" card
          b) "Daily challenge" card
          c) "Popular games" row */}

      {/* 8a. CONTINUE PLAYING CARD */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, delay: 0.2 }}
        className="relative z-10 w-full p-3 sm:p-3.5 rounded-2xl bg-[#141d33] border border-[#26314d] shadow-lg flex items-center justify-between gap-3 shrink-0"
      >
        {lastPlayed ? (
          <>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#1fd1a0]/15 border border-[#1fd1a0]/30 flex items-center justify-center shrink-0 text-[#1fd1a0]">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-black uppercase text-[#1fd1a0] tracking-wider">
                    Continue playing
                  </span>
                </div>
                <h4 className="text-xs sm:text-sm font-black text-white font-display truncate">
                  {lastPlayed.gameName}
                </h4>
                <p className="text-[10px] text-gray-400 truncate">
                  Last result: {lastPlayed.outcome === 'win' ? 'Victory 🏆' : lastPlayed.outcome === 'draw' ? 'Draw 🤝' : 'Match finished'}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                soundEngine.playAgogo(true);
                navigate(`/game/${lastPlayed.gameId}`);
              }}
              className="h-9 px-3 rounded-xl bg-gradient-to-r from-[#1fd1a0] to-[#17b88c] hover:brightness-105 active:scale-95 text-black font-black text-xs font-display uppercase tracking-wider flex items-center justify-center cursor-pointer transition-all shrink-0"
            >
              Resume
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#ff7a00]/15 border border-[#ff7a00]/30 flex items-center justify-center shrink-0 text-[#ff7a00]">
                <Play className="w-5 h-5 fill-current" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] font-black uppercase text-[#ff7a00] tracking-wider">
                  New Player
                </span>
                <h4 className="text-xs sm:text-sm font-black text-white font-display truncate">
                  Play your first game
                </h4>
                <p className="text-[10px] text-gray-400 truncate">
                  Jump into offline vs Computer or Pass &amp; Play
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                soundEngine.playAgogo(true);
                navigate('/game/xo');
              }}
              className="h-9 px-3 rounded-xl bg-[#ff7a00] hover:bg-[#ff8800] active:scale-95 text-black font-black text-xs font-display uppercase tracking-wider flex items-center justify-center cursor-pointer transition-all shrink-0"
            >
              Quick play
            </button>
          </>
        )}
      </motion.div>

      {/* 8b. DAILY CHALLENGE CARD */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, delay: 0.24 }}
        className="relative z-10 w-full p-3 sm:p-3.5 rounded-2xl bg-[#141d33] border border-[#26314d] shadow-lg shrink-0 space-y-2.5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#ffb703]/15 border border-[#ffb703]/30 flex items-center justify-center text-[#ffb703]">
              <Gift className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[9px] font-black uppercase text-[#ffb703] tracking-wider block leading-none">
                Daily Challenge
              </span>
              <h4 className="text-xs font-black text-white font-display mt-0.5">
                {challenge.goal}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-black font-mono">
            <Coins className="w-3 h-3 text-[#ffb703]" />
            <span>+{challenge.rewardXP} XP</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-gray-300">
            <span>Progress</span>
            <span className="font-mono text-gray-300">
              {challenge.currentWins} / {challenge.targetWins}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-[#0d1426] overflow-hidden border border-[#26314d]">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: Math.min(1, challenge.currentWins / challenge.targetWins) }}
              style={{ transformOrigin: 'left' }}
              transition={{ duration: 0.6 }}
              className="w-full h-full bg-gradient-to-r from-[#1fd1a0] to-[#ffb703] rounded-full"
            />
          </div>
        </div>

        {/* Action / Claim button */}
        {challenge.currentWins >= challenge.targetWins ? (
          challenge.claimed ? (
            <div className="flex items-center justify-center gap-1.5 py-1 text-xs font-bold text-[#1fd1a0]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Claimed! Resetting tomorrow</span>
            </div>
          ) : (
            <button
              onClick={handleClaimReward}
              className="w-full h-9 rounded-xl bg-gradient-to-r from-[#1fd1a0] to-[#17b88c] hover:brightness-105 active:scale-95 text-black font-black text-xs font-display uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Gift className="w-3.5 h-3.5" />
              <span>Claim Reward (+{challenge.rewardXP} XP)</span>
            </button>
          )
        ) : (
          <p className="text-[10px] text-gray-400 text-center font-medium">
            Play vs Computer or friends to complete this goal.
          </p>
        )}
      </motion.div>

      {/* 8c. POPULAR GAMES ROW (Horizontally scrollable strip of small game chips) */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, delay: 0.28 }}
        className="relative z-10 w-full shrink-0 space-y-2"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black font-display uppercase tracking-wider text-gray-300">
            Popular Games
          </h3>
          <button
            onClick={onOpenPicker}
            className="text-[10px] font-bold text-[#ff7a00] hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            <span>See all</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Scrollable strip */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar touch-scroller -mx-4 px-4 overscroll-contain">
          {popularGames.map((game) => (
            <button
              key={game.id}
              onClick={() => {
                soundEngine.playAgogo(true);
                navigate(`/game/${game.id}`);
              }}
              className="group shrink-0 min-w-[120px] max-w-[130px] p-2.5 rounded-2xl bg-[#141d33] hover:bg-[#1a2542] active:scale-95 border border-[#26314d] hover:border-[#ff7a00]/40 transition-all text-left shadow-md cursor-pointer flex flex-col justify-between h-[84px]"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xl group-hover:scale-110 transition-transform">{game.icon}</span>
                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-gray-300">
                  {game.category}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-white font-display truncate">
                  {game.name}
                </p>
                <p className="text-[9px] text-[#1fd1a0] font-bold truncate">
                  Offline Ready
                </p>
              </div>
            </button>
          ))}
        </div>
      </motion.div>

      {/* 9. FLOATING GAME PIECES (Behind everything, lower opacity 0.08, confined strictly below content) */}
      <div className="relative w-full h-12 pointer-events-none select-none overflow-hidden z-0 mt-1 opacity-[0.08]">
        <div
          style={{ animationPlayState: isPaused ? 'paused' : 'running' }}
          className="absolute left-[8%] top-1 text-2xl animate-float-1"
        >
          🎲
        </div>
        <div
          style={{ animationPlayState: isPaused ? 'paused' : 'running' }}
          className="absolute left-[36%] top-2 text-2xl animate-float-2"
        >
          ♞
        </div>
        <div
          style={{ animationPlayState: isPaused ? 'paused' : 'running' }}
          className="absolute left-[64%] top-0 text-2xl animate-float-3"
        >
          🟤
        </div>
        <div
          style={{ animationPlayState: isPaused ? 'paused' : 'running' }}
          className="absolute right-[8%] top-1 text-2xl animate-float-1"
        >
          ❌
        </div>
      </div>

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

export default DashboardScreen;
