export type Shape = 'circle' | 'triangle' | 'cross' | 'square' | 'star' | 'whot';

export type SpecialEffectType =
  | 'hold_on'        // Card 1
  | 'pick_two'       // Card 2
  | 'pick_three'     // Card 5
  | 'suspension'     // Card 8
  | 'general_market' // Card 14
  | 'whot';          // Card 20

export interface Card {
  id: string;
  shape: Shape;
  number: number;
  specialType?: SpecialEffectType;
}

export interface SpecialsConfig {
  holdOn: boolean;        // 1
  pickTwo: boolean;       // 2
  pickThree: boolean;     // 5
  suspension: boolean;    // 8
  generalMarket: boolean; // 14
  whot: boolean;          // 20
}

export interface Ruleset {
  startingCards: number; // 4 to 8, default 6
  pickTwoPassing: boolean; // default true
  pickThreePassing: boolean; // default true
  crossPassing: boolean; // default false
  whot20DefendsAgainstPicks: boolean; // default false
  specials: SpecialsConfig;
  goOutOnSpecial: boolean; // default false ("Allow finishing on special cards")
  calloutsRequired: boolean; // default true
  calloutPenalty: number; // 1 to 5, default 2
  turnTimerSec: number; // 0 (off), 15, 30, 60
  reconnectTimeoutSec: number; // 10 to 300, default 60
}

export type PresetName = 'naija_classic' | 'quick_game' | 'no_specials' | 'custom';

export interface OpponentView {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  cardCount: number;
  seatIndex: number;
  isConnected: boolean;
  hasCalledLastCard: boolean;
  turnCountdown?: number;
}

export interface PlayerGameView {
  roomId: string;
  ruleset: Ruleset;
  myUserId: string;
  mySeatIndex: number;
  myHand: Card[];
  legalCardIds: string[];
  canDraw: boolean;
  mustCallLastCard: boolean;
  mustCallCheckUp: boolean;
  opponents: OpponentView[];
  topDiscard: Card | null;
  activeShape: Shape;
  activePlayerIndex: number;
  activeUserId: string;
  turnDirection: 1 | -1;
  drawPileCount: number;
  discardPileCount: number;
  pendingPickCount: number;
  pendingPickType: 'pick_two' | 'pick_three' | null;
  isGameOver: boolean;
  winnerUserId: string | null;
  gameStatus: 'waiting' | 'playing' | 'completed' | 'abandoned';
  lastActionMessage?: string;
  turnTimerSec: number;
  currentTurnRemainingSec?: number;
  isPlayAgainTurn?: boolean;
  playAgainReason?: 'general_market' | 'hold_on' | 'suspension' | null;
  generalMarketActive?: boolean;
}
