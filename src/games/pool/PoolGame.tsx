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
  Volume2,
  VolumeX,
  Target,
  Sparkles,
  Trophy,
  Check,
  CheckCircle2,
  Zap,
  Play,
  Sliders,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Disc,
} from 'lucide-react';
import { soundEngine } from '../../audio/audioEngine';
import { useWhotStore } from '../../store/useWhotStore';
import { GameResultModal } from '../../components/GameResultModal';
import { saveMatchResult } from '../../lib/offlineSync';
import { Avatar } from '../../components/Avatar';
import supabase from '../../lib/supabase';
import {
  PoolBall,
  PoolPocket,
  TableGeometry,
  CushionSegment,
  TrajectoryProjection,
  TurnOutcome,
  BallGroup,
  PoolPlayer,
  PoolRoomSettings,
  STANDARD_BALL_COLORS,
} from './types';
import {
  initializeRack,
  createPockets,
  createCushions,
  stepPoolPhysics,
  projectTrajectory,
  areAllBallsStopped,
  evaluateTurnOutcome,
} from './physics';
import { ballSpriteCache } from './ballSprites';
import { computeBotShot } from './ai';

interface PoolGameProps {
  onBack: () => void;
}

const DEFAULT_POOL_SETTINGS: PoolRoomSettings = {
  bestOfRacks: 3,
  shotTimerSeconds: 45,
  callAllPockets: false,
  eightBallOnBreak: 're_rack',
};

const BANTER_MESSAGES = [
  'Odogwu on the green felt!',
  'Chop knuckle shot!',
  'Clean bank shot, no shaking!',
  'Smooth roll, masterclass!',
  'Penalty ball in hand!',
  'Corner pocket called!',
  'Side pocket snipe!',
  'Senior player level!',
];

