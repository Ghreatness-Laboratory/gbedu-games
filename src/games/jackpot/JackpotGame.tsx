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
  Search,
  Eye,
  Snowflake,
  Flame,
  X,
  Coins,
} from 'lucide-react';
import { soundEngine } from '../../audio/audioEngine';
import { useWhotStore } from '../../store/useWhotStore';
import { GameResultModal } from '../../components/GameResultModal';
import { saveMatchResult } from '../../lib/offlineSync';
import { Avatar } from '../../components/Avatar';
import { WhotCard } from '../../components/WhotCard';
import { Shape } from '@gbedu/shared';
import {
  JackpotCard,
  JackpotPlayer,
  JackpotSettings,
  JackpotWinCondition,
  JackpotPassDirection,
  JackpotSuspectEvent,
} from './types';
import {
  createJackpotDeck,
  shuffleJackpotDeck,
  checkWinningHand,
  getHandProgress,
  executeSimultaneousPass,
  validateJackpotCall,
  validateSuspectAccusation,
  canPlayerAccuse,
  applySuspectResult,
  validateFreezeCard,
  applyFreezeCard,
  checkMatchWinnerByPoints,
  SHAPE_NAMES,
  SHAPE_SYMBOLS,
  BASIC_SHAPES,
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
  suspectTokensPerRound: 2, // 1, 2, or 3 (0 = off)
  suspectThreshold: 3, // 2, 3, or 4
  targetPoints: 15, // 10, 15, or 20
  shrinkingTimer: false,
  allowFreezeCard: false,
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

  // Suspect Mechanic State
  const [isSuspectSheetOpen, setIsSuspectSheetOpen] = useState(false);
  const [suspectTarget, setSuspectTarget] = useState<JackpotPlayer | null>(null);
  const [suspectShape, setSuspectShape] = useState<Shape>('circle');
  const [activityFeed, setActivityFeed] = useState<JackpotSuspectEvent[]>([]);

  // Accusation Dramatic Spotlight & Magnifying Glass Animation State
  const [accusationAnim, setAccusationAnim] = useState<{
    accuserName: string;
    accusedId: string;
    accusedName: string;
    accusedAvatar: string;
    shape: Shape;
    isCorrect: boolean;
    active: boolean;
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
      points: 0,
      suspectTokens: settings.suspectTokensPerRound,
      isExposed: false,
      exposedShape: null,
      isSkipped: false,
      isFrozen: false,
      hasUsedFreeze: false,
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
        points: 0,
        suspectTokens: settings.suspectTokensPerRound,
        isExposed: false,
        exposedShape: null,
        isSkipped: false,
        isFrozen: false,
        hasUsedFreeze: false,
        isConnected: true,
      });

      if (isBotSeat && !botBrainsRef.current.has(seatId)) {
        botBrainsRef.current.set(seatId, new JackpotBotBrain());
      }
    }

    setPlayers(list);
  }, [user, mode, settings.playerCount, settings.suspectTokensPerRound, botDifficulty]);

  // 2. Deal New Round Hands & Refresh Tokens
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
        suspectTokens: settings.suspectTokensPerRound,
        isExposed: false,
        exposedShape: null,
        isSkipped: false,
        isFrozen: false,
        hasUsedFreeze: false,
      };
    });

    setPlayers(updated);
    setPassTimer(settings.passTimerSeconds);
    setCurrentStep(0);
    setJackpotBanner(null);
    setJustReceivedCardId(null);
    setIsSuspectSheetOpen(false);
    setAccusationAnim(null);

    // Initial pass direction
    setEffectiveDirection(settings.passDirection === 'right' ? 'right' : 'left');
  }, [players, settings.allowWhotWilds, settings.passTimerSeconds, settings.passDirection, settings.suspectTokensPerRound]);

  // Setup on mount / settings change
  useEffect(() => {
    initPlayers();
  }, [initPlayers]);

  useEffect(() => {
    if (players.length > 0 && players[0].hand.length === 0) {
      dealRound();
    }
  }, [players, dealRound]);

  // Calculate current pass step timer (supports Shrinking Timer option)
  const getStepTimerInitialSeconds = useCallback(() => {
    if (settings.shrinkingTimer) {
      return Math.max(5, settings.passTimerSeconds - currentStep);
    }
    return settings.passTimerSeconds;
  }, [settings.shrinkingTimer, settings.passTimerSeconds, currentStep]);

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
          return getStepTimerInitialSeconds();
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [players.length, isPassingAnimation, isResultOpen, jackpotBanner, getStepTimerInitialSeconds]);

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

  // 5. Bot Suspect Automation
  useEffect(() => {
    if (
      players.length === 0 ||
      isPassingAnimation ||
      isResultOpen ||
      jackpotBanner ||
      settings.suspectTokensPerRound === 0
    ) {
      return;
    }

    players.forEach((bot) => {
      if (!bot.isBot || bot.suspectTokens <= 0 || bot.isSkipped) return;

      const brain = botBrainsRef.current.get(bot.id);
      if (!brain) return;

      const suspectDecision = brain.decideSuspect(
        bot,
        players,
        currentStep,
        settings,
        bot.botDifficulty || 'medium'
      );

      if (suspectDecision) {
        const delay = 1800 + Math.random() * 2500;
        const timer = setTimeout(() => {
          executeSuspectAction(bot.id, suspectDecision.targetPlayerId, suspectDecision.shape);
        }, delay);

        return () => clearTimeout(timer);
      }
    });
  }, [players, currentStep, isPassingAnimation, isResultOpen, jackpotBanner, settings]);

  // 6. Bot Jackpot Calling Automation
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

  // 7. Check If All Players Have Locked In -> Fast-Forward Pass!
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

  // 8. Execute Simultaneous Pass
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

    // Execute pass logic (respecting Exposed shapes)
    const { updatedPlayers, passedSummary } = executeSimultaneousPass(
      players,
      dir,
      settings.winCondition,
      settings.allowWhotWilds
    );

    // Record bot history for tracking & intelligent suspecting
    passedSummary.forEach((ev) => {
      const recipientBrain = botBrainsRef.current.get(ev.toPlayerId);
      if (recipientBrain) {
        recipientBrain.recordReceivedCard(ev.card.shape);
      }
      const donorBrain = botBrainsRef.current.get(ev.fromPlayerId);
      if (donorBrain) {
        donorBrain.recordLeftNeighborDiscard(ev.card.shape);
        donorBrain.recordPlayerDiscard(ev.fromPlayerId, ev.card.shape);
      }
    });

    // Animate cards flying
    setTimeout(() => {
      setPlayers(updatedPlayers);
      setIsPassingAnimation(false);
      setPassTimer(getStepTimerInitialSeconds());
      setCurrentStep((s) => s + 1);

      // Highlight new card for local user
      const userPlayer = updatedPlayers.find((p) => p.id === (user?.id || 'player_1'));
      if (userPlayer?.receivedCard) {
        setJustReceivedCardId(userPlayer.receivedCard.id);
        setTimeout(() => setJustReceivedCardId(null), 2500);
      }
    }, 450);
  };

  // 9. Player Locks In Selected Card
  const handleLockInCard = () => {
    const userPlayer = players.find((p) => p.id === (user?.id || 'player_1'));
    if (!userPlayer || !userPlayer.selectedCardId || userPlayer.hasLockedIn) return;

    // Check if player is exposed: must pass card of exposed shape if held
    if (userPlayer.isExposed && userPlayer.exposedShape) {
      const hasExposedCard = userPlayer.hand.some(
        (c) =>
          c.shape === userPlayer.exposedShape ||
          (settings.allowWhotWilds && c.shape === 'whot')
      );
      if (hasExposedCard) {
        const selected = userPlayer.hand.find((c) => c.id === userPlayer.selectedCardId);
        if (
          !selected ||
          (selected.shape !== userPlayer.exposedShape &&
            (!settings.allowWhotWilds || selected.shape !== 'whot'))
        ) {
          soundEngine.playFalseAlarm();
          return;
        }
      }
    }

    soundEngine.playLockIn();
    setPlayers((prev) =>
      prev.map((p) => (p.id === userPlayer.id ? { ...p, hasLockedIn: true } : p))
    );
  };

  // Select card to pass
  const handleSelectCard = (cardId: string) => {
    const userPlayer = players.find((p) => p.id === (user?.id || 'player_1'));
    if (!userPlayer || userPlayer.hasLockedIn || userPlayer.isSkipped) return;

    // If exposed, prevent selecting illegal cards if player holds the exposed shape
    if (userPlayer.isExposed && userPlayer.exposedShape) {
      const heldExposed = userPlayer.hand.some(
        (c) =>
          c.shape === userPlayer.exposedShape ||
          (settings.allowWhotWilds && c.shape === 'whot')
      );
      if (heldExposed) {
        const target = userPlayer.hand.find((c) => c.id === cardId);
        if (
          target &&
          target.shape !== userPlayer.exposedShape &&
          (!settings.allowWhotWilds || target.shape !== 'whot')
        ) {
          soundEngine.playFalseAlarm();
          return;
        }
      }
    }

    soundEngine.playCardSlide();
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === userPlayer.id
          ? { ...p, selectedCardId: p.selectedCardId === cardId ? null : cardId }
          : p
      )
    );
  };

  // 10. SUSPECT ACTION: Accuse an Opponent of Hoarding a Shape
  const executeSuspectAction = (
    accuserId: string,
    accusedId: string,
    shape: Shape
  ) => {
    const accuser = players.find((p) => p.id === accuserId);
    const accused = players.find((p) => p.id === accusedId);
    if (!accuser || !accused) return;

    const checkAllowed = canPlayerAccuse(accuser, accused);
    if (!checkAllowed.canAccuse) return;

    // Trigger Accuse Sting Sound
    soundEngine.playSuspectAccuse();

    // Authoritative check on accused player's hand
    const checkResult = validateSuspectAccusation(
      accused.hand,
      shape,
      settings.suspectThreshold,
      settings.allowWhotWilds
    );

    // Spotlight & Magnifying Glass Animation
    setAccusationAnim({
      accuserName: accuser.displayName,
      accusedId: accused.id,
      accusedName: accused.displayName,
      accusedAvatar: accused.avatarId,
      shape,
      isCorrect: checkResult.isCorrect,
      active: true,
    });

    // Close bottom sheet if open
    setIsSuspectSheetOpen(false);

    // Apply engine state modifications
    const { updatedAccuser, updatedAccused } = applySuspectResult(
      accuser,
      accused,
      shape,
      checkResult.isCorrect
    );

    const nextPlayers = players.map((p) => {
      if (p.id === accuserId) return updatedAccuser;
      if (p.id === accusedId) return updatedAccused;
      return p;
    });

    setPlayers(nextPlayers);

    // Sound & Haptics Feedback after brief dramatic zoom
    setTimeout(() => {
      if (checkResult.isCorrect) {
        soundEngine.playSuspectCorrect();
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate(100);
          } catch {}
        }
      } else {
        soundEngine.playSuspectWrong();
      }

      // Add to Activity Feed
      const event: JackpotSuspectEvent = {
        id: `suspect_${Date.now()}_${Math.random()}`,
        accuserId: accuser.id,
        accuserName: accuser.displayName,
        accusedId: accused.id,
        accusedName: accused.displayName,
        shape,
        isCorrect: checkResult.isCorrect,
        timestamp: Date.now(),
      };

      setActivityFeed((prev) => [event, ...prev.slice(0, 2)]);

      // Check if accuser reached target points (e.g. 15 points)
      const winCheck = checkMatchWinnerByPoints(nextPlayers, settings.targetPoints);
      if (winCheck.isGameOver && winCheck.winner) {
        handleMatchPointVictory(winCheck.winner);
      }
    }, 700);

    // Clear overlay animation after 2.2 seconds
    setTimeout(() => {
      setAccusationAnim(null);
    }, 2200);
  };

  // 11. Freeze Opponent Card Action
  const handleFreezeOpponent = (targetPlayer: JackpotPlayer) => {
    const userPlayer = players.find((p) => p.id === (user?.id || 'player_1'));
    if (!userPlayer) return;

    const check = validateFreezeCard(userPlayer, targetPlayer);
    if (!check.canFreeze) return;

    soundEngine.playLockIn();
    const { updatedFreezer, updatedTarget } = applyFreezeCard(userPlayer, targetPlayer);

    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id === updatedFreezer.id) return updatedFreezer;
        if (p.id === updatedTarget.id) return updatedTarget;
        return p;
      })
    );

    setIsSuspectSheetOpen(false);
  };

  // 12. Handle Match Point Victory (First to 10, 15, or 20 points)
  const handleMatchPointVictory = (winner: JackpotPlayer) => {
    soundEngine.playWin();
    setMatchWinner(winner.displayName);
    setIsResultOpen(true);

    const isUserWinner = winner.id === (user?.id || 'player_1');
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
  };

  // 13. Call JACKPOT Action! (Round Win = +5 Points!)
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
        text: `JACKPOT CALLED BY ${caller.displayName.toUpperCase()}! (+5 PTS)`,
      });

      // Award 5 competition points
      const nextPlayers = players.map((p) =>
        p.id === callerId
          ? {
              ...p,
              score: (p.score || 0) + 1,
              points: (p.points || 0) + 5,
            }
          : p
      );
      setPlayers(nextPlayers);

      // Check if match won by reaching target points (e.g. 15 pts)
      const winCheck = checkMatchWinnerByPoints(nextPlayers, settings.targetPoints);

      setTimeout(() => {
        if (winCheck.isGameOver && winCheck.winner) {
          handleMatchPointVictory(winCheck.winner);
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

  // Open Suspect Sheet for an opponent
  const handleOpenSuspectSheet = (target?: JackpotPlayer) => {
    const userPlayer = players.find((p) => p.id === (user?.id || 'player_1'));
    if (!userPlayer || userPlayer.suspectTokens <= 0) {
      soundEngine.playFalseAlarm();
      return;
    }

    soundEngine.playClick();
    const opponents = players.filter((p) => p.id !== userPlayer.id);
    setSuspectTarget(target || opponents[0] || null);
    setIsSuspectSheetOpen(true);
  };

  const userPlayer = players.find((p) => p.id === (user?.id || 'player_1'));
  const userHand = userPlayer?.hand || [];
  const handProgress = getHandProgress(
    userHand,
    settings.winCondition,
    settings.allowWhotWilds
  );

  const opponents = players.filter((p) => p.id !== (user?.id || 'player_1'));

  // Cooldown remaining seconds for user
  const now = Date.now();
  const cooldownRemaining = userPlayer?.lastSuspectTimestamp
    ? Math.max(0, Math.ceil((5000 - (now - userPlayer.lastSuspectTimestamp)) / 1000))
    : 0;

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
            First to {settings.targetPoints} Points • Win +5 / Suspect +1
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

      {/* 2. LIVE LEADERBOARD (Animated count-up competition points to 15) */}
      <div className="w-full bg-[#141d33] border border-[#26314d] rounded-2xl px-3 py-2 mb-2 shadow-md">
        <div className="flex items-center justify-between text-[11px] font-black uppercase text-gray-400 mb-1.5">
          <span className="flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5 text-[#ffb703]" />
            <span>Leaderboard (First to {settings.targetPoints})</span>
          </span>
          <span className="text-[#1fd1a0] font-mono">
            {userPlayer?.points || 0} / {settings.targetPoints} pts
          </span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-4 gap-1.5">
          {players.map((p) => {
            const isMe = p.id === (user?.id || 'player_1');
            return (
              <div
                key={p.id}
                className={`p-1.5 rounded-xl border flex flex-col items-center text-center transition-all ${
                  isMe
                    ? 'bg-[#1fd1a0]/10 border-[#1fd1a0]/40'
                    : 'bg-[#0d1426] border-[#26314d]'
                }`}
              >
                <div className="relative">
                  <Avatar avatarId={p.avatarId} size="xs" />
                  {p.isExposed && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  )}
                </div>
                <p className="text-[10px] font-black truncate max-w-[65px] mt-0.5">
                  {p.displayName.replace(' (AI)', '')}
                </p>
                <div className="flex items-center gap-1 font-mono font-black text-xs text-[#ffb703]">
                  <span>★{p.points || 0}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. OPPONENTS CIRCULAR RING (Avatars around top with Card Badges, Lock Checkmarks, Exposed & Tokens) */}
      <div className="w-full flex items-center justify-center gap-2.5 sm:gap-4 my-1 px-1">
        {opponents.map((opp) => (
          <div
            key={opp.id}
            onClick={() => handleOpenSuspectSheet(opp)}
            className="flex flex-col items-center relative group min-w-[56px] sm:min-w-[68px] cursor-pointer"
          >
            {/* Avatar with Glow, Lock Checkmark & Exposed State */}
            <div className="relative">
              <div
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl p-0.5 border-2 transition-all shadow-lg relative ${
                  opp.isExposed
                    ? 'border-rose-500 shadow-rose-500/50 bg-rose-950/40 animate-pulse'
                    : opp.hasLockedIn
                    ? 'border-[#1fd1a0] shadow-[#1fd1a0]/30 bg-[#1fd1a0]/15'
                    : 'border-[#26314d] bg-[#141d33]'
                }`}
              >
                <Avatar avatarId={opp.avatarId} size="md" />
              </div>

              {/* Locked In Check Badge */}
              {opp.hasLockedIn && !opp.isExposed && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#1fd1a0] text-black flex items-center justify-center shadow-md border border-black/30"
                  title="Card Locked"
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                </motion.div>
              )}

              {/* EXPOSED BADGE */}
              {opp.isExposed && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-rose-600 text-white flex items-center gap-0.5 text-[9px] font-black shadow-lg border border-white/40"
                  title={`Exposed! Must pass ${opp.exposedShape}`}
                >
                  <span>⚠️</span>
                  <span>{SHAPE_SYMBOLS[opp.exposedShape || 'circle']}</span>
                </motion.div>
              )}

              {/* Frozen Badge */}
              {opp.isFrozen && (
                <div
                  className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center text-[10px] shadow-md border border-black/30 animate-pulse"
                  title="Frozen! Passing blind"
                >
                  ❄️
                </div>
              )}

              {/* Skipped Penalty Badge */}
              {opp.isSkipped && (
                <div
                  className="absolute -bottom-1.5 -left-1.5 w-5 h-5 rounded-full bg-amber-500 text-black flex items-center justify-center text-[10px] font-black shadow-md border border-black/30"
                  title="Skipped pass step"
                >
                  🚫
                </div>
              )}
            </div>

            {/* Name & Token Magnifiers */}
            <p className="text-[10px] font-bold text-gray-300 truncate max-w-[64px] text-center mt-1">
              {opp.displayName}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[9px] font-mono text-gray-400">5🎴</span>
              {/* Suspect Tokens Left */}
              <div className="flex items-center gap-0.5">
                {Array.from({ length: opp.suspectTokens || 0 }).map((_, i) => (
                  <span key={i} className="text-[10px]" title="Suspect token">
                    🔍
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 4. TABLE CENTER: Rotating Pass Direction Arrow, 10s Timer & Spotlight */}
      <div className="relative w-full max-w-[360px] h-32 my-1 rounded-3xl bg-gradient-to-b from-[#141d33]/90 to-[#0c1222]/90 border border-[#26314d] shadow-xl flex flex-col items-center justify-center overflow-hidden">
        {/* Subtle Felt Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#1fd1a0_1px,transparent_1px)] [background-size:12px_12px] opacity-10 pointer-events-none" />

        {/* DRAMATIC ACCUSATION SPOTLIGHT & MAGNIFYING GLASS ANIMATION OVERLAY */}
        <AnimatePresence>
          {accusationAnim && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm p-3 text-center"
            >
              {/* Spotlight Ray */}
              <motion.div
                initial={{ scale: 0.2, rotate: -45 }}
                animate={{ scale: [1, 1.2, 1], rotate: 0 }}
                transition={{ duration: 0.5 }}
                className="text-4xl mb-1 filter drop-shadow-[0_0_15px_#ffb703]"
              >
                🔍
              </motion.div>

              <p className="text-xs font-black tracking-wide text-white uppercase">
                {accusationAnim.accuserName} suspects {accusationAnim.accusedName}!
              </p>
              <p className="text-[11px] font-extrabold text-[#ffb703] mt-0.5">
                Target Shape: {SHAPE_SYMBOLS[accusationAnim.shape]} {SHAPE_NAMES[accusationAnim.shape]}
              </p>

              {/* Result Burst */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4 }}
                className={`mt-2 px-3 py-1 rounded-full text-xs font-black uppercase shadow-lg ${
                  accusationAnim.isCorrect
                    ? 'bg-[#1fd1a0] text-black shadow-[#1fd1a0]/50'
                    : 'bg-rose-600 text-white shadow-rose-600/50'
                }`}
              >
                {accusationAnim.isCorrect
                  ? '🎯 CORRECT! ACCUSED IS EXPOSED (+1 PT)!'
                  : '❌ WRONG CALL! TOKEN LOST & SKIPS PASS!'}
              </motion.div>
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

          {/* Circular Timer with Shrinking Indicator */}
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
                {userPlayer?.isExposed
                  ? `⚠️ EXPOSED! Must pass ${SHAPE_NAMES[userPlayer.exposedShape || 'circle']}`
                  : userPlayer?.isSkipped
                  ? '⚠️ You are skipped this step!'
                  : 'Passing simultaneously'}
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

      {/* 5. SUSPECT ACTIVITY FEED (Last 3 events) */}
      {activityFeed.length > 0 && (
        <div className="w-full max-w-[360px] bg-[#0d1426] border border-[#26314d] rounded-xl px-2.5 py-1.5 my-1 space-y-1">
          {activityFeed.map((ev) => (
            <div
              key={ev.id}
              className="flex items-center justify-between text-[10px] font-bold"
            >
              <span className="truncate text-gray-300">
                🔍 {ev.accuserName} suspected {ev.accusedName}: {SHAPE_NAMES[ev.shape]}
              </span>
              <span
                className={`font-black ml-2 shrink-0 ${
                  ev.isCorrect ? 'text-[#1fd1a0]' : 'text-rose-400'
                }`}
              >
                {ev.isCorrect ? 'Exposed!' : 'Wrong!'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 6. HAND HELPER: Target Shape & Progress Bar */}
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

      {/* 7. PLAYER'S 5 CARDS (With Frozen blur & Exposed shape enforcement) */}
      <div className="w-full max-w-[380px] my-2 relative">
        {/* If user is Frozen -> Frosted glass overlay (passing blind!) */}
        {userPlayer?.isFrozen && (
          <div className="absolute inset-0 z-30 rounded-2xl bg-sky-950/70 backdrop-blur-md border border-sky-400/40 flex flex-col items-center justify-center p-2 text-center pointer-events-none">
            <Snowflake className="w-6 h-6 text-sky-300 animate-spin" />
            <p className="text-xs font-black text-sky-200 mt-1 uppercase">FROZEN! Passing Blind</p>
            <p className="text-[10px] text-sky-300/80">Hand cards are hidden for this step</p>
          </div>
        )}

        <div className="flex items-center justify-center gap-1.5 sm:gap-2 px-1">
          {userHand.map((card) => {
            const isSelected = userPlayer?.selectedCardId === card.id;
            const isJustReceived = justReceivedCardId === card.id;

            // Check if card violates exposed shape restriction
            const isIllegalForExposed =
              userPlayer?.isExposed &&
              userPlayer.exposedShape &&
              userHand.some(
                (c) =>
                  c.shape === userPlayer.exposedShape ||
                  (settings.allowWhotWilds && c.shape === 'whot')
              ) &&
              card.shape !== userPlayer.exposedShape &&
              (!settings.allowWhotWilds || card.shape !== 'whot');

            return (
              <motion.div
                key={card.id}
                onClick={() => {
                  if (isIllegalForExposed) {
                    soundEngine.playFalseAlarm();
                    return;
                  }
                  handleSelectCard(card.id);
                }}
                whileHover={{ y: -6 }}
                animate={{
                  y: isSelected ? -16 : 0,
                  scale: isSelected ? 1.05 : 1.0,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className={`relative cursor-pointer transition-all ${
                  userPlayer?.hasLockedIn && !isSelected ? 'opacity-40 pointer-events-none' : ''
                } ${isIllegalForExposed ? 'opacity-30 cursor-not-allowed filter grayscale' : ''}`}
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

      {/* 8. ACTION BAR: PASS BUTTON & "SUSPECT" BUTTON WITH TOKENS */}
      <div className="w-full max-w-[360px] my-1 space-y-2">
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
                <span>SKIPPED THIS STEP (PENALTY)</span>
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

        {/* SUSPECT BUTTON (Sits under Pass button with token count) */}
        {settings.suspectTokensPerRound > 0 && (
          <button
            onClick={() => handleOpenSuspectSheet()}
            disabled={!userPlayer || userPlayer.suspectTokens <= 0 || cooldownRemaining > 0}
            className={`w-full py-2.5 px-4 rounded-2xl border font-black text-xs uppercase tracking-wider flex items-center justify-between transition-all ${
              userPlayer && userPlayer.suspectTokens > 0 && cooldownRemaining === 0
                ? 'bg-[#141d33] hover:bg-[#1a2542] border-[#ffb703]/50 text-[#ffb703] active:scale-98 shadow-md cursor-pointer'
                : 'bg-white/5 border-white/10 text-gray-500 cursor-not-allowed opacity-60'
            }`}
          >
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              <span>
                {cooldownRemaining > 0
                  ? `SUSPECT (WAIT ${cooldownRemaining}s)`
                  : 'SUSPECT OPPONENT'}
              </span>
            </div>

            {/* Token count icons */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-mono text-gray-300">Tokens:</span>
              {Array.from({ length: userPlayer?.suspectTokens || 0 }).map((_, i) => (
                <span key={i} className="text-sm">
                  🔍
                </span>
              ))}
              {userPlayer?.suspectTokens === 0 && (
                <span className="text-[10px] text-gray-400">None left</span>
              )}
            </div>
          </button>
        )}
      </div>

      {/* 9. SUSPECT ACCUSATION BOTTOM SHEET MODAL */}
      <AnimatePresence>
        {isSuspectSheetOpen && suspectTarget && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSuspectSheetOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm cursor-pointer"
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-sm bg-[#141d33] border-t sm:border border-[#26314d] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl z-10 text-white space-y-4 max-h-[90vh] overflow-y-auto"
            >
              {/* Sheet Header */}
              <div className="flex items-center justify-between pb-2 border-b border-[#26314d]">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔍</span>
                  <div>
                    <h3 className="text-base font-black font-display text-white">Call Suspect</h3>
                    <p className="text-[10px] text-gray-400">
                      Need {settings.suspectThreshold}+ cards of shape to expose
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsSuspectSheetOpen(false)}
                  className="p-1 rounded-lg bg-white/5 text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Select Accused Opponent */}
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1.5">
                  Select Opponent:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {opponents.map((opp) => (
                    <button
                      key={opp.id}
                      onClick={() => setSuspectTarget(opp)}
                      className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                        suspectTarget.id === opp.id
                          ? 'bg-[#ffb703]/20 border-[#ffb703] text-white'
                          : 'bg-white/5 border-transparent text-gray-400'
                      }`}
                    >
                      <Avatar avatarId={opp.avatarId} size="xs" />
                      <span className="text-[10px] font-black truncate max-w-[70px]">
                        {opp.displayName.replace(' (AI)', '')}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Select Suspected Shape */}
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1.5">
                  Which shape are they hoarding?
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {BASIC_SHAPES.map((shape) => {
                    const isSelected = suspectShape === shape;
                    return (
                      <button
                        key={shape}
                        onClick={() => setSuspectShape(shape)}
                        className={`p-2 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all ${
                          isSelected
                            ? 'bg-gradient-to-t from-[#ff7a00] to-[#ffb703] text-black border-white shadow-lg scale-105'
                            : 'bg-[#0d1426] border-[#26314d] text-gray-300 hover:border-gray-500'
                        }`}
                      >
                        <span className="text-xl leading-none">{SHAPE_SYMBOLS[shape]}</span>
                        <span className="text-[9px] font-black uppercase">
                          {shape.slice(0, 4)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Rule Summary Box */}
              <div className="p-3 rounded-2xl bg-[#0d1426] border border-[#26314d] text-[10px] text-gray-300 space-y-1">
                <p className="flex items-center gap-1.5">
                  <span className="text-[#1fd1a0]">✓</span>
                  <span>
                    <strong>Correct:</strong> +1 pt, you keep token, {suspectTarget.displayName} is
                    Exposed & must pass {SHAPE_NAMES[suspectShape]}!
                  </span>
                </p>
                <p className="flex items-center gap-1.5">
                  <span className="text-rose-400">✗</span>
                  <span>
                    <strong>Wrong:</strong> You spend 1 token and skip your next pass step.
                  </span>
                </p>
              </div>

              {/* Action Buttons: Confirm Accusation + Optional Freeze Card */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={() =>
                    executeSuspectAction(
                      userPlayer?.id || 'player_1',
                      suspectTarget.id,
                      suspectShape
                    )
                  }
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#ff7a00] via-[#ff8800] to-[#ffb703] text-black font-black text-sm uppercase tracking-wider shadow-xl hover:brightness-105 active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  <span>Confirm Accusation</span>
                </button>

                {/* Freeze Opponent Option (if enabled in room settings) */}
                {settings.allowFreezeCard && (
                  <button
                    onClick={() => handleFreezeOpponent(suspectTarget)}
                    disabled={
                      !userPlayer ||
                      userPlayer.suspectTokens <= 0 ||
                      userPlayer.hasUsedFreeze ||
                      suspectTarget.isFrozen
                    }
                    className="w-full py-2.5 rounded-2xl bg-sky-950/60 border border-sky-500/40 text-sky-300 font-bold text-xs uppercase flex items-center justify-center gap-2 hover:bg-sky-900/60 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Snowflake className="w-4 h-4" />
                    <span>Freeze {suspectTarget.displayName} (Pass Blind - Costs 1 Token)</span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 10. ROOM SETTINGS MODAL */}
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

              {/* Suspect Tokens Per Round */}
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1.5">
                  Suspect Tokens (Per Round)
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {([0, 1, 2, 3] as const).map((cnt) => (
                    <button
                      key={cnt}
                      onClick={() => setSettings((s) => ({ ...s, suspectTokensPerRound: cnt }))}
                      className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                        settings.suspectTokensPerRound === cnt
                          ? 'bg-[#ffb703] text-black border-[#ffb703]'
                          : 'bg-[#0d1426] text-gray-400 border-[#26314d]'
                      }`}
                    >
                      {cnt === 0 ? 'Off' : `${cnt} Tokens`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Suspect Threshold */}
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1.5">
                  Suspect Threshold (Cards Needed)
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {([2, 3, 4] as const).map((th) => (
                    <button
                      key={th}
                      onClick={() => setSettings((s) => ({ ...s, suspectThreshold: th }))}
                      className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                        settings.suspectThreshold === th
                          ? 'bg-[#1fd1a0] text-black border-[#1fd1a0]'
                          : 'bg-[#0d1426] text-gray-400 border-[#26314d]'
                      }`}
                    >
                      {th} Cards
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Match Points (First to 10, 15, 20) */}
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1.5">
                  Match Points Goal
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {([10, 15, 20] as const).map((pts) => (
                    <button
                      key={pts}
                      onClick={() => setSettings((s) => ({ ...s, targetPoints: pts }))}
                      className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                        settings.targetPoints === pts
                          ? 'bg-[#1fd1a0] text-black border-[#1fd1a0]'
                          : 'bg-[#0d1426] text-gray-400 border-[#26314d]'
                      }`}
                    >
                      First to {pts}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shrinking Timer Toggle */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#0d1426] border border-[#26314d]">
                <div>
                  <p className="text-xs font-bold text-white">Shrinking Timer</p>
                  <p className="text-[10px] text-gray-400">-1s per step down to 5s min</p>
                </div>
                <button
                  onClick={() =>
                    setSettings((s) => ({ ...s, shrinkingTimer: !s.shrinkingTimer }))
                  }
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    settings.shrinkingTimer ? 'bg-[#ff7a00]' : 'bg-gray-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                      settings.shrinkingTimer ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {/* Freeze Card Mechanic Toggle */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#0d1426] border border-[#26314d]">
                <div>
                  <p className="text-xs font-bold text-white">Freeze Card</p>
                  <p className="text-[10px] text-gray-400">Costs 1 token; opponent passes blind</p>
                </div>
                <button
                  onClick={() =>
                    setSettings((s) => ({ ...s, allowFreezeCard: !s.allowFreezeCard }))
                  }
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    settings.allowFreezeCard ? 'bg-sky-500' : 'bg-gray-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                      settings.allowFreezeCard ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
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

              {/* Pass Step Timer */}
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

              <button
                onClick={() => {
                  setIsSettingsOpen(false);
                  initPlayers();
                  dealRound();
                }}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#ff7a00] to-[#ffb703] text-black font-black text-sm uppercase tracking-wider shadow-xl"
              >
                Apply & Restart Match
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 11. GAME RESULT MODAL */}
      <GameResultModal
        isOpen={isResultOpen}
        winner={matchWinner}
        isWin={matchWinner === (user?.displayName || 'Player 1')}
        scoreText={`Final Points: ${players
          .map((p) => `${p.displayName.replace(' (AI)', '')}: ${p.points || 0}`)
          .join(' • ')}`}
        onPlayAgain={() => {
          setIsResultOpen(false);
          setPlayers((prev) =>
            prev.map((p) => ({
              ...p,
              score: 0,
              points: 0,
              suspectTokens: settings.suspectTokensPerRound,
              isExposed: false,
              exposedShape: null,
            }))
          );
          setCurrentRound(1);
          dealRound();
        }}
        onBackToLobby={onBack}
      />
    </div>
  );
};
