import React, { useState } from 'react';
import { PlayerProfile } from '../types';
import { Trophy, Users, Award, Plus, Trash2, Crown, Sparkles, Flame, Check } from 'lucide-react';
import { Avatar } from './Avatar';
import { soundEngine } from '../audio/audioEngine';
import confetti from 'canvas-confetti';

interface PartyLeaderboardProps {
  player: PlayerProfile;
}

interface PartyPlayer {
  id: string;
  name: string;
  score: number;
}

export const PartyLeaderboard: React.FC<PartyLeaderboardProps> = ({ player }) => {
  const [partyPlayers, setPartyPlayers] = useState<PartyPlayer[]>([
    { id: '1', name: player.name, score: player.totalScore },
    { id: '2', name: 'DJ Tunez', score: 3850 },
    { id: '3', name: 'Olori Gbedu', score: 3200 },
    { id: '4', name: 'Amapiano Chief', score: 2750 },
  ]);

  const [newPlayerName, setNewPlayerName] = useState('');

  const badges = [
    { id: 'b1', name: 'Log Drum Maestro', desc: 'Mastered the Amapiano 808 drop', icon: '🥁', unlocked: player.rhythmHighScore > 1000 },
    { id: 'b2', name: 'Lyrics Virtuoso', desc: 'Finished lyrics with 3+ question streak', icon: '🎤', unlocked: player.lyricsStreak >= 3 },
    { id: 'b3', name: 'Shrine Priest', desc: 'Played Kalakuta Polyrhythm on Hard', icon: '🪘', unlocked: player.rhythmHighScore > 2500 },
    { id: 'b4', name: 'Studio Chef', desc: 'Programmed an Afrobeats drum loop', icon: '🎛️', unlocked: true },
    { id: 'b5', name: 'Odogwu Supreme', desc: 'Achieved over 5,000 total career points', icon: '👑', unlocked: player.totalScore >= 5000 },
  ];

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;

    soundEngine.playAgogo(true);
    setPartyPlayers((prev) => [
      ...prev,
      { id: Date.now().toString(), name: newPlayerName.trim(), score: 0 },
    ]);
    setNewPlayerName('');
  };

  const handleAdjustScore = (id: string, delta: number) => {
    soundEngine.playHitSound('perfect');
    setPartyPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, score: Math.max(0, p.score + delta) } : p))
    );
  };

  const handleRemovePlayer = (id: string) => {
    setPartyPlayers((prev) => prev.filter((p) => p.id !== id));
  };

  const handleDeclareWinner = () => {
    soundEngine.playCheerSound();
    confetti({
      particleCount: 150,
      spread: 90,
      origin: { y: 0.5 },
    });
  };

  // Sort by score
  const sorted = [...partyPlayers].sort((a, b) => b.score - a.score);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-4 space-y-6">
      {/* Hall of Fame Banner */}
      <div className="bg-[#121826] rounded-3xl p-6 border border-white/10 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <Avatar
              avatarUrl={player.avatar}
              avatarId={player.avatarId}
              config={player.avatarConfig}
              size={56}
              showAura={true}
              interactive={true}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-extrabold text-amber-400 tracking-wider">
                FragNaija Esports & Party Arena
              </span>
            </div>
            <h2 className="text-2xl font-black font-display text-white">
              Gbedu Hall of Fame & Party Mode
            </h2>
            <p className="text-xs text-gray-400">
              Pass-and-play tournament scoreboard for friends, family, and game night rivalries!
            </p>
          </div>
        </div>

        <button
          onClick={handleDeclareWinner}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-black font-black text-xs md:text-sm hover:scale-105 transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
        >
          <Crown className="w-4 h-4" />
          <span>CROWN WINNER</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pass-and-Play Scoreboard (2 cols) */}
        <div className="md:col-span-2 bg-[#0e1524] rounded-3xl p-6 border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-extrabold text-white">Party Leaderboard</h3>
            </div>
            <span className="text-xs text-gray-400">{partyPlayers.length} Contestants</span>
          </div>

          {/* Add Player Input */}
          <form onSubmit={handleAddPlayer} className="flex gap-2">
            <input
              type="text"
              placeholder="Add friend name (e.g. Tunde, Chidi)..."
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-black font-black text-xs rounded-xl hover:bg-amber-400 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>ADD</span>
            </button>
          </form>

          {/* Player Score Rows */}
          <div className="space-y-2.5 pt-2">
            {sorted.map((p, idx) => {
              const isTop = idx === 0;
              return (
                <div
                  key={p.id}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                    isTop
                      ? 'bg-amber-500/15 border-amber-500/50 shadow-md shadow-amber-500/10'
                      : 'bg-white/5 border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                        isTop ? 'bg-amber-500 text-black' : 'bg-black/30 text-gray-400'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="shrink-0">
                      <Avatar
                        avatarUrl={p.name === player.name ? player.avatar : `avatar-0${(idx % 9) + 1}`}
                        size={32}
                        showAura={isTop}
                        interactive={false}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-white">{p.name}</span>
                        {isTop && (
                          <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            ODOGWU
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-amber-400 font-black font-mono">
                        {p.score.toLocaleString()} pts
                      </span>
                    </div>
                  </div>

                  {/* Increment/Decrement Buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleAdjustScore(p.id, -100)}
                      className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs flex items-center justify-center cursor-pointer"
                      title="-100 points"
                    >
                      -
                    </button>
                    <button
                      onClick={() => handleAdjustScore(p.id, 100)}
                      className="px-2 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 font-bold text-xs flex items-center justify-center cursor-pointer"
                      title="+100 points"
                    >
                      +100
                    </button>
                    <button
                      onClick={() => handleAdjustScore(p.id, 500)}
                      className="px-2 h-7 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 font-bold text-xs flex items-center justify-center cursor-pointer"
                      title="+500 points"
                    >
                      +500
                    </button>
                    {partyPlayers.length > 1 && (
                      <button
                        onClick={() => handleRemovePlayer(p.id)}
                        className="w-7 h-7 rounded-lg text-gray-500 hover:text-rose-400 flex items-center justify-center cursor-pointer ml-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Career Badges & Achievements */}
        <div className="bg-[#0e1524] rounded-3xl p-6 border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-white/10">
            <Award className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-extrabold text-white">Gbedu Badges</h3>
          </div>

          <div className="space-y-3">
            {badges.map((b) => (
              <div
                key={b.id}
                className={`p-3 rounded-2xl border transition-all flex items-start gap-3 ${
                  b.unlocked
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                    : 'bg-white/5 border-white/5 opacity-50'
                }`}
              >
                <div className="text-2xl">{b.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black text-gray-200">{b.name}</p>
                    {b.unlocked ? (
                      <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> Unlocked
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-500">Locked</span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
