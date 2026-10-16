// Biro Battle (Swipe-to-Flick Pen Battle) Types

export type PlatformType = 'desk' | 'notebook' | 'round' | 'book';
export type ControlScheme = 'swipe' | 'pullback'; // 'swipe' = flick forward; 'pullback' = slingshot
export type PenArchetype = 'classic' | 'parker' | 'fountain' | 'stylus';
export type AIDifficulty = 'easy' | 'medium' | 'hard';
export type GameMode = 'ai' | 'pass' | 'online';

export interface PenStats {
  id: PenArchetype;
  name: string;
  tagline: string;
  color: string;
  inkColor: string;
  capColor: string;
  bodyColor: string;
  mass: number;        // affects push resistance (1.0 = normal)
  length: number;      // px (approx 58-68)
  width: number;       // px (approx 12-14)
  restitution: number; // bounciness (0.55 - 0.75)
  friction: number;    // desk friction (0.958 - 0.968)
}

export interface Vector2D {
  x: number;
  y: number;
}

export interface Obstacle {
  id: string;
  type: 'eraser' | 'ruler';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // radians
  color: string;
}

export interface PenBody {
  id: string; // matches player id
  playerId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number; // in radians
  omega: number; // angular velocity (rad/s)
  mass: number;
  length: number;
  width: number;
  restitution: number;
  friction: number;
  archetype: PenArchetype;
  color: string;
  inkColor: string;
  isEliminated: boolean;
  fallAnimation?: {
    progress: number; // 0 to 1
    scale: number;
    rotateSpeed: number;
    opacity: number;
  };
  streak: number; // consecutive knockouts in match
}

export interface InkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  color: string;
  life: number; // 0 to 1
}

export interface InkTrailPoint {
  x: number;
  y: number;
  opacity: number;
  width: number;
}

export interface PlayerSlot {
  id: string;
  userId: string;
  displayName: string;
  username: string;
  avatarId: string;
  avatarUrl?: string;
  isBot: boolean;
  botDifficulty?: AIDifficulty;
  isHost: boolean;
  seatIndex: number;
  score: number; // rounds won
  consecutiveKOs: number;
  penArchetype: PenArchetype;
  isConnected: boolean;
}

export interface BiroMatchSettings {
  bestOfRounds: 1 | 3 | 5;
  platformType: PlatformType;
  chaosObstacles: boolean;
  balancedPens: boolean;
  turnTimeSeconds: 15;
  controlScheme: ControlScheme;
}

export interface KnockoutEvent {
  attackerId: string;
  attackerName: string;
  attackerAvatar: string;
  victimId: string;
  victimName: string;
  victimAvatar: string;
  isSelfElimination: boolean;
  timestamp: number;
}
