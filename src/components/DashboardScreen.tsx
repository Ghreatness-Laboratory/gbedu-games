import React, { useState, useEffect } from 'react';
import { useWhotStore } from '../store/useWhotStore';
import { FriendsModal } from './FriendsModal';
import {
  Users,
  Plus,
  Play,
  Trophy,
  Flame,
  Sparkles,
  ArrowRight,
  Shield,
  Layers,
  Mail,
  Zap,
} from 'lucide-react';
import { soundEngine } from '../audio/audioEngine';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface GameInvite {
  id: string;
  roomId: string;
  roomCode: string;
  senderName: string;
}

export const DashboardScreen: React.FC = () => {
  const { user, token, stats, createRoom, joinRoom, roomError, setUser, loginDemo } = useWhotStore();

  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isFriendsOpen, setIsFriendsOpen] = useState(false);
  const [invites, setInvites] = useState<GameInvite[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  // Quick switch demo accounts for instant 2-6 player multiplayer testing
  const DEMO_ACCOUNTS = [
    { username: 'ada', name: 'Ada', avatar: '👑' },
    { username: 'tobi', name: 'Tobi', avatar: '🦁' },
    { username: 'chi', name: 'Chi', avatar: '🕶️' },
    { username: 'emeka', name: 'Emeka', avatar: '🧢' },
    { username: 'zainab', name: 'Zainab', avatar: '💃' },
  ];

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
        // Ignore
      }
    }
  };

  useEffect(() => {
    fetchInvites();
    const interval = setInterval(fetchInvites, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const handleCreateRoom = async () => {
    setIsCreating(true);
    soundEngine.playAgogo(true);
    await createRoom();
    setIsCreating(false);
  };

  const handleJoinWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;

    setIsJoining(true);
    soundEngine.playAgogo(true);
    await joinRoom(joinCodeInput.trim().toUpperCase());
    setIsJoining(false);
  };

  const handleSwitchAccount = async (username: string) => {
    soundEngine.playShekere();
    const target = DEMO_ACCOUNTS.find((d) => d.username === username);
    await loginDemo(username, target?.name, target?.avatar);
  };

  if (!user) return null;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-4 space-y-6">
      {/* Active Game Invitations Alert Banner */}
      {invites.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-amber-500/20 border-2 border-amber-500/40 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-black flex items-center justify-center font-black text-xl">
              ✉️
            </div>
            <div>
              <p className="text-sm font-black text-white">
                Game Invite from <span className="text-amber-400">{invites[0].senderName}</span>!
              </p>
              <p className="text-xs text-gray-300">Room Code: {invites[0].roomCode}</p>
            </div>
          </div>
          <button
            onClick={() => joinRoom(invites[0].roomCode)}
            className="px-5 py-2 rounded-xl bg-amber-500 text-black font-black text-xs hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/30 cursor-pointer"
          >
            JOIN ROOM NOW
          </button>
        </div>
      )}

      {/* Hero Welcome & Quick Stats */}
      <div className="bg-gradient-to-r from-[#0e1626] via-[#111c30] to-[#0a111e] rounded-3xl p-6 md:p-8 border border-white/10 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4 text-center md:text-left">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-emerald-500 p-[2px] shadow-xl shadow-amber-500/20">
            <div className="w-full h-full bg-[#0b0f17] rounded-[14px] flex items-center justify-center text-3xl">
              {user.avatarUrl}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Gbedu Whot Master
              </span>
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                LIVE MULTIPLAYER
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black font-display text-white mt-1">
              Welcome back, {user.displayName}!
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              @{user.username} • Play real-time Whot with 2 to 6 players across mobile and desktop.
            </p>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full md:w-auto">
          <div className="p-3 bg-white/5 rounded-2xl border border-white/5 text-center min-w-[90px]">
            <p className="text-[10px] uppercase font-bold text-gray-400">Played</p>
            <p className="text-xl font-black text-white font-display">{stats.gamesPlayed}</p>
          </div>
          <div className="p-3 bg-white/5 rounded-2xl border border-white/5 text-center min-w-[90px]">
            <p className="text-[10px] uppercase font-bold text-gray-400">Won</p>
            <p className="text-xl font-black text-amber-400 font-display">{stats.gamesWon}</p>
          </div>
          <div className="col-span-2 sm:col-span-1 p-3 bg-white/5 rounded-2xl border border-white/5 text-center min-w-[90px]">
            <p className="text-[10px] uppercase font-bold text-gray-400">Streak</p>
            <p className="text-xl font-black text-emerald-400 font-display">{stats.streak}🔥</p>
          </div>
        </div>
      </div>

      {roomError && (
        <div className="p-3.5 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold text-center">
          {roomError}
        </div>
      )}

      {/* 3 Primary Action Cards: Create Room, Join Code, Friends */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* 1. Create Room */}
        <div className="bg-[#121927] border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col justify-between hover:border-amber-400/40 transition-all group">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-105 transition-transform">
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </div>
            <h3 className="text-xl font-black font-display text-white">Create Room</h3>
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
              Host a 2-6 player Whot room. Configure Naija Classic or Custom House Rules, and invite your squad!
            </p>
          </div>

          <button
            onClick={handleCreateRoom}
            disabled={isCreating}
            className="mt-6 w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{isCreating ? 'CREATING ROOM...' : 'CREATE ROOM'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Join with Code */}
        <div className="bg-[#121927] border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col justify-between hover:border-emerald-400/40 transition-all group">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-105 transition-transform">
              <Play className="w-6 h-6 stroke-[2.5]" />
            </div>
            <h3 className="text-xl font-black font-display text-white">Join with Code</h3>
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
              Got a 4-letter room code from a friend? Enter it below to jump straight into their game lobby.
            </p>
          </div>

          <form onSubmit={handleJoinWithCode} className="mt-6 space-y-2">
            <input
              type="text"
              placeholder="e.g. K7Q2"
              maxLength={6}
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
              className="w-full bg-black/40 border border-white/15 rounded-xl px-4 py-2.5 text-center font-mono font-black text-base text-amber-400 tracking-widest focus:outline-none focus:border-emerald-400"
            />
            <button
              type="submit"
              disabled={isJoining || !joinCodeInput.trim()}
              className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
            >
              <span>{isJoining ? 'JOINING...' : 'JOIN ROOM'}</span>
            </button>
          </form>
        </div>

        {/* 3. Friends & Social */}
        <div className="bg-[#121927] border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col justify-between hover:border-cyan-400/40 transition-all group">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-105 transition-transform">
              <Users className="w-6 h-6 stroke-[2.5]" />
            </div>
            <h3 className="text-xl font-black font-display text-white">Friends & Social</h3>
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
              Search Nigerian Whot players by username, send friend requests, and send direct match invites!
            </p>
          </div>

          <button
            onClick={() => setIsFriendsOpen(true)}
            className="mt-6 w-full py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-cyan-500/30 text-cyan-300 font-extrabold text-sm transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Users className="w-4 h-4" />
            <span>MANAGE FRIENDS</span>
          </button>
        </div>
      </div>

      {/* Multi-Player Quick Test Account Switcher Bar */}
      <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-gray-300">
            Quick Multiplayer Test Switcher:
          </span>
          <span className="text-[10px] text-gray-500">
            (Switch accounts to test 2-6 player multiplayer across browser tabs)
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.username}
              onClick={() => handleSwitchAccount(acc.username)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                user.username === acc.username
                  ? 'bg-amber-500 text-black border-amber-400 shadow-sm'
                  : 'bg-white/5 border-white/5 text-gray-400 hover:text-white'
              }`}
            >
              <span>{acc.avatar}</span>
              <span>{acc.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Friends Modal */}
      <FriendsModal isOpen={isFriendsOpen} onClose={() => setIsFriendsOpen(false)} />
    </div>
  );
};
