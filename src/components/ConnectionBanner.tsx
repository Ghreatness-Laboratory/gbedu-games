import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { syncPendingMatches } from '../lib/offlineSync';

export const ConnectionBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [showReconnected, setShowReconnected] = useState(false);
  const [swUpdateAvailable, setSwUpdateAvailable] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      // Auto-dismiss reconnected notification after 3.2s
      timer = setTimeout(() => {
        setShowReconnected(false);
      }, 3200);

      // Trigger offline matches sync
      syncPendingMatches();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for Service Worker updates if registered
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (!reg) return;
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setSwUpdateAvailable(true);
              }
            });
          }
        });
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <>
      {/* 1. Offline & Reconnected Status Pill */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            role="status"
            aria-live="polite"
            className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-[#141d33]/95 backdrop-blur-md border border-amber-500/40 text-amber-300 px-3.5 py-1.5 rounded-full shadow-2xl flex items-center gap-2 text-xs font-bold"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            <span>Offline Mode — Cached data active</span>
          </motion.div>
        )}

        {isOnline && showReconnected && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            role="status"
            aria-live="polite"
            className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-[#141d33]/95 backdrop-blur-md border border-[#1fd1a0]/50 text-[#1fd1a0] px-3.5 py-1.5 rounded-full shadow-2xl flex items-center gap-2 text-xs font-bold"
          >
            <span className="w-2 h-2 rounded-full bg-[#1fd1a0] animate-ping" />
            <Wifi className="w-3.5 h-3.5 text-[#1fd1a0]" />
            <span>Back online • Synced</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. PWA Update Available Prompt */}
      <AnimatePresence>
        {swUpdateAvailable && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 z-50 max-w-sm bg-[#141d33] border-2 border-[#ff7a00] rounded-2xl p-3.5 shadow-2xl flex items-center justify-between gap-3 text-white"
          >
            <div className="flex items-center gap-2.5">
              <RefreshCw className="w-4 h-4 text-[#ff7a00] animate-spin" />
              <div>
                <p className="text-xs font-black">Update available</p>
                <p className="text-[11px] text-gray-300">Tap refresh to load new features</p>
              </div>
            </div>
            <button
              onClick={handleReload}
              className="px-3 py-1.5 rounded-xl bg-[#ff7a00] text-black font-extrabold text-xs cursor-pointer hover:bg-[#ff8800] transition-colors"
            >
              Refresh
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ConnectionBanner;
