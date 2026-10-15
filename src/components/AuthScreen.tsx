import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useWhotStore } from '../store/useWhotStore';
import {
  Mail,
  Lock,
  User,
  AlertCircle,
  Volume2,
  Play,
  CheckCircle2,
  Flame,
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { GbeduLogo } from './GbeduLogo';
import { soundEngine } from '../audio/audioEngine';
import { Avatar } from './Avatar';
import { AvatarPicker } from './AvatarPicker';
import { AvatarConfig, DEFAULT_AVATAR_CONFIG, getPresetById } from '../data/avatarData';

const SINGLE_TAGLINE = 'Pull Up. Play On. Gbedu Never Stops.';

export const AuthScreen: React.FC = () => {
  const { signIn, signUp, loginDemo } = useWhotStore();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [selectedAvatarId, setSelectedAvatarId] = useState('avatar-01');
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(DEFAULT_AVATAR_CONFIG);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [isPlayingBeat, setIsPlayingBeat] = useState(false);
  const [forgotPasswordMsg, setForgotPasswordMsg] = useState(false);

  // Virtual keyboard / focus awareness for seamless mobile viewport handling
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const viewport = window.visualViewport;

    const handleResize = () => {
      // If visual viewport shrinks substantially below window innerHeight, virtual keyboard is active
      const isShrunk = viewport.height < window.innerHeight * 0.78;
      setIsKeyboardOpen(isShrunk);
    };

    viewport.addEventListener('resize', handleResize);
    viewport.addEventListener('scroll', handleResize);
    return () => {
      viewport.removeEventListener('resize', handleResize);
      viewport.removeEventListener('scroll', handleResize);
    };
  }, []);

  const isCollapsed = isKeyboardOpen || isInputFocused;

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
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#009a49', '#ff7900', '#ec4899', '#8b5cf6'],
      });
    } catch {
      // safe fallback
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setForgotPasswordMsg(false);

    if (!email.trim() || !password) {
      setError('Please enter your email and password to continue.');
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
          displayName: username.trim(),
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
    } catch (err: unknown) {
      soundEngine.playWrongSound();
      setError((err as Error)?.message || 'A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * SECURITY NOTICE:
   * Demo players below are standard low-privilege guest contenders with zero administrative
   * rights, isolated to party/demo sessions. No secret keys or real credentials exist here.
   * Recommendation: In production deployments requiring strict authentication only,
   * these demo quick-buttons can be toggled off via feature flag or removed.
   */
  const handleQuickDemo = async (demoUsername: string, demoName: string, demoAvatarId: string) => {
    setLoading(true);
    setError(null);
    soundEngine.playClick();
    try {
      const preset = getPresetById(demoAvatarId);
      const res = await loginDemo(demoUsername, demoName, demoAvatarId, demoAvatarId, preset.config);
      if (!res.success) {
        soundEngine.playWrongSound();
        setError(res.error || 'Demo login failed. Please try again.');
      } else {
        soundEngine.playWin();
      }
    } catch (err: unknown) {
      soundEngine.playWrongSound();
      setError((err as Error)?.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] w-full flex flex-col items-center justify-center px-4 py-3 sm:py-5 overflow-x-hidden bg-gradient-to-br from-[#060a14] via-[#091224] to-[#0d0718] ankara-pattern pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      {/* Background Ambience: warm orange edge glow & floating pieces */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-orange-600/15 blur-3xl" />

        {/* Slow-floating game pieces (Paused when keyboard is active) */}
        <div
          style={{ animationPlayState: isCollapsed ? 'paused' : 'running' }}
          className="absolute top-8 left-[6%] text-3xl opacity-25 filter drop-shadow-[0_0_10px_rgba(245,158,11,0.25)] animate-float-1"
        >
          🎲
        </div>
        <div
          style={{ animationPlayState: isCollapsed ? 'paused' : 'running' }}
          className="absolute top-16 right-[8%] text-3xl opacity-25 filter drop-shadow-[0_0_10px_rgba(0,154,73,0.25)] animate-float-2"
        >
          ♞
        </div>
        <div
          style={{ animationPlayState: isCollapsed ? 'paused' : 'running' }}
          className="absolute bottom-16 left-[8%] text-2xl opacity-25 filter drop-shadow-[0_0_10px_rgba(255,121,0,0.25)] animate-float-3"
        >
          🟤
        </div>
        <div
          style={{ animationPlayState: isCollapsed ? 'paused' : 'running' }}
          className="absolute bottom-12 right-[8%] text-3xl opacity-25 filter drop-shadow-[0_0_10px_rgba(236,72,153,0.25)] animate-float-1"
        >
          ⚽
        </div>
      </div>

      {/* Main Mobile-First Compact Card */}
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-[420px] mx-auto bg-gradient-to-b from-[#131b2e]/95 via-[#0f1728]/95 to-[#0b101c]/95 border-2 border-amber-500/30 rounded-3xl p-4 sm:p-5 shadow-2xl backdrop-blur-xl space-y-3 sm:space-y-3.5 glow-pulse-gold transition-all duration-300"
      >
        {/* Header: Logo, Title, and Tagline (Collapses smoothly when keyboard opens) */}
        <motion.div
          animate={{
            height: isCollapsed ? 0 : 'auto',
            opacity: isCollapsed ? 0 : 1,
            marginBottom: isCollapsed ? 0 : 4,
          }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="overflow-hidden flex flex-col items-center justify-center text-center"
        >
          <div className="flex items-center justify-center gap-2">
            <motion.div
              initial={{ scale: 0.8, rotate: -6 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.05 }}
              className="w-[52px] h-[44px] sm:w-[60px] sm:h-[50px] shrink-0 cursor-pointer flex items-center justify-center"
              onClick={() => soundEngine.playTalkingDrum(true)}
              title="Gbedu Controller"
            >
              <GbeduLogo iconOnly size="sm" className="w-full h-full" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              style={{ fontSize: 'clamp(28px, 9vw, 38px)' }}
              className="font-black font-display tracking-tight text-white leading-none whitespace-nowrap"
            >
              GBEDU{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-amber-300 drop-shadow-[0_0_14px_rgba(255,121,0,0.5)]">
                GAMES
              </span>
            </motion.h1>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.18 }}
            className="text-[13px] sm:text-[14px] font-bold text-amber-400 font-display tracking-normal truncate max-w-full mt-1 leading-tight"
          >
            {SINGLE_TAGLINE}
          </motion.p>
        </motion.div>

        {/* Beat Player: Slim 44px Pill */}
        <div className="h-11 px-3.5 rounded-full bg-black/45 border border-white/10 flex items-center justify-between gap-2 text-xs shadow-inner">
          <div className="flex items-center gap-2 min-w-0">
            <Flame className="w-4 h-4 text-orange-500 shrink-0 animate-pulse" />
            <span className="text-[12px] font-medium text-gray-300 truncate">
              Amapiano Log Drum Loop
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Equalizer animation: animates while playing, gentle pulse while idle */}
            <div className="flex items-end gap-[3px] h-3.5 w-10 justify-center">
              <span
                className={`w-1 bg-amber-400 rounded-full transition-all ${
                  isPlayingBeat ? 'animate-eq-1' : 'h-1.5 opacity-40'
                }`}
              />
              <span
                className={`w-1 bg-emerald-400 rounded-full transition-all ${
                  isPlayingBeat ? 'animate-eq-2' : 'h-2.5 opacity-40'
                }`}
              />
              <span
                className={`w-1 bg-orange-500 rounded-full transition-all ${
                  isPlayingBeat ? 'animate-eq-3' : 'h-3 opacity-40'
                }`}
              />
              <span
                className={`w-1 bg-pink-500 rounded-full transition-all ${
                  isPlayingBeat ? 'animate-eq-4' : 'h-2 opacity-40'
                }`}
              />
              <span
                className={`w-1 bg-purple-400 rounded-full transition-all ${
                  isPlayingBeat ? 'animate-eq-5' : 'h-1.5 opacity-40'
                }`}
              />
            </div>

            <button
              type="button"
              onClick={toggleBeatPreview}
              className="w-7 h-7 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95"
              title={isPlayingBeat ? 'Pause Beat' : 'Play Beat'}
            >
              {isPlayingBeat ? (
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              )}
            </button>
          </div>
        </div>

        {/* Tabs: Slim 40px with animated sliding highlight pill */}
        <div className="relative h-10 grid grid-cols-2 p-1 rounded-2xl bg-black/50 border border-white/10 text-xs font-black">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setMode('login');
              setError(null);
              setForgotPasswordMsg(false);
            }}
            className={`relative z-10 rounded-xl transition-colors font-display tracking-wide flex items-center justify-center min-h-[32px] cursor-pointer ${
              mode === 'login' ? 'text-black' : 'text-gray-400 hover:text-white'
            }`}
          >
            {mode === 'login' && (
              <motion.div
                layoutId="authTabPill"
                className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl shadow-md shadow-amber-500/20"
                transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              />
            )}
            <span className="relative z-10">Log In</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setMode('signup');
              setError(null);
              setForgotPasswordMsg(false);
            }}
            className={`relative z-10 rounded-xl transition-colors font-display tracking-wide flex items-center justify-center min-h-[32px] cursor-pointer ${
              mode === 'signup' ? 'text-black' : 'text-gray-400 hover:text-white'
            }`}
          >
            {mode === 'signup' && (
              <motion.div
                layoutId="authTabPill"
                className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl shadow-md shadow-amber-500/20"
                transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              />
            )}
            <span className="relative z-10">Sign Up</span>
          </button>
        </div>

        {/* Inline Error Notice */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-2.5 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-medium flex items-center gap-2 animate-shake"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="text-[12px] leading-tight flex-1">{error}</span>
          </motion.div>
        )}

        {/* Success Banner */}
        {signupSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-medium flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span className="text-[12px] leading-tight flex-1">
              Account created! Logging you into the arena...
            </span>
          </motion.div>
        )}

        {/* Forgot Password Friendly Helper Notice */}
        {forgotPasswordMsg && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-medium flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
            <span className="text-[12px] leading-tight flex-1">
              Forgot password? Use one of the instant Demo Player accounts below to play immediately!
            </span>
          </motion.div>
        )}

        {/* Form Inputs (48px tall, 16px font to prevent mobile zoom) */}
        <AnimatePresence mode="wait">
          <motion.form
            key={mode}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleSubmit}
            className="space-y-2.5"
          >
            {/* Sign Up Character Avatar Picker (Compact Mode) */}
            {mode === 'signup' && (
              <div className="pb-0.5">
                <AvatarPicker
                  selectedPresetId={selectedAvatarId}
                  currentConfig={avatarConfig}
                  onChange={(presetId, nextConfig) => {
                    setSelectedAvatarId(presetId);
                    setAvatarConfig(nextConfig);
                  }}
                  compact={true}
                />
              </div>
            )}

            {/* Player Tag / Username (Sign Up Only) */}
            {mode === 'signup' && (
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Player tag (e.g. odogwu_whot)"
                  maxLength={20}
                  value={username}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setIsInputFocused(false)}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  className="w-full h-12 bg-black/40 border border-white/15 rounded-2xl pl-10 pr-3 text-[16px] text-white font-medium placeholder-gray-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
                  required
                />
              </div>
            )}

            {/* Email Field */}
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 bg-black/40 border border-white/15 rounded-2xl pl-10 pr-3 text-[16px] text-white font-medium placeholder-gray-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
                required
              />
            </div>

            {/* Password Field with Eye Toggle */}
            <div>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setIsInputFocused(false)}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 bg-black/40 border border-white/15 rounded-2xl pl-10 pr-11 text-[16px] text-white font-medium placeholder-gray-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="w-11 h-12 absolute right-0 top-0 flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Forgot password link on Log In tab */}
              {mode === 'login' && (
                <div className="flex justify-end pt-1 pr-1">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setForgotPasswordMsg((prev) => !prev);
                    }}
                    className="text-[11px] text-amber-400/80 hover:text-amber-300 font-bold transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </div>

            {/* Primary Action Button (48-52px tall with press scale effect & spinner) */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-sm uppercase tracking-wider transition-all shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 font-display"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin stroke-[2.5]" />
                  <span>Entering Arena...</span>
                </>
              ) : (
                <span>{mode === 'login' ? 'Log In' : 'Sign Up'}</span>
              )}
            </motion.button>
          </motion.form>
        </AnimatePresence>

        {/* Demo Players: Single Row of 40px Chips under a Tiny Divider */}
        <div className="pt-2 border-t border-white/10 text-center space-y-1.5">
          <p className="text-[11px] text-gray-400 font-medium">
            or try a demo player
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
                className="h-10 px-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-gray-200 flex items-center justify-center gap-1.5 cursor-pointer transition-transform hover:scale-102 active:scale-95"
              >
                <div className="shrink-0 w-6 h-6 flex items-center justify-center">
                  <Avatar avatarId={d.avatarId} size={24} interactive={false} showAura={false} />
                </div>
                <span className="truncate">{d.name}</span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
