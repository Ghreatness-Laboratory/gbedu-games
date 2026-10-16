import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  RotateCcw,
  Bot,
  Users,
  Settings,
  HelpCircle,
  Volume2,
  VolumeX,
  Sparkles,
  Trophy,
  Check,
  CheckCircle2,
  Zap,
  ArrowRight,
  RefreshCw,
  Clock,
  AlertTriangle,
  Play,
  Share2,
} from 'lucide-react';
import { soundEngine } from '../../audio/audioEngine';
import { useWhotStore } from '../../store/useWhotStore';
import { GameResultModal } from '../../components/GameResultModal';
import { saveMatchResult } from '../../lib/offlineSync';
import { Avatar } from '../../components/Avatar';
import { WhotCard } from '../../components/WhotCard';
import {
  JackpotCard,
  JackpotPlayer,
  JackpotSettings,
  JackpotWinCondition,
  JackpotPassDirection,
} from './types';
import {
  createJackpotDeck,
  shuffleJackpotDeck,
  checkWinningHand,
  getHandProgress,
  executeSimultaneousPass,
  validateJackpotCall,
  SHAPE_NAMES,
  SHAPE_SYMBOLS,
} from './engine';
import { JackpotBotBrain } from './ai';

interface JackpotGameProps {
  onBack: () => void;
}

const DEFAULT_SETTINGS: JackpotSettings = {
  bestOfRounds: 3,
  winCondition: 'match_set',
  allowWhotWilds: true,
  passTimerSeconds: 10,
  passDirection: 'left',
  playerCount: 4, // 3 to 6 players
};

const BOT_NAMES = ['Tobi', 'Emeka', 'Chi', 'Zainab', 'Kunle'];
const BOT_AVATARS = ['avatar-02', 'avatar-04', 'avatar-07', 'avatar-09', 'avatar-11'];

