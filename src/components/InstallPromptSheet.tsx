import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share, PlusSquare, CheckCircle, X, Download } from 'lucide-react';

interface InstallPromptSheetProps {
  isOpen: boolean;
  onClose: () => void;
  isIOS?: boolean;
}

export const InstallPromptSheet: React.FC<InstallPromptSheetProps> = ({
  isOpen,
  onClose,
  isIOS = true,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-sheet-title"
          className="fixed inset-0 z-50 flex items-end justify-center overscroll-contain"
        >
          {/* Dimmed backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Sheet Modal */}
          <motion.div
            initial={{ y: '100%', opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.8 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="relative w-full max-w-md bg-[#141d33] border-t border-[#26314d] rounded-t-3xl p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl text-white z-10"
          >
            {/* Grab handle */}
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />

            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#ff7a00]/15 border border-[#ff7a00]/30 flex items-center justify-center text-[#ff7a00]">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="install-sheet-title" className="text-base font-black tracking-tight text-white">
                    Install Gbedu Games
                  </h3>
                  <p className="text-xs text-gray-400">Play full-screen with offline party support</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Instruction Steps */}
            <div className="space-y-3 bg-[#0d1426] border border-[#26314d] rounded-2xl p-4 mb-5">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#ff7a00]/20 text-[#ff7a00] font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                  1
                </div>
                <div className="flex-1 text-xs text-gray-300">
                  Tap the <strong className="text-white">Share</strong> button in your {isIOS ? 'Safari' : 'browser'} toolbar.
                  <div className="inline-flex items-center gap-1 ml-1 px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">
                    <Share className="w-3 h-3 inline" /> Share
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#ff7a00]/20 text-[#ff7a00] font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                  2
                </div>
                <div className="flex-1 text-xs text-gray-300">
                  Scroll down the options list and select <strong className="text-white">Add to Home Screen</strong>.
                  <div className="inline-flex items-center gap-1 ml-1 px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">
                    <PlusSquare className="w-3 h-3 inline" /> Add to Home Screen
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#ff7a00]/20 text-[#ff7a00] font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                  3
                </div>
                <div className="flex-1 text-xs text-gray-300">
                  Tap <strong className="text-white">Add</strong> in the top-right corner to complete installation.
                  <div className="inline-flex items-center gap-1 ml-1 px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">
                    <CheckCircle className="w-3 h-3 text-[#1fd1a0] inline" /> Add
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#ff7a00] to-[#ff9e00] text-black font-extrabold text-sm shadow-lg shadow-[#ff7a00]/20 hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer"
            >
              Got It
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
