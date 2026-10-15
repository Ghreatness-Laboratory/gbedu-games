import { Card, Ruleset, PresetName, Shape, PlayerGameView } from './whot';

export interface UserProfile {
  id: string;
  publicId?: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  bio?: string;
  isOnline?: boolean;
  avatarId?: string;
  avatarConfig?: Record<string, any>;
}

export interface RoomPlayer {
  userId: string;
  publicId?: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  avatarId?: string;
  avatarConfig?: Record<string, any>;
  seatIndex: number;
  isHost: boolean;
  isReady: boolean;
  isConnected: boolean;
  isVerified?: boolean;
  joinedAt?: string;
  disconnectedAt?: number | null;
}

export interface RoomDetails {
  id: string;
  code: string;
  game?: string;
  hostId: string;
  status: 'waiting' | 'lobby' | 'playing' | 'in_progress' | 'completed' | 'finished' | 'abandoned';
  ruleset?: Ruleset;
  settings?: Record<string, any>;
  preset?: PresetName | string;
  maxPlayers: number;
  minPlayers?: number;
  players: RoomPlayer[];
  createdAt: string;
  lastActivity?: string;
  countdown?: number | null;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  avatarUrl: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

// Client -> Server Events
export interface ClientToServerEvents {
  'room:create': (data: { ruleset?: Partial<Ruleset>; maxPlayers?: number }, callback: (res: { success: boolean; room?: RoomDetails; error?: string }) => void) => void;
  'room:join': (data: { code: string }, callback: (res: { success: boolean; room?: RoomDetails; error?: string }) => void) => void;
  'room:leave': () => void;
  'room:ready': (data: { isReady: boolean }) => void;
  'room:kick': (data: { userId: string }) => void;
  'room:start': () => void;

  'rules:update': (data: { ruleset: Partial<Ruleset> }) => void;
  'rules:preset': (data: { preset: PresetName }) => void;
  'rules:reset': () => void;

  'game:play': (data: { cardId: string; chosenShape?: Shape; calledLastCard?: boolean; calledCheckUp?: boolean }) => void;
  'game:draw': () => void;

  'chat:send': (data: { text: string }) => void;
}

// Server -> Client Events
export interface ServerToClientEvents {
  'room:updated': (room: RoomDetails) => void;
  'rules:changed': (data: { ruleset: Ruleset; preset: PresetName }) => void;
  'room:readyCleared': () => void;
  'room:kicked': (data: { reason: string }) => void;

  'game:started': () => void;
  'game:state': (view: PlayerGameView) => void;
  'game:event': (data: { type: string; message: string; userId?: string; payload?: unknown }) => void;
  'game:completed': (data: { winnerId: string; winnerName: string; standings: { userId: string; username: string; rank: number; cardsRemaining: number }[] }) => void;

  'chat:message': (message: ChatMessage) => void;
  'player:disconnected': (data: { userId: string; username: string; timeoutSec: number }) => void;
  'player:reconnected': (data: { userId: string; username: string }) => void;
  'notification': (data: { type: string; title: string; body: string; data?: unknown }) => void;
}