export const PoolGame: React.FC<PoolGameProps> = ({ onBack }) => {
  const { user, isMuted, toggleMute } = useWhotStore();
  const [searchParams] = useSearchParams();
  const roomCodeParam = searchParams.get('room') || '';

  // Mode & Room Settings
  const [mode, setMode] = useState<'ai' | 'pass' | 'online'>(roomCodeParam ? 'online' : 'ai');
  const [botDifficulty, setBotDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [settings, setSettings] = useState<PoolRoomSettings>(DEFAULT_POOL_SETTINGS);
  const [controlScheme, setControlScheme] = useState<'powerbar' | 'pullback'>('powerbar');
  const [confirmShotRequired, setConfirmShotRequired] = useState(false);

  // Match State
  const [players, setPlayers] = useState<PoolPlayer[]>([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [currentRack, setCurrentRack] = useState(1);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [isRackBreak, setIsRackBreak] = useState(true);
  const [isBallInHand, setIsBallInHand] = useState(false);
  const [calledPocketId, setCalledPocketId] = useState<number | null>(null);
  const [shotTimer, setShotTimer] = useState<number>(45);
  const [isSimulating, setIsSimulating] = useState(false);

  // Cue Shot Aim & Power State
  const [aimAngle, setAimAngle] = useState(-Math.PI / 2); // pointing up towards foot spot
  const [shotPower, setShotPower] = useState(0.5); // 0.1 to 1.0
  const [spinX, setSpinX] = useState(0); // -1 to +1
  const [spinY, setSpinY] = useState(0); // -1 to +1
  const [isSpinModalOpen, setIsSpinModalOpen] = useState(false);

  // Banter / Turn Banner
  const [bannerNotice, setBannerNotice] = useState<{ text: string; sub?: string; isFoul?: boolean } | null>(null);

  // Modal Dialogs
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isResultOpen, setIsResultOpen] = useState(false);
  const [matchWinner, setMatchWinner] = useState<string | null>(null);

  // References for Animation & Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Table Geometry
  const geomRef = useRef<TableGeometry>({
    width: 360,
    height: 540,
    feltX: 20,
    feltY: 20,
    feltW: 320,
    feltH: 500,
    headStringY: 410,
    footSpotY: 155,
    ballRadius: 8.5,
  });

  const ballsRef = useRef<PoolBall[]>([]);
  const pocketsRef = useRef<PoolPocket[]>([]);
  const cushionsRef = useRef<CushionSegment[]>([]);

  // Turn Tracking
  const firstContactBallIdRef = useRef<number | null>(null);
  const cushionHitCountRef = useRef<number>(0);
  const newlyPocketedRef = useRef<number[]>([]);
  const particlesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string }>>([]);

  // Dragging Aim Interaction Refs
  const isDraggingAimRef = useRef(false);
  const isDraggingPowerRef = useRef(false);
  const isDraggingBallInHandRef = useRef(false);
  const lastTouchPosRef = useRef<{ x: number; y: number } | null>(null);

  // 1. Initialize Players
  const initPlayers = useCallback(() => {
    const p1Id = user?.id || 'player_1';
    const p1Name = user?.displayName || user?.username || 'Player 1';
    const p1Avatar = user?.avatarId || 'avatar-01';

    const p1: PoolPlayer = {
      id: p1Id,
      userId: p1Id,
      displayName: p1Name,
      avatarId: p1Avatar,
      avatarUrl: user?.avatarUrl,
      group: null,
      score: 0,
      isBot: false,
      isHost: true,
      seatIndex: 0,
      hasTurn: true,
    };

    let p2: PoolPlayer;
    if (mode === 'ai') {
      p2 = {
        id: 'bot_player',
        userId: 'bot_player',
        displayName: `AI ${botDifficulty.toUpperCase()}`,
        avatarId: 'avatar-08',
        group: null,
        score: 0,
        isBot: true,
        botDifficulty,
        isHost: false,
        seatIndex: 1,
        hasTurn: false,
      };
    } else {
      p2 = {
        id: 'player_2',
        userId: 'player_2',
        displayName: mode === 'pass' ? 'Player 2' : 'Opponent',
        avatarId: 'avatar-04',
        group: null,
        score: 0,
        isBot: false,
        isHost: false,
        seatIndex: 1,
        hasTurn: false,
      };
    }

    setPlayers([p1, p2]);
    setCurrentTurnIndex(0);
    setScores({ [p1.id]: 0, [p2.id]: 0 });
  }, [user, mode, botDifficulty]);

  // 2. Initialize Rack on Table
  const resetRack = useCallback(() => {
    const geom = geomRef.current;
    pocketsRef.current = createPockets(geom);
    cushionsRef.current = createCushions(geom);
    ballsRef.current = initializeRack(geom);
    setIsRackBreak(true);
    setIsBallInHand(false);
    setCalledPocketId(null);
    newlyPocketedRef.current = [];
    firstContactBallIdRef.current = null;
    cushionHitCountRef.current = 0;
    particlesRef.current = [];

    // Aim cue ball towards apex ball
    setAimAngle(-Math.PI / 2);
    setShotPower(0.75);

    // Render static background
    renderStaticTable();
  }, []);

  // 3. Render Static Table Canvas (Felt, Wood Rails, Pockets, Sights)
  const renderStaticTable = () => {
    const bgCanvas = bgCanvasRef.current;
    if (!bgCanvas) return;
    const ctx = bgCanvas.getContext('2d');
    if (!ctx) return;

    const geom = geomRef.current;
    const w = geom.width;
    const h = geom.height;
    const fx = geom.feltX;
    const fy = geom.feltY;
    const fw = geom.feltW;
    const fh = geom.feltH;

    ctx.clearRect(0, 0, w, h);

    // 1. Rich Mahogany Wooden Rails Border
    const woodGrad = ctx.createLinearGradient(0, 0, w, h);
    woodGrad.addColorStop(0, '#2c1810');
    woodGrad.addColorStop(0.5, '#4a2618');
    woodGrad.addColorStop(1, '#1f100a');
    ctx.fillStyle = woodGrad;
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, 16);
    ctx.fill();

    // Subtle Wood Grain Inlay Trim
    ctx.strokeStyle = '#6b3a24';
    ctx.lineWidth = 2;
    ctx.strokeRect(6, 6, w - 12, h - 12);

    // 2. Diamond Sights (Mother of pearl sights along rails)
    ctx.fillStyle = '#ffb703';
    // Top & Bottom rails sights
    [0.25, 0.5, 0.75].forEach((ratio) => {
      // Top rail
      ctx.beginPath();
      ctx.arc(fx + fw * ratio, fy * 0.45, 2.2, 0, Math.PI * 2);
      ctx.fill();
      // Bottom rail
      ctx.beginPath();
      ctx.arc(fx + fw * ratio, h - fy * 0.45, 2.2, 0, Math.PI * 2);
      ctx.fill();
    });
    // Left & Right rails sights
    [0.2, 0.35, 0.65, 0.8].forEach((ratio) => {
      // Left rail
      ctx.beginPath();
      ctx.arc(fx * 0.45, fy + fh * ratio, 2.2, 0, Math.PI * 2);
      ctx.fill();
      // Right rail
      ctx.beginPath();
      ctx.arc(w - fx * 0.45, fy + fh * ratio, 2.2, 0, Math.PI * 2);
      ctx.fill();
    });

    // 3. Luxurious Green Tournament Felt
    const feltGrad = ctx.createRadialGradient(
      fx + fw / 2,
      fy + fh / 2,
      fw * 0.1,
      fx + fw / 2,
      fy + fh / 2,
      fw * 0.8
    );
    feltGrad.addColorStop(0, '#0f824e');
    feltGrad.addColorStop(0.7, '#0b653c');
    feltGrad.addColorStop(1, '#064528');

    ctx.fillStyle = feltGrad;
    ctx.beginPath();
    ctx.roundRect(fx, fy, fw, fh, 8);
    ctx.fill();

    // Felt Inner Shadow
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 3;
    ctx.strokeRect(fx, fy, fw, fh);

    // 4. Subtle Table Markings
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    // Head String (Break Line)
    ctx.beginPath();
    ctx.moveTo(fx, geom.headStringY);
    ctx.lineTo(fx + fw, geom.headStringY);
    ctx.stroke();

    ctx.setLineDash([]); // Reset dash

    // Head Spot & Foot Spot
    const cx = fx + fw / 2;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    // Head Spot
    ctx.beginPath();
    ctx.arc(cx, geom.headStringY, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Foot Spot (Triangle apex area)
    ctx.beginPath();
    ctx.arc(cx, geom.footSpotY, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // 5. Six Pocket Holes & Brass Corner Plates
    pocketsRef.current.forEach((pocket) => {
      // Brass Corner Plate
      ctx.beginPath();
      ctx.arc(pocket.x, pocket.y, pocket.radius * 1.25, 0, Math.PI * 2);
      ctx.fillStyle = '#b45309';
      ctx.fill();

      // Deep Black Leather Pocket Drop
      ctx.beginPath();
      ctx.arc(pocket.x, pocket.y, pocket.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#05070a';
      ctx.fill();

      // Pocket Rim Ring
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  };

  // Handle Resize and High-DPI canvas
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !bgCanvasRef.current) return;
      const canvas = canvasRef.current;
      const bgCanvas = bgCanvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      const w = Math.min(380, Math.max(320, rect.width || 360));
      const h = Math.round(w * 1.5); // 2:3 table aspect ratio

      geomRef.current = {
        width: w,
        height: h,
        feltX: Math.round(w * 0.065),
        feltY: Math.round(h * 0.045),
        feltW: Math.round(w * 0.87),
        feltH: Math.round(h * 0.91),
        headStringY: Math.round(h * 0.76),
        footSpotY: Math.round(h * 0.28),
        ballRadius: Math.max(7.5, Math.round(w * 0.024)),
      };

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      bgCanvas.width = w * dpr;
      bgCanvas.height = h * dpr;

      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);

      const bgCtx = bgCanvas.getContext('2d');
      if (bgCtx) bgCtx.scale(dpr, dpr);

      ballSpriteCache.init();
      resetRack();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [resetRack]);

  // Initial Players Setup
  useEffect(() => {
    initPlayers();
  }, [initPlayers]);

  // Turn Countdown Timer
  useEffect(() => {
    if (isSimulating || isResultOpen || settings.shotTimerSeconds === 0) return;

    setShotTimer(settings.shotTimerSeconds);
    const interval = setInterval(() => {
      setShotTimer((prev) => {
        if (prev <= 1) {
          // Timer ran out! Auto shoot or switch turn with foul
          handleTimeoutShot();
          return 0;
        }
        if (prev <= 4) {
          soundEngine.playTenseTick(true);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentTurnIndex, isSimulating, isResultOpen, settings.shotTimerSeconds]);

  // Auto shot on timeout
  const handleTimeoutShot = () => {
    soundEngine.playFalseAlarm();
    setBannerNotice({
      text: 'SHOT CLOCK EXPIRED!',
      sub: 'Automatic soft flick triggered',
      isFoul: true,
    });
    executeShot(aimAngle, 0.25, 0, 0, null);
  };

  // AI Turn Trigger
  useEffect(() => {
    if (players.length < 2 || isSimulating || isResultOpen) return;
    const activePlayer = players[currentTurnIndex];
    if (!activePlayer || !activePlayer.isBot) return;

    // AI is thinking...
    const botThinkTime = activePlayer.botDifficulty === 'hard' ? 1400 : 900;
    const timer = setTimeout(() => {
      const decision = computeBotShot(
        ballsRef.current,
        pocketsRef.current,
        geomRef.current,
        activePlayer.group,
        activePlayer.botDifficulty || 'medium',
        isRackBreak
      );

      setAimAngle(decision.angle);
      setShotPower(decision.power);
      if (decision.calledPocket !== null) {
        setCalledPocketId(decision.calledPocket);
      }

      // Small delay to let user see AI aim line
      setTimeout(() => {
        executeShot(
          decision.angle,
          decision.power,
          decision.spinX,
          decision.spinY,
          decision.calledPocket
        );
      }, 500);
    }, botThinkTime);

    return () => clearTimeout(timer);
  }, [currentTurnIndex, players, isSimulating, isRackBreak, isResultOpen]);

  // Execute Player Shot
  const executeShot = (
    angle: number,
    power: number,
    sX: number,
    sY: number,
    calledPocket: number | null
  ) => {
    const cueBall = ballsRef.current.find((b) => b.id === 0);
    if (!cueBall || cueBall.isPocketed) return;

    setIsSimulating(true);
    setBannerNotice(null);
    firstContactBallIdRef.current = null;
    cushionHitCountRef.current = 0;
    newlyPocketedRef.current = [];

    // Map power to physical velocity
    const MAX_CUE_SPEED = 24;
    const speed = Math.max(3.5, power * MAX_CUE_SPEED);

    cueBall.vx = Math.cos(angle) * speed;
    cueBall.vy = Math.sin(angle) * speed;

    // Apply spin impulse adjustments
    cueBall.vx += sX * 1.5;
    cueBall.vy += sY * 1.5;

    soundEngine.playCueStrike(power);

    // Chalk dust puff
    for (let i = 0; i < 8; i++) {
      particlesRef.current.push({
        x: cueBall.x - Math.cos(angle) * cueBall.radius,
        y: cueBall.y - Math.sin(angle) * cueBall.radius,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        life: 1.0,
        color: '#38bdf8', // chalk blue
      });
    }

    if (isRackBreak) {
      setTimeout(() => soundEngine.playRackBreak(), 180);
    }
  };

  // Main 60fps Physics & Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const frame = () => {
      if (!isRunning) return;

      const balls = ballsRef.current;
      const pockets = pocketsRef.current;
      const cushions = cushionsRef.current;
      const geom = geomRef.current;

      // 1. Step Physics if balls are in motion
      if (isSimulating) {
        const { newlyPocketed, cushionHitCount, firstContactBallId } = stepPoolPhysics(
          balls,
          cushions,
          pockets,
          {
            onBallCollision: (relSpeed) => {
              soundEngine.playBallClack(Math.min(1.2, relSpeed * 0.15));
            },
            onCushionCollision: (speed) => {
              soundEngine.playCushionBounce(Math.min(1.0, speed * 0.1));
            },
            onPocketDrop: () => {
              soundEngine.playPocketDrop();
            },
          }
        );

        if (firstContactBallId !== null && firstContactBallIdRef.current === null) {
          firstContactBallIdRef.current = firstContactBallId;
        }

        if (cushionHitCount > 0) {
          cushionHitCountRef.current += cushionHitCount;
        }

        if (newlyPocketed.length > 0) {
          newlyPocketedRef.current.push(...newlyPocketed);
        }

        // Check if all balls have come to rest
        if (areAllBallsStopped(balls)) {
          handleShotFinished();
        }
      }

      // 2. Clear dynamic canvas
      ctx.clearRect(0, 0, geom.width, geom.height);

      // 3. Draw Chalk Dust Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.04;
        if (p.life <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5 * p.life, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      // 4. Draw Called Pocket Indicator
      if (calledPocketId !== null) {
        const p = pockets.find((pk) => pk.id === calledPocketId);
        if (p) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 1.5, 0, Math.PI * 2);
          ctx.strokeStyle = '#ffb703';
          ctx.lineWidth = 3;
          ctx.setLineDash([5, 3]);
          ctx.stroke();
          ctx.restore();
        }
      }

      // 5. Draw Aim Trajectory & Ghost Ball (Only when not simulating)
      const cueBall = balls.find((b) => b.id === 0);
      if (!isSimulating && cueBall && !cueBall.isPocketed) {
        const proj = projectTrajectory(cueBall, aimAngle, balls, geom);

        // A. Dotted Aim Line from Cue to Contact Point
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([6, 4]);

        const endX = proj.ghostBall ? proj.ghostBall.x : proj.cushionHitPoint?.x || cueBall.x;
        const endY = proj.ghostBall ? proj.ghostBall.y : proj.cushionHitPoint?.y || cueBall.y;

        ctx.beginPath();
        ctx.moveTo(cueBall.x, cueBall.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.restore();

        // B. Ghost Ball at Impact
        if (proj.ghostBall) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(proj.ghostBall.x, proj.ghostBall.y, geom.ballRadius, 0, Math.PI * 2);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
          ctx.fill();
          ctx.stroke();
          ctx.restore();

          // C. Object Ball Path
          if (proj.objectBallLine) {
            ctx.save();
            ctx.strokeStyle = '#1fd1a0';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(proj.objectBallLine.x1, proj.objectBallLine.y1);
            ctx.lineTo(proj.objectBallLine.x2, proj.objectBallLine.y2);
            ctx.stroke();

            // Arrow head
            const aAngle = Math.atan2(
              proj.objectBallLine.y2 - proj.objectBallLine.y1,
              proj.objectBallLine.x2 - proj.objectBallLine.x1
            );
            ctx.beginPath();
            ctx.moveTo(proj.objectBallLine.x2, proj.objectBallLine.y2);
            ctx.lineTo(
              proj.objectBallLine.x2 - 8 * Math.cos(aAngle - Math.PI / 6),
              proj.objectBallLine.y2 - 8 * Math.sin(aAngle - Math.PI / 6)
            );
            ctx.lineTo(
              proj.objectBallLine.x2 - 8 * Math.cos(aAngle + Math.PI / 6),
              proj.objectBallLine.y2 - 8 * Math.sin(aAngle + Math.PI / 6)
            );
            ctx.fillStyle = '#1fd1a0';
            ctx.fill();
            ctx.restore();
          }

          // D. Cue Ball Deflection Line
          if (proj.cueBallDeflectionLine) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.lineWidth = 1.8;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(proj.cueBallDeflectionLine.x1, proj.cueBallDeflectionLine.y1);
            ctx.lineTo(proj.cueBallDeflectionLine.x2, proj.cueBallDeflectionLine.y2);
            ctx.stroke();
            ctx.restore();
          }
        }

        // E. Cue Stick Visual Rendering
        const cuePullback = 20 + shotPower * 45;
        const cueLen = 140;
        const cueStartX = cueBall.x - Math.cos(aimAngle) * (geom.ballRadius + cuePullback);
        const cueStartY = cueBall.y - Math.sin(aimAngle) * (geom.ballRadius + cuePullback);
        const cueEndX = cueStartX - Math.cos(aimAngle) * cueLen;
        const cueEndY = cueStartY - Math.sin(aimAngle) * cueLen;

        ctx.save();
        // Wooden cue shaft
        const cueGrad = ctx.createLinearGradient(cueStartX, cueStartY, cueEndX, cueEndY);
        cueGrad.addColorStop(0, '#fef08a'); // Tip
        cueGrad.addColorStop(0.1, '#ca8a04'); // Brass ferrule
        cueGrad.addColorStop(0.3, '#d97706'); // Wood maple
        cueGrad.addColorStop(1, '#78350f'); // Dark butt
        ctx.strokeStyle = cueGrad;
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cueStartX, cueStartY);
        ctx.lineTo(cueEndX, cueEndY);
        ctx.stroke();

        // Blue Chalked Tip
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 5.5;
        ctx.beginPath();
        ctx.moveTo(cueStartX, cueStartY);
        ctx.lineTo(
          cueStartX - Math.cos(aimAngle) * 4,
          cueStartY - Math.sin(aimAngle) * 4
        );
        ctx.stroke();
        ctx.restore();
      }

      // 6. Draw Balls (Using Pre-rendered Sprite Cache)
      balls.forEach((ball) => {
        if (ball.isPocketed) {
          // Pocket drop scale animation
          if (ball.pocketAnim && ball.pocketAnim.progress < 1) {
            ball.pocketAnim.progress += 0.08;
            const p = ball.pocketAnim.progress;
            const currentScale = Math.max(0.1, 1 - p * 0.9);
            const x = ball.x + (ball.pocketAnim.targetX - ball.x) * p;
            const y = ball.y + (ball.pocketAnim.targetY - ball.y) * p;
            ballSpriteCache.drawBall(ctx, ball.number, x, y, ball.radius, currentScale);
          }
          return;
        }

        ballSpriteCache.drawBall(ctx, ball.number, ball.x, ball.y, ball.radius);
      });

      // 7. Draw Ball-in-Hand Highlight Ring if Active
      if (isBallInHand && cueBall && !cueBall.isPocketed) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cueBall.x, cueBall.y, geom.ballRadius * 2.2, 0, Math.PI * 2);
        ctx.strokeStyle = '#1fd1a0';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.fillStyle = 'rgba(31, 209, 160, 0.2)';
        ctx.fill();
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(frame);
    };

    animFrameRef.current = requestAnimationFrame(frame);
    return () => {
      isRunning = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isSimulating, aimAngle, shotPower, calledPocketId, isBallInHand]);

  // Handle Shot Resolution after all balls stop moving
  const handleShotFinished = () => {
    setIsSimulating(false);

    const shooter = players[currentTurnIndex];
    const opponent = players[(currentTurnIndex + 1) % 2];

    const outcome = evaluateTurnOutcome(
      shooter,
      opponent,
      ballsRef.current,
      firstContactBallIdRef.current,
      newlyPocketedRef.current,
      cushionHitCountRef.current,
      calledPocketId,
      isRackBreak,
      settings.eightBallOnBreak
    );

    // If cue ball scratched, respawn it for ball-in-hand
    if (outcome.cueScratched) {
      const cue = ballsRef.current.find((b) => b.id === 0);
      if (cue) {
        cue.isPocketed = false;
        cue.x = geomRef.current.feltX + geomRef.current.feltW / 2;
        cue.y = geomRef.current.headStringY;
        cue.vx = 0;
        cue.vy = 0;
      }
    }

    // Assign Group if claimed on this turn
    if (outcome.claimedGroup && shooter.group === null) {
      const opponentGroup = outcome.claimedGroup === 'solids' ? 'stripes' : 'solids';
      setPlayers((prev) =>
        prev.map((p) => {
          if (p.id === shooter.id) return { ...p, group: outcome.claimedGroup };
          if (p.id === opponent.id) return { ...p, group: opponentGroup };
          return p;
        })
      );
      setBannerNotice({
        text: `${shooter.displayName.toUpperCase()} CLAIMS ${outcome.claimedGroup.toUpperCase()}!`,
        sub: `${opponent.displayName} is assigned ${opponentGroup}`,
      });
    }

    // Check Rack Victory
    if (outcome.isRackOver) {
      handleRackOver(outcome);
      return;
    }

    // Turn / Foul Banter
    if (outcome.foul) {
      soundEngine.playFalseAlarm();
      setBannerNotice({
        text: 'FOUL COMMITTED!',
        sub: outcome.foulReason || 'Ball in hand for opponent',
        isFoul: true,
      });
      setIsBallInHand(true);
    } else {
      setIsBallInHand(false);
      // Random Nigerian pool parlor banter
      const banter = BANTER_MESSAGES[Math.floor(Math.random() * BANTER_MESSAGES.length)];
      setBannerNotice({ text: banter });
    }

    // Break is now completed
    if (isRackBreak) {
      setIsRackBreak(false);
    }

    // Switch Turn or Retain Turn
    if (outcome.switchPlayer) {
      setCurrentTurnIndex((prev) => (prev + 1) % 2);
    }

    // Reset turn trackers
    setCalledPocketId(null);
  };

  // Handle Rack Finished
  const handleRackOver = (outcome: TurnOutcome) => {
    const winner = players.find((p) => p.id === outcome.winnerPlayerId);
    const winnerName = winner?.displayName || 'Winner';

    soundEngine.playWin();
    setBannerNotice({
      text: `${winnerName.toUpperCase()} WINS RACK ${currentRack}!`,
      sub: outcome.winReason || 'Rack Victory',
    });

    const nextScores = { ...scores, [winner?.id || '']: (scores[winner?.id || ''] || 0) + 1 };
    setScores(nextScores);

    const neededToWin = Math.ceil(settings.bestOfRacks / 2);
    if ((winner && nextScores[winner.id] >= neededToWin) || settings.bestOfRacks === 1) {
      // Match Won!
      setTimeout(() => {
        setMatchWinner(winnerName);
        setIsResultOpen(true);

        const isUserWinner = winner?.id === (user?.id || 'player_1');
        saveMatchResult({
          userId: user?.id || 'guest',
          gameId: 'pool',
          gameName: 'Gbedu Pool',
          mode: mode === 'ai' ? 'ai' : mode === 'pass' ? 'pass' : 'online',
          outcome: isUserWinner ? 'win' : 'loss',
          xpEarned: isUserWinner ? 250 : 80,
          coinsEarned: isUserWinner ? 50 : 20,
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
      }, 2000);
    } else {
      // Next Rack
      setTimeout(() => {
        setCurrentRack((r) => r + 1);
        resetRack();
      }, 2400);
    }
  };

  // Pointer Interaction on Table Canvas
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isSimulating) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const cueBall = ballsRef.current.find((b) => b.id === 0);
    if (!cueBall) return;

    // A. If Ball in Hand is Active -> Check if tapping to move cue ball
    if (isBallInHand) {
      const distToCue = Math.hypot(x - cueBall.x, y - cueBall.y);
      if (distToCue < geomRef.current.ballRadius * 3) {
        isDraggingBallInHandRef.current = true;
        return;
      }
    }

    // B. Check if tapping one of the 6 pockets to call pocket
    for (const pocket of pocketsRef.current) {
      const dist = Math.hypot(x - pocket.x, y - pocket.y);
      if (dist < pocket.radius * 2.2) {
        soundEngine.playClick();
        setCalledPocketId(pocket.id);
        setBannerNotice({
          text: `CALLED: ${pocket.name.toUpperCase()} POCKET!`,
          sub: 'Sink the 8-ball here to claim victory',
        });
        return;
      }
    }

    // C. Otherwise -> Drag to Aim Cue
    isDraggingAimRef.current = true;
    lastTouchPosRef.current = { x, y };

    const dx = x - cueBall.x;
    const dy = y - cueBall.y;
    setAimAngle(Math.atan2(dy, dx));
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isSimulating) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Reposition Cue Ball in Hand
    if (isDraggingBallInHandRef.current) {
      const geom = geomRef.current;
      const r = geom.ballRadius;
      const cue = ballsRef.current.find((b) => b.id === 0);
      if (cue) {
        // Constrain to legal table bounds
        cue.x = Math.max(geom.feltX + r * 1.5, Math.min(geom.feltX + geom.feltW - r * 1.5, x));
        const minY = isRackBreak ? geom.headStringY : geom.feltY + r * 1.5;
        cue.y = Math.max(minY, Math.min(geom.feltY + geom.feltH - r * 1.5, y));
      }
      return;
    }

    // Rotate Aim Angle
    if (isDraggingAimRef.current) {
      const cueBall = ballsRef.current.find((b) => b.id === 0);
      if (!cueBall) return;
      const dx = x - cueBall.x;
      const dy = y - cueBall.y;
      setAimAngle(Math.atan2(dy, dx));
    }
  };

  const handleCanvasPointerUp = () => {
    isDraggingAimRef.current = false;
    isDraggingBallInHandRef.current = false;
  };

  // Fine-Aim Slider adjustment
  const handleFineAim = (deltaRad: number) => {
    setAimAngle((prev) => prev + deltaRad);
  };

  // Confirm and Execute Shot
  const handleShootClick = () => {
    if (isSimulating) return;
    const activePlayer = players[currentTurnIndex];
    if (activePlayer?.isBot) return;

    executeShot(aimAngle, shotPower, spinX, spinY, calledPocketId);
  };

  const activePlayer = players[currentTurnIndex];
  const isMyTurn = !activePlayer?.isBot;

  // Active balls per group
  const activeSolids = ballsRef.current.filter((b) => b.number >= 1 && b.number <= 7 && !b.isPocketed);
  const activeStripes = ballsRef.current.filter((b) => b.number >= 9 && b.number <= 15 && !b.isPocketed);
  const isEightBallActive = ballsRef.current.some((b) => b.number === 8 && !b.isPocketed);

  return (
    <div className="w-full max-w-md mx-auto px-2 py-1 flex flex-col items-center select-none text-white relative min-h-[92vh]">
      {/* 1. TOP HEADER: Back, Title, Mode, Audio & Settings */}
      <div className="w-full flex items-center justify-between gap-2 mb-2 bg-[#141d33] border border-[#26314d] rounded-2xl px-3 py-1.5 shadow-lg">
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
              GBEDU <span className="text-[#1fd1a0]">POOL</span>
            </h2>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-[#1fd1a0]/15 text-[#1fd1a0] border border-[#1fd1a0]/30">
              R{currentRack}
            </span>
          </div>
          <p className="text-[10px] font-bold text-gray-400">
            8-Ball Billiards • First to {Math.ceil(settings.bestOfRacks / 2)}
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
            title="Match Settings"
          >
            <Settings className="w-4 h-4 text-gray-300 hover:text-[#ffb703]" />
          </button>
        </div>
      </div>

      {/* 2. PLAYER SCOREBOARD & GROUP ASSIGNMENT BAR */}
      <div className="w-full grid grid-cols-2 gap-2 mb-2">
        {players.map((p, idx) => {
          const isTurn = currentTurnIndex === idx;
          const remainingInGroup =
            p.group === 'solids'
              ? activeSolids.length
              : p.group === 'stripes'
              ? activeStripes.length
              : null;

          return (
            <div
              key={p.id}
              className={`p-2 rounded-2xl flex items-center justify-between border transition-all ${
                isTurn
                  ? 'bg-[#141d33] border-[#1fd1a0] ring-2 ring-[#1fd1a0]/30 shadow-lg'
                  : 'bg-[#0f172a]/70 border-white/5 opacity-80'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Avatar avatarId={p.avatarId} avatarUrl={p.avatarUrl} size="sm" />
                  {isTurn && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#1fd1a0] animate-pulse" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-black truncate max-w-[85px]">{p.displayName}</p>
                  <p className="text-[10px] font-bold text-gray-400">
                    {p.group ? (
                      <span className="capitalize text-[#ffb703]">
                        {p.group} ({remainingInGroup})
                      </span>
                    ) : (
                      <span className="text-gray-400">Open Table</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Racks Won Score Chip */}
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black font-display text-white">
                  {scores[p.id] || 0}
                </span>
                {isTurn && settings.shotTimerSeconds > 0 && (
                  <span
                    className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                      shotTimer <= 5 ? 'bg-rose-500/20 text-rose-400 animate-pulse' : 'bg-white/10 text-gray-300'
                    }`}
                  >
                    {shotTimer}s
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. AFRICAN COMMENTARY & BANTER NOTICE BANNER */}
      {bannerNotice && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`w-full py-1.5 px-3 mb-2 rounded-xl text-center shadow-md ${
            bannerNotice.isFoul
              ? 'bg-rose-950/80 border border-rose-500/50 text-rose-300'
              : 'bg-[#141d33] border border-[#1fd1a0]/40 text-[#1fd1a0]'
          }`}
        >
          <p className="text-xs font-black tracking-wide">{bannerNotice.text}</p>
          {bannerNotice.sub && <p className="text-[10px] text-gray-300">{bannerNotice.sub}</p>}
        </motion.div>
      )}

      {/* 4. POOL TABLE ARENA (CANVAS + SIDE POWER BAR) */}
      <div className="relative w-full flex items-center justify-center gap-2">
        {/* Main Canvas Stack */}
        <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-[#26314d]">
          {/* Static Pre-rendered Background Canvas */}
          <canvas
            ref={bgCanvasRef}
            className="w-full h-auto max-w-[360px] block"
            style={{ touchAction: 'none' }}
          />
          {/* Dynamic 60fps Foreground Canvas */}
          <canvas
            ref={canvasRef}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
            className="absolute inset-0 w-full h-full cursor-crosshair"
            style={{ touchAction: 'none' }}
          />

          {/* Ball in Hand floating instruction */}
          {isBallInHand && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#1fd1a0]/90 text-black text-[11px] font-black shadow-lg pointer-events-none animate-bounce">
              Ball in Hand: Drag cue to legal position
            </div>
          )}
        </div>

        {/* Tactile Side Power Slider Bar */}
        <div className="flex flex-col items-center justify-between h-[480px] w-10 bg-[#141d33] border border-[#26314d] rounded-2xl p-1.5 shadow-xl">
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">MAX</span>
          <div className="relative flex-1 w-full flex items-center justify-center my-2">
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.01"
              value={shotPower}
              onChange={(e) => setShotPower(parseFloat(e.target.value))}
              disabled={isSimulating}
              className="accent-[#1fd1a0] w-full h-full cursor-pointer opacity-0 absolute z-10"
              style={{ transform: 'rotate(270deg)' }}
            />
            {/* Visual Power Gauge Fill */}
            <div className="w-3 h-full rounded-full bg-white/5 relative overflow-hidden border border-white/10">
              <div
                className="w-full bg-gradient-to-t from-[#1fd1a0] via-[#ffb703] to-[#ff7a00] absolute bottom-0 transition-all rounded-full"
                style={{ height: `${shotPower * 100}%` }}
              />
            </div>
          </div>
          <span className="text-[10px] font-black text-[#1fd1a0]">
            {Math.round(shotPower * 100)}%
          </span>
        </div>
      </div>

      {/* 5. FINE-AIM ADJUSTMENT & SPIN CONTROLS BAR */}
      <div className="w-full max-w-sm mt-2 flex items-center justify-between gap-1.5 px-2">
        {/* Fine Left Adjustment */}
        <button
          onClick={() => handleFineAim(-0.015)}
          disabled={isSimulating}
          className="p-2 rounded-xl bg-[#141d33] hover:bg-white/10 active:scale-95 text-gray-300 font-black text-xs border border-white/10 cursor-pointer flex items-center gap-1"
          title="Fine Rotate Left"
        >
          <ChevronLeft className="w-4 h-4 text-[#ffb703]" />
          <span>Fine</span>
        </button>

        {/* Spin Cue Ball Widget */}
        <button
          onClick={() => setIsSpinModalOpen(true)}
          disabled={isSimulating}
          className="flex-1 py-2 px-3 rounded-xl bg-[#141d33] hover:bg-white/10 active:scale-95 text-gray-300 border border-white/10 cursor-pointer flex items-center justify-center gap-2"
        >
          <Disc className="w-4 h-4 text-[#38bdf8]" />
          <span className="text-xs font-black">
            {spinX === 0 && spinY === 0 ? 'Center Spin' : 'Spin Applied'}
          </span>
        </button>

        {/* Fine Right Adjustment */}
        <button
          onClick={() => handleFineAim(0.015)}
          disabled={isSimulating}
          className="p-2 rounded-xl bg-[#141d33] hover:bg-white/10 active:scale-95 text-gray-300 font-black text-xs border border-white/10 cursor-pointer flex items-center gap-1"
          title="Fine Rotate Right"
        >
          <span>Fine</span>
          <ChevronRight className="w-4 h-4 text-[#ffb703]" />
        </button>

        {/* Shoot Button */}
        <button
          onClick={handleShootClick}
          disabled={isSimulating || !isMyTurn}
          className={`py-2 px-4 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all shadow-lg cursor-pointer ${
            isSimulating || !isMyTurn
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-50'
              : 'bg-gradient-to-r from-[#1fd1a0] to-[#10b981] text-black hover:opacity-90 active:scale-95'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>STRIKE</span>
        </button>
      </div>

      {/* 6. SPIN PICKER MODAL */}
      <AnimatePresence>
        {isSpinModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-xs bg-[#141d33] border border-[#26314d] rounded-3xl p-5 shadow-2xl text-center"
            >
              <h3 className="text-sm font-black text-white mb-1">CUE BALL SPIN (ENGLISH)</h3>
              <p className="text-[11px] text-gray-400 mb-4">
                Tap or drag red dot to set follow (top), draw (back), or side spin
              </p>

              {/* 2D Interactive Spin Circle */}
              <div
                className="w-40 h-40 mx-auto rounded-full bg-white relative border-4 border-gray-300 shadow-inner cursor-crosshair flex items-center justify-center"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const cx = rect.width / 2;
                  const cy = rect.height / 2;
                  const clickX = e.clientX - rect.left - cx;
                  const clickY = e.clientY - rect.top - cy;
                  const r = cx * 0.8;
                  const sX = Math.max(-1, Math.min(1, clickX / r));
                  const sY = Math.max(-1, Math.min(1, clickY / r));
                  setSpinX(parseFloat(sX.toFixed(2)));
                  setSpinY(parseFloat((-sY).toFixed(2))); // Invert Y for top-spin
                }}
              >
                {/* Center crosshair */}
                <div className="w-full h-[1px] bg-gray-300 absolute" />
                <div className="h-full w-[1px] bg-gray-300 absolute" />

                {/* Red Chalk Impact Dot */}
                <div
                  className="w-6 h-6 rounded-full bg-rose-600 border-2 border-white absolute shadow-md"
                  style={{
                    transform: `translate(${spinX * 55}px, ${-spinY * 55}px)`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between mt-5 gap-2">
                <button
                  onClick={() => {
                    setSpinX(0);
                    setSpinY(0);
                  }}
                  className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-300"
                >
                  Reset Center
                </button>
                <button
                  onClick={() => setIsSpinModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-[#1fd1a0] text-black text-xs font-black"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. MATCH SETTINGS MODAL */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-[#141d33] border border-[#26314d] rounded-3xl p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-white">MATCH SETTINGS</h3>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-1 rounded-lg bg-white/5 text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Game Mode */}
              <div>
                <label className="text-xs font-bold text-gray-400 mb-1.5 block">Game Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setMode('ai')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      mode === 'ai'
                        ? 'bg-[#1fd1a0]/20 border-[#1fd1a0] text-[#1fd1a0]'
                        : 'bg-white/5 border-transparent text-gray-400'
                    }`}
                  >
                    vs Computer
                  </button>
                  <button
                    onClick={() => setMode('pass')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      mode === 'pass'
                        ? 'bg-[#1fd1a0]/20 border-[#1fd1a0] text-[#1fd1a0]'
                        : 'bg-white/5 border-transparent text-gray-400'
                    }`}
                  >
                    Pass & Play
                  </button>
                </div>
              </div>

              {/* AI Difficulty (If AI mode) */}
              {mode === 'ai' && (
                <div>
                  <label className="text-xs font-bold text-gray-400 mb-1.5 block">Bot Difficulty</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['easy', 'medium', 'hard'] as const).map((diff) => (
                      <button
                        key={diff}
                        onClick={() => setBotDifficulty(diff)}
                        className={`py-2 rounded-xl text-xs font-bold capitalize border transition-all ${
                          botDifficulty === diff
                            ? 'bg-[#ffb703]/20 border-[#ffb703] text-[#ffb703]'
                            : 'bg-white/5 border-transparent text-gray-400'
                        }`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Best of Racks */}
              <div>
                <label className="text-xs font-bold text-gray-400 mb-1.5 block">Match Length</label>
                <div className="grid grid-cols-3 gap-2">
                  {([1, 3, 5] as const).map((racks) => (
                    <button
                      key={racks}
                      onClick={() => setSettings((s) => ({ ...s, bestOfRacks: racks }))}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        settings.bestOfRacks === racks
                          ? 'bg-[#1fd1a0]/20 border-[#1fd1a0] text-[#1fd1a0]'
                          : 'bg-white/5 border-transparent text-gray-400'
                      }`}
                    >
                      Best of {racks}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shot Timer */}
              <div>
                <label className="text-xs font-bold text-gray-400 mb-1.5 block">Shot Timer</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {([30, 45, 60, 0] as const).map((time) => (
                    <button
                      key={time}
                      onClick={() => setSettings((s) => ({ ...s, shotTimerSeconds: time }))}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        settings.shotTimerSeconds === time
                          ? 'bg-[#1fd1a0]/20 border-[#1fd1a0] text-[#1fd1a0]'
                          : 'bg-white/5 border-transparent text-gray-400'
                      }`}
                    >
                      {time === 0 ? 'Off' : `${time}s`}
                    </button>
                  ))}
                </div>
              </div>

              {/* 8-Ball on Break */}
              <div>
                <label className="text-xs font-bold text-gray-400 mb-1.5 block">8-Ball on Break</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSettings((s) => ({ ...s, eightBallOnBreak: 're_rack' }))}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      settings.eightBallOnBreak === 're_rack'
                        ? 'bg-[#1fd1a0]/20 border-[#1fd1a0] text-[#1fd1a0]'
                        : 'bg-white/5 border-transparent text-gray-400'
                    }`}
                  >
                    Re-rack (Default)
                  </button>
                  <button
                    onClick={() => setSettings((s) => ({ ...s, eightBallOnBreak: 'win' }))}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      settings.eightBallOnBreak === 'win'
                        ? 'bg-[#1fd1a0]/20 border-[#1fd1a0] text-[#1fd1a0]'
                        : 'bg-white/5 border-transparent text-gray-400'
                    }`}
                  >
                    Instant Win
                  </button>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsSettingsOpen(false);
                  initPlayers();
                  resetRack();
                }}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#1fd1a0] to-[#10b981] text-black font-black text-sm shadow-xl"
              >
                Apply & Restart Rack
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 8. GAME RESULT MODAL */}
      <GameResultModal
        isOpen={isResultOpen}
        winner={matchWinner}
        isWin={matchWinner === (user?.displayName || 'Player 1')}
        scoreText={`Final Score: ${scores[players[0]?.id || ''] || 0} - ${
          scores[players[1]?.id || ''] || 0
        }`}
        onPlayAgain={() => {
          setIsResultOpen(false);
          setScores({ [players[0]?.id || '']: 0, [players[1]?.id || '']: 0 });
          setCurrentRack(1);
          resetRack();
        }}
        onBackToLobby={onBack}
      />
    </div>
  );
};
