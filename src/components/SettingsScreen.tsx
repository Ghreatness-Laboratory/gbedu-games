import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWhotStore } from '../store/useWhotStore';
import { soundEngine } from '../audio/audioEngine';
import { Avatar } from './Avatar';
import {
  Volume2,
  VolumeX,
  Music,
  Bell,
  BellOff,
  User,
  LogOut,
  ArrowLeft,
  Sparkles,
  Shield,
  Flame,
  Check,
} from 'lucide-react';

interface SettingsScreenProps {
  onOpenProfile: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onOpenProfile }) => {
  const navigate = useNavigate();
  const { user, stats, isMuted, toggleMute, logout } = useWhotStore();

  const [bgmEnabled, setBgmEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const showSavedIndicator = (msg: string) => {
    setSavedMessage(msg);
    setTimeout(() => setSavedMessage(null), 2500);
  };

  const handleToggleSound = () => {
    toggleMute();
    if (isMuted) {
      setTimeout(() => soundEngine.playTalkingDrum(true), 100);
      showSavedIndicator('Sound unmuted');
    } else {
      showSavedIndicator('Sound muted');
    }
  };

  const handleToggleMusic = () => {
    setBgmEnabled((prev) => {
      const next = !prev;
      soundEngine.playClick();
      showSavedIndicator(next ? 'Background music enabled' : 'Background music disabled');
      return next;
    });
  };

  const handleToggleNotifications = () => {
    setNotificationsEnabled((prev) => {
      const next = !prev;
      soundEngine.playClick();
      showSavedIndicator(next ? 'Notifications enabled' : 'Notifications muted');
      return next;
    });
  };

  const handleLogout = async () => {
    soundEngine.playClick();
    await logout();
    navigate('/home');
  };

  return (
    <div className="flex-1 w-full max-w-2xl mx-auto px-4 py-4 space-y-6 animate-fade-in select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-[#26314d] pb-3">
        <button
          onClick={() => {
            soundEngine.playClick();
            navigate('/home');
          }}
          className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-white transition-colors cursor-pointer py-1.5 px-2 rounded-lg hover:bg-white/5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>
        <h1 className="text-base font-black uppercase tracking-wider text-white">App Settings</h1>
        <div className="w-16 flex justify-end">
          {savedMessage && (
            <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 animate-fade-in">
              <Check className="w-3 h-3" /> Saved
            </span>
          )}
        </div>
      </div>

      {/* 1. AUDIO & SOUND SECTION */}
      <div className="bg-[#141d33] border border-[#26314d] rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#ff7a00]">
          <Volume2 className="w-4 h-4" />
          <span>Sound & Music</span>
        </div>

        {/* Master Sound FX */}
        <div className="flex items-center justify-between py-2 border-b border-[#26314d]/60">
          <div>
            <div className="text-sm font-bold text-white">Sound Effects (SFX)</div>
            <div className="text-xs text-gray-400">Talking drums, agogo bells & game clicks</div>
          </div>
          <button
            onClick={handleToggleSound}
            className={`w-14 h-8 rounded-full p-1 transition-colors cursor-pointer flex items-center ${
              !isMuted ? 'bg-[#ff7a00] justify-end' : 'bg-[#26314d] justify-start'
            }`}
            aria-label={!isMuted ? 'Mute sound effects' : 'Unmute sound effects'}
          >
            <div className="w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center text-black">
              {!isMuted ? <Volume2 className="w-3.5 h-3.5 text-[#ff7a00]" /> : <VolumeX className="w-3.5 h-3.5 text-gray-500" />}
            </div>
          </button>
        </div>

        {/* Background Music */}
        <div className="flex items-center justify-between py-2">
          <div>
            <div className="text-sm font-bold text-white">Background Music (BGM)</div>
            <div className="text-xs text-gray-400">Amapiano log drum grooves & ambient rhythm</div>
          </div>
          <button
            onClick={handleToggleMusic}
            className={`w-14 h-8 rounded-full p-1 transition-colors cursor-pointer flex items-center ${
              bgmEnabled ? 'bg-[#1fd1a0] justify-end' : 'bg-[#26314d] justify-start'
            }`}
            aria-label={bgmEnabled ? 'Disable background music' : 'Enable background music'}
          >
            <div className="w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center text-black">
              <Music className={`w-3.5 h-3.5 ${bgmEnabled ? 'text-[#1fd1a0]' : 'text-gray-500'}`} />
            </div>
          </button>
        </div>
      </div>

      {/* 2. NOTIFICATIONS */}
      <div className="bg-[#141d33] border border-[#26314d] rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#ffb703]">
          <Bell className="w-4 h-4" />
          <span>Notifications</span>
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <div className="text-sm font-bold text-white">In-Game Alerts & Invites</div>
            <div className="text-xs text-gray-400">Room invitations, game results, & streaks</div>
          </div>
          <button
            onClick={handleToggleNotifications}
            className={`w-14 h-8 rounded-full p-1 transition-colors cursor-pointer flex items-center ${
              notificationsEnabled ? 'bg-[#ff7a00] justify-end' : 'bg-[#26314d] justify-start'
            }`}
            aria-label={notificationsEnabled ? 'Disable notifications' : 'Enable notifications'}
          >
            <div className="w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center text-black">
              {notificationsEnabled ? (
                <Bell className="w-3.5 h-3.5 text-[#ff7a00]" />
              ) : (
                <BellOff className="w-3.5 h-3.5 text-gray-500" />
              )}
            </div>
          </button>
        </div>
      </div>

      {/* 3. AVATAR & PROFILE */}
      {user && (
        <div className="bg-[#141d33] border border-[#26314d] rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-rose-400">
            <User className="w-4 h-4" />
            <span>Avatar & Profile</span>
          </div>

          <div className="flex items-center gap-4 bg-[#0d1426] border border-[#26314d] p-3.5 rounded-xl">
            <div className="shrink-0">
              <Avatar
                avatarUrl={user.avatarUrl}
                avatarId={user.avatarId}
                config={user.avatarConfig as any}
                size={52}
                showAura={true}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white truncate">
                  {user.displayName || user.username}
                </span>
                <span className="text-[10px] font-bold text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30">
                  {user.bio || 'Odogwu'}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-[#ff7a00]" />
                  Won: <strong className="text-white">{stats.gamesWon || 0}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                  Streak: <strong className="text-white">{stats.streak || 0}</strong>
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                soundEngine.playClick();
                onOpenProfile();
              }}
              className="px-3 py-2 rounded-xl bg-[#ff7a00]/15 border border-[#ff7a00]/40 text-[#ff7a00] hover:bg-[#ff7a00]/25 text-xs font-bold transition-all shrink-0 cursor-pointer"
            >
              Customize
            </button>
          </div>
        </div>
      )}

      {/* 4. ACCOUNT & LOGOUT */}
      <div className="bg-[#141d33] border border-[#26314d] rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-400">
          <Shield className="w-4 h-4" />
          <span>Account & Security</span>
        </div>

        <div className="text-xs text-gray-400">
          Signed in as <strong className="text-white font-mono">{user?.username || 'player'}</strong>
        </div>

        <button
          onClick={handleLogout}
          className="w-full py-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 active:scale-[0.99] transition-all text-xs font-black flex items-center justify-center gap-2 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out of Gbedu Games</span>
        </button>
      </div>
    </div>
  );
};
