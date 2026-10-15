import React, { useState } from 'react';
import { useWhotStore } from '../store/useWhotStore';
import { HouseRulesPanel } from './HouseRulesPanel';
import { Avatar } from './Avatar';
import { DEFAULT_RULESET } from '@gbedu/whot-engine';
import { PresetName } from '@gbedu/shared';
import {
  Users,
  Copy,
  Check,
  Share2,
  Crown,
  Play,
  LogOut,
  AlertCircle,
  Sparkles,
  UserCheck,
  UserX,
  Bot,
  Plus,
} from 'lucide-react';

export const LobbyScreen: React.FC = () => {
  const {
    user,
    currentRoom,
    leaveRoom,
    toggleReady,
    kickPlayer,
    addBotPlayer,
    startGame,
    updateRules,
    applyPreset,
    resetRules,
  } = useWhotStore();

  const [copied, setCopied] = useState(false);

  if (!currentRoom || !user) return null;

  const isHost = currentRoom.hostId === user.id;
  const me = currentRoom.players.find((p) => p.userId === user.id);
  const isReady = me?.isReady || false;

  const canStart =
    isHost &&
    currentRoom.players.length >= 2 &&
    currentRoom.players.every((p) => p.isReady);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentRoom.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `Join my live Naija Whot match on Gbedu Games! Room Code: ${currentRoom.code}`
  )}`;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-4 space-y-6">
      {/* Top Room Banner with Share Code & WhatsApp Link */}
      <div className="bg-[#121826] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-extrabold text-amber-400 tracking-wider">
              Naija Whot Match Lobby
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {currentRoom.players.length} / {currentRoom.maxPlayers} Players
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black font-display text-white mt-1">
            Game Room
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Share this room code with friends to join the match!
          </p>
        </div>

        {/* Big Room Code Box */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-black/50 border-2 border-amber-400/40 shadow-inner">
            <div className="text-left">
              <p className="text-[10px] uppercase font-bold text-gray-400">ROOM CODE</p>
              <p className="text-3xl font-black tracking-widest text-amber-400 font-display">
                {currentRoom.code}
              </p>
            </div>
            <button
              onClick={handleCopyCode}
              className="p-2.5 rounded-xl bg-amber-500 text-black hover:bg-amber-400 transition-colors cursor-pointer"
              title="Copy Room Code"
            >
              {copied ? <Check className="w-5 h-5 stroke-[3]" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>

          <a
            href={whatsappShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition-colors shadow-lg shadow-emerald-600/30 cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>Invite on WhatsApp</span>
          </a>
        </div>
      </div>

      {/* Players Slots List */}
      <div className="bg-[#0e1524] border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-extrabold text-white">Player Lineup (2-6)</h3>
          </div>
          <div className="flex items-center gap-3">
            {isHost && currentRoom.players.length < currentRoom.maxPlayers && (
              <button
                onClick={() => addBotPlayer()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all cursor-pointer"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>+ Add AI Opponent</span>
              </button>
            )}
            <span className="text-xs text-gray-400 font-medium">
              {currentRoom.players.length < 2
                ? 'Need at least 1 more player'
                : 'Ready to play!'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {currentRoom.players.map((p) => {
            const isMe = p.userId === user.id;
            return (
              <div
                key={p.userId}
                className={`p-4 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                  p.isHost
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-white/5 border-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <Avatar
                      avatarUrl={p.avatarUrl}
                      username={p.username}
                      size={44}
                      showAura={true}
                      interactive={false}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-extrabold text-white">{p.username}</span>
                      {p.isHost && (
                        <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      )}
                      {isMe && (
                        <span className="text-[10px] text-amber-400 font-bold">(You)</span>
                      )}
                      {p.userId.startsWith('bot_') && (
                        <span className="text-[10px] text-cyan-400 font-bold px-1 rounded bg-cyan-500/10 border border-cyan-500/20">
                          AI
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                          p.isReady
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-gray-700/40 text-gray-400'
                        }`}
                      >
                        {p.isReady ? 'Ready' : 'Not Ready'}
                      </span>
                    </div>
                  </div>
                </div>

                {isHost && !p.isHost && (
                  <button
                    onClick={() => kickPlayer(p.userId)}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Remove player"
                  >
                    <UserX className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}

          {/* Empty Slots */}
          {Array.from({ length: currentRoom.maxPlayers - currentRoom.players.length }).map((_, idx) => (
            isHost && idx === 0 ? (
              <button
                key={idx}
                onClick={() => addBotPlayer()}
                className="p-4 rounded-2xl border border-dashed border-amber-500/40 hover:border-amber-400 bg-amber-500/5 hover:bg-amber-500/10 flex items-center justify-center gap-2 text-xs font-bold text-amber-300 transition-all cursor-pointer group"
              >
                <Bot className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                <span>+ Add AI Opponent</span>
              </button>
            ) : (
              <div
                key={idx}
                className="p-4 rounded-2xl border border-dashed border-white/10 flex items-center justify-center text-xs font-semibold text-gray-500"
              >
                + Waiting for player...
              </div>
            )
          ))}
        </div>

        {/* Action Buttons: Ready / Start / Leave */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-white/10">
          <button
            onClick={leaveRoom}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-gray-400 hover:text-rose-300 text-xs font-bold transition-colors cursor-pointer w-full sm:w-auto justify-center"
          >
            <LogOut className="w-4 h-4" />
            <span>Leave Lobby</span>
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {!isHost && (
              <button
                onClick={toggleReady}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs sm:text-sm transition-all cursor-pointer shadow-md ${
                  isReady
                    ? 'bg-emerald-500 text-black shadow-emerald-500/20'
                    : 'bg-white/15 text-white hover:bg-white/20'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>{isReady ? 'READY TO PLAY!' : 'CLICK TO BE READY'}</span>
              </button>
            )}

            {isHost && (
              <button
                onClick={startGame}
                disabled={!canStart}
                className={`flex items-center gap-2.5 px-8 py-3.5 rounded-2xl font-black text-sm transition-all cursor-pointer shadow-xl ${
                  canStart
                    ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 text-black hover:scale-105 active:scale-95 shadow-amber-500/30'
                    : 'bg-white/10 text-gray-500 cursor-not-allowed border border-white/5'
                }`}
              >
                <Play className="w-4 h-4 fill-current" />
                <span>START WHOT GAME</span>
              </button>
            )}
          </div>
        </div>

        {isHost && !canStart && (
          <p className="text-[11px] text-amber-400/90 text-right">
            {currentRoom.players.length < 2
              ? 'At least 2 players are required to start.'
              : 'All players must click Ready before the host can start.'}
          </p>
        )}
      </div>

      {/* House Rules Configuration Panel */}
      <HouseRulesPanel
        ruleset={currentRoom.ruleset || DEFAULT_RULESET}
        preset={(currentRoom.preset as PresetName) || 'naija_classic'}
        isHost={isHost}
        onUpdateRules={updateRules}
        onApplyPreset={applyPreset}
        onResetRules={resetRules}
      />
    </div>
  );
};