export const JackpotGame: React.FC<JackpotGameProps> = ({ onBack }) => {
  const { user, isMuted, toggleMute } = useWhotStore();
  const [searchParams] = useSearchParams();
  const roomCodeParam = searchParams.get('room') || '';

  // Mode & Match Settings
  const [mode, setMode] = useState<'ai' | 'pass' | 'online'>(roomCodeParam ? 'online' : 'ai');
  const [botDifficulty, setBotDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [settings, setSettings] = useState<JackpotSettings>(DEFAULT_SETTINGS);

  // Match State
  const [players, setPlayers] = useState<JackpotPlayer[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [currentStep, setCurrentStep] = useState(0);
  const [passTimer, setPassTimer] = useState(10);
  const [effectiveDirection, setEffectiveDirection] = useState<'left' | 'right'>('left');
  const [isPassingAnimation, setIsPassingAnimation] = useState(false);
  const [justReceivedCardId, setJustReceivedCardId] = useState<string | null>(null);

  // Jackpot Call & Banner State
  const [jackpotBanner, setJackpotBanner] = useState<{
    callerName: string;
    avatarId: string;
    isWin: boolean;
    text: string;
  } | null>(null);

  // Result Modal
  const [isResultOpen, setIsResultOpen] = useState(false);
  const [matchWinner, setMatchWinner] = useState<string | null>(null);

  // Modals & Sheets
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  // Bot brain instance ref (maintains card memory between passes)
  const botBrainsRef = useRef<Map<string, JackpotBotBrain>>(new Map());

  // 1. Initialize Players (3 to 6)
  const initPlayers = useCallback(() => {
    const list: JackpotPlayer[] = [];
    const myId = user?.id || 'player_1';
    const myName = user?.displayName || user?.username || 'Player 1';
    const myAvatar = user?.avatarId || 'avatar-01';

    // Player 1 (You)
    list.push({
      id: myId,
      userId: myId,
      displayName: myName,
      username: user?.username || 'player_1',
      avatarId: myAvatar,
      avatarUrl: user?.avatarUrl,
      isBot: false,
      isHost: true,
      seatIndex: 0,
      hand: [],
      cardCount: 5,
      hasLockedIn: false,
      selectedCardId: null,
      passedCard: null,
      receivedCard: null,
      score: 0,
      isSkipped: false,
      isConnected: true,
    });

    const otherCount = settings.playerCount - 1;

    for (let i = 0; i < otherCount; i++) {
      const isBotSeat = mode === 'ai';
      const seatId = isBotSeat ? `bot_${i + 1}` : `pass_p${i + 2}`;
      const seatName = isBotSeat
        ? `${BOT_NAMES[i % BOT_NAMES.length]} (AI)`
        : `Player ${i + 2}`;
      const seatAvatar = BOT_AVATARS[i % BOT_AVATARS.length];

      list.push({
        id: seatId,
        userId: seatId,
        displayName: seatName,
        username: seatName,
        avatarId: seatAvatar,
        isBot: isBotSeat,
        botDifficulty,
        isHost: false,
        seatIndex: i + 1,
        hand: [],
        cardCount: 5,
        hasLockedIn: false,
        selectedCardId: null,
        passedCard: null,
        receivedCard: null,
        score: 0,
        isSkipped: false,
        isConnected: true,
      });

      if (isBotSeat && !botBrainsRef.current.has(seatId)) {
        botBrainsRef.current.set(seatId, new JackpotBotBrain());
      }
    }

    setPlayers(list);
  }, [user, mode, settings.playerCount, botDifficulty]);

  // 2. Deal New Round Hands
  const dealRound = useCallback(() => {
    if (players.length === 0) return;

    soundEngine.playCardSlide();
    const freshDeck = shuffleJackpotDeck(createJackpotDeck(settings.allowWhotWilds));

    const updated = players.map((p, idx) => {
      const hand = freshDeck.slice(idx * 5, idx * 5 + 5);
      return {
        ...p,
        hand,
        cardCount: hand.length,
        hasLockedIn: false,
        selectedCardId: null,
        passedCard: null,
        receivedCard: null,
        isSkipped: false,
      };
    });

    setPlayers(updated);
    setPassTimer(settings.passTimerSeconds);
    setCurrentStep(0);
    setJackpotBanner(null);
    setJustReceivedCardId(null);

    // Initial pass direction
    setEffectiveDirection(settings.passDirection === 'right' ? 'right' : 'left');
  }, [players, settings.allowWhotWilds, settings.passTimerSeconds, settings.passDirection]);

  // Setup on mount / settings change
  useEffect(() => {
    initPlayers();
  }, [initPlayers]);

  useEffect(() => {
    if (players.length > 0 && players[0].hand.length === 0) {
      dealRound();
    }
  }, [players, dealRound]);

  // 3. Pass Step Countdown Timer & Last-3-Seconds Ticking
  useEffect(() => {
    if (players.length === 0 || isPassingAnimation || isResultOpen || jackpotBanner) return;

    const interval = setInterval(() => {
      setPassTimer((prev) => {
        if (prev <= 4 && prev > 1) {
          soundEngine.playTenseTick(false);
        } else if (prev === 1) {
          soundEngine.playTenseTick(true);
        }

        if (prev <= 1) {
          // Timer expired: execute simultaneous pass!
          triggerSimultaneousPass();
          return settings.passTimerSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [players.length, isPassingAnimation, isResultOpen, jackpotBanner, settings.passTimerSeconds]);

  // 4. Bot Decision Automation for Current Pass Step
  useEffect(() => {
    if (players.length === 0 || isPassingAnimation || isResultOpen || jackpotBanner) return;

    players.forEach((p) => {
      if (!p.isBot || p.hasLockedIn || p.isSkipped) return;

      const brain = botBrainsRef.current.get(p.id) || new JackpotBotBrain();
      botBrainsRef.current.set(p.id, brain);

      const decision = brain.decideCardToPass(
        p,
        settings.winCondition,
        settings.allowWhotWilds,
        p.botDifficulty || 'medium'
      );

      const timer = setTimeout(() => {
        setPlayers((prev) =>
          prev.map((item) => {
            if (item.id === p.id && !item.hasLockedIn) {
              return {
                ...item,
                selectedCardId: decision.cardToPass.id,
                hasLockedIn: true,
              };
            }
            return item;
          })
        );
      }, decision.delayMs);

      return () => clearTimeout(timer);
    });
  }, [players, currentStep, isPassingAnimation, isResultOpen, jackpotBanner, settings.winCondition, settings.allowWhotWilds]);

  // 5. Bot Jackpot Calling Automation
  useEffect(() => {
    if (players.length === 0 || isPassingAnimation || isResultOpen || jackpotBanner) return;

    players.forEach((p) => {
      if (!p.isBot || p.isSkipped) return;

      const check = checkWinningHand(p.hand, settings.winCondition, settings.allowWhotWilds);
      if (check.isWin) {
        const brain = botBrainsRef.current.get(p.id) || new JackpotBotBrain();
        const delay = brain.getJackpotCallReactionDelay(p.botDifficulty || 'medium');

        const callTimer = setTimeout(() => {
          handleCallJackpot(p.id);
        }, delay);

        return () => clearTimeout(callTimer);
      }
    });
  }, [players, isPassingAnimation, isResultOpen, jackpotBanner, settings.winCondition, settings.allowWhotWilds]);

  // 6. Check If All Players Have Locked In -> Fast-Forward Pass!
  useEffect(() => {
    if (players.length === 0 || isPassingAnimation || isResultOpen || jackpotBanner) return;

    const allLocked = players.every((p) => p.hasLockedIn || p.isSkipped);
    if (allLocked && players.length > 0) {
      const fastForward = setTimeout(() => {
        triggerSimultaneousPass();
      }, 350);
      return () => clearTimeout(fastForward);
    }
  }, [players, isPassingAnimation, isResultOpen, jackpotBanner]);

  // 7. Execute Simultaneous Pass
  const triggerSimultaneousPass = () => {
    if (isPassingAnimation) return;

    setIsPassingAnimation(true);
    soundEngine.playPassWhoosh();

    // Determine direction for this step
    let dir: 'left' | 'right' = effectiveDirection;
    if (settings.passDirection === 'alternate') {
      dir = currentStep % 2 === 0 ? 'left' : 'right';
      setEffectiveDirection(dir);
    }

    // Execute pass logic
    const { updatedPlayers, passedSummary } = executeSimultaneousPass(
      players,
      dir,
      settings.winCondition,
      settings.allowWhotWilds
    );

    // Record bot history for tracking
    passedSummary.forEach((ev) => {
      const recipientBrain = botBrainsRef.current.get(ev.toPlayerId);
      if (recipientBrain) {
        recipientBrain.recordReceivedCard(ev.card.shape);
      }
      const donorBrain = botBrainsRef.current.get(ev.fromPlayerId);
      if (donorBrain) {
        donorBrain.recordLeftNeighborDiscard(ev.card.shape);
      }
    });

    // Animate cards flying
    setTimeout(() => {
      setPlayers(updatedPlayers);
      setIsPassingAnimation(false);
      setPassTimer(settings.passTimerSeconds);
      setCurrentStep((s) => s + 1);

      // Highlight new card for local user
      const userPlayer = updatedPlayers.find((p) => p.id === (user?.id || 'player_1'));
      if (userPlayer?.receivedCard) {
        setJustReceivedCardId(userPlayer.receivedCard.id);
        setTimeout(() => setJustReceivedCardId(null), 2500);
      }
    }, 450);
  };

  // 8. Player Locks In Selected Card
  const handleLockInCard = () => {
    const userPlayer = players.find((p) => p.id === (user?.id || 'player_1'));
    if (!userPlayer || !userPlayer.selectedCardId || userPlayer.hasLockedIn) return;

    soundEngine.playLockIn();
    setPlayers((prev) =>
      prev.map((p) => (p.id === userPlayer.id ? { ...p, hasLockedIn: true } : p))
    );
  };

  // Select card to pass
  const handleSelectCard = (cardId: string) => {
    const userPlayer = players.find((p) => p.id === (user?.id || 'player_1'));
    if (!userPlayer || userPlayer.hasLockedIn || userPlayer.isSkipped) return;

    soundEngine.playCardSlide();
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === userPlayer.id
          ? { ...p, selectedCardId: p.selectedCardId === cardId ? null : cardId }
          : p
      )
    );
  };

  // 9. Call JACKPOT Action!
  const handleCallJackpot = (callerId: string) => {
    const caller = players.find((p) => p.id === callerId);
    if (!caller) return;

    const validation = validateJackpotCall(
      callerId,
      players,
      settings.winCondition,
      settings.allowWhotWilds
    );

    if (validation.isValid) {
      // Valid Jackpot Call!
      soundEngine.playJackpotCall();
      setJackpotBanner({
        callerName: caller.displayName,
        avatarId: caller.avatarId,
        isWin: true,
        text: `JACKPOT CALLED BY ${caller.displayName.toUpperCase()}!`,
      });

      const nextPlayers = players.map((p) =>
        p.id === callerId ? { ...p, score: p.score + 1 } : p
      );
      setPlayers(nextPlayers);

      const targetWins = Math.ceil(settings.bestOfRounds / 2);
      const isMatchWon = caller.score + 1 >= targetWins;

      setTimeout(() => {
        if (isMatchWon) {
          setMatchWinner(caller.displayName);
          setIsResultOpen(true);

          const isUserWinner = caller.id === (user?.id || 'player_1');
          saveMatchResult({
            userId: user?.id || 'guest',
            gameId: 'jackpot',
            gameName: 'Jackpot',
            mode: mode === 'ai' ? 'ai' : mode === 'pass' ? 'pass' : 'online',
            outcome: isUserWinner ? 'win' : 'loss',
            xpEarned: isUserWinner ? 250 : 75,
            coinsEarned: isUserWinner ? 50 : 20,
          }).catch(() => {});

          // Zustand stats update
          const currentStats = useWhotStore.getState().stats;
          useWhotStore.setState({
            stats: {
              ...currentStats,
              gamesPlayed: currentStats.gamesPlayed + 1,
              gamesWon: isUserWinner ? currentStats.gamesWon + 1 : currentStats.gamesWon,
              streak: isUserWinner ? (currentStats.streak || 0) + 1 : 0,
            },
          });
        } else {
          // Next round
          setCurrentRound((r) => r + 1);
          dealRound();
        }
      }, 2400);
    } else {
      // False Alarm!
      soundEngine.playFalseAlarm();
      setJackpotBanner({
        callerName: caller.displayName,
        avatarId: caller.avatarId,
        isWin: false,
        text: `FALSE ALARM! ${caller.displayName} skips next pass!`,
      });

      setPlayers((prev) =>
        prev.map((p) => (p.id === callerId ? { ...p, isSkipped: true } : p))
      );

      setTimeout(() => {
        setJackpotBanner(null);
      }, 2500);
    }
  };

  const userPlayer = players.find((p) => p.id === (user?.id || 'player_1'));
  const userHand = userPlayer?.hand || [];
  const handProgress = getHandProgress(
    userHand,
    settings.winCondition,
    settings.allowWhotWilds
  );

  const opponents = players.filter((p) => p.id !== (user?.id || 'player_1'));

  return (
    <div className="w-full max-w-md mx-auto px-2 py-2 flex flex-col items-center select-none text-white relative min-h-[90vh]">
      {/* 1. TOP HEADER: Back, Title, Settings & House Rules */}
      <div className="w-full flex items-center justify-between gap-2 mb-2 bg-[#141d33] border border-[#26314d] rounded-2xl px-3 py-2 shadow-lg">
        <button
          onClick={() => {
            soundEngine.playClick();
            onBack();
          }}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white cursor-pointer transition-colors"
          title="Back to Hub"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <h2 className="text-sm sm:text-base font-black font-display text-white tracking-wide">
              JACKPOT <span className="text-[#ffb703]">RACE</span>
            </h2>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-[#ffb703]/15 text-[#ffb703] border border-[#ffb703]/30">
              R{currentRound}
            </span>
          </div>
          <p className="text-[10px] font-bold text-gray-400">
            {settings.winCondition === 'match_set' ? 'Match 5 of a Kind' : 'Collect All 5 Shapes'} • First to {Math.ceil(settings.bestOfRounds / 2)}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={toggleMute}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-[#1fd1a0]" />}
          </button>
          <button
            onClick={() => {
              soundEngine.playClick();
              setIsSettingsOpen(true);
            }}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white cursor-pointer"
            title="Room Settings"
          >
            <Settings className="w-4 h-4 text-[#ff7a00]" />
          </button>
        </div>
      </div>

      {/* 2. OPPONENTS CIRCULAR RING (Avatars around top with Card Badges & Lock Checkmarks) */}
      <div className="w-full flex items-center justify-center gap-2.5 sm:gap-4 my-2 px-1">
        {opponents.map((opp) => (
          <div
            key={opp.id}
            className="flex flex-col items-center relative group min-w-[56px] sm:min-w-[68px]"
          >
            {/* Avatar with Glow and Lock Checkmark */}
            <div className="relative">
              <div
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl p-0.5 border-2 transition-all shadow-lg ${
                  opp.hasLockedIn
                    ? 'border-[#1fd1a0] shadow-[#1fd1a0]/30 bg-[#1fd1a0]/15'
                    : 'border-[#26314d] bg-[#141d33]'
                }`}
              >
                <Avatar avatarId={opp.avatarId} size="md" />
              </div>

              {/* Locked In Check Badge */}
              {opp.hasLockedIn && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#1fd1a0] text-black flex items-center justify-center shadow-md border border-black/30"
                  title="Card Locked"
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                </motion.div>
              )}

              {/* Skipped / False Call Penalty Badge */}
              {opp.isSkipped && (
                <div
                  className="absolute -bottom-1.5 -left-1.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] shadow-md border border-black/30"
                  title="Skipped pass step"
                >
                  ⚠️
                </div>
              )}
            </div>

            {/* Name & Round Wins */}
            <p className="text-[10px] font-bold text-gray-300 truncate max-w-[62px] text-center mt-1">
              {opp.displayName}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[9px] font-mono text-gray-400">5🎴</span>
              <span className="text-[9px] font-mono font-bold text-[#ffb703] bg-black/40 px-1 rounded">
                ★{opp.score}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* 3. TABLE CENTER: Rotating Pass Direction Arrow & 10s Timer */}
      <div className="relative w-full max-w-[360px] h-32 my-1 rounded-3xl bg-gradient-to-b from-[#141d33]/90 to-[#0c1222]/90 border border-[#26314d] shadow-xl flex flex-col items-center justify-center overflow-hidden">
        {/* Subtle Felt Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#1fd1a0_1px,transparent_1px)] [background-size:12px_12px] opacity-10 pointer-events-none" />

        {/* Animated Flying Cards Overlay during Pass */}
        <AnimatePresence>
          {isPassingAnimation && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1.2, opacity: 1, rotate: effectiveDirection === 'left' ? 360 : -360 }}
              exit={{ scale: 0.2, opacity: 0 }}
              transition={{ duration: 0.45 }}
              className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
            >
              <div className="text-4xl filter drop-shadow-lg">🎴 💨</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Center Timer & Pass Direction Indicator */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
              Pass Direction:
            </span>
            <span className="text-xs font-black text-[#ff7a00] flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-full border border-[#ff7a00]/30">
              <RefreshCw className={`w-3 h-3 ${effectiveDirection === 'left' ? 'rotate-180' : ''}`} />
              <span>{effectiveDirection.toUpperCase()}</span>
            </span>
          </div>

          {/* 10s Circular Timer */}
          <div className="flex items-center gap-2">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center font-mono font-black text-xl border-2 shadow-lg transition-colors ${
                passTimer <= 3
                  ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse'
                  : 'bg-black/40 border-[#ffb703] text-[#ffb703]'
              }`}
            >
              {passTimer}s
            </div>

            <div className="text-left">
              <p className="text-[10px] font-bold text-gray-300">
                {userPlayer?.hasLockedIn ? '✅ Card Locked' : 'Pick 1 Card & Pass'}
              </p>
              <p className="text-[9px] text-gray-400">
                {userPlayer?.isSkipped ? '⚠️ You are skipped this step!' : 'Passing simultaneously'}
              </p>
            </div>
          </div>
        </div>

        {/* JACKPOT CALL BANNER */}
        <AnimatePresence>
          {jackpotBanner && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className={`absolute inset-2 rounded-2xl z-30 flex flex-col items-center justify-center p-3 text-center backdrop-blur-md border-2 shadow-2xl ${
                jackpotBanner.isWin
                  ? 'bg-[#141d33]/95 border-[#ffb703]'
                  : 'bg-rose-950/95 border-rose-500'
              }`}
            >
              <div className="text-2xl mb-0.5">
                {jackpotBanner.isWin ? '👑 🎊' : '❌ ⚠️'}
              </div>
              <h3
                className={`text-sm font-black font-display tracking-wide uppercase ${
                  jackpotBanner.isWin ? 'text-[#ffb703]' : 'text-rose-400'
                }`}
              >
                {jackpotBanner.text}
              </h3>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 4. HAND HELPER: Target Shape & Progress Bar */}
      <div className="w-full max-w-[360px] bg-[#141d33] border border-[#26314d] rounded-2xl px-3 py-2 my-1 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#ffb703]" />
          <div>
            <p className="text-[10px] uppercase font-bold text-gray-400">Your Hand Goal</p>
            <p className="text-xs font-black text-white font-display">
              {handProgress.label}
            </p>
          </div>
        </div>

        {/* 5-Pip Progress Dots */}
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full border transition-all ${
                idx < handProgress.currentCount
                  ? 'bg-[#ffb703] border-[#ffb703] shadow-sm shadow-[#ffb703]/50 scale-105'
                  : 'bg-black/40 border-gray-600'
              }`}
            />
          ))}
        </div>
      </div>

      {/* 5. PLAYER'S 5 CARDS (Fanned out at bottom, tap to inspect/select) */}
      <div className="w-full max-w-[380px] my-2">
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 px-1">
          {userHand.map((card, idx) => {
            const isSelected = userPlayer?.selectedCardId === card.id;
            const isJustReceived = justReceivedCardId === card.id;

            return (
              <motion.div
                key={card.id}
                onClick={() => handleSelectCard(card.id)}
                whileHover={{ y: -6 }}
                animate={{
                  y: isSelected ? -16 : 0,
                  scale: isSelected ? 1.05 : 1.0,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className={`relative cursor-pointer transition-all ${
                  userPlayer?.hasLockedIn && !isSelected ? 'opacity-40 pointer-events-none' : ''
                }`}
              >
                {/* Glow ring on selected card */}
                {isSelected && (
                  <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-[#ff7a00] to-[#ffb703] blur-[3px] opacity-80" />
                )}

                {/* Just Received Flip Highlight */}
                {isJustReceived && (
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 px-1.5 py-0.2 rounded-full bg-[#1fd1a0] text-black text-[9px] font-black uppercase shadow-md"
                  >
                    NEW!
                  </motion.div>
                )}

                <WhotCard
                  card={{ id: card.id, shape: card.shape, number: card.number || 1 }}
                  size="sm"
                  isSelected={isSelected}
                  className="shadow-xl"
                />
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* 6. BIG ACTION BAR: "PASS THIS CARD" or GLOWING "JACKPOT!" BUTTON */}
      <div className="w-full max-w-[360px] my-2 space-y-2">
        {/* If hand is WINNING -> GLOWING JACKPOT BUTTON (Race to tap!) */}
        {handProgress.isWin ? (
          <motion.button
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            onClick={() => handleCallJackpot(userPlayer?.id || 'player_1')}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 text-black font-black text-xl font-display tracking-widest uppercase shadow-2xl shadow-amber-500/50 border-2 border-white/60 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>👑</span>
            <span>SHOUT JACKPOT!</span>
            <span>🎉</span>
          </motion.button>
        ) : (
          <button
            onClick={handleLockInCard}
            disabled={!userPlayer?.selectedCardId || userPlayer.hasLockedIn || userPlayer.isSkipped}
            className={`w-full py-3.5 rounded-2xl font-black text-sm tracking-wide font-display uppercase flex items-center justify-center gap-2 transition-all shadow-lg ${
              userPlayer?.hasLockedIn
                ? 'bg-[#1fd1a0] text-black border border-[#1fd1a0]/50 shadow-[#1fd1a0]/20 cursor-default'
                : userPlayer?.selectedCardId
                ? 'bg-gradient-to-r from-[#ff7a00] to-[#ffb703] text-black shadow-[#ff7a00]/30 hover:brightness-105 active:scale-98 cursor-pointer'
                : 'bg-[#141d33] text-gray-500 border border-[#26314d] cursor-not-allowed'
            }`}
          >
            {userPlayer?.hasLockedIn ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>CARD LOCKED IN (WAITING FOR OTHERS)</span>
              </>
            ) : userPlayer?.isSkipped ? (
              <>
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>SKIPPED THIS STEP (FALSE ALARM)</span>
              </>
            ) : userPlayer?.selectedCardId ? (
              <>
                <ArrowRight className="w-4 h-4" />
                <span>PASS SELECTED CARD</span>
              </>
            ) : (
              <span>SELECT 1 CARD ABOVE TO PASS</span>
            )}
          </button>
        )}
      </div>

      {/* 7. ROOM SETTINGS MODAL */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-[#141d33] border border-[#26314d] rounded-3xl p-5 shadow-2xl z-10 text-white space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#26314d]">
                <h3 className="text-base font-black font-display text-white">Jackpot Room Settings</h3>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="text-gray-400 hover:text-white text-xs font-bold"
                >
                  Done
                </button>
              </div>

              {/* Game Mode */}
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1.5">Game Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setMode('ai');
                      setIsSettingsOpen(false);
                    }}
                    className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                      mode === 'ai'
                        ? 'bg-[#ff7a00] text-black border-[#ff7a00]'
                        : 'bg-[#0d1426] text-gray-400 border-[#26314d]'
                    }`}
                  >
                    vs Computer
                  </button>
                  <button
                    onClick={() => {
                      setMode('pass');
                      setIsSettingsOpen(false);
                    }}
                    className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                      mode === 'pass'
                        ? 'bg-[#ff7a00] text-black border-[#ff7a00]'
                        : 'bg-[#0d1426] text-gray-400 border-[#26314d]'
                    }`}
                  >
                    Pass & Play
                  </button>
                </div>
              </div>

              {/* Player Count: 3 to 6 */}
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1.5">Players (3 to 6)</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[3, 4, 5, 6].map((cnt) => (
                    <button
                      key={cnt}
                      onClick={() => setSettings((s) => ({ ...s, playerCount: cnt }))}
                      className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                        settings.playerCount === cnt
                          ? 'bg-[#1fd1a0] text-black border-[#1fd1a0]'
                          : 'bg-[#0d1426] text-gray-400 border-[#26314d]'
                      }`}
                    >
                      {cnt} Seats
                    </button>
                  ))}
                </div>
              </div>

              {/* Win Condition */}
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1.5">Win Condition</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSettings((s) => ({ ...s, winCondition: 'match_set' }))}
                    className={`p-2 rounded-xl text-xs font-bold border text-left transition-colors ${
                      settings.winCondition === 'match_set'
                        ? 'bg-[#ffb703] text-black border-[#ffb703]'
                        : 'bg-[#0d1426] text-gray-400 border-[#26314d]'
                    }`}
                  >
                    <p className="font-black">Match Set (Default)</p>
                    <p className="text-[10px] opacity-80">5 of the same shape</p>
                  </button>
                  <button
                    onClick={() => setSettings((s) => ({ ...s, winCondition: 'collect_all' }))}
                    className={`p-2 rounded-xl text-xs font-bold border text-left transition-colors ${
                      settings.winCondition === 'collect_all'
                        ? 'bg-[#ffb703] text-black border-[#ffb703]'
                        : 'bg-[#0d1426] text-gray-400 border-[#26314d]'
                    }`}
                  >
                    <p className="font-black">Collect All</p>
                    <p className="text-[10px] opacity-80">1 of each 5 shapes</p>
                  </button>
                </div>
              </div>

              {/* Whot 20 Wild Cards Toggle */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#0d1426] border border-[#26314d]">
                <div>
                  <p className="text-xs font-bold text-white">Whot 20 Wild Cards</p>
                  <p className="text-[10px] text-gray-400">Wild cards count as any shape</p>
                </div>
                <button
                  onClick={() =>
                    setSettings((s) => ({ ...s, allowWhotWilds: !s.allowWhotWilds }))
                  }
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    settings.allowWhotWilds ? 'bg-[#1fd1a0]' : 'bg-gray-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                      settings.allowWhotWilds ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {/* Pass Timer */}
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1.5">Pass Step Timer</label>
                <div className="grid grid-cols-3 gap-2">
                  {[10, 15, 20].map((t) => (
                    <button
                      key={t}
                      onClick={() =>
                        setSettings((s) => ({ ...s, passTimerSeconds: t as 10 | 15 | 20 }))
                      }
                      className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                        settings.passTimerSeconds === t
                          ? 'bg-[#ff7a00] text-black border-[#ff7a00]'
                          : 'bg-[#0d1426] text-gray-400 border-[#26314d]'
                      }`}
                    >
                      {t} Seconds
                    </button>
                  ))}
                </div>
              </div>

              {/* Pass Direction */}
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1.5">Pass Direction</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'left', label: 'Left' },
                    { id: 'right', label: 'Right' },
                    { id: 'alternate', label: 'Alternate' },
                  ].map((d) => (
                    <button
                      key={d.id}
                      onClick={() =>
                        setSettings((s) => ({
                          ...s,
                          passDirection: d.id as JackpotPassDirection,
                        }))
                      }
                      className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                        settings.passDirection === d.id
                          ? 'bg-[#ff7a00] text-black border-[#ff7a00]'
                          : 'bg-[#0d1426] text-gray-400 border-[#26314d]'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  soundEngine.playClick();
                  setIsSettingsOpen(false);
                  dealRound();
                }}
                className="w-full py-3 rounded-2xl bg-[#ff7a00] hover:bg-[#ff7a00]/90 text-black font-black text-xs tracking-wider uppercase shadow-lg shadow-[#ff7a00]/20 cursor-pointer"
              >
                APPLY & START MATCH
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 8. RULES BOTTOM SHEET */}
      <AnimatePresence>
        {isRulesOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRulesOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-[#141d33] border border-[#26314d] rounded-3xl p-5 shadow-2xl z-10 text-white space-y-3"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#26314d]">
                <h3 className="text-base font-black font-display text-white">How to Play Jackpot</h3>
                <button
                  onClick={() => setIsRulesOpen(false)}
                  className="text-gray-400 hover:text-white text-xs font-bold"
                >
                  Close
                </button>
              </div>

              <div className="space-y-2.5 text-xs text-gray-300 leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
                <div className="flex gap-2">
                  <span className="text-[#ffb703] font-black">1.</span>
                  <p>
                    <strong className="text-white">Shapes Only:</strong> Only card shapes matter (Circle, Triangle, Cross, Square, Star). Numbers are ignored!
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="text-[#ffb703] font-black">2.</span>
                  <p>
                    <strong className="text-white">Simultaneous Pass:</strong> Pick 1 card from your hand and hit Pass. When the countdown ends, all chosen cards pass simultaneously around the circle.
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="text-[#ffb703] font-black">3.</span>
                  <p>
                    <strong className="text-white">5 Cards Always:</strong> You always hold exactly 5 cards. Keep passing until you collect a winning hand!
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="text-[#ffb703] font-black">4.</span>
                  <p>
                    <strong className="text-white">Jackpot Race:</strong> When you complete your goal, tap the glowing JACKPOT! button immediately. First valid call wins the round!
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="text-[#ffb703] font-black">5.</span>
                  <p>
                    <strong className="text-white">False Alarm Penalty:</strong> If you call Jackpot without a winning hand, you lose your next pass step!
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsRulesOpen(false)}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-black text-xs cursor-pointer"
              >
                GOT IT, LET'S RACE!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 9. MATCH RESULT MODAL */}
      <GameResultModal
        isOpen={isResultOpen}
        winner={matchWinner}
        isWin={matchWinner === (user?.displayName || user?.username || 'Player 1')}
        scoreText={`Final Score: ${players.map((p) => `${p.displayName} (${p.score})`).join(' • ')}`}
        onPlayAgain={() => {
          setIsResultOpen(false);
          setMatchWinner(null);
          setCurrentRound(1);
          setPlayers((prev) => prev.map((p) => ({ ...p, score: 0 })));
          dealRound();
        }}
        onBackToLobby={onBack}
      />
    </div>
  );
};

export default JackpotGame;
