import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  RotateCcw,
  Bot,
  Users,
  Globe,
  Settings,
  HelpCircle,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Flame,
  Trophy,
  Check,
  Sparkles,
  Zap,
  Shield,
  Layers,
} from 'lucide-react';
import { soundEngine } from '../../audio/audioEngine';
import { useWhotStore } from '../../store/useWhotStore';
import { GameResultModal } from '../../components/GameResultModal';
import { saveMatchResult } from '../../lib/offlineSync';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { Avatar } from '../../components/Avatar';
import {
  PenBody,
  PlayerSlot,
  BiroMatchSettings,
  PlatformType,
  ControlScheme,
  KnockoutEvent,
  InkParticle,
  InkTrailPoint,
  Obstacle,
  Vector2D,
} from './types';
import {
  PEN_ARCHETYPES,
  resolvePenCollision,
  resolveObstacleCollision,
  isPenOutOfBounds,
  stepPenPhysics,
  areAllPensStopped,
  getPenEndpoints,
} from './physics';
import { calculateBotFlick, BotFlickDecision } from './ai';

interface BiroBattleGameProps {
  onBack: () => void;
}

const DEFAULT_SETTINGS: BiroMatchSettings = {
  bestOfRounds: 3,
  platformType: 'desk',
  chaosObstacles: false,
  balancedPens: true,
  turnTimeSeconds: 15,
  controlScheme: 'swipe',
};

const BOT_AVATARS = ['avatar-02', 'avatar-04', 'avatar-07', 'avatar-09'];
const BOT_NAMES = ['Tobi (AI)', 'Emeka (AI)', 'Chi (AI)'];

