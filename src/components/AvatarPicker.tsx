import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar } from './Avatar';
import {
  AvatarConfig,
  AVATAR_PRESETS,
  SKIN_TONES,
  HAIR_STYLES,
  OUTFITS,
  ACCESSORIES,
  AURAS,
  getRandomAvatarConfig,
  getPresetById,
} from '../data/avatarData';
import { soundEngine } from '../audio/audioEngine';
import { Dices, Sliders, Check, Sparkles, ChevronRight, RefreshCw } from 'lucide-react';

interface AvatarPickerProps {
  selectedPresetId: string;
  currentConfig: AvatarConfig;
  onChange: (presetId: string, config: AvatarConfig) => void;
  title?: string;
  compact?: boolean;
}

type TabType = 'presets' | 'skin' | 'hair' | 'outfit' | 'accessory' | 'aura';

export const AvatarPicker: React.FC<AvatarPickerProps> = ({
  selectedPresetId,
  currentConfig,
  onChange,
  title = 'Pick Your Character',
  compact = false,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('presets');
  const [isSpinning, setIsSpinning] = useState(false);
  const [isHype, setIsHype] = useState(false);

  // Active preset metadata if matching
  const activePreset = AVATAR_PRESETS.find((p) => p.id === selectedPresetId);

  // 1. Shuffle Handler (Randomizes everything with spin and sound)
  const handleShuffle = () => {
    setIsSpinning(true);
    soundEngine.playDiceRoll();
    soundEngine.playTalkingDrum(true);

    // Pick a random preset or generate random mix
    const usePreset = Math.random() > 0.4;
    let nextPresetId = 'custom';
    let nextConfig: AvatarConfig;

    if (usePreset) {
      const randomPreset = AVATAR_PRESETS[Math.floor(Math.random() * AVATAR_PRESETS.length)];
      nextPresetId = randomPreset.id;
      nextConfig = { ...randomPreset.config };
    } else {
      nextConfig = getRandomAvatarConfig();
    }

    setTimeout(() => {
      onChange(nextPresetId, nextConfig);
      setIsSpinning(false);
      setIsHype(true);
      setTimeout(() => setIsHype(false), 400);
    }, 280);
  };

  const handleSelectPreset = (preset: typeof AVATAR_PRESETS[0]) => {
    soundEngine.playClick();
    onChange(preset.id, { ...preset.config });
    setIsHype(true);
    setTimeout(() => setIsHype(false), 300);
  };

  const handleUpdateConfig = <K extends keyof AvatarConfig>(key: K, value: AvatarConfig[K]) => {
    soundEngine.playShekere();
    const updated = { ...currentConfig, [key]: value };
    // Check if updated matches any preset
    const match = AVATAR_PRESETS.find(
      (p) =>
        p.config.skin === updated.skin &&
        p.config.hair === updated.hair &&
        p.config.outfit === updated.outfit &&
        p.config.accessory === updated.accessory &&
        p.config.aura === updated.aura
    );
    onChange(match ? match.id : 'custom', updated);
  };

  return (
    <div className="w-full space-y-4">
      {/* 1. Big Live Character Preview */}
      <div className="relative flex flex-col items-center justify-center p-4 rounded-3xl bg-gradient-to-b from-black/50 via-[#0e1628]/60 to-black/40 border-2 border-amber-500/30 overflow-hidden shadow-xl">
        {/* Ambient Aura Lighting Behind Live Preview */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-gradient-to-tr from-amber-500/20 via-pink-500/15 to-emerald-500/20 blur-2xl pointer-events-none" />

        {/* Live SVG Character */}
        <motion.div
          animate={isHype ? { scale: [1, 1.15, 1], rotate: [0, -3, 3, 0] } : {}}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="relative z-10 my-1 cursor-pointer"
          onClick={() => {
            soundEngine.playAgogo(true);
            setIsHype(true);
            setTimeout(() => setIsHype(false), 350);
          }}
          title="Tap to hype!"
        >
          <Avatar
            config={currentConfig}
            size={compact ? 130 : 170}
            interactive={true}
            showAura={true}
            className="drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)]"
          />
        </motion.div>

        {/* Tagline / Name Banner */}
        <div className="relative z-10 text-center mt-2 px-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 border border-white/15 text-xs font-black text-amber-300 tracking-wide font-display shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{activePreset ? activePreset.label : 'Custom Odogwu'}</span>
          </div>
          <p className="text-[11px] text-gray-300 mt-1 max-w-[280px] line-clamp-1">
            {activePreset ? activePreset.tagline : 'Crafted with authentic Nigerian drip'}
          </p>
        </div>

        {/* Quick Toolbar: Shuffle + Customize Toggle */}
        <div className="relative z-10 flex items-center gap-2 mt-3 w-full max-w-xs justify-center">
          <motion.button
            whileTap={{ scale: 0.94 }}
            type="button"
            onClick={handleShuffle}
            className="flex-1 min-h-[48px] px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer transition-all"
          >
            <motion.div
              animate={isSpinning ? { rotate: 360 } : { rotate: 0 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
            >
              <Dices className="w-4 h-4 stroke-[2.5]" />
            </motion.div>
            <span>Shuffle</span>
          </motion.button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setActiveTab((prev) => (prev === 'presets' ? 'skin' : 'presets'));
            }}
            className={`min-h-[48px] px-4 py-2.5 rounded-2xl border text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab !== 'presets'
                ? 'bg-amber-400/20 text-amber-300 border-amber-400 shadow-sm'
                : 'bg-white/10 text-white border-white/15 hover:bg-white/15'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>{activeTab === 'presets' ? 'Customize' : 'Done'}</span>
          </button>
        </div>
      </div>

      {/* 2. Mode Tabs: Presets Row VS Customizer Tabs */}
      {activeTab === 'presets' ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black uppercase tracking-wider text-gray-300 font-display">
              12 Character Presets
            </span>
            <span className="text-[10px] text-gray-400">Swipe to explore →</span>
          </div>

          {/* Swipeable Presets Row (Mobile First, tap targets >= 64px) */}
          <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 px-1 scrollbar-none snap-x snap-mandatory">
            {AVATAR_PRESETS.map((preset, index) => {
              const isSelected = selectedPresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`snap-center shrink-0 flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all cursor-pointer min-w-[76px] min-h-[96px] ${
                    isSelected
                      ? 'bg-amber-500/25 border-2 border-amber-400 scale-105 shadow-lg shadow-amber-500/30'
                      : 'bg-white/5 border border-white/10 opacity-75 hover:opacity-100 hover:scale-100'
                  }`}
                  style={{
                    animationDelay: `${index * 0.1}s`,
                  }}
                >
                  <div className="w-16 h-16 flex items-center justify-center relative">
                    <Avatar
                      config={preset.config}
                      size={58}
                      interactive={false}
                      showAura={isSelected}
                    />
                    {isSelected && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-black flex items-center justify-center text-[10px] font-black shadow-md">
                        ✓
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-extrabold text-white max-w-[70px] truncate text-center leading-tight">
                    {preset.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* 3. Deep Customizer Tabs */
        <div className="rounded-3xl bg-black/40 border border-white/15 p-3 space-y-3">
          {/* Sub Navigation Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {(
              [
                { id: 'skin', label: 'Skin' },
                { id: 'hair', label: 'Hair' },
                { id: 'outfit', label: 'Outfit' },
                { id: 'accessory', label: 'Accessory' },
                { id: 'aura', label: 'Aura Ring' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setActiveTab(t.id);
                }}
                className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === t.id
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black font-display shadow-md'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Options Palette for Active Tab (Touch Targets >= 48px) */}
          <div className="pt-1">
            {/* Skin Tone Selector */}
            {activeTab === 'skin' && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {SKIN_TONES.map((tone) => {
                  const isSelected = currentConfig.skin === tone.id;
                  return (
                    <button
                      key={tone.id}
                      type="button"
                      onClick={() => handleUpdateConfig('skin', tone.id as AvatarConfig['skin'])}
                      className={`min-h-[52px] p-2 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-amber-400 bg-amber-500/20 scale-105 shadow-md shadow-amber-500/20'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <span
                        className="w-6 h-6 rounded-full border border-white/20 shadow-inner"
                        style={{ backgroundColor: tone.fill }}
                      />
                      <span className="text-[10px] font-bold text-gray-200 text-center truncate max-w-full">
                        {tone.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Hair Style Selector */}
            {activeTab === 'hair' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {HAIR_STYLES.map((style) => {
                  const isSelected = currentConfig.hair === style.id;
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => handleUpdateConfig('hair', style.id as AvatarConfig['hair'])}
                      className={`min-h-[52px] p-2 rounded-2xl border flex items-center gap-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-amber-400 bg-amber-500/20 scale-102 shadow-md shadow-amber-500/20'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <span className="text-xl">{style.icon}</span>
                      <span className="text-xs font-bold text-gray-200 text-left leading-tight">
                        {style.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Outfit Selector */}
            {activeTab === 'outfit' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {OUTFITS.map((outfit) => {
                  const isSelected = currentConfig.outfit === outfit.id;
                  return (
                    <button
                      key={outfit.id}
                      type="button"
                      onClick={() => handleUpdateConfig('outfit', outfit.id as AvatarConfig['outfit'])}
                      className={`min-h-[52px] p-2.5 rounded-2xl border flex items-center justify-between gap-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-amber-400 bg-amber-500/20 shadow-md shadow-amber-500/20'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className="text-left">
                        <p className="text-xs font-extrabold text-white">{outfit.name}</p>
                        <p className="text-[10px] text-amber-300 font-medium">{outfit.tag}</p>
                      </div>
                      {isSelected && <span className="text-emerald-400 font-black">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Accessory Selector */}
            {activeTab === 'accessory' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ACCESSORIES.map((acc) => {
                  const isSelected = currentConfig.accessory === acc.id;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => handleUpdateConfig('accessory', acc.id as AvatarConfig['accessory'])}
                      className={`min-h-[52px] p-2 rounded-2xl border flex items-center gap-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-amber-400 bg-amber-500/20 shadow-md shadow-amber-500/20'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <span className="text-xl">{acc.icon}</span>
                      <span className="text-xs font-bold text-gray-200 truncate">{acc.name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Aura Ring Selector */}
            {activeTab === 'aura' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {AURAS.map((auraItem) => {
                  const isSelected = currentConfig.aura === auraItem.id;
                  return (
                    <button
                      key={auraItem.id}
                      type="button"
                      onClick={() => handleUpdateConfig('aura', auraItem.id as AvatarConfig['aura'])}
                      className={`min-h-[52px] p-2.5 rounded-2xl border flex items-center gap-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-amber-400 bg-amber-500/20 shadow-md'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <span
                        className="w-5 h-5 rounded-full border border-white/20 animate-pulse shrink-0"
                        style={{
                          background: `radial-gradient(circle, ${auraItem.color1} 0%, ${auraItem.color2} 100%)`,
                          boxShadow: `0 0 10px ${auraItem.color1}`,
                        }}
                      />
                      <span className="text-xs font-bold text-gray-200 truncate">{auraItem.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AvatarPicker;
