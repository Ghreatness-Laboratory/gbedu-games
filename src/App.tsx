import React, { useEffect, useState } from 'react';
import { useWhotStore } from './store/useWhotStore';
import { AuthScreen } from './components/AuthScreen';
import { DashboardScreen } from './components/DashboardScreen';
import { LobbyScreen } from './components/LobbyScreen';
import { GameBoard } from './components/GameBoard';
import { BeatMaker } from './components/BeatMaker';
import { LyricsQuiz } from './components/LyricsQuiz';
import { GuessMelody } from './components/GuessMelody';
import { PartyLeaderboard } from './components/PartyLeaderboard';
import { GbeduLogo } from './components/GbeduLogo';
import { Avatar } from './components/Avatar';
import { ProfileModal } from './components/ProfileModal';
import { soundEngine } from './audio/audioEngine';
import {
  Flame,
  Mic2,
  Disc3,
  Music,
  Trophy,
  Volume2,
  VolumeX,
  LogOut,
  Sparkles,
  Layers,
  X,
} from 'lucide-react';

type SubTab = 'whot' | 'beatmaker' | 'lyrics' | 'guess' | 'party';

export const App: React.FC = () => {
  const {
    user,
    token,
    initAuth,
    currentRoom,
    gameView,
    logout,
    isMuted,
    toggleMute,
    notification,
    clearNotification,
  } = useWhotStore();

  const [activeTab, setActiveTab] = useState<SubTab>('whot');
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Initialize Supabase auth session listener
  useEffect(() => {
    initAuth();
  }, [initAuth]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0b1426] text-white flex flex-col justify-between">
        <AuthScreen />
        <footer className="py-4 text-center text-xs text-gray-500 border-t border-white/5">
          Gbedu Games • Real Multiplayer Naija Whot • FragNaija by Ghreatness Laboratory
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1426] text-white flex flex-col selection:bg-amber-500 selection:text-black">
      {/* Universal Top Header */}
      <header className="sticky top-0 z-40 bg-[#0d1527]/90 backdrop-blur-md border-b border-white/10 px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Official Logo & Tagline */}
          <div
            onClick={() => setActiveTab('whot')}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <GbeduLogo size="md" />
            <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              NAIJA WHOT
            </span>
          </div>

          {/* Nav Tabs (When outside live game) */}
          {!gameView && !currentRoom && (
            <nav className="hidden md:flex items-center gap-1.5">
              {[
                { id: 'whot', label: 'Whot Multiplayer', icon: <Layers className="w-4 h-4 text-amber-400" /> },
                { id: 'beatmaker', label: 'Beat Maker', icon: <Disc3 className="w-4 h-4 text-rose-400" /> },
                { id: 'lyrics', label: 'Lyrics Quiz', icon: <Mic2 className="w-4 h-4 text-emerald-400" /> },
                { id: 'guess', label: 'Whot & Tune', icon: <Music className="w-4 h-4 text-cyan-400" /> },
                { id: 'party', label: 'Hall of Fame', icon: <Trophy className="w-4 h-4 text-yellow-400" /> },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as SubTab)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === t.id
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                      : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {t.icon}
                  <span>{t.label}</span>
                </button>
              ))}
            </nav>
          )}

          {/* Right Controls: Sound, Profile & Logout */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={toggleMute}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 transition-colors cursor-pointer"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            <button
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer group"
              title="Edit Player Avatar & Profile"
            >
              <Avatar
                avatarUrl={user.avatarUrl}
                avatarId={user.avatarId}
                config={user.avatarConfig as any}
                username={user.username}
                size={30}
                showAura={true}
                interactive={false}
              />
              <span className="text-xs font-extrabold text-white group-hover:text-amber-300 hidden sm:inline transition-colors">
                {user.displayName || user.username}
              </span>
            </button>

            <button
              onClick={logout}
              className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-gray-400 hover:text-rose-300 transition-colors cursor-pointer"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Global Toast Notification */}
      {notification && (
        <div className="fixed top-16 right-4 z-50 max-w-sm bg-[#121927] border-2 border-amber-500/50 rounded-2xl p-4 shadow-2xl flex items-start gap-3 animate-scale-up">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-black text-white">{notification.title}</p>
            <p className="text-[11px] text-gray-300 mt-0.5">{notification.body}</p>
          </div>
          <button onClick={clearNotification} className="text-gray-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Content Arena */}
      <main className={`flex-1 flex flex-col justify-center ${!gameView && !currentRoom ? 'pb-16 md:pb-0' : ''}`}>
        {gameView ? (
          /* Live Game Active */
          <GameBoard />
        ) : currentRoom ? (
          /* Room Lobby Active */
          <LobbyScreen />
        ) : activeTab === 'whot' ? (
          /* Main Dashboard */
          <DashboardScreen />
        ) : activeTab === 'beatmaker' ? (
          <BeatMaker />
        ) : activeTab === 'lyrics' ? (
          <LyricsQuiz onScoreUpdate={() => {}} />
        ) : activeTab === 'guess' ? (
          <GuessMelody onScoreUpdate={() => {}} />
        ) : (
          <PartyLeaderboard player={{ name: user.displayName, avatar: user.avatarUrl, title: 'Odogwu', totalScore: 2500, rhythmHighScore: 3000, lyricsStreak: 5, unlockedBadges: ['b1', 'b4'] }} />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      {!gameView && !currentRoom && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0d1527]/95 backdrop-blur-md border-t border-white/10 px-2 py-2 flex items-center justify-around shadow-2xl">
          {[
            { id: 'whot', label: 'Whot', icon: <Layers className="w-5 h-5 text-amber-400" /> },
            { id: 'beatmaker', label: 'Beats', icon: <Disc3 className="w-5 h-5 text-rose-400" /> },
            { id: 'lyrics', label: 'Lyrics', icon: <Mic2 className="w-5 h-5 text-emerald-400" /> },
            { id: 'guess', label: 'Melody', icon: <Music className="w-5 h-5 text-cyan-400" /> },
            { id: 'party', label: 'Fame', icon: <Trophy className="w-5 h-5 text-yellow-400" /> },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as SubTab)}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                activeTab === t.id
                  ? 'text-amber-300 bg-amber-500/15 border border-amber-500/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      )}

      {/* Footer */}
      {!gameView && (
        <footer className="border-t border-white/10 bg-[#080d1a] py-4 px-4 text-center text-xs text-gray-500 mb-16 md:mb-0">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2 justify-center">
              <span className="text-amber-400 font-extrabold">GBEDU GAMES</span>
              <span>•</span>
              <span>Multiplayer Naija Whot Platform (2-6 Players)</span>
            </div>
            <div className="text-gray-400 text-[11px]">
              Single Authority Game Server • Pure TS Whot Engine • Realtime Sockets
            </div>
          </div>
        </footer>
      )}
      {/* Profile & Avatar Customizer Modal */}
      {isProfileOpen && (
        <ProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          player={{
            name: user.displayName || user.username,
            avatar: user.avatarUrl,
            avatarId: user.avatarId,
            avatarConfig: user.avatarConfig,
            title: 'Odogwu',
            totalScore: 2500,
            rhythmHighScore: 3000,
            lyricsStreak: 5,
            unlockedBadges: ['b1', 'b4'],
          }}
        />
      )}
    </div>
  );
};

export default App;
