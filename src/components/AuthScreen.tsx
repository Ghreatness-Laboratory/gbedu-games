import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useWhotStore } from '../store/useWhotStore';
import {
  Sparkles,
  ArrowRight,
  Mail,
  Lock,
  AlertCircle,
  Volume2,
  VolumeX,
  Play,
  CheckCircle2,
  Flame,
  Award,
} from 'lucide-react';
import { GbeduLogo } from './GbeduLogo';
import { soundEngine } from '../audio/audioEngine';
import { Avatar } from './Avatar';
import { AvatarPicker } from './AvatarPicker';
import { AvatarConfig, DEFAULT_AVATAR_CONFIG, getPresetById } from '../data/avatarData';

// Tagline alternatives for easy swapping:
const DEFAULT_TAGLINE = 'Pull Up. Play On. Gbedu Never Stops.';

export const AuthScreen: React.FC = () => {
  const { signIn, signUp, loginDemo } = useWhotStore();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedAvatarId, setSelectedAvatarId] = useState('avatar-01');
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(DEFAULT_AVATAR_CONFIG);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [isPlayingBeat, setIsPlayingBeat] = useState(false);

  const toggleBeatPreview = () => {
    soundEngine.init();
    if (isPlayingBeat) {
      soundEngine.stopBackingTrack();
      setIsPlayingBeat(false);
    } else {
      soundEngine.startBackingTrack(1, 115); // Amapiano Sunset track
      setIsPlayingBeat(true);
    }
  };

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#009a49', '#ff7900', '#ec4899', '#8b5cf6'],
      });
    } catch {
      // Safe fallback if canvas-confetti is not loaded
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please provide your email and password to enter the arena.');
      soundEngine.playWrongSound();
      return;
    }

    if (mode === 'signup' && !username.trim()) {
      setError('Choose a player tag so rivals know who is beating them!');
      soundEngine.playWrongSound();
      return;
    }

    setLoading(true);
    soundEngine.playClick();

    try {
      if (mode === 'login') {
        const res = await signIn(email.trim(), password);
        if (!res.success) {
          soundEngine.playWrongSound();
          setError(res.error || 'Invalid email or password. Please verify your credentials.');
        } else {
          soundEngine.playWin();
          triggerConfetti();
        }
      } else {
        const res = await signUp(email.trim(), password, {
          username: username.trim(),
          displayName: displayName.trim() || username.trim(),
          avatarUrl: selectedAvatarId,
          avatarId: selectedAvatarId,
          avatarConfig: avatarConfig,
        });
        if (!res.success) {
          soundEngine.playWrongSound();
          setError(res.error || 'Could not complete registration. Please try another tag or email.');
        } else {
          soundEngine.playWin();
          triggerConfetti();
          setSignupSuccess(true);
        }
      }
    } catch (err: any) {
      soundEngine.playWrongSound();
      setError(err?.message || 'A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (demoUsername: string, demoName: string, demoAvatarId: string) => {
    setLoading(true);
    setError(null);
    soundEngine.playClick();
    try {
      const preset = getPresetById(demoAvatarId);
      const res = await loginDemo(demoUsername, demoName, demoAvatarId, demoAvatarId, preset.config);
      if (!res.success) {
        soundEngine.playWrongSound();
        setError(res.error || 'Demo login failed');
      } else {
        soundEngine.playWin();
      }
    } catch (err: any) {
      soundEngine.playWrongSound();
      setError(err?.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center px-4 py-8 overflow-hidden bg-gradient-to-br from-[#060a14] via-[#091224] to-[#0d0718] ankara-pattern">
      {/* Dynamic Floating Game Pieces Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
        {/* Dice */}
        <motion.div
          className="absolute top-12 left-[10%] text-4xl sm:text-5xl opacity-40 filter drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]"
          animate={{
            y: [-10, 25, -10],
            rotate: [0, 25, 0],
          }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        >
          🎲
        </motion.div>

        {/* Chess Knight */}
        <motion.div
          className="absolute top-24 right-[12%] text-4xl sm:text-5xl opacity-40 filter drop-shadow-[0_0_15px_rgba(0,154,73,0.3)]"
          animate={{
            y: [15, -20, 15],
            rotate: [0, -15, 0],
          }}
          transition={{ duration: 8.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          ♞
        </motion.div>

        {/* Ayo Seed */}
        <motion.div
          className="absolute bottom-28 left-[8%] text-3xl sm:text-4xl opacity-40 filter drop-shadow-[0_0_15px_rgba(255,121,0,0.3)]"
          animate={{
            y: [-15, 18, -15],
            rotate: [0, 30, 0],
          }}
          transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          🟤
        </motion.div>

        {/* Soccer Ball */}
        <motion.div
          className="absolute bottom-20 right-[10%] text-4xl sm:text-5xl opacity-40 filter drop-shadow-[0_0_15px_rgba(236,72,153,0.3)]"
          animate={{
            y: [20, -15, 20],
            rotate: [0, -45, 0],
          }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        >
          ⚽
        </motion.div>

        {/* XO Marks */}
        <motion.div
          className="absolute top-1/2 left-[4%] text-2xl sm:text-3xl font-black text-amber-400/30"
          animate={{
            y: [-12, 12, -12],
            rotate: [-10, 15, -10],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          ✖ ⭕
        </motion.div>

        <motion.div
          className="absolute top-1/3 right-[5%] text-3xl font-black text-emerald-400/30"
          animate={{
            y: [10, -15, 10],
            rotate: [15, -10, 15],
          }}
          transition={{ duration: 7.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          🪘
        </motion.div>

        {/* Subtle glowing ambient orbs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-orange-600/10 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-20 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      </div>

      {/* Main Landing & Auth Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={`relative z-10 w-full ${mode === 'signup' ? 'max-w-xl' : 'max-w-md'} bg-gradient-to-b from-[#131b2e]/95 via-[#0f1728]/95 to-[#0b101c]/95 border-2 border-amber-500/30 rounded-3xl p-5 sm:p-7 shadow-2xl backdrop-blur-xl space-y-4 glow-pulse-gold transition-all duration-300`}
      >
        {/* Animated Brand Header */}
        <div className="flex flex-col items-center justify-center text-center pt-1">
          <motion.div
            initial={{ scale: 0.8, rotate: -5 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 14 }}
            className="cursor-pointer"
            onClick={() => soundEngine.playTalkingDrum(true)}
          >
            <GbeduLogo size="xl" layout="vertical" />
          </motion.div>

          {/* Vibe Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-3 text-xs sm:text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-400 to-amber-200 tracking-wide font-display"
          >
            {DEFAULT_TAGLINE}
          </motion.p>
        </div>

        {/* Log Drum / Equalizer Beat Visualizer Bar */}
        <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-black/40 border border-white/10 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              <span>Gbedu Beat:</span>
            </span>
            <span className="text-[10px] text-gray-400">Amapiano Log Drum Loop</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Equalizer animation */}
            <div className="flex items-end gap-1 h-4 w-12 justify-center">
              <span className={`w-1 bg-amber-400 rounded-full ${isPlayingBeat ? 'animate-eq-1' : 'h-1.5'}`} />
              <span className={`w-1 bg-emerald-400 rounded-full ${isPlayingBeat ? 'animate-eq-2' : 'h-2'}`} />
              <span className={`w-1 bg-orange-500 rounded-full ${isPlayingBeat ? 'animate-eq-3' : 'h-3'}`} />
              <span className={`w-1 bg-pink-500 rounded-full ${isPlayingBeat ? 'animate-eq-4' : 'h-1.5'}`} />
              <span className={`w-1 bg-purple-400 rounded-full ${isPlayingBeat ? 'animate-eq-5' : 'h-2.5'}`} />
            </div>

            <button
              type="button"
              onClick={toggleBeatPreview}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title={isPlayingBeat ? 'Pause Beat' : 'Play Beat'}
            >
              {isPlayingBeat ? <Volume2 className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Clear Tabs: Log In vs Sign Up (No mention of Supabase!) */}
        <div className="grid grid-cols-2 gap-1.5 bg-black/50 p-1.5 rounded-2xl border border-white/15 text-xs font-black">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setMode('login');
              setError(null);
            }}
            className={`py-2.5 rounded-xl transition-all cursor-pointer font-display tracking-wide ${
              mode === 'login'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg shadow-amber-500/25 scale-[1.02]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setMode('signup');
              setError(null);
            }}
            className={`py-2.5 rounded-xl transition-all cursor-pointer font-display tracking-wide ${
              mode === 'signup'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg shadow-amber-500/25 scale-[1.02]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Real Error Banner with Shake Animation */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3.5 rounded-2xl bg-rose-500/20 border-2 border-rose-500/40 text-rose-300 text-xs font-bold flex items-start gap-2.5 animate-shake shadow-lg"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <div className="flex-1">
              <p className="font-black text-rose-200">Unable to Proceed</p>
              <p className="font-medium opacity-90 mt-0.5 leading-relaxed">{error}</p>
            </div>
          </motion.div>
        )}

        {/* Success Banner */}
        {signupSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-3.5 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-start gap-2.5 shadow-lg"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <div className="flex-1">
              <p className="font-black text-emerald-200">Welcome to Gbedu Games!</p>
              <p className="font-medium opacity-90 mt-0.5">
                Your player account is ready. Log in to claim your daily rewards and challenge players.
              </p>
            </div>
          </motion.div>
        )}

        {/* Animated Form Switch */}
        <AnimatePresence mode="wait">
          <motion.form
            key={mode}
            initial={{ opacity: 0, x: mode === 'login' ? -15 : 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: mode === 'login' ? 15 : -15 }}
            transition={{ duration: 0.25 }}
            onSubmit={handleSubmit}
            className="space-y-3.5"
          >
            {mode === 'signup' && (
              <div className="pt-1 pb-1">
                <AvatarPicker
                  selectedPresetId={selectedAvatarId}
                  currentConfig={avatarConfig}
                  onChange={(presetId, nextConfig) => {
                    setSelectedAvatarId(presetId);
                    setAvatarConfig(nextConfig);
                  }}
                />
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-black text-gray-300 uppercase tracking-wider mb-1">
                  Player Tag / Username
                </label>
                <input
                  type="text"
                  placeholder="e.g. odogwu_whot, burna_king..."
                  maxLength={20}
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  className="w-full bg-black/40 border border-white/20 rounded-xl px-3.5 py-2.5 text-white font-bold text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 font-mono transition-all"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-black text-gray-300 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  placeholder="player@gbedu.games"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/40 border border-white/20 rounded-xl pl-10 pr-4 py-2.5 text-white font-bold text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-gray-300 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/40 border border-white/20 rounded-xl pl-10 pr-4 py-2.5 text-white font-bold text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 transition-all"
                  required
                />
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-black text-gray-300 uppercase tracking-wider mb-1">
                  Display Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Odogwu of Lagos"
                  maxLength={24}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-black/40 border border-white/20 rounded-xl px-3.5 py-2.5 text-white font-bold text-sm focus:outline-none focus:border-amber-400 transition-all"
                />
              </div>
            )}

            {/* Main Action Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-sm transition-all shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-3 font-display tracking-wide uppercase"
            >
              <span>{loading ? 'Entering Arena...' : mode === 'login' ? 'Log In' : 'Sign Up'}</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </motion.button>
          </motion.form>
        </AnimatePresence>

        {/* Quick Demo Guest Jump-In */}
        <div className="pt-3 border-t border-white/10 text-center">
          <p className="text-[11px] uppercase font-black text-gray-400 tracking-wider mb-2.5 flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Or Jump In With Demo Player</span>
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { username: 'ada', name: 'Ada', avatarId: 'avatar-01' },
              { username: 'tobi', name: 'Tobi', avatarId: 'avatar-02' },
              { username: 'chi', name: 'Chi', avatarId: 'avatar-03' },
            ].map((d) => (
              <button
                key={d.username}
                type="button"
                disabled={loading}
                onClick={() => handleQuickDemo(d.username, d.name, d.avatarId)}
                className="p-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-black text-gray-200 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95"
              >
                <Avatar avatarId={d.avatarId} size={28} interactive={false} showAura={false} />
                <span>{d.name}</span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
