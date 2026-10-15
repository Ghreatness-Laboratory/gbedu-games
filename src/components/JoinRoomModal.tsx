import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Hash, Users, Sparkles } from 'lucide-react';
import { soundEngine } from '../audio/audioEngine';
import { useWhotStore } from '../store/useWhotStore';
import { useNavigate } from 'react-router-dom';

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGamePrompt?: () => void;
}

export const JoinRoomModal: React.FC<JoinRoomModalProps> = ({
  isOpen,
  onClose,
  onSelectGamePrompt,
}) => {
  const { joinRoom } = useWhotStore();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean.length < 3) {
      setError('Enter a valid 4-letter room code');
      soundEngine.playWrongSound();
      return;
    }

    setIsJoining(true);
    setError(null);
    soundEngine.playAgogo(true);

    try {
      const ok = await joinRoom(clean);
      if (ok) {
        onClose();
        navigate(`/game/whot`);
      } else {
        setError('Room not found or game already finished');
        soundEngine.playWrongSound();
      }
    } catch {
      setError('Failed to join room');
      soundEngine.playWrongSound();
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Join Room"
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm cursor-pointer"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-sm bg-[#141d33] border border-[#26314d] rounded-3xl p-6 shadow-2xl z-10 text-white"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#26314d]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#ff7a00]/15 text-[#ff7a00] flex items-center justify-center font-black">
                  <Hash className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black font-display text-white">Join Game Room</h3>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">
                  Enter 4-Letter Room Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. K7Q2"
                  maxLength={6}
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    setError(null);
                  }}
                  autoFocus
                  className="w-full h-12 bg-[#0d1426] border border-[#26314d] rounded-2xl px-4 text-center font-mono font-black text-xl text-[#ffb703] tracking-widest focus:outline-none focus:border-[#ff7a00]"
                />
              </div>

              {error && (
                <p className="text-xs text-rose-400 font-bold text-center bg-rose-500/10 py-1.5 px-2 rounded-xl border border-rose-500/20">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isJoining || !code.trim()}
                className="w-full h-12 rounded-2xl bg-[#ff7a00] hover:bg-[#ff8800] active:scale-98 text-black font-display font-black text-sm tracking-wide transition-all shadow-lg shadow-[#ff7a00]/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{isJoining ? 'JOINING ROOM...' : 'JOIN ROOM'}</span>
              </button>

              {onSelectGamePrompt && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSelectGamePrompt();
                    }}
                    className="text-xs text-[#ffb703] hover:underline font-bold"
                  >
                    Want to create a room instead? Select a game →
                  </button>
                </div>
              )}
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
