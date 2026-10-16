// Jackpot Game (Card-Passing Race Game) Types
import { Shape } from '@gbedu/shared';

export type JackpotWinCondition = 'match_set' | 'collect_all';
export type JackpotPassDirection = 'left' | 'right' | 'alternate';

export interface JackpotCard {
  id: string;
  shape: Shape; // 'circle' | 'triangle' | 'cross' | 'square' | 'star' | 'whot'
  number?: number;
}

export interface JackpotPlayer {
  id: string;
  userId: string;
  displayName: string;
  username: string;
  avatarId: string;
  avatarUrl?: string;
  isBot: boolean;
  botDifficulty?: 'easy' | 'medium' | 'hard';
  isHost: boolean;
  seatIndex: number;
  hand: JackpotCard[];
  cardCount: number; // for opponents (hidden cards)
  hasLockedIn: boolean;
  selectedCardId: string | null;
  passedCard: JackpotCard | null;
  receivedCard: JackpotCard | null;
  score: number; // rounds won
  points: number; // competition points (first to 15)
  suspectTokens: number; // 2 per round
  isExposed: boolean; // exposed by successful suspect
  exposedShape: Shape | null; // must pass card of this shape
  isSkipped: boolean; // penalty if false call was made or wrong suspect call
  isFrozen: boolean; // hand hidden for 1 step (Freeze Card mechanic)
  hasUsedFreeze: boolean; // 1 per round
  lastSuspectTimestamp?: number; // 5-second cooldown
  isConnected: boolean;
  disconnectedAt?: number | null;
}

export interface JackpotSettings {
  bestOfRounds: 1 | 3 | 5;
  winCondition: JackpotWinCondition;
  allowWhotWilds: boolean; // Whot 20 cards count as any shape
  passTimerSeconds: 10 | 15 | 20;
  passDirection: JackpotPassDirection;
  playerCount: number; // 3 to 6
  // Suspect & Competitive Settings
  suspectTokensPerRound: 0 | 1 | 2 | 3; // 0 = off, default 2
  suspectThreshold: 2 | 3 | 4; // default 3 (cards needed to be exposed)
  targetPoints: 10 | 15 | 20; // default 15
  shrinkingTimer: boolean; // pass timer shrinks by 1s down to 5s min (default off)
  allowFreezeCard: boolean; // freeze opponent blind for 1 step (default off)
}

export interface JackpotHandProgress {
  isWin: boolean;
  label: string;
  currentCount: number;
  totalNeeded: 5;
  targetShape?: Shape;
  shapeCounts: Record<Shape, number>;
  wildCount: number;
}

export interface JackpotSuspectEvent {
  id: string;
  accuserId: string;
  accuserName: string;
  accusedId: string;
  accusedName: string;
  shape: Shape;
  isCorrect: boolean;
  timestamp: number;
}

export interface JackpotGameState {
  version: number;
  status: 'dealing' | 'passing' | 'revealing' | 'jackpot_called' | 'round_over' | 'match_over';
  currentRound: number;
  currentStep: number;
  effectiveDirection: 'left' | 'right';
  timerRemaining: number;
  winnerId: string | null;
  winnerName: string | null;
  winnerHand: JackpotCard[] | null;
  jackpotCallTime?: number;
  falseAlarmCaller?: string | null;
}