export const BiroBattleGame: React.FC<BiroBattleGameProps> = ({ onBack }) => {
  const { user, isMuted, toggleMute } = useWhotStore();
  const [searchParams] = useSearchParams();
  const roomCodeParam = searchParams.get('room') || '';

  // Mode and setup
  const [mode, setMode] = useState<'ai' | 'pass' | 'online'>(roomCodeParam ? 'online' : 'ai');
  const [numPlayers, setNumPlayers] = useState<2 | 3>(2);
  const [botDifficulty, setBotDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [matchSettings, setMatchSettings] = useState<BiroMatchSettings>(DEFAULT_SETTINGS);

  // Match progression
  const [players, setPlayers] = useState<PlayerSlot[]>([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [isSimulating, setIsSimulating] = useState(false);
  const [turnTimer, setTurnTimer] = useState(15);
  const [suddenDeathActive, setSuddenDeathActive] = useState(false);
  const [suddenDeathTurns, setSuddenDeathTurns] = useState(0);
  const [shrinkMultiplier, setShrinkMultiplier] = useState(1.0);

  // Elimination Banner & Feedback
  const [koBanner, setKoBanner] = useState<{
    text: string;
    subText?: string;
    avatarId?: string;
    avatarUrl?: string;
    streak?: number;
  } | null>(null);

  // Modals & Panels
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isResultOpen, setIsResultOpen] = useState(false);
  const [matchWinner, setMatchWinner] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(() => {
    return typeof window !== 'undefined' ? !localStorage.getItem('gbedu_biro_tutorial_seen') : true;
  });

  // Canvas and Physics Refs (Keeps 60fps simulation outside React render tree)
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pensRef = useRef<PenBody[]>([]);
  const particlesRef = useRef<InkParticle[]>([]);
  const inkTrailsRef = useRef<Map<string, InkTrailPoint[]>>(new Map());
  const obstaclesRef = useRef<Obstacle[]>([]);
  const animFrameId = useRef<number | null>(null);

  // Drag interaction refs
  const dragStartRef = useRef<Vector2D | null>(null);
  const dragCurrentRef = useRef<Vector2D | null>(null);
  const isDraggingPenRef = useRef(false);
  const activePenIdRef = useRef<string | null>(null);

  // AI bot planning indicator ref
  const botAimPreviewRef = useRef<{ x: number; y: number; angle: number; power: number } | null>(null);

  // Dimensions
  const viewWidthRef = useRef(380);
  const viewHeightRef = useRef(520);
  const platCenterRef = useRef<Vector2D>({ x: 190, y: 260 });
  const platSizeRef = useRef<{ w: number; h: number }>({ w: 320, h: 420 });

  // Consecutive KOs tracking
  const lastAttackerIdRef = useRef<string | null>(null);
  const matchKOsStreakRef = useRef(0);

  // 1. Initialize Players on Mount / Mode Change
  const setupPlayers = useCallback(() => {
    const list: PlayerSlot[] = [];
    const myId = user?.id || 'player_1';
    const myName = user?.displayName || user?.username || 'Player 1';
    const myAvatar = user?.avatarId || 'avatar-01';

    // Player 1 (Local user)
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
      score: 0,
      consecutiveKOs: 0,
      penArchetype: 'classic',
      isConnected: true,
    });

    if (mode === 'ai') {
      // 1 or 2 Computer bots
      const botCount = numPlayers - 1;
      for (let i = 0; i < botCount; i++) {
        const botId = `bot_${i + 1}`;
        list.push({
          id: botId,
          userId: botId,
          displayName: BOT_NAMES[i % BOT_NAMES.length],
          username: BOT_NAMES[i % BOT_NAMES.length],
          avatarId: BOT_AVATARS[i % BOT_AVATARS.length],
          isBot: true,
          botDifficulty,
          isHost: false,
          seatIndex: i + 1,
          score: 0,
          consecutiveKOs: 0,
          penArchetype: (['fountain', 'parker', 'stylus'] as const)[i % 3],
          isConnected: true,
        });
      }
    } else if (mode === 'pass') {
      // Local Pass & Play opponents
      for (let i = 1; i < numPlayers; i++) {
        const pId = `local_p${i + 1}`;
        list.push({
          id: pId,
          userId: pId,
          displayName: `Player ${i + 1}`,
          username: `player_${i + 1}`,
          avatarId: BOT_AVATARS[i % BOT_AVATARS.length],
          isBot: false,
          isHost: false,
          seatIndex: i,
          score: 0,
          consecutiveKOs: 0,
          penArchetype: (['fountain', 'parker', 'stylus'] as const)[i % 3],
          isConnected: true,
        });
      }
    } else {
      // Online mode placeholder seats (populated by Room)
      for (let i = 1; i < numPlayers; i++) {
        const pId = `challenger_${i}`;
        list.push({
          id: pId,
          userId: pId,
          displayName: `Challenger ${i}`,
          username: `challenger_${i}`,
          avatarId: BOT_AVATARS[i % BOT_AVATARS.length],
          isBot: false,
          isHost: false,
          seatIndex: i,
          score: 0,
          consecutiveKOs: 0,
          penArchetype: 'parker',
          isConnected: true,
        });
      }
    }

    setPlayers(list);
    const initialScores: Record<string, number> = {};
    list.forEach((p) => {
      initialScores[p.id] = 0;
    });
    setScores(initialScores);
  }, [user, mode, numPlayers, botDifficulty]);

  // 2. Spawn Pens for Current Round
  const spawnPens = useCallback(() => {
    if (players.length === 0) return;

    const pw = platSizeRef.current.w;
    const ph = platSizeRef.current.h;
    const cx = platCenterRef.current.x;
    const cy = platCenterRef.current.y;

    // Build obstacles if Chaos setting enabled
    if (matchSettings.chaosObstacles) {
      obstaclesRef.current = [
        {
          id: 'eraser',
          type: 'eraser',
          x: cx,
          y: cy,
          width: 54,
          height: 32,
          rotation: 0.15,
          color: '#ffffff',
        },
        {
          id: 'ruler',
          type: 'ruler',
          x: cx + pw * 0.28,
          y: cy - ph * 0.2,
          width: 130,
          height: 14,
          rotation: -0.65,
          color: 'rgba(251, 191, 36, 0.75)',
        },
      ];
    } else {
      obstaclesRef.current = [];
    }

    // Spawn pen positions symmetrically around platform
    // Player 0 (local user) is ALWAYS at bottom facing up
    const newPens: PenBody[] = [];
    const count = players.length;

    // Colors for pens
    const penPalette = ['#0284c7', '#ff7a00', '#1fd1a0', '#ffb703'];

    players.forEach((p, index) => {
      let x = cx;
      let y = cy + ph * 0.36;
      let angle = -Math.PI / 2; // Facing up

      if (count === 2) {
        if (index === 0) {
          x = cx;
          y = cy + ph * 0.35;
          angle = -Math.PI / 2; // Facing up
        } else {
          x = cx;
          y = cy - ph * 0.35;
          angle = Math.PI / 2; // Facing down
        }
      } else if (count === 3) {
        if (index === 0) {
          x = cx;
          y = cy + ph * 0.35;
          angle = -Math.PI / 2;
        } else if (index === 1) {
          x = cx - pw * 0.32;
          y = cy - ph * 0.25;
          angle = Math.PI / 4;
        } else {
          x = cx + pw * 0.32;
          y = cy - ph * 0.25;
          angle = (3 * Math.PI) / 4;
        }
      }

      const archetypeStats = PEN_ARCHETYPES[p.penArchetype] || PEN_ARCHETYPES.classic;
      // In balanced pens mode, all pens share identical physical mass & length
      const effectiveMass = matchSettings.balancedPens ? 1.0 : archetypeStats.mass;
      const effectiveLength = matchSettings.balancedPens ? 64 : archetypeStats.length;
      const effectiveWidth = matchSettings.balancedPens ? 12 : archetypeStats.width;
      const effectiveRestitution = matchSettings.balancedPens ? 0.64 : archetypeStats.restitution;

      newPens.push({
        id: p.id,
        playerId: p.id,
        x,
        y,
        vx: 0,
        vy: 0,
        angle,
        omega: 0,
        mass: effectiveMass,
        length: effectiveLength,
        width: effectiveWidth,
        restitution: effectiveRestitution,
        friction: archetypeStats.friction,
        archetype: p.penArchetype,
        color: penPalette[index % penPalette.length],
        inkColor: penPalette[index % penPalette.length],
        isEliminated: false,
        streak: 0,
      });
    });

    pensRef.current = newPens;
    particlesRef.current = [];
    inkTrailsRef.current.clear();
    setSuddenDeathActive(false);
    setSuddenDeathTurns(0);
    setShrinkMultiplier(1.0);
    setCurrentTurnIndex(0);
    setIsSimulating(false);
    setTurnTimer(matchSettings.turnTimeSeconds);
  }, [players, matchSettings]);

  // Setup on mount / mode change
  useEffect(() => {
    setupPlayers();
  }, [setupPlayers]);

  useEffect(() => {
    if (players.length > 0) {
      spawnPens();
    }
  }, [players.length, currentRound, spawnPens]);

  // Handle Resize and High-DPI setup for canvas
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      const w = Math.min(390, Math.max(340, rect.width || 360));
      const h = Math.min(540, Math.max(460, rect.height || 500));

      viewWidthRef.current = w;
      viewHeightRef.current = h;
      platCenterRef.current = { x: w / 2, y: h / 2 };

      // Set platform dimensions proportional to canvas
      platSizeRef.current = {
        w: matchSettings.platformType === 'book' ? w * 0.76 : w * 0.86,
        h: matchSettings.platformType === 'round' ? w * 0.84 : h * 0.82,
      };

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [matchSettings.platformType]);

  // 3. Turn Timer Countdown (15s)
  useEffect(() => {
    if (isSimulating || isPaused || isResultOpen || players.length === 0) return;

    const interval = setInterval(() => {
      setTurnTimer((prev) => {
        if (prev <= 1) {
          // Automatic emergency flick when timer runs out
          handleTurnTimeout();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isSimulating, isPaused, isResultOpen, currentTurnIndex, players.length]);

  // Timeout handler: automatic weak flick in random forward direction
  const handleTurnTimeout = () => {
    const activePlayer = players[currentTurnIndex];
    if (!activePlayer) return;
    const activePen = pensRef.current.find((p) => p.id === activePlayer.id && !p.isEliminated);
    if (!activePen) return;

    soundEngine.playVocalAdlib('ehn');
    executeFlick(activePen, activePen.angle, 0.35);
  };

  // 4. Trigger Next Turn
  const advanceTurn = useCallback(() => {
    if (pensRef.current.length === 0) return;

    // Check surviving pens
    const activePens = pensRef.current.filter((p) => !p.isEliminated);

    // Round Over Check
    if (activePens.length <= 1) {
      handleRoundCompleted(activePens[0] || null);
      return;
    }

    // Advance to next active player
    let nextIndex = (currentTurnIndex + 1) % players.length;
    let attempts = 0;
    while (
      pensRef.current.find((p) => p.id === players[nextIndex].id)?.isEliminated &&
      attempts < players.length
    ) {
      nextIndex = (nextIndex + 1) % players.length;
      attempts++;
    }

    setCurrentTurnIndex(nextIndex);
    setTurnTimer(matchSettings.turnTimeSeconds);
    setIsSimulating(false);

    // Sudden death progression: 8 turns with no knockout shrinks platform
    setSuddenDeathTurns((prev) => {
      const nextCount = prev + 1;
      if (nextCount >= 8) {
        setSuddenDeathActive(true);
        setShrinkMultiplier((sm) => Math.max(0.65, sm - 0.04));
      }
      return nextCount;
    });
  }, [currentTurnIndex, players, matchSettings.turnTimeSeconds]);

  // 5. Round Completion & Scoring
  const handleRoundCompleted = (winnerPen: PenBody | null) => {
    setIsSimulating(false);

    if (!winnerPen) {
      // Draw (both fell on same turn)
      soundEngine.playTalkingDrum(false);
      setKoBanner({
        text: 'STALEMATE DRAW!',
        subText: 'Both pens fell off! Replaying round.',
      });
      setTimeout(() => {
        setKoBanner(null);
        spawnPens();
      }, 2000);
      return;
    }

    const roundWinner = players.find((p) => p.id === winnerPen.id);
    const winnerName = roundWinner?.displayName || 'Winner';

    soundEngine.playWin();
    setKoBanner({
      text: `${winnerName.toUpperCase()} WINS ROUND ${currentRound}!`,
      avatarId: roundWinner?.avatarId,
      avatarUrl: roundWinner?.avatarUrl,
      streak: matchKOsStreakRef.current > 1 ? matchKOsStreakRef.current : undefined,
    });

    const nextScores = { ...scores, [winnerPen.id]: (scores[winnerPen.id] || 0) + 1 };
    setScores(nextScores);

    const neededToWin = Math.ceil(matchSettings.bestOfRounds / 2);

    if (nextScores[winnerPen.id] >= neededToWin) {
      // Match Won!
      setTimeout(() => {
        setKoBanner(null);
        setMatchWinner(winnerName);
        setIsResultOpen(true);

        const isUserWinner = winnerPen.id === user?.id;
        saveMatchResult({
          userId: user?.id || 'guest',
          gameId: 'biro-soccer',
          gameName: 'Biro Battle',
          mode: mode === 'ai' ? 'ai' : mode === 'pass' ? 'pass' : 'online',
          outcome: isUserWinner ? 'win' : 'loss',
          xpEarned: isUserWinner ? 200 : 60,
          coinsEarned: isUserWinner ? 40 : 15,
        }).catch(() => {});

        // Update Zustand stats
        const currentStats = useWhotStore.getState().stats;
        useWhotStore.setState({
          stats: {
            ...currentStats,
            gamesPlayed: currentStats.gamesPlayed + 1,
            gamesWon: isUserWinner ? currentStats.gamesWon + 1 : currentStats.gamesWon,
            streak: isUserWinner ? (currentStats.streak || 0) + 1 : 0,
          },
        });
      }, 1800);
    } else {
      // Next Round
      setTimeout(() => {
        setKoBanner(null);
        setCurrentRound((r) => r + 1);
        spawnPens();
      }, 1900);
    }
  };

  // 6. Execute Flick Action
  const executeFlick = (pen: PenBody, angle: number, power: number) => {
    setIsSimulating(true);
    lastAttackerIdRef.current = pen.id;

    const MAX_SPEED = 23;
    const speed = Math.max(4, power * MAX_SPEED);

    pen.vx = Math.cos(angle) * speed;
    pen.vy = Math.sin(angle) * speed;
    // Add realistic subtle off-axis launch torque
    pen.omega = (Math.random() - 0.5) * 0.22;

    soundEngine.playFlickSwish(power);

    // Emit initial ink spurt
    for (let i = 0; i < 7; i++) {
      particlesRef.current.push({
        x: pen.x,
        y: pen.y,
        vx: -pen.vx * 0.15 + (Math.random() - 0.5) * 2,
        vy: -pen.vy * 0.15 + (Math.random() - 0.5) * 2,
        radius: 2 + Math.random() * 2.5,
        opacity: 0.9,
        color: pen.inkColor,
        life: 1.0,
      });
    }

    // Dismiss tutorial once user flicks
    if (showTutorial) {
      setShowTutorial(false);
      try {
        localStorage.setItem('gbedu_biro_tutorial_seen', 'true');
      } catch {}
    }
  };

  // 7. Computer AI Turn Automation
  useEffect(() => {
    const activePlayer = players[currentTurnIndex];
    if (!activePlayer || !activePlayer.isBot || isSimulating || isPaused || isResultOpen) return;

    const botPen = pensRef.current.find((p) => p.id === activePlayer.id && !p.isEliminated);
    if (!botPen) {
      advanceTurn();
      return;
    }

    // Calculate decision
    const decision = calculateBotFlick(
      botPen,
      pensRef.current,
      activePlayer.botDifficulty || 'medium',
      matchSettings.platformType,
      platSizeRef.current.w,
      platSizeRef.current.h,
      platCenterRef.current.x,
      platCenterRef.current.y,
      shrinkMultiplier,
      obstaclesRef.current
    );

    // Show faint ghost aim line for human anticipation (1.1s)
    botAimPreviewRef.current = {
      x: botPen.x,
      y: botPen.y,
      angle: decision.angle,
      power: decision.power,
    };

    const timer = setTimeout(() => {
      botAimPreviewRef.current = null;
      executeFlick(botPen, decision.angle, decision.power);
    }, 1100);

    return () => clearTimeout(timer);
  }, [currentTurnIndex, isSimulating, isPaused, isResultOpen, players, matchSettings.platformType, shrinkMultiplier, advanceTurn]);

  // 8. Main 60fps Physics & Render Loop
  useEffect(() => {
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min(32, time - lastTime);
      lastTime = time;

      const canvas = canvasRef.current;
      if (!canvas) {
        animFrameId.current = requestAnimationFrame(loop);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animFrameId.current = requestAnimationFrame(loop);
        return;
      }

      const w = viewWidthRef.current;
      const h = viewHeightRef.current;
      const cx = platCenterRef.current.x;
      const cy = platCenterRef.current.y;
      const pw = platSizeRef.current.w * shrinkMultiplier;
      const ph = platSizeRef.current.h * shrinkMultiplier;

      // --- PHYSICS UPDATE (Sub-stepping for rock-solid stability) ---
      if (isSimulating && !isPaused) {
        const subSteps = 2;
        for (let s = 0; s < subSteps; s++) {
          // 1. Move and damp pens
          pensRef.current.forEach((pen) => {
            if (pen.isEliminated) return;
            stepPenPhysics(pen);

            // Record ink trail point
            const speed = Math.hypot(pen.vx, pen.vy);
            if (speed > 1.2) {
              const trail = inkTrailsRef.current.get(pen.id) || [];
              trail.push({
                x: pen.x,
                y: pen.y,
                opacity: 0.7,
                width: Math.min(3.5, 1.2 + speed * 0.15),
              });
              if (trail.length > 28) trail.shift();
              inkTrailsRef.current.set(pen.id, trail);
            }

            // Check Obstacles
            obstaclesRef.current.forEach((obs) => {
              const res = resolveObstacleCollision(pen, obs);
              if (res.collided) {
                soundEngine.playPenClack(0.7);
              }
            });
          });

          // 2. Pen to Pen Collisions
          for (let i = 0; i < pensRef.current.length; i++) {
            for (let j = i + 1; j < pensRef.current.length; j++) {
              const pA = pensRef.current[i];
              const pB = pensRef.current[j];
              const res = resolvePenCollision(pA, pB);
              if (res.collided && res.impactIntensity > 0.08) {
                soundEngine.playPenClack(res.impactIntensity);
                // Emit impact spark particles
                for (let k = 0; k < 4; k++) {
                  particlesRef.current.push({
                    x: res.contactX,
                    y: res.contactY,
                    vx: (Math.random() - 0.5) * 4,
                    vy: (Math.random() - 0.5) * 4,
                    radius: 1.5 + Math.random() * 2,
                    opacity: 0.9,
                    color: Math.random() > 0.5 ? pA.inkColor : pB.inkColor,
                    life: 0.8,
                  });
                }
              }
            }
          }

          // 3. Platform Boundary & Edge Overhang Check
          pensRef.current.forEach((pen) => {
            if (pen.isEliminated) return;

            const out = isPenOutOfBounds(
              pen,
              matchSettings.platformType,
              platSizeRef.current.w,
              platSizeRef.current.h,
              cx,
              cy,
              shrinkMultiplier
            );

            if (out) {
              // Pen fell off table!
              pen.isEliminated = true;
              pen.fallAnimation = {
                progress: 0,
                scale: 1.0,
                rotateSpeed: (Math.random() - 0.5) * 0.35,
                opacity: 1.0,
              };

              soundEngine.playFallWhoosh();
              try {
                if (navigator.vibrate) navigator.vibrate([40, 30, 80]);
              } catch {}

              // KO Event & Streak
              const victim = players.find((pl) => pl.id === pen.id);
              const attacker = players.find((pl) => pl.id === lastAttackerIdRef.current);
              const isSelf = !attacker || attacker.id === victim?.id;

              if (isSelf) {
                matchKOsStreakRef.current = 0;
                setKoBanner({
                  text: 'SELF-ELIMINATED!',
                  subText: `${victim?.displayName || 'Player'} flicked off the edge!`,
                  avatarId: victim?.avatarId,
                });
              } else {
                matchKOsStreakRef.current += 1;
                setSuddenDeathTurns(0); // Reset sudden death clock
                setKoBanner({
                  text: 'KNOCKED OUT!',
                  subText: `${attacker.displayName} knocked out ${victim?.displayName}!`,
                  avatarId: attacker.avatarId,
                  avatarUrl: attacker.avatarUrl,
                  streak: matchKOsStreakRef.current > 1 ? matchKOsStreakRef.current : undefined,
                });
                soundEngine.playKnockoutFanfare();
              }

              setTimeout(() => {
                setKoBanner(null);
              }, 2200);
            }
          });
        }

        // Check if all pens have stopped moving
        if (areAllPensStopped(pensRef.current)) {
          advanceTurn();
        }
      }

      // --- UPDATE PARTICLES & TRAILS ---
      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.94;
        p.vy *= 0.94;
        p.opacity -= 0.025;
      });
      particlesRef.current = particlesRef.current.filter((p) => p.opacity > 0.05);

      // Fade ink trails
      inkTrailsRef.current.forEach((points) => {
        points.forEach((pt) => {
          pt.opacity *= 0.985;
        });
      });

      // --- RENDERING CANVAS ---
      ctx.clearRect(0, 0, w, h);

      // 1. Room Floor Ambient Gradient
      const floorGrad = ctx.createRadialGradient(cx, cy, 50, cx, cy, w);
      floorGrad.addColorStop(0, '#11192e');
      floorGrad.addColorStop(1, '#070c18');
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, 0, w, h);

      // 2. Platform Drop Shadow
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
      ctx.shadowBlur = 32;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 14;

      // Draw Platform Surface Base
      if (matchSettings.platformType === 'round') {
        const rad = Math.min(pw, ph) / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.fillStyle = '#2b1b11'; // Mahogany wood
        ctx.fill();
        ctx.restore();

        // Round table rim & wood grain rings
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#452b1b';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, rad - 18, 0, Math.PI * 2);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(255, 183, 3, 0.15)';
        ctx.stroke();
        ctx.restore();
      } else if (matchSettings.platformType === 'notebook') {
        const halfW = pw / 2;
        const halfH = ph / 2;
        ctx.beginPath();
        ctx.roundRect(cx - halfW, cy - halfH, pw, ph, 14);
        ctx.fillStyle = '#f8fafc'; // Crisp notebook paper
        ctx.fill();
        ctx.restore();

        // Notebook Ruled Lines & Red Margin Line
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(cx - halfW, cy - halfH, pw, ph, 14);
        ctx.clip();

        // Red left margin line
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - halfW + 42, cy - halfH);
        ctx.lineTo(cx - halfW + 42, cy + halfH);
        ctx.stroke();

        // Blue horizontal ruled lines
        ctx.strokeStyle = '#93c5fd';
        ctx.lineWidth = 1;
        for (let ly = cy - halfH + 28; ly < cy + halfH; ly += 24) {
          ctx.beginPath();
          ctx.moveTo(cx - halfW, ly);
          ctx.lineTo(cx + halfW, ly);
          ctx.stroke();
        }

        // Spiral binding holes on left
        for (let hy = cy - halfH + 18; hy < cy + halfH; hy += 24) {
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(cx - halfW + 12, hy, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      } else if (matchSettings.platformType === 'book') {
        const halfW = pw / 2;
        const halfH = ph / 2;
        ctx.beginPath();
        ctx.roundRect(cx - halfW, cy - halfH, pw, ph, 18);
        ctx.fillStyle = '#1e293b'; // Hardcover leather
        ctx.fill();
        ctx.restore();

        // Gold decorative embossed border
        ctx.save();
        ctx.strokeStyle = '#ffb703';
        ctx.lineWidth = 2;
        ctx.strokeRect(cx - halfW + 10, cy - halfH + 10, pw - 20, ph - 20);
        ctx.restore();
      } else {
        // Standard Classroom Desk (Rich warm cedar wood)
        const halfW = pw / 2;
        const halfH = ph / 2;
        ctx.beginPath();
        ctx.roundRect(cx - halfW, cy - halfH, pw, ph, 16);
        ctx.fillStyle = '#3c2415';
        ctx.fill();
        ctx.restore();

        // Beveled desk rim
        ctx.save();
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#57371f';
        ctx.strokeRect(cx - halfW + 2, cy - halfH + 2, pw - 4, ph - 4);

        // Subtle wood grain horizontal lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 2;
        for (let gy = cy - halfH + 30; gy < cy + halfH; gy += 45) {
          ctx.beginPath();
          ctx.moveTo(cx - halfW, gy);
          ctx.lineTo(cx + halfW, gy);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Sudden Death Warning Rim if active
      if (suddenDeathActive) {
        ctx.save();
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.65)';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 6]);
        if (matchSettings.platformType === 'round') {
          ctx.beginPath();
          ctx.arc(cx, cy, (Math.min(pw, ph) / 2) + 2, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.strokeRect(cx - pw / 2 - 2, cy - ph / 2 - 2, pw + 4, ph + 4);
        }
        ctx.restore();
      }

      // 3. Obstacles (Eraser / Ruler)
      obstaclesRef.current.forEach((obs) => {
        ctx.save();
        ctx.translate(obs.x, obs.y);
        ctx.rotate(obs.rotation);

        if (obs.type === 'eraser') {
          // Eraser with drop shadow
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.roundRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height, 6);
          ctx.fill();

          // Blue sleeve wrapper
          ctx.fillStyle = '#2563eb';
          ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width * 0.45, obs.height);

          // Brand imprint
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 8px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('GBEDU', -obs.width / 4, 0);
        } else {
          // Amber school ruler
          ctx.fillStyle = obs.color;
          ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
          // Ruler tick marks
          ctx.fillStyle = '#78350f';
          for (let tx = -obs.width / 2 + 5; tx < obs.width / 2; tx += 6) {
            ctx.fillRect(tx, -obs.height / 2, 1, 4);
          }
        }
        ctx.restore();
      });

      // 4. Ink Trails (fading ink strokes left on table)
      inkTrailsRef.current.forEach((points, penId) => {
        const pen = pensRef.current.find((p) => p.id === penId);
        const color = pen?.inkColor || '#0284c7';

        if (points.length < 2) return;
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (let i = 1; i < points.length; i++) {
          const p1 = points[i - 1];
          const p2 = points[i];
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = color;
          ctx.globalAlpha = p2.opacity * 0.7;
          ctx.lineWidth = p2.width;
          ctx.stroke();
        }
        ctx.restore();
      });

      // 5. Ink Particles
      particlesRef.current.forEach((p) => {
        ctx.save();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 6. Draw Pens
      pensRef.current.forEach((pen) => {
        // If pen has fallen, animate shrink/fade
        if (pen.isEliminated) {
          if (pen.fallAnimation && pen.fallAnimation.progress < 1.0) {
            pen.fallAnimation.progress += 0.035;
            pen.fallAnimation.scale = Math.max(0.01, 1.0 - pen.fallAnimation.progress * 1.1);
            pen.fallAnimation.opacity = Math.max(0, 1.0 - pen.fallAnimation.progress * 1.2);
            pen.angle += pen.fallAnimation.rotateSpeed;

            ctx.save();
            ctx.translate(pen.x, pen.y);
            ctx.rotate(pen.angle);
            ctx.scale(pen.fallAnimation.scale, pen.fallAnimation.scale);
            ctx.globalAlpha = pen.fallAnimation.opacity;
            drawPenBody(ctx, pen, false);
            ctx.restore();
          }
          return;
        }

        const isCurrentTurnPen = players[currentTurnIndex]?.id === pen.id;

        ctx.save();
        ctx.translate(pen.x, pen.y);
        ctx.rotate(pen.angle);

        // Active Player Glow Ring
        if (isCurrentTurnPen && !isSimulating) {
          ctx.save();
          const pulse = Math.sin(time * 0.007) * 4 + 8;
          ctx.strokeStyle = pen.color;
          ctx.lineWidth = 2.5;
          ctx.shadowColor = pen.color;
          ctx.shadowBlur = pulse;
          ctx.beginPath();
          ctx.ellipse(0, 0, pen.length * 0.65 + pulse * 0.5, pen.width * 1.8 + pulse * 0.5, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        drawPenBody(ctx, pen, isCurrentTurnPen);
        ctx.restore();
      });

      // 7. Aim Trajectory & Ink Power Meter (when player is dragging)
      if (isDraggingPenRef.current && dragStartRef.current && dragCurrentRef.current) {
        const start = dragStartRef.current;
        const curr = dragCurrentRef.current;
        const dx = curr.x - start.x;
        const dy = curr.y - start.y;
        const rawDist = Math.hypot(dx, dy);

        // Invert vector if pull-back (slingshot) mode
        const isPullback = matchSettings.controlScheme === 'pullback';
        const aimAngle = isPullback ? Math.atan2(-dy, -dx) : Math.atan2(dy, dx);
        const powerNorm = Math.min(1.0, Math.max(0.1, rawDist / 130));

        const activePen = pensRef.current.find((p) => p.id === activePenIdRef.current);

        if (activePen && rawDist > 14) {
          ctx.save();
          // Dotted Aim Line
          ctx.setLineDash([6, 5]);
          ctx.strokeStyle = activePen.inkColor;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(activePen.x, activePen.y);
          const aimLen = 50 + powerNorm * 110;
          const targetX = activePen.x + Math.cos(aimAngle) * aimLen;
          const targetY = activePen.y + Math.sin(aimAngle) * aimLen;
          ctx.lineTo(targetX, targetY);
          ctx.stroke();

          // Aim Target Arrowhead
          ctx.fillStyle = activePen.inkColor;
          ctx.beginPath();
          ctx.arc(targetX, targetY, 4.5, 0, Math.PI * 2);
          ctx.fill();

          // Ink Droplet Power Meter
          ctx.setLineDash([]);
          const meterX = activePen.x;
          const meterY = activePen.y - 45;
          ctx.fillStyle = 'rgba(13, 20, 38, 0.85)';
          ctx.strokeStyle = '#26314d';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(meterX - 35, meterY - 14, 70, 26, 8);
          ctx.fill();
          ctx.stroke();

          // Power Bar
          const barW = 54 * powerNorm;
          const powerColor = powerNorm > 0.8 ? '#ef4444' : powerNorm > 0.5 ? '#ffb703' : '#1fd1a0';
          ctx.fillStyle = powerColor;
          ctx.fillRect(meterX - 27, meterY - 4, barW, 8);

          // Power %
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${Math.round(powerNorm * 100)}%`, meterX, meterY + 18);
          ctx.restore();
        }
      }

      // 8. Bot Ghost Aim Line (faint line showing bot thinking)
      if (botAimPreviewRef.current) {
        const botAim = botAimPreviewRef.current;
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(255, 183, 3, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(botAim.x, botAim.y);
        ctx.lineTo(
          botAim.x + Math.cos(botAim.angle) * (50 + botAim.power * 80),
          botAim.y + Math.sin(botAim.angle) * (50 + botAim.power * 80)
        );
        ctx.stroke();
        ctx.restore();
      }

      animFrameId.current = requestAnimationFrame(loop);
    };

    animFrameId.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [isSimulating, isPaused, currentTurnIndex, suddenDeathActive, shrinkMultiplier, matchSettings.controlScheme, matchSettings.platformType, players, advanceTurn]);

  // Helper: Detailed Procedural Biro Rendering
  const drawPenBody = (ctx: CanvasRenderingContext2D, pen: PenBody, isActive: boolean) => {
    const halfL = pen.length / 2;
    const halfW = pen.width / 2;

    // 1. Transparent / Colored Barrel (Hexagonal or Capsule)
    ctx.fillStyle = pen.color;
    ctx.beginPath();
    ctx.roundRect(-halfL, -halfW, pen.length, pen.width, halfW * 0.6);
    ctx.fill();

    // 2. Shiny Highlight Stripe along barrel
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillRect(-halfL + 8, -halfW + 2, pen.length - 16, 2.5);

    // 3. Ink Reservoir Tube inside
    ctx.fillStyle = pen.inkColor;
    ctx.fillRect(-halfL + 12, -2, pen.length - 24, 4);

    // 4. Pen Cap & Clip on Left End (-X)
    ctx.fillStyle = '#0f172a'; // Dark cap plug
    ctx.fillRect(-halfL - 2, -halfW, 7, pen.width);

    // Pen Pocket Clip
    ctx.fillStyle = '#d97706';
    ctx.fillRect(-halfL + 4, halfW - 2, 14, 3);

    // 5. Pen Nib / Cone on Right End (+X)
    ctx.fillStyle = '#94a3b8'; // Metal cone
    ctx.beginPath();
    ctx.moveTo(halfL, -halfW);
    ctx.lineTo(halfL + 7, -2);
    ctx.lineTo(halfL + 10, 0); // Ballpoint tip
    ctx.lineTo(halfL + 7, 2);
    ctx.lineTo(halfL, halfW);
    ctx.closePath();
    ctx.fill();

    // Ballpoint ink dot
    ctx.fillStyle = pen.inkColor;
    ctx.beginPath();
    ctx.arc(halfL + 9.5, 0, 1.4, 0, Math.PI * 2);
    ctx.fill();

    // 6. Avatar Sticker Icon on pen center
    const owner = players.find((p) => p.id === pen.id);
    if (owner) {
      ctx.save();
      ctx.fillStyle = 'rgba(13, 20, 38, 0.9)';
      ctx.beginPath();
      ctx.arc(0, 0, halfW + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = pen.color;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Mini text badge or initials
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(owner.displayName.slice(0, 2).toUpperCase(), 0, 0);
      ctx.restore();
    }
  };

  // --- 9. POINTER TOUCH / SWIPE CONTROLS ---
  // Pointer events with touch-action: none on the game canvas only
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isSimulating || isPaused || isResultOpen) return;

    const activePlayer = players[currentTurnIndex];
    if (!activePlayer) return;

    // In AI mode, humans can only touch player 1
    if (mode === 'ai' && activePlayer.isBot) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touchX = e.clientX - rect.left;
    const touchY = e.clientY - rect.top;

    const activePen = pensRef.current.find((p) => p.id === activePlayer.id && !p.isEliminated);
    if (!activePen) return;

    // Check distance to pen (generous 36px touch zone)
    const distToPen = Math.hypot(touchX - activePen.x, touchY - activePen.y);
    if (distToPen < 42) {
      canvas.setPointerCapture(e.pointerId);
      isDraggingPenRef.current = true;
      activePenIdRef.current = activePen.id;
      dragStartRef.current = { x: touchX, y: touchY };
      dragCurrentRef.current = { x: touchX, y: touchY };
      soundEngine.playClick();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingPenRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    dragCurrentRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingPenRef.current || !dragStartRef.current || !dragCurrentRef.current) {
      isDraggingPenRef.current = false;
      return;
    }

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    const start = dragStartRef.current;
    const end = dragCurrentRef.current;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dist = Math.hypot(dx, dy);

    // Minimum swipe distance (taps cancel cleanly)
    if (dist >= 18) {
      const isPullback = matchSettings.controlScheme === 'pullback';
      const angle = isPullback ? Math.atan2(-dy, -dx) : Math.atan2(dy, dx);
      const power = Math.min(1.0, Math.max(0.2, dist / 130));

      const activePen = pensRef.current.find((p) => p.id === activePenIdRef.current);
      if (activePen) {
        executeFlick(activePen, angle, power);
      }
    }

    isDraggingPenRef.current = false;
    dragStartRef.current = null;
    dragCurrentRef.current = null;
    activePenIdRef.current = null;
  };

  const activePlayer = players[currentTurnIndex];
  const isMyTurn = activePlayer && (mode !== 'ai' || !activePlayer.isBot);

  return (
    <div className="w-full max-w-md mx-auto px-2 py-2 flex flex-col items-center select-none text-white relative">
      {/* 1. TOP STATUS BAR: Back Button, Player Turn Pills & Settings */}
      <div className="w-full flex items-center justify-between gap-2 mb-2 bg-[#141d33] border border-[#26314d] rounded-2xl px-3 py-2 shadow-lg">
        {/* Back Button */}
        <button
          onClick={() => {
            soundEngine.playClick();
            onBack();
          }}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white cursor-pointer transition-colors"
          title="Exit Match"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Players Score & Turn Indicator */}
        <div className="flex items-center gap-2 flex-1 justify-center">
          {players.map((p, idx) => {
            const isTurn = currentTurnIndex === idx;
            const pen = pensRef.current.find((item) => item.id === p.id);
            const isEliminated = pen?.isEliminated;

            return (
              <div
                key={p.id}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all ${
                  isEliminated
                    ? 'opacity-35 bg-black/40 border-gray-700 line-through'
                    : isTurn
                    ? 'bg-[#ff7a00]/20 border-[#ff7a00] text-white shadow-md'
                    : 'bg-black/30 border-[#26314d] text-gray-400'
                }`}
              >
                <div className="w-5 h-5 rounded-full overflow-hidden bg-black/40 flex items-center justify-center shrink-0">
                  <Avatar avatarId={p.avatarId} size="xs" />
                </div>
                <span className="truncate max-w-[65px]">{p.displayName}</span>
                {/* Score / Lives */}
                <span className="text-[10px] px-1 py-0.2 rounded bg-black/50 text-[#ffb703] font-mono">
                  {scores[p.id] || 0}
                </span>
              </div>
            );
          })}
        </div>

        {/* Options / Pause Button */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              soundEngine.playClick();
              setIsPaused(!isPaused);
            }}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white cursor-pointer"
            title="Pause / Settings"
          >
            {isPaused ? <Play className="w-4 h-4 text-[#1fd1a0]" /> : <Pause className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. MATCH INFO & TURN TIMER BANNER */}
      <div className="w-full flex items-center justify-between text-xs px-2 mb-1.5 font-bold">
        <div className="flex items-center gap-1.5 text-gray-300">
          <span className="text-[#ffb703] font-display uppercase">Round {currentRound}</span>
          <span className="text-gray-500">•</span>
          <span className="text-[11px] text-gray-400">First to {Math.ceil(matchSettings.bestOfRounds / 2)}</span>
          {suddenDeathActive && (
            <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[10px] animate-pulse">
              🔥 SUDDEN DEATH!
            </span>
          )}
        </div>

        {/* 15s Circular Turn Timer */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-gray-400">
            {isMyTurn ? 'YOUR TURN' : `${activePlayer?.displayName.toUpperCase()}'S TURN`}
          </span>
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-black border ${
              turnTimer <= 4
                ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-ping'
                : 'bg-black/40 border-[#ff7a00]/40 text-[#ff7a00]'
            }`}
          >
            {turnTimer}
          </div>
        </div>
      </div>

      {/* 3. GAME CANVAS VIEWPORT (touch-action: none ONLY on canvas) */}
      <div className="relative w-full max-w-[390px] aspect-[4/5] bg-[#0d1426] rounded-3xl border-2 border-[#26314d] shadow-2xl overflow-hidden flex items-center justify-center">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ touchAction: 'none' }}
          className="w-full h-full cursor-grab active:cursor-grabbing block"
        />

        {/* First Play Ghost-Hand Tutorial Overlay */}
        <AnimatePresence>
          {showTutorial && !isSimulating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTutorial(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center cursor-pointer pointer-events-auto z-20"
            >
              <motion.div
                animate={{ y: [0, -32, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                className="w-16 h-16 rounded-3xl bg-[#ff7a00] text-black text-3xl flex items-center justify-center shadow-xl shadow-[#ff7a00]/30 mb-3"
              >
                👆
              </motion.div>
              <h3 className="text-lg font-black font-display text-white">SWIPE TO FLICK!</h3>
              <p className="text-xs text-gray-300 mt-1 max-w-xs leading-relaxed">
                Touch your biro pen, drag in the direction you want to shoot, and release to knock rival pens off the table!
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTutorial(false);
                }}
                className="mt-4 px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20"
              >
                GOT IT, LET'S BATTLE!
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* KO / Impact Celebration Banner */}
        <AnimatePresence>
          {koBanner && (
            <motion.div
              initial={{ scale: 0.6, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: -15 }}
              className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 px-5 py-3.5 rounded-3xl bg-[#141d33]/95 border-2 border-[#ff7a00] text-center shadow-2xl backdrop-blur-md min-w-[240px]"
            >
              {koBanner.avatarId && (
                <div className="w-10 h-10 rounded-full mx-auto mb-1.5 overflow-hidden border-2 border-[#ffb703]">
                  <Avatar avatarId={koBanner.avatarId} size="sm" />
                </div>
              )}
              <h2 className="text-lg font-black font-display text-[#ff7a00] tracking-wide">
                {koBanner.text}
              </h2>
              {koBanner.subText && (
                <p className="text-xs text-gray-300 mt-0.5">{koBanner.subText}</p>
              )}
              {koBanner.streak && (
                <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500 text-rose-300 text-[10px] font-black">
                  <Flame className="w-3 h-3 fill-current" />
                  <span>{koBanner.streak}x KNOCKOUT STREAK!</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 4. BOTTOM ACTION & CONTROLS BAR */}
      <div className="w-full flex items-center justify-between mt-2.5 px-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              soundEngine.playClick();
              setIsRulesOpen(true);
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#141d33] hover:bg-white/10 text-gray-300 hover:text-white text-xs font-bold border border-[#26314d] cursor-pointer transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#ffb703]" />
            <span>Rules</span>
          </button>

          <button
            onClick={() => {
              soundEngine.playClick();
              setIsSettingsOpen(true);
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#141d33] hover:bg-white/10 text-gray-300 hover:text-white text-xs font-bold border border-[#26314d] cursor-pointer transition-colors"
          >
            <Settings className="w-3.5 h-3.5 text-[#ff7a00]" />
            <span>Settings</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="p-2 rounded-xl bg-[#141d33] hover:bg-white/10 text-gray-300 hover:text-white border border-[#26314d] cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-[#1fd1a0]" />}
          </button>

          <button
            onClick={() => {
              soundEngine.playClick();
              spawnPens();
            }}
            className="p-2 rounded-xl bg-[#141d33] hover:bg-white/10 text-gray-300 hover:text-white border border-[#26314d] cursor-pointer"
            title="Reset Round"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 5. MATCH SETTINGS BOTTOM SHEET */}
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
                <h3 className="text-base font-black font-display text-white">Biro Battle Settings</h3>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="text-gray-400 hover:text-white text-xs font-bold"
                >
                  Done
                </button>
              </div>

              {/* Opponent Mode */}
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1.5">Game Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setMode('ai');
                      setIsSettingsOpen(false);
                    }}
                    className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                      mode === 'ai' ? 'bg-[#ff7a00] text-black border-[#ff7a00]' : 'bg-[#0d1426] text-gray-400 border-[#26314d]'
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
                      mode === 'pass' ? 'bg-[#ff7a00] text-black border-[#ff7a00]' : 'bg-[#0d1426] text-gray-400 border-[#26314d]'
                    }`}
                  >
                    Pass & Play
                  </button>
                </div>
              </div>

              {/* Number of Players: 2 or 3 */}
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1.5">Number of Pens (Players)</label>
                <div className="grid grid-cols-2 gap-2">
                  {[2, 3].map((num) => (
                    <button
                      key={num}
                      onClick={() => setNumPlayers(num as 2 | 3)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                        numPlayers === num
                          ? 'bg-[#1fd1a0] text-black border-[#1fd1a0]'
                          : 'bg-[#0d1426] text-gray-400 border-[#26314d]'
                      }`}
                    >
                      {num} Pens ({num} Players)
                    </button>
                  ))}
                </div>
              </div>

              {/* Bot Difficulty (if in AI mode) */}
              {mode === 'ai' && (
                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1.5">Bot Difficulty</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['easy', 'medium', 'hard'] as const).map((diff) => (
                      <button
                        key={diff}
                        onClick={() => setBotDifficulty(diff)}
                        className={`py-1.5 rounded-xl text-xs font-bold uppercase border transition-colors ${
                          botDifficulty === diff
                            ? 'bg-[#ffb703] text-black border-[#ffb703]'
                            : 'bg-[#0d1426] text-gray-400 border-[#26314d]'
                        }`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Platform Surface */}
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1.5">Platform Surface</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'desk', label: 'School Desk' },
                    { id: 'notebook', label: 'Notebook Paper' },
                    { id: 'round', label: 'Round Table' },
                    { id: 'book', label: 'Hardcover Book' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() =>
                        setMatchSettings((s) => ({ ...s, platformType: p.id as PlatformType }))
                      }
                      className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                        matchSettings.platformType === p.id
                          ? 'bg-[#ff7a00] text-black border-[#ff7a00]'
                          : 'bg-[#0d1426] text-gray-400 border-[#26314d]'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Control Scheme: Swipe vs Slingshot */}
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1.5">Control Scheme</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setMatchSettings((s) => ({ ...s, controlScheme: 'swipe' }))}
                    className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                      matchSettings.controlScheme === 'swipe'
                        ? 'bg-[#1fd1a0] text-black border-[#1fd1a0]'
                        : 'bg-[#0d1426] text-gray-400 border-[#26314d]'
                    }`}
                  >
                    Swipe (Flick Forward)
                  </button>
                  <button
                    onClick={() => setMatchSettings((s) => ({ ...s, controlScheme: 'pullback' }))}
                    className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                      matchSettings.controlScheme === 'pullback'
                        ? 'bg-[#1fd1a0] text-black border-[#1fd1a0]'
                        : 'bg-[#0d1426] text-gray-400 border-[#26314d]'
                    }`}
                  >
                    Pull Back (Slingshot)
                  </button>
                </div>
              </div>

              {/* Chaos Obstacles Toggle */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#0d1426] border border-[#26314d]">
                <div>
                  <p className="text-xs font-bold text-white">Chaos Mode (Obstacles)</p>
                  <p className="text-[10px] text-gray-400">Eraser & ruler barriers on the table</p>
                </div>
                <button
                  onClick={() =>
                    setMatchSettings((s) => ({ ...s, chaosObstacles: !s.chaosObstacles }))
                  }
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    matchSettings.chaosObstacles ? 'bg-[#1fd1a0]' : 'bg-gray-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                      matchSettings.chaosObstacles ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {/* Balanced Pens Toggle */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#0d1426] border border-[#26314d]">
                <div>
                  <p className="text-xs font-bold text-white">Balanced Pens</p>
                  <p className="text-[10px] text-gray-400">All pens have identical mass and stats</p>
                </div>
                <button
                  onClick={() =>
                    setMatchSettings((s) => ({ ...s, balancedPens: !s.balancedPens }))
                  }
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    matchSettings.balancedPens ? 'bg-[#1fd1a0]' : 'bg-gray-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                      matchSettings.balancedPens ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              <button
                onClick={() => {
                  soundEngine.playClick();
                  setIsSettingsOpen(false);
                  spawnPens();
                }}
                className="w-full py-3 rounded-2xl bg-[#ff7a00] hover:bg-[#ff7a00]/90 text-black font-black text-xs tracking-wider uppercase shadow-lg shadow-[#ff7a00]/20 cursor-pointer"
              >
                APPLY & RESTART MATCH
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. RULES BOTTOM SHEET */}
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
                <h3 className="text-base font-black font-display text-white">Biro Battle Rules</h3>
                <button
                  onClick={() => setIsRulesOpen(false)}
                  className="text-gray-400 hover:text-white text-xs font-bold"
                >
                  Close
                </button>
              </div>

              <div className="space-y-2.5 text-xs text-gray-300 leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
                <div className="flex gap-2">
                  <span className="text-[#ff7a00] font-black">1.</span>
                  <p>
                    <strong className="text-white">Flick Turn-by-Turn:</strong> Touch your glowing pen and swipe in the direction you want it to travel. Length sets flick power.
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="text-[#ff7a00] font-black">2.</span>
                  <p>
                    <strong className="text-white">Knock Rivals Off:</strong> Hit opponent pens to knock them over the platform edge. When a pen's center crosses the edge, it plunges off!
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="text-[#ff7a00] font-black">3.</span>
                  <p>
                    <strong className="text-white">Realistic Rotation:</strong> Pens spin and bounce when hit off-center. Use spin to hook around obstacles and nudge rivals off.
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="text-[#ff7a00] font-black">4.</span>
                  <p>
                    <strong className="text-white">Sudden Death:</strong> If 8 turns pass with no knockout, the platform shrinks slightly each turn to force a showdown!
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="text-[#ff7a00] font-black">5.</span>
                  <p>
                    <strong className="text-white">Last Pen Wins:</strong> The last surviving pen wins the round. If the final two fall in the same turn, it is a draw and the round replays.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsRulesOpen(false)}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-black text-xs cursor-pointer"
              >
                GOT IT!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. PAUSE OVERLAY */}
      <AnimatePresence>
        {isPaused && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center"
            >
              <div className="w-full max-w-xs bg-[#141d33] border border-[#26314d] rounded-3xl p-6 text-center shadow-2xl space-y-4">
                <h2 className="text-2xl font-black font-display text-white">MATCH PAUSED</h2>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => {
                      soundEngine.playClick();
                      setIsPaused(false);
                    }}
                    className="w-full py-3 rounded-2xl bg-[#ff7a00] text-black font-black text-xs tracking-wider cursor-pointer shadow-lg shadow-[#ff7a00]/20"
                  >
                    RESUME BATTLE
                  </button>

                  <button
                    onClick={() => {
                      soundEngine.playClick();
                      setIsPaused(false);
                      spawnPens();
                    }}
                    className="w-full py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs cursor-pointer"
                  >
                    RESTART MATCH
                  </button>

                  <button
                    onClick={() => {
                      soundEngine.playClick();
                      setIsPaused(false);
                      onBack();
                    }}
                    className="w-full py-2.5 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 font-bold text-xs cursor-pointer border border-rose-500/30"
                  >
                    EXIT TO LOBBY
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 8. MATCH RESULT MODAL */}
      <GameResultModal
        isOpen={isResultOpen}
        winner={matchWinner}
        isWin={matchWinner === (user?.displayName || user?.username || 'Player 1')}
        scoreText={`Rounds Won: ${players.map((p) => `${p.displayName} (${scores[p.id] || 0})`).join(' vs ')}`}
        onPlayAgain={() => {
          setIsResultOpen(false);
          setMatchWinner(null);
          setCurrentRound(1);
          const resetScores: Record<string, number> = {};
          players.forEach((p) => {
            resetScores[p.id] = 0;
          });
          setScores(resetScores);
          spawnPens();
        }}
        onBackToLobby={onBack}
      />
    </div>
  );
};
