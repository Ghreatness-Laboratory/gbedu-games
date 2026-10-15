import { Card, Shape, Ruleset } from '@gbedu/shared';

export interface EnginePlayer {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  hand: Card[];
  seatIndex: number;
  hasCalledLastCard: boolean;
  hasCalledCheckUp: boolean;
  isForfeited: boolean;
  isConnected: boolean;
}

export interface EngineState {
  id: string;
  roomId: string;
  ruleset: Ruleset;
  players: EnginePlayer[];
  drawPile: Card[];
  discardPile: Card[];
  activePlayerIndex: number;
  activeShape: Shape;
  turnDirection: 1 | -1;
  pendingPickCount: number;
  pendingPickType: 'pick_two' | 'pick_three' | null;
  turnStep: number;
  lastActionMessage: string;
  gameStatus: 'waiting' | 'playing' | 'completed' | 'abandoned';
  winnerUserId: string | null;
  startedAt: number;
  endedAt?: number;
}

export function cloneState(state: EngineState): EngineState {
  return JSON.parse(JSON.stringify(state));
}
