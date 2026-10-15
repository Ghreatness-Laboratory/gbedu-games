import React, { useState } from 'react';
import { PlayerProfile } from '../types';
import { X, Check, Sparkles, User } from 'lucide-react';
import { soundEngine } from '../audio/audioEngine';

interface ProfileModalProps {
  player: PlayerProfile;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: Partial<PlayerProfile>) => void;
}

const AVATARS = ['👑', '🪘', '🕶️', '💃', '🧢', '🦁', '🥁', '🌟'];
const TITLES = [
  'Odogwu',
  'President of Enjoyment',
  'Amapiano Queen',
  'Log Drum Maestro',
  'Groove Minister',
  'Street Ambassador',
  'Shrine Elder'
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  player,
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(player.name);
  const [selectedAvatar, setSelectedAvatar] = useState(player.avatar);
  const [selectedTitle, setSelectedTitle] = useState(player.title);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    soundEngine.playAgogo(true);
    onSave({
      name: name.trim() || 'Gbedu Player',
      avatar: selectedAvatar,
      title: selectedTitle,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#121927] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-5 animate-scale-up">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-black font-display text-white">Player Identity</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Select Your Avatar
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
                  className={`h-12 rounded-2xl text-2xl flex items-center justify-center transition-all cursor-pointer ${
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

          {/* Nickname Input */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Player Nickname
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              className="w-full bg-black/40 border border-white/15 rounded-xl px-4 py-2.5 text-white font-bold text-sm focus:outline-none focus:border-amber-400 transition-colors"
              placeholder="e.g. Starboy, FragChamp, Odogwu..."
            />
          </div>

          {/* Title Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Honorary African Title
            </label>
            <select
              value={selectedTitle}
              onChange={(e) => setSelectedTitle(e.target.value)}
              className="w-full bg-[#0a0f18] border border-white/15 rounded-xl px-4 py-2.5 text-white font-bold text-sm focus:outline-none focus:border-amber-400"
            >
              {TITLES.map((t) => (
                <option key={t} value={t} className="bg-[#0a0f18] text-white">
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Save Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 text-black font-extrabold text-sm hover:scale-[1.02] active:scale-98 transition-all shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>SAVE PROFILE</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
