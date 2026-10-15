import React from 'react';
import { GameTab, PlayerProfile } from '../types';
import { Music, Mic2, Disc3, Trophy, Volume2, VolumeX, Sparkles, User, Flame } from 'lucide-react';
import { GbeduLogo } from './GbeduLogo';
import { Avatar } from './Avatar';
import { soundEngine } from '../audio/audioEngine';

interface NavbarProps {
  activeTab: GameTab;
  setActiveTab: (tab: GameTab) => void;
  player: PlayerProfile;
  onOpenProfile: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  player,
  onOpenProfile,
  isMuted,
  onToggleMute,
}) => {
  const tabs: { id: GameTab; label: string; icon: React.ReactNode; tag?: string }[] = [
    { id: 'rhythm', label: 'Beat Tap', icon: <Flame className="w-4 h-4 text-amber-400" />, tag: 'HOT' },
    { id: 'lyrics', label: 'Lyrics Quiz', icon: <Mic2 className="w-4 h-4 text-emerald-400" /> },
    { id: 'beatmaker', label: 'Beat Maker', icon: <Disc3 className="w-4 h-4 text-rose-400" /> },
    { id: 'guess', label: 'Whot & Tune', icon: <Music className="w-4 h-4 text-cyan-400" /> },
    { id: 'party', label: 'Party & Ranks', icon: <Trophy className="w-4 h-4 text-yellow-400" /> },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#0d131f]/90 backdrop-blur-md border-b border-white/10 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Logo & Brand */}
        <div className="flex items-center justify-between w-full md:w-auto">
          <div 
            onClick={() => setActiveTab('rhythm')}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <GbeduLogo size="sm" />
            <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              AFROBEATS
            </span>
          </div>

          {/* Mobile Right Action Icons */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={onToggleMute}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
            <button
              onClick={onOpenProfile}
              className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold"
            >
              <Avatar
                avatarUrl={player.avatar}
                avatarId={player.avatarId}
                config={player.avatarConfig}
                size={26}
                showAura={true}
                interactive={false}
              />
              <span>{player.totalScore.toLocaleString()}</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto py-1 scrollbar-none">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  soundEngine.playAgogo(true);
                  setActiveTab(tab.id);
                }}
                className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500/25 to-rose-500/25 text-white border border-amber-500/50 shadow-md shadow-amber-500/10'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.tag && (
                  <span className="text-[9px] bg-rose-500 text-white font-extrabold px-1 rounded-sm animate-pulse">
                    {tab.tag}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Desktop Controls (Audio + Profile) */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={onToggleMute}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 transition-colors border border-white/5 cursor-pointer"
          >
            {isMuted ? (
              <>
                <VolumeX className="w-4 h-4 text-rose-400" />
                <span className="text-rose-400">Muted</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <span>Audio On</span>
              </>
            )}
          </button>

          <button
            onClick={onOpenProfile}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/15 border border-amber-500/30 hover:border-amber-400/60 transition-all text-left cursor-pointer group"
          >
            <div className="relative shrink-0">
              <Avatar
                avatarUrl={player.avatar}
                avatarId={player.avatarId}
                config={player.avatarConfig}
                size={34}
                showAura={true}
                interactive={false}
              />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-gray-200">{player.name}</span>
                <span className="text-[9px] font-bold text-amber-400 px-1 rounded bg-amber-500/10 border border-amber-500/20">
                  {player.title}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-amber-300 font-extrabold">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>{player.totalScore.toLocaleString()} pts</span>
              </div>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
