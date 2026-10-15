import React, { useEffect, useState, Suspense, lazy } from 'react';
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
  useSearchParams,
} from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useWhotStore } from './store/useWhotStore';
import { AuthScreen } from './components/AuthScreen';
import { DashboardScreen } from './components/DashboardScreen';
import { GameLobbyScreen } from './components/GameLobbyScreen';
import { BeatMaker } from './components/BeatMaker';
import { LyricsQuiz } from './components/LyricsQuiz';
import { GuessMelody } from './components/GuessMelody';
import { PartyLeaderboard } from './components/PartyLeaderboard';
import { GbeduLogo } from './components/GbeduLogo';
import { ProfileModal } from './components/ProfileModal';
import { JoinRoomModal } from './components/JoinRoomModal';
import { soundEngine } from './audio/audioEngine';
import {
  Home,
  Gamepad2,
  Hash,
  Trophy,
  User,
  Volume2,
  VolumeX,
  LogOut,
  Sparkles,
  X,
} from 'lucide-react';

// Lazy-load GamePickerSheet for fast first paint
const GamePickerSheet = lazy(() =>
  import('./components/GamePickerSheet').then((m) => ({ default: m.GamePickerSheet }))
);

type NavTabId = 'home' | 'games' | 'rooms' | 'ranks' | 'profile';
type AppSubView = 'home' | 'beatmaker' | 'lyrics' | 'guess' | 'ranks';

