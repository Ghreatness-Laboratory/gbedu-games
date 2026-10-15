import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Lock,
  Sparkles,
  Users,
  Play,
  RotateCcw,
  History,
  ChevronRight,
  Flame,
} from 'lucide-react';
import {
  GAMES_CATALOG,
  CATEGORIES,
  GameDefinition,
  getLastPlayedGame,
  setLastPlayedGame,
} from '../data/gamesCatalog';
import { soundEngine } from '../audio/audioEngine';

interface GamePickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGame: (gameId: string) => void;
}

export const GamePickerSheet: React.FC<GamePickerSheetProps> = ({
  isOpen,
  onClose,
  onSelectGame,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const sheetContentRef = useRef<HTMLDivElement>(null);

  const lastPlayed = getLastPlayedGame();

  // Handle Escape key to close on desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock scroll only while picker is open and guarantee complete cleanup on close/unmount
  useEffect(() => {
    if (isOpen) {
      const prevBodyOverflow = document.body.style.overflow;
      const prevHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevBodyOverflow || '';
        document.documentElement.style.overflow = prevHtmlOverflow || '';
      };
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
  }, [isOpen]);

  const showToast = (message: string) => {
    soundEngine.playWrongSound();
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(message);
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  const handleCardClick = (game: GameDefinition) => {
    if (game.status === 'coming_soon') {
      showToast(`"${game.name}" is coming soon! Our elders are still tuning the balance.`);
      return;
    }

    soundEngine.playClick();
    setLastPlayedGame(game.id);
    onSelectGame(game.id);
  };

  const filteredGames = GAMES_CATALOG.filter((game) => {
    if (selectedCategory === 'All') return true;
    return game.category === selectedCategory;
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Choose Your Game"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center overscroll-contain"
        >
          {/* Dimmed Blurred Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-md cursor-pointer overscroll-contain"
          />

          {/* Toast Notification for Coming Soon */}
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="fixed top-6 left-1/2 -translate-x-1/2 z-60 bg-amber-500 text-black px-4 py-2.5 rounded-2xl shadow-2xl font-black text-xs sm:text-sm flex items-center gap-2 border border-amber-300 pointer-events-none"
            >
              <Lock className="w-4 h-4 shrink-0" />
              <span>{toastMessage}</span>
            </motion.div>
          )}

          {/* Sheet / Modal Container */}
          <motion.div
            ref={sheetContentRef}
            initial={{ y: '100%', opacity: 0.9 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.3 }}
            onDragEnd={(_e, info) => {
              if (info.offset.y > 120 || info.velocity.y > 300) {
                soundEngine.playClick();
                onClose();
              }
            }}
            className="relative w-full sm:max-w-xl md:max-w-2xl bg-[#0d1426] border-t sm:border border-[#26314d] rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden max-h-[88dvh] sm:max-h-[85vh] flex flex-col z-50 text-white pb-[max(1rem,env(safe-area-inset-bottom))] overscroll-contain"
          >
            {/* Drag Handle Bar (Mobile Only) */}
            <div className="pt-3 pb-1 flex justify-center sm:hidden cursor-grab active:cursor-grabbing">
              <div className="w-12 h-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors" />
            </div>

            {/* Sticky Header */}
            <div className="sticky top-0 z-20 bg-[#0d1426]/95 backdrop-blur-md px-5 py-3.5 border-b border-[#26314d] flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#ff7a00]/15 border border-[#ff7a00]/30 flex items-center justify-center text-[#ff7a00] font-black text-lg">
                  🎮
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black font-display text-white tracking-tight">
                    Choose Your Game
                  </h2>
                  <p className="text-[11px] text-gray-400">
                    Select a classic Naija party or board game
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  soundEngine.playClick();
                  onClose();
                }}
                aria-label="Close game selector"
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-gray-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Category Filter Chips Bar */}
            <div className="px-5 py-2.5 border-b border-[#26314d] bg-[#0d1426]/80 overflow-x-auto scrollbar-none flex items-center gap-2">
              {CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      soundEngine.playClick();
                      setSelectedCategory(cat);
                    }}
                    className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-[#ff7a00] text-black shadow-md shadow-[#ff7a00]/30'
                        : 'bg-[#141d33] text-gray-400 hover:text-white hover:bg-[#1a2540] border border-[#26314d]'
                    }`}
                  >
                    <span>{cat}</span>
                    {cat === 'All' && (
                      <span className="text-[10px] opacity-75 font-bold">
                        ({GAMES_CATALOG.length})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Scrollable Game Grid Area */}
            <div className="flex-1 overflow-y-auto overscroll-contain touch-scroller px-5 py-4 space-y-4">
              {/* Highlighted "Last Played" Banner (If in 'All' category and game is playable) */}
              {selectedCategory === 'All' && lastPlayed && (
                <div className="relative group">
                  <div className="text-[10px] font-black tracking-wider uppercase text-[#ffb703] mb-1.5 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5" />
                    <span>Last Played Game</span>
                  </div>
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleCardClick(lastPlayed)}
                    className="relative p-4 rounded-2xl bg-gradient-to-r from-[#ff7a00]/20 via-[#ffb703]/10 to-[#141d33] border-2 border-[#ffb703]/50 hover:border-[#ffb703] shadow-xl flex items-center justify-between gap-4 cursor-pointer overflow-hidden transition-all"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-14 h-14 rounded-2xl bg-[#ff7a00]/25 border border-[#ffb703]/40 flex items-center justify-center text-3xl shrink-0 group-hover:scale-105 transition-transform shadow-inner">
                        {lastPlayed.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base sm:text-lg font-black font-display text-white">
                            {lastPlayed.name}
                          </h3>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#1fd1a0]/15 text-[#1fd1a0] border border-[#1fd1a0]/30">
                            Playable
                          </span>
                        </div>
                        <p className="text-xs text-gray-300 line-clamp-1 mt-0.5">
                          {lastPlayed.tagline}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] font-bold text-gray-400">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-[#ffb703]" />
                            {lastPlayed.playerCount}
                          </span>
                          <span>•</span>
                          <span className="text-[#ffb703]">{lastPlayed.category}</span>
                        </div>
                      </div>
                    </div>

                    <div className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-[#ff7a00] text-black font-extrabold text-xs px-3 py-2 hover:bg-[#ff8800] transition-colors shadow-md shadow-[#ff7a00]/30 shrink-0">
                      <Play className="w-4 h-4 fill-current mr-1" />
                      <span className="hidden sm:inline">RESUME</span>
                    </div>
                  </motion.div>
                </div>
              )}

              {/* 2-Column Grid of Game Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4">
                {filteredGames.map((game, idx) => {
                  const isPlayable = game.status === 'playable';
                  return (
                    <motion.div
                      key={game.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03, duration: 0.2 }}
                      whileHover={isPlayable ? { y: -2, scale: 1.01 } : {}}
                      whileTap={isPlayable ? { scale: 0.98 } : { scale: 0.99 }}
                      onClick={() => handleCardClick(game)}
                      className={`relative p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col justify-between min-h-[120px] select-none ${
                        isPlayable
                          ? `bg-[#141d33] border-[#26314d] hover:border-[#ff7a00]/50 cursor-pointer group shadow-lg hover:shadow-xl`
                          : 'bg-[#141d33]/50 border-[#26314d]/50 opacity-55 cursor-pointer'
                      }`}
                    >
                      {/* Top Row: Icon + Status Tag */}
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className={`w-11 h-11 rounded-xl bg-gradient-to-br ${game.iconBg} border border-[#26314d] flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-inner shrink-0`}
                        >
                          {game.icon}
                        </div>

                        {isPlayable ? (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#1fd1a0]/15 text-[#1fd1a0] border border-[#1fd1a0]/30">
                            Playable
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-gray-700/50 text-gray-400 border border-[#26314d] flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" />
                            <span>Soon</span>
                          </span>
                        )}
                      </div>

                      {/* Info Content */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-sm sm:text-base font-black font-display text-white group-hover:text-[#ffb703] transition-colors">
                            {game.name}
                          </h4>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-gray-400">
                            {game.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">
                          {game.tagline}
                        </p>
                      </div>

                      {/* Bottom Footer: Player count */}
                      <div className="mt-2.5 pt-2 border-t border-[#26314d] flex items-center justify-between text-[11px] text-gray-400">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-[#ffb703]" />
                          <span>{game.playerCount}</span>
                        </span>

                        {isPlayable ? (
                          <span className="text-[#ff7a00] font-extrabold text-[11px] flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                            <span>PLAY</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="text-gray-500 text-[10px]">Tap for info</span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default GamePickerSheet;
