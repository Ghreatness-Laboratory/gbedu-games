import React, { useState, useEffect } from 'react';
import { useWhotStore } from '../store/useWhotStore';
import { WhotCard } from './WhotCard';
import { Shape } from '@gbedu/shared';
import {
  Volume2,
  VolumeX,
  MessageSquare,
  Send,
  X,
  Trophy,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Radio,
  ArrowRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const GameBoard: React.FC = () => {
  const {
    user,
    currentRoom,
    gameView,
    playCard,
    drawCard,
    leaveRoom,
    sendChatMessage,
    chatMessages,
    unreadChatCount,
    resetChatUnread,
    isMuted,
    toggleMute,
    isConnected,
  } = useWhotStore();

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [calledLastCard, setCalledLastCard] = useState<boolean>(false);
  const [calledCheckUp, setCalledCheckUp] = useState<boolean>(false);
  const [showShapePicker, setShowShapePicker] = useState<boolean>(false);
  const [pendingWhotCardId, setPendingWhotCardId] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [chatInput, setChatInput] = useState<string>('');

  // Fire celebratory confetti when game completes and we win or game ends
  useEffect(() => {
    if (gameView?.isGameOver) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.5 },
      });
    }
  }, [gameView?.isGameOver]);

  if (!gameView || !user) {
    return null;
  }

  const isMyTurn = gameView.activeUserId === user.id && !gameView.isGameOver;
  const myHand = gameView.myHand;
  const legalIds = gameView.legalCardIds;
  const topDiscard = gameView.topDiscard;
  const activeShape = gameView.activeShape;

  const handleCardClick = (cardId: string) => {
    if (!isMyTurn) return;
    if (!legalIds.includes(cardId)) return;

    if (selectedCardId === cardId) {
      // Tap again to play!
      attemptPlayCard(cardId);
    } else {
      setSelectedCardId(cardId);
    }
  };

  const attemptPlayCard = (cardId: string) => {
    const card = myHand.find((c) => c.id === cardId);
    if (!card) return;

    // Check if card is Whot 20 and specials are enabled -> prompt shape picker!
    if (card.number === 20 && gameView.ruleset.specials.whot) {
      setPendingWhotCardId(cardId);
      setShowShapePicker(true);
      return;
    }

    playCard(cardId, undefined, calledLastCard, calledCheckUp);
    setSelectedCardId(null);
    setCalledLastCard(false);
    setCalledCheckUp(false);
  };

  const handleSelectShape = (shape: Shape) => {
    if (!pendingWhotCardId) return;
    playCard(pendingWhotCardId, shape, calledLastCard, calledCheckUp);
    setShowShapePicker(false);
    setPendingWhotCardId(null);
    setSelectedCardId(null);
    setCalledLastCard(false);
    setCalledCheckUp(false);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendChatMessage(chatInput);
    setChatInput('');
  };

  const getShapeColor = (shape: Shape) => {
    switch (shape) {
      case 'circle': return 'text-red-500 bg-red-500/10 border-red-500/30';
      case 'triangle': return 'text-blue-500 bg-blue-500/10 border-blue-500/30';
      case 'cross': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
      case 'square': return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
      case 'star': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      default: return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
    }
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto h-[calc(100vh-80px)] flex flex-col justify-between overflow-hidden px-2 sm:px-4 py-2 select-none">
      {/* 1. Header Bar: Room Code, Sound Toggle, Connection status, Chat button */}
      <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 z-20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30">
            <span className="text-[10px] uppercase font-bold text-gray-400">ROOM:</span>
            <span className="text-xs font-black font-mono text-amber-400 tracking-wider">
              {currentRoom?.code || 'WHOT'}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-bold text-gray-400">
            <Radio className={`w-3.5 h-3.5 ${isConnected ? 'text-emerald-400 animate-pulse' : 'text-rose-400'}`} />
            <span className="hidden sm:inline">{isConnected ? 'Connected' : 'Reconnecting...'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 transition-colors cursor-pointer"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          <button
            onClick={() => {
              setIsChatOpen(!isChatOpen);
              resetChatUnread();
            }}
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-300 transition-colors cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Chat</span>
            {unreadChatCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center animate-bounce">
                {unreadChatCount}
              </span>
            )}
          </button>

          <button
            onClick={leaveRoom}
            className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-gray-400 hover:text-rose-300 text-xs font-bold transition-colors cursor-pointer"
          >
            Exit
          </button>
        </div>
      </div>

      {/* 2. Opponents Row / Arc */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 py-1 overflow-x-auto scrollbar-none z-10 shrink-0">
        {gameView.opponents.map((opp) => {
          const isActive = gameView.activeUserId === opp.userId;
          return (
            <div
              key={opp.userId}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border transition-all ${
                isActive
                  ? 'bg-amber-500/25 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)] scale-105'
                  : 'bg-black/40 border-white/10'
              } ${!opp.isConnected ? 'opacity-50 grayscale' : ''}`}
            >
              <div className="relative">
                <span className="text-xl">{opp.avatarUrl}</span>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-black ${
                    opp.isConnected ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                />
              </div>

              <div className="text-left">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-extrabold text-white max-w-[80px] sm:max-w-[100px] truncate">
                    {opp.username}
                  </span>
                  {opp.hasCalledLastCard && (
                    <span className="text-[9px] font-black px-1 rounded bg-rose-500 text-white animate-pulse">
                      LAST!
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-black text-amber-400 font-display">
                    {opp.cardCount} cards
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Felt Table with Discard Pile, Draw Pile & Active Shape */}
      <div className="relative flex-1 my-2 rounded-3xl bg-radial from-[#12633e] via-[#0f5132] to-[#093520] border-4 border-amber-500/30 shadow-[inset_0_0_50px_rgba(0,0,0,0.6)] flex flex-col items-center justify-center p-4 overflow-hidden">
        {/* Special Action Banner */}
        {gameView.pendingPickCount > 0 && (
          <div className="absolute top-3 px-4 py-1.5 rounded-xl bg-rose-600 text-white font-black text-xs sm:text-sm tracking-wider uppercase animate-bounce shadow-xl shadow-rose-600/40 z-20 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>
              {gameView.pendingPickType === 'pick_two' ? 'PICK TWO STACK' : 'PICK THREE STACK'}: +{gameView.pendingPickCount} CARDS!
            </span>
          </div>
        )}

        {/* Center Cards: Draw Pile & Discard Pile */}
        <div className="flex items-center justify-center gap-4 sm:gap-8 my-auto z-10">
          {/* Draw Pile (Market) */}
          <div className="flex flex-col items-center">
            <div
              onClick={() => {
                if (isMyTurn && gameView.canDraw) {
                  drawCard();
                }
              }}
              className={`relative cursor-pointer transition-transform ${
                isMyTurn && gameView.canDraw
                  ? 'hover:scale-105 active:scale-95 ring-4 ring-emerald-400 rounded-xl'
                  : 'opacity-90'
              }`}
            >
              <WhotCard isBack size="lg" />
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-white text-[10px] font-mono font-black">
                {gameView.drawPileCount}
              </div>
            </div>
            <span className="text-[10px] uppercase font-extrabold text-amber-300 mt-1 tracking-wider">
              MARKET (DRAW)
            </span>
          </div>

          {/* Discard Pile */}
          <div className="flex flex-col items-center">
            {topDiscard ? (
              <div className="relative">
                <WhotCard card={topDiscard} size="lg" />
              </div>
            ) : (
              <div className="w-24 sm:w-28 h-36 sm:h-40 rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center text-xs text-gray-400">
                Empty
              </div>
            )}
            <span className="text-[10px] uppercase font-extrabold text-gray-300 mt-1 tracking-wider">
              TOP CARD
            </span>
          </div>

          {/* Active Shape Badge (Crucial for Whot 20 wild choices) */}
          <div className="flex flex-col items-center">
            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 flex flex-col items-center justify-center shadow-lg ${getShapeColor(activeShape)}`}>
              <span className="text-xl sm:text-2xl capitalize">
                {activeShape === 'circle' && '⭕'}
                {activeShape === 'triangle' && '🔺'}
                {activeShape === 'cross' && '➕'}
                {activeShape === 'square' && '⬛'}
                {activeShape === 'star' && '⭐'}
                {activeShape === 'whot' && '👑'}
              </span>
              <span className="text-[9px] font-black uppercase mt-0.5 tracking-tight font-display">
                {activeShape}
              </span>
            </div>
            <span className="text-[10px] uppercase font-extrabold text-amber-300 mt-1 tracking-wider">
              ACTIVE
            </span>
          </div>
        </div>

        {/* Action / Turn Prompt Banner */}
        <div className="w-full text-center z-10 mt-auto pt-2">
          <p className="text-xs sm:text-sm font-extrabold text-white drop-shadow">
            {isMyTurn ? (
              <span className="text-amber-400 font-display">
                👉 YOUR TURN: Play a {activeShape.toUpperCase()} or {topDiscard?.number}
              </span>
            ) : (
              <span className="text-gray-300">
                Waiting for {gameView.opponents.find((o) => o.userId === gameView.activeUserId)?.username || 'opponent'}...
              </span>
            )}
          </p>
          {gameView.lastActionMessage && (
            <p className="text-[11px] text-emerald-300 mt-0.5 opacity-90 truncate max-w-md mx-auto">
              {gameView.lastActionMessage}
            </p>
          )}
        </div>
      </div>

      {/* 4. Action Controls: Callouts & Play Button */}
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 z-20 shrink-0">
        <div className="flex items-center gap-2">
          {/* Callout: Last Card */}
          {(gameView.mustCallLastCard || myHand.length <= 2) && (
            <button
              onClick={() => setCalledLastCard(!calledLastCard)}
              className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer border ${
                calledLastCard
                  ? 'bg-rose-500 text-white border-rose-300 shadow-lg shadow-rose-500/40 animate-pulse'
                  : 'bg-white/10 hover:bg-white/15 text-rose-300 border-rose-500/30'
              }`}
            >
              LAST CARD! {calledLastCard ? '✓' : ''}
            </button>
          )}

          {/* Callout: Check Up */}
          {(gameView.mustCallCheckUp || myHand.length === 1) && (
            <button
              onClick={() => setCalledCheckUp(!calledCheckUp)}
              className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer border ${
                calledCheckUp
                  ? 'bg-amber-500 text-black border-amber-300 shadow-lg shadow-amber-500/40 animate-pulse'
                  : 'bg-white/10 hover:bg-white/15 text-amber-300 border-amber-500/30'
              }`}
            >
              CHECK UP! 🏆 {calledCheckUp ? '✓' : ''}
            </button>
          )}
        </div>

        {/* Action: Play Selected Card or Draw */}
        <div className="flex items-center gap-2">
          {selectedCardId && (
            <button
              onClick={() => attemptPlayCard(selectedCardId)}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-amber-500 text-black font-black text-xs sm:text-sm hover:scale-105 active:scale-95 transition-all shadow-lg shadow-emerald-500/30 cursor-pointer"
            >
              <span>PLAY CARD</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {isMyTurn && gameView.canDraw && (
            <button
              onClick={drawCard}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/20 transition-colors cursor-pointer"
            >
              Draw Card
            </button>
          )}
        </div>
      </div>

      {/* 5. Player's Fanned Hand (Fixed at bottom) */}
      <div className="w-full pb-1 z-20 shrink-0">
        <div className="flex items-end justify-start sm:justify-center gap-1 sm:gap-2 overflow-x-auto py-2 px-2 scrollbar-none min-h-[110px] sm:min-h-[130px]">
          {myHand.map((card) => {
            const isPlayable = isMyTurn && legalIds.includes(card.id);
            const isSelected = selectedCardId === card.id;

            return (
              <WhotCard
                key={card.id}
                card={card}
                isPlayable={isPlayable}
                isSelected={isSelected}
                onClick={() => handleCardClick(card.id)}
                size="md"
              />
            );
          })}
        </div>
      </div>

      {/* Whot 20 Shape Picker Modal */}
      {showShapePicker && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#0e1626] border-2 border-amber-500/50 rounded-3xl p-6 text-center shadow-2xl space-y-4 animate-scale-up">
            <h3 className="text-xl font-black font-display text-white">
              Choose Whot Shape! 👑
            </h3>
            <p className="text-xs text-gray-300">
              Pick the required shape that next players must follow:
            </p>

            <div className="grid grid-cols-5 gap-2 pt-2">
              {(
                [
                  { id: 'circle', label: 'Circle', icon: '⭕', color: 'border-red-500 hover:bg-red-500/20' },
                  { id: 'triangle', label: 'Triangle', icon: '🔺', color: 'border-blue-500 hover:bg-blue-500/20' },
                  { id: 'cross', label: 'Cross', icon: '➕', color: 'border-emerald-500 hover:bg-emerald-500/20' },
                  { id: 'square', label: 'Square', icon: '⬛', color: 'border-amber-500 hover:bg-amber-500/20' },
                  { id: 'star', label: 'Star', icon: '⭐', color: 'border-yellow-500 hover:bg-yellow-500/20' },
                ] as const
              ).map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSelectShape(s.id)}
                  className={`w-16 h-16 rounded-2xl border-2 flex flex-col items-center justify-center transition-all cursor-pointer ${s.color}`}
                >
                  <span className="text-2xl">{s.icon}</span>
                  <span className="text-[9px] font-black uppercase mt-1 text-white">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Game Over Victory Screen */}
      {gameView.isGameOver && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#121927] border-2 border-amber-500/50 rounded-3xl p-6 text-center shadow-2xl space-y-5 animate-scale-up">
            <div className="w-20 h-20 rounded-2xl bg-amber-500/20 border-2 border-amber-500/50 flex items-center justify-center text-4xl mx-auto shadow-xl shadow-amber-500/30">
              🏆
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-black font-display text-white">
                CHECK UP! Game Finished!
              </h2>
              <p className="text-sm font-extrabold text-amber-400 mt-1">
                Winner: {gameView.winnerUserId === user.id ? 'You are the Champion! (Odogwu)' : 'Well Played!'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-left space-y-2">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Final Standings</p>
              <div className="space-y-1.5">
                {gameView.opponents.concat([{
                  userId: user.id,
                  username: user.username,
                  displayName: user.displayName,
                  avatarUrl: user.avatarUrl,
                  cardCount: myHand.length,
                  seatIndex: gameView.mySeatIndex,
                  isConnected: true,
                  hasCalledLastCard: false,
                }]).sort((a, b) => a.cardCount - b.cardCount).map((p, idx) => (
                  <div key={p.userId} className="flex items-center justify-between text-xs py-1 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-400">{idx + 1}.</span>
                      <span>{p.avatarUrl}</span>
                      <span className="font-bold text-white">{p.username}</span>
                    </div>
                    <span className="font-mono text-amber-400">{p.cardCount} cards left</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={leaveRoom}
                className="px-6 py-3 rounded-xl bg-amber-500 text-black font-black text-sm hover:bg-amber-400 transition-colors cursor-pointer"
              >
                Back to Lobby / Rooms
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide-up Chat Drawer (Mobile) or Side Panel (Desktop) */}
      {isChatOpen && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-80 bg-[#0e1626] border-l border-white/10 z-50 flex flex-col shadow-2xl">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-cyan-400" />
              <h4 className="text-sm font-extrabold text-white">Room Chat</h4>
            </div>
            <button
              onClick={() => setIsChatOpen(false)}
              className="p-1 rounded-lg text-gray-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {chatMessages.length === 0 ? (
              <p className="text-xs text-gray-500 text-center my-auto">No messages yet. Say hello!</p>
            ) : (
              chatMessages.map((msg) => (
                <div key={msg.id} className="text-xs">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span>{msg.avatarUrl}</span>
                    <span className="font-bold text-amber-400">{msg.senderName}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-gray-200">
                    {msg.text}
                  </div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSendChat} className="p-3 border-t border-white/10 flex gap-2">
            <input
              type="text"
              placeholder="Send hype message..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              className="p-2 bg-amber-500 text-black rounded-xl hover:bg-amber-400 transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
