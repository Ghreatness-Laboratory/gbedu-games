// Gbedu Pool (8-Ball Billiards) Types & Data Contracts

export type BallGroup = 'solids' | 'stripes';
export type BallType = 'cue' | 'solid' | 'stripe' | '8ball';

export interface PoolBall {
  id: number; // 0 = cue ball, 1-7 = solids, 8 = eight-ball, 9-15 = stripes
  number: number;
  type: BallType;
  color: string;
  stripeColor?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number; // in table pixels
  isPocketed: boolean;
  pocketAnim?: {
    progress: number;
    scale: number;
    targetX: number;
    targetY: number;
  };
}

export interface PoolPocket {
  id: number; // 0=TL, 1=TR, 2=ML, 3=MR, 4=BL, 5=BR
  name: string;
  x: number;
  y: number;
  radius: number;
  mouthRadius: number;
}

export interface CushionSegment {
  id: string;
  p1: { x: number; y: number };
  p2: { x: number; y: number };
  normal: { x: number; y: number };
}

export interface TableGeometry {
  width: number;
  height: number;
  feltX: number;
  feltY: number;
  feltW: number;
  feltH: number;
  headStringY: number; // Break line
  footSpotY: number;   // Rack spot
  ballRadius: number;
}

export interface PoolPlayer {
  id: string;
  userId: string;
  displayName: string;
  avatarId: string;
  avatarUrl?: string;
  group: BallGroup | null; // assigned on first legal pocket after break
  score: number; // racks won
  isBot: boolean;
  botDifficulty?: 'easy' | 'medium' | 'hard';
  isHost: boolean;
  seatIndex: number;
  hasTurn: boolean;
}

export interface ShotParameters {
  angle: number; // radians (0 = right, PI/2 = down)
  power: number; // 0.0 to 1.0
  spinX: number; // -1 (left english) to +1 (right english)
  spinY: number; // -1 (backspin / draw) to +1 (topspin / follow)
  calledPocket: number | null; // 0..5 for 8-ball or call-pocket mode
}

export interface TrajectoryProjection {
  ghostBall: { x: number; y: number } | null;
  hitBallId: number | null;
  objectBallLine: { x1: number; y1: number; x2: number; y2: number } | null;
  cueBallDeflectionLine: { x1: number; y1: number; x2: number; y2: number } | null;
  cushionHitPoint: { x: number; y: number } | null;
}

export interface TurnOutcome {
  foul: boolean;
  foulReason: string | null;
  cueScratched: boolean;
  eightBallPocketed: boolean;
  pocketedBalls: number[];
  firstBallHit: number | null;
  cushionsHitAfterContact: number;
  isLegalBreak: boolean;
  claimedGroup: BallGroup | null;
  isRackOver: boolean;
  winnerPlayerId: string | null;
  loserPlayerId: string | null;
  winReason: string | null;
  switchPlayer: boolean;
  ballInHand: boolean;
}

export interface PoolRoomSettings {
  bestOfRacks: 1 | 3 | 5;
  shotTimerSeconds: 0 | 30 | 45 | 60; // 0 = off
  callAllPockets: boolean; // default false (only 8-ball requires call)
  eightBallOnBreak: 're_rack' | 'win';
}

export const STANDARD_BALL_COLORS: Record<number, string> = {
  0: '#ffffff', // Cue Ball
  1: '#fbbf24', // Yellow
  2: '#2563eb', // Blue
  3: '#dc2626', // Red
  4: '#7c3aed', // Purple
  5: '#ea580c', // Orange
  6: '#16a34a', // Green
  7: '#7f1d1d', // Maroon
  8: '#111827', // 8-Ball Black
  9: '#fbbf24', // Yellow Stripe
  10: '#2563eb', // Blue Stripe
  11: '#dc2626', // Red Stripe
  12: '#7c3aed', // Purple Stripe
  13: '#ea580c', // Orange Stripe
  14: '#16a34a', // Green Stripe
  15: '#7f1d1d', // Maroon Stripe
};
