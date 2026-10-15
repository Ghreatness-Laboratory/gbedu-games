import React, { useState, useEffect } from 'react';
import { PlayerProfile } from '../types';
import { X, Check, Sparkles, User } from 'lucide-react';
import { soundEngine } from '../audio/audioEngine';
import { AvatarPicker } from './AvatarPicker';
import { AvatarConfig, parseAvatarConfig, DEFAULT_AVATAR_CONFIG } from '../data/avatarData';
import { useWhotStore } from '../store/useWhotStore';

interface ProfileModalProps {
  player: PlayerProfile;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (updated: Partial<PlayerProfile>) => void;
}

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
  const { updateProfile } = useWhotStore();

  const [name, setName] = useState(player.name);
  const [selectedPresetId, setSelectedPresetId] = useState(
    player.avatarId || (player.avatar?.startsWith('avatar-') ? player.avatar : 'avatar-01')
  );
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(
    player.avatarConfig || parseAvatarConfig(player.avatar || 'avatar-01')
  );
  const [selectedTitle, setSelectedTitle] = useState(player.title || 'Odogwu');
  const [isSaving, setIsSaving] = useState(false);

  // Lock scroll only while profile modal is open with guaranteed cleanup
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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    soundEngine.playAgogo(true);
    setIsSaving(true);

    const updatedData: Partial<PlayerProfile> = {
      name: name.trim() || 'Gbedu Player',
      avatar: selectedPresetId,
      avatarId: selectedPresetId,
      avatarConfig: avatarConfig,
      title: selectedTitle,
    };

    if (onSave) {
      onSave(updatedData);
    }

    // Persist to store and Supabase
    await updateProfile({
      displayName: name.trim() || undefined,
      avatarUrl: selectedPresetId,
      avatarId: selectedPresetId,
      avatarConfig: avatarConfig,
    });

    setIsSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain touch-scroller">
      <div className="w-full max-w-lg bg-gradient-to-b from-[#131b2e] via-[#0f1728] to-[#0b101c] border-2 border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 animate-scale-up my-auto max-h-[92vh] overflow-y-auto overscroll-contain touch-scroller">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black font-display text-white">Customize Player Identity</h3>
              <p className="text-[11px] text-gray-400">Edit your character, drip, and honorary title</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar Picker with Live Preview, 12 presets and Customizer */}
          <AvatarPicker
            selectedPresetId={selectedPresetId}
            currentConfig={avatarConfig}
            onChange={(presetId, nextConfig) => {
              setSelectedPresetId(presetId);
              setAvatarConfig(nextConfig);
            }}
            compact={true}
          />

          {/* Nickname Input */}
          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
              Player Nickname / Tag
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
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
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
              disabled={isSaving}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-sm uppercase tracking-wider transition-all shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{isSaving ? 'SAVING IDENTITY...' : 'SAVE & APPLY DRIP'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
