import React, { useState } from 'react';
import { useWhotStore } from '../store/useWhotStore';
import { User, Sparkles, ArrowRight, ShieldCheck, Mail, Lock, AlertCircle, Info } from 'lucide-react';
import { GbeduLogo } from './GbeduLogo';
import { soundEngine } from '../audio/audioEngine';
import { isSupabaseConfigured } from '../lib/supabase';

const AVATARS = ['👑', '🦁', '🕶️', '🧢', '💃', '🪘', '⭐', '🔥'];

export const AuthScreen: React.FC = () => {
  const { signIn, signUp, loginDemo } = useWhotStore();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('👑');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please provide email and password');
      return;
    }

    if (mode === 'signup' && !username.trim()) {
      setError('Please choose a username for your player card');
      return;
    }

    setLoading(true);
    soundEngine.playAgogo(true);

    try {
      if (mode === 'login') {
        const res = await signIn(email.trim(), password);
        if (!res.success) {
          setError(res.error || 'Login failed. Please check your credentials.');
        }
      } else {
        const res = await signUp(email.trim(), password, {
          username: username.trim(),
          displayName: displayName.trim() || username.trim(),
          avatarUrl: selectedAvatar,
        });
        if (!res.success) {
          setError(res.error || 'Signup failed. Please try again.');
        }
      }
    } catch (err) {
      setError((err as Error).message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (demoUsername: string, demoName: string, demoAvatar: string) => {
    setLoading(true);
    setError(null);
    soundEngine.playAgogo(true);
    try {
      const res = await loginDemo(demoUsername, demoName, demoAvatar);
      if (!res.success) {
        setError(res.error || 'Demo login failed');
      }
    } catch (err) {
      setError((err as Error).message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-gradient-to-b from-[#131b2e] to-[#0d131f] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
        {/* Official Brand Lockup */}
        <div className="flex flex-col items-center justify-center pt-2">
          <GbeduLogo size="xl" layout="vertical" />
        </div>

        {/* Auth Mode Toggle Tabs (Log In vs Create Account) */}
        <div className="grid grid-cols-2 gap-1 bg-black/40 p-1 rounded-2xl border border-white/10 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`py-2 rounded-xl transition-all cursor-pointer ${
              mode === 'login' ? 'bg-amber-500 text-black shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError(null);
            }}
            className={`py-2 rounded-xl transition-all cursor-pointer ${
              mode === 'signup' ? 'bg-amber-500 text-black shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Real Error Banner from Supabase */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-start gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-black">Authentication Error</p>
              <p className="font-normal opacity-90 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Vercel Configuration Notice if env vars are unset */}
        {!isSupabaseConfigured && (
          <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-200 text-[11px] leading-relaxed flex items-start gap-2">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Supabase Direct Client Mode</p>
              <p className="opacity-80">
                To link your live database, add <code className="bg-black/40 px-1 py-0.5 rounded text-amber-300 font-mono">VITE_SUPABASE_URL</code> and <code className="bg-black/40 px-1 py-0.5 rounded text-amber-300 font-mono">VITE_SUPABASE_ANON_KEY</code> to your Vercel project environment variables.
              </p>
            </div>
          </div>
        )}

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                Select Avatar
              </label>
              <div className="grid grid-cols-4 gap-2">
                {AVATARS.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => {
                      soundEngine.playShekere();
                      setSelectedAvatar(av);
                    }}
                    className={`h-11 rounded-xl text-2xl flex items-center justify-center transition-all cursor-pointer ${
                      selectedAvatar === av
                        ? 'bg-amber-500/25 border-2 border-amber-400 scale-105 shadow-md shadow-amber-500/20'
                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                Player Username
              </label>
              <input
                type="text"
                placeholder="e.g. burna_whot, odogwu..."
                maxLength={20}
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-white font-bold text-sm focus:outline-none focus:border-amber-400 font-mono"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/40 border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-white font-bold text-sm focus:outline-none focus:border-amber-400"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-white font-bold text-sm focus:outline-none focus:border-amber-400"
                required
              />
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                Display Name (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Odogwu of Lagos"
                maxLength={24}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-white font-bold text-sm focus:outline-none focus:border-amber-400"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 text-black font-black text-sm hover:scale-[1.02] active:scale-98 transition-all shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            <span>
              {loading
                ? 'CONNECTING TO SUPABASE...'
                : mode === 'login'
                ? 'LOG IN WITH SUPABASE'
                : 'CREATE SUPABASE ACCOUNT'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Accounts for 2-6 Player Multiplayer Testing */}
        <div className="pt-2 border-t border-white/10 text-center">
          <p className="text-[11px] uppercase font-extrabold text-gray-400 tracking-wider mb-2.5">
            Or Jump In With Demo Player:
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { username: 'ada', name: 'Ada', avatar: '👑' },
              { username: 'tobi', name: 'Tobi', avatar: '🦁' },
              { username: 'chi', name: 'Chi', avatar: '🕶️' },
            ].map((d) => (
              <button
                key={d.username}
                type="button"
                disabled={loading}
                onClick={() => handleQuickDemo(d.username, d.name, d.avatar)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-gray-300 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <span>{d.avatar}</span>
                <span>{d.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
