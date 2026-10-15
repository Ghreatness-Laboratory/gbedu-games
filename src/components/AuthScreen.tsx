import React, { useState } from 'react';
import { useWhotStore } from '../store/useWhotStore';
import { User, Sparkles, ArrowRight, ShieldCheck, Play } from 'lucide-react';
import { GbeduLogo } from './GbeduLogo';
import { soundEngine } from '../audio/audioEngine';

const AVATARS = ['👑', '🦁', '🕶️', '🧢', '💃', '🪘', '⭐', '🔥'];

export const AuthScreen: React.FC = () => {
  const { setUser } = useWhotStore();

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('👑');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please choose a username');
      return;
    }

    setLoading(true);
    setError(null);
    soundEngine.playAgogo(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          displayName: displayName.trim() || username.trim(),
          avatarUrl: selectedAvatar,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Authentication failed');
      } else {
        setUser(data.profile, data.token);
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (demoUsername: string, demoName: string, demoAvatar: string) => {
    setLoading(true);
    soundEngine.playAgogo(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: demoUsername,
          displayName: demoName,
          avatarUrl: demoAvatar,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setUser(data.profile, data.token);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-gradient-to-b from-[#131b2e] to-[#0d131f] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Official Brand Lockup */}
        <div className="flex flex-col items-center justify-center pt-2">
          <GbeduLogo size="xl" layout="vertical" />
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold text-center">
            {error}
          </div>
        )}

        {/* Custom Sign Up Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
              Unique Username
            </label>
            <input
              type="text"
              placeholder="e.g. burna_whot, odogwu99..."
              maxLength={20}
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              className="w-full bg-black/40 border border-white/15 rounded-xl px-4 py-2.5 text-white font-bold text-sm focus:outline-none focus:border-amber-400 font-mono"
            />
            <p className="text-[10px] text-gray-500 mt-1">Letters, numbers, and underscores only</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
              Display Name (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Odogwu of Lagos"
              maxLength={24}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-black/40 border border-white/15 rounded-xl px-4 py-2.5 text-white font-bold text-sm focus:outline-none focus:border-amber-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 text-black font-black text-sm hover:scale-[1.02] active:scale-98 transition-all shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>{loading ? 'CONNECTING...' : 'ENTER GBEDU ARENA'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Accounts for fast instant testing */}
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