export const App: React.FC = () => {
  const {
    user,
    stats,
    initAuth,
    currentRoom,
    gameView,
    logout,
    isMuted,
    toggleMute,
    notification,
    clearNotification,
  } = useWhotStore();

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [activeSubView, setActiveSubView] = useState<AppSubView>('home');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isJoinRoomOpen, setIsJoinRoomOpen] = useState(false);

  // Sync picker state from URL query param (?picker=open)
  const isPickerOpen = searchParams.get('picker') === 'open';

  // Initialize Supabase auth session listener
  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Clean up body/html scroll lock on route/params change or unmount
  useEffect(() => {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [location.pathname, location.search]);

  // Idle prefetch of GamePickerSheet for instantaneous opening
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const prefetch = () => {
        import('./components/GamePickerSheet');
      };
      if ('requestIdleCallback' in window) {
        (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(prefetch);
      } else {
        setTimeout(prefetch, 1000);
      }
    }
  }, []);

  const handleOpenPicker = () => {
    soundEngine.playClick();
    const newParams = new URLSearchParams(searchParams);
    newParams.set('picker', 'open');
    navigate({ search: newParams.toString() });
  };

  const handleClosePicker = () => {
    soundEngine.playClick();
    if (isPickerOpen) {
      navigate(-1);
    }
  };

  const handleSelectGame = (gameId: string) => {
    soundEngine.playAgogo(true);
    setActiveSubView('home');
    navigate(`/game/${gameId}`);
  };

  if (!user) {
    return (
      <div className="min-h-[100dvh] w-full bg-[#0d1426] text-white flex flex-col justify-between overflow-y-auto touch-scroller">
        <AuthScreen />
        <footer className="py-4 text-center text-xs text-gray-500 border-t border-[#26314d] shrink-0">
          Gbedu Games • Real Multiplayer Naija Party Games • FragNaija by Ghreatness Laboratory
        </footer>
      </div>
    );
  }

  const isGameRoute = location.pathname.startsWith('/game/');

  // Determine active bottom nav tab
  let activeNavTab: NavTabId = 'home';
  if (isPickerOpen) {
    activeNavTab = 'games';
  } else if (isJoinRoomOpen) {
    activeNavTab = 'rooms';
  } else if (activeSubView === 'ranks') {
    activeNavTab = 'ranks';
  } else if (isProfileOpen) {
    activeNavTab = 'profile';
  } else if (location.pathname === '/home') {
    activeNavTab = 'home';
  }

  const bottomNavItems = [
    {
      id: 'home' as NavTabId,
      label: 'Home',
      icon: <Home className="w-5 h-5" />,
      onClick: () => {
        soundEngine.playClick();
        setActiveSubView('home');
        navigate('/home');
      },
    },
    {
      id: 'games' as NavTabId,
      label: 'Games',
      icon: <Gamepad2 className="w-5 h-5" />,
      onClick: () => {
        handleOpenPicker();
      },
    },
    {
      id: 'rooms' as NavTabId,
      label: 'Rooms',
      icon: <Hash className="w-5 h-5" />,
      onClick: () => {
        soundEngine.playClick();
        setIsJoinRoomOpen(true);
      },
    },
    {
      id: 'ranks' as NavTabId,
      label: 'Ranks',
      icon: <Trophy className="w-5 h-5" />,
      onClick: () => {
        soundEngine.playClick();
        setActiveSubView('ranks');
      },
    },
    {
      id: 'profile' as NavTabId,
      label: 'Profile',
      icon: <User className="w-5 h-5" />,
      onClick: () => {
        soundEngine.playClick();
        setIsProfileOpen(true);
      },
    },
  ];

  return (
    <div className="min-h-[100dvh] w-full bg-[#0d1426] text-white flex flex-col select-none pt-[env(safe-area-inset-top)] selection:bg-[#ff7a00] selection:text-black relative">
      {/* 1. SLIM HEADER (48px) */}
      <header className="sticky top-0 z-40 h-12 min-h-[48px] max-h-[48px] bg-[#0d1426] border-b border-[#26314d] px-3 sm:px-4 flex items-center justify-between shrink-0">
        {/* Logo icon + "GBEDU GAMES" on one line (No 'PLAY • CONNECT • WIN') */}
        <div
          onClick={() => {
            setActiveSubView('home');
            navigate('/home');
          }}
          className="flex items-center gap-2 cursor-pointer select-none"
        >
          <GbeduLogo size="xs" iconOnly={true} />
          <span className="font-display font-black text-sm tracking-tight text-white whitespace-nowrap">
            GBEDU <span className="text-[#ff7a00]">GAMES</span>
          </span>
        </div>

        {/* Mute and Logout buttons (44px min tap targets) */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={toggleMute}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl hover:bg-white/5 active:bg-white/10 text-gray-300 transition-colors flex items-center justify-center cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-[#1fd1a0]" />
            )}
          </button>

          <button
            onClick={logout}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl hover:bg-rose-500/10 active:bg-rose-500/20 text-gray-400 hover:text-rose-400 transition-colors flex items-center justify-center cursor-pointer"
            title="Log Out"
            aria-label="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Global Toast Notification */}
      {notification && (
        <div className="fixed top-14 right-3 left-3 sm:left-auto sm:right-4 z-50 max-w-sm bg-[#141d33] border-2 border-[#ff7a00]/60 rounded-2xl p-3.5 shadow-2xl flex items-start gap-3 animate-scale-up">
          <Sparkles className="w-5 h-5 text-[#ffb703] shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-black text-white">{notification.title}</p>
            <p className="text-[11px] text-gray-300 mt-0.5">{notification.body}</p>
          </div>
          <button onClick={clearNotification} className="text-gray-400 hover:text-white cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Screen Arena (let content area scroll with bottom padding for fixed nav) */}
      <main
        className={`flex-1 w-full flex flex-col ${
          !gameView ? 'pb-[calc(76px+env(safe-area-inset-bottom,0px))]' : 'pb-[env(safe-area-inset-bottom,0px)]'
        }`}
      >
        {activeSubView === 'ranks' ? (
          <div className="flex-1 flex flex-col">
            <div className="px-4 py-2 flex items-center justify-between border-b border-[#26314d] shrink-0">
              <span className="text-xs font-black uppercase text-[#ffb703]">Hall of Fame</span>
              <button
                onClick={() => setActiveSubView('home')}
                className="text-xs text-gray-400 hover:text-white font-bold cursor-pointer"
              >
                Back to Home
              </button>
            </div>
            <PartyLeaderboard
              player={{
                name: user.displayName || user.username,
                avatar: user.avatarUrl,
                title: user.bio || 'Odogwu',
                totalScore: (stats.gamesWon || 0) * 500 + 1000,
                rhythmHighScore: 3000,
                lyricsStreak: stats.streak || 1,
                unlockedBadges: ['b1', 'b4'],
              }}
            />
          </div>
        ) : (
          <Routes>
            <Route
              path="/home"
              element={
                <DashboardScreen
                  onOpenPicker={handleOpenPicker}
                  onQuickPlay={(gameId) => navigate(`/game/${gameId}`)}
                  isPickerOpen={isPickerOpen}
                />
              }
            />
            <Route
              path="/game/:gameId"
              element={<GameLobbyScreen onOpenPicker={handleOpenPicker} />}
            />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        )}
      </main>

      {/* 7. FIXED BOTTOM NAV (5 TABS: Home, Games, Rooms, Ranks, Profile) */}
      {/* Hidden during active games (gameView) and on login screen */}
      {!gameView && (
        <nav
          aria-label="App Navigation"
          className="fixed bottom-0 left-0 right-0 z-40 bg-[#0d1426]/95 backdrop-blur-md border-t border-[#26314d] px-2 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] flex items-center justify-around select-none shrink-0"
        >
          {bottomNavItems.map((item) => {
            const isActive = activeNavTab === item.id;
            return (
              <button
                key={item.id}
                onClick={item.onClick}
                className="relative min-w-[44px] min-h-[44px] px-2 py-1 flex-1 flex flex-col items-center justify-center rounded-xl cursor-pointer transition-colors"
                aria-label={item.label}
              >
                {/* Animated Sliding Active Pill */}
                {isActive && (
                  <motion.div
                    layoutId="activeBottomNavPill"
                    transition={{ type: 'spring', damping: 24, stiffness: 320 }}
                    className="absolute inset-0 bg-[#ff7a00]/15 border border-[#ff7a00]/30 rounded-xl"
                  />
                )}

                {/* Icon with bounce on tap */}
                <motion.div
                  whileTap={{ scale: 0.82 }}
                  className={`relative z-10 transition-colors ${
                    isActive ? 'text-[#ff7a00]' : 'text-gray-400'
                  }`}
                >
                  {item.icon}
                </motion.div>

                <span
                  className={`relative z-10 text-[10px] font-bold mt-0.5 transition-colors leading-none ${
                    isActive ? 'text-[#ff7a00]' : 'text-gray-400'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      )}

      {/* Lazy-Loaded GamePickerSheet */}
      <Suspense fallback={null}>
        <GamePickerSheet
          isOpen={isPickerOpen}
          onClose={handleClosePicker}
          onSelectGame={handleSelectGame}
        />
      </Suspense>

      {/* Join Room Modal */}
      {isJoinRoomOpen && (
        <JoinRoomModal
          isOpen={isJoinRoomOpen}
          onClose={() => setIsJoinRoomOpen(false)}
          onSelectGamePrompt={handleOpenPicker}
        />
      )}

      {/* Profile & Avatar Customizer Modal */}
      {isProfileOpen && user && (
        <ProfileModal
          isOpen={isProfileOpen}
          player={{
            name: user.displayName || user.username,
            title: user.bio || 'Odogwu Contender',
            avatar: user.avatarUrl,
            avatarId: user.avatarId,
            avatarConfig: user.avatarConfig,
            totalScore: (stats.gamesWon || 0) * 500 + 1000,
            rhythmHighScore: 3000,
            lyricsStreak: stats.streak || 1,
            unlockedBadges: ['b1', 'b4'],
          }}
          onClose={() => setIsProfileOpen(false)}
        />
      )}
    </div>
  );
};

export default App;
