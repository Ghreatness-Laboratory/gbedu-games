import {
  newGame,
  playCard,
  drawCard,
  forfeitPlayer,
  abandonGame,
  getPlayerView,
  EngineState,
} from '@gbedu/whot-engine';
import { PlayerGameView, Shape } from '@gbedu/shared';
import { getRoomById } from './rooms';
import { recordGameResult } from './auth';

interface ActiveSession {
  roomId: string;
  engineState: EngineState;
  turnTimeoutTimer?: NodeJS.Timeout;
  turnRemainingSec?: number;
  disconnectTimers: Map<string, { timer: NodeJS.Timeout; expiresAt: number }>;
}

const activeSessions = new Map<string, ActiveSession>();
// Server-only table snapshot store
const gameSnapshots = new Map<string, { engineState: EngineState; updatedAt: number }>();

export function getActiveSession(roomId: string): ActiveSession | null {
  return activeSessions.get(roomId) || null;
}

export function startGameSession(
  roomId: string,
  hostId: string,
  broadcastStateCallback: (roomId: string) => void,
  onGameCompletedCallback: (roomId: string, winnerId: string, standings: { userId: string; username: string; rank: number; cardsRemaining: number }[]) => void
): { success: boolean; error?: string } {
  const room = getRoomById(roomId);
  if (!room) return { success: false, error: 'Room not found' };
  if (room.hostId !== hostId) return { success: false, error: 'Only the host can start the game' };
  if (room.players.length < 2) return { success: false, error: 'At least 2 players are required to start Whot' };

  // All non-host players must be ready
  const unready = room.players.find((p) => !p.isReady);
  if (unready) {
    return { success: false, error: `Waiting for ${unready.username} to get ready` };
  }

  const rawPlayers = room.players.map((p) => ({
    userId: p.userId,
    username: p.username,
    displayName: p.displayName,
    avatarUrl: p.avatarUrl,
  }));

  const gameRes = newGame({
    roomId,
    players: rawPlayers,
    ruleset: room.ruleset,
  });

  room.status = 'in_progress';

  const session: ActiveSession = {
    roomId,
    engineState: gameRes.state,
    disconnectTimers: new Map(),
  };

  activeSessions.set(roomId, session);
  saveSnapshot(roomId, gameRes.state);

  // Setup turn timer if enabled
  resetTurnTimer(session, broadcastStateCallback, onGameCompletedCallback);

  return { success: true };
}

function saveSnapshot(roomId: string, state: EngineState) {
  gameSnapshots.set(roomId, {
    engineState: JSON.parse(JSON.stringify(state)),
    updatedAt: Date.now(),
  });
}

export function executePlayerMove(
  roomId: string,
  userId: string,
  data: { cardId: string; chosenShape?: Shape; calledLastCard?: boolean; calledCheckUp?: boolean },
  broadcastStateCallback: (roomId: string) => void,
  onGameCompletedCallback: (roomId: string, winnerId: string, standings: { userId: string; username: string; rank: number; cardsRemaining: number }[]) => void
): { success: boolean; error?: string } {
  const session = activeSessions.get(roomId);
  if (!session) return { success: false, error: 'Game session not active' };

  const res = playCard(session.engineState, {
    userId,
    cardId: data.cardId,
    chosenShape: data.chosenShape,
    calledLastCard: data.calledLastCard,
    calledCheckUp: data.calledCheckUp,
  });

  if (!res.success) {
    return { success: false, error: res.error };
  }

  session.engineState = res.state;
  saveSnapshot(roomId, session.engineState);

  if (session.engineState.gameStatus === 'completed') {
    handleGameOver(session, onGameCompletedCallback);
  } else {
    resetTurnTimer(session, broadcastStateCallback, onGameCompletedCallback);
  }

  broadcastStateCallback(roomId);
  return { success: true };
}

export function executePlayerDraw(
  roomId: string,
  userId: string,
  broadcastStateCallback: (roomId: string) => void,
  onGameCompletedCallback: (roomId: string, winnerId: string, standings: { userId: string; username: string; rank: number; cardsRemaining: number }[]) => void
): { success: boolean; error?: string } {
  const session = activeSessions.get(roomId);
  if (!session) return { success: false, error: 'Game session not active' };

  const res = drawCard(session.engineState, { userId });
  if (!res.success) {
    return { success: false, error: res.error };
  }

  session.engineState = res.state;
  saveSnapshot(roomId, session.engineState);

  resetTurnTimer(session, broadcastStateCallback, onGameCompletedCallback);
  broadcastStateCallback(roomId);
  return { success: true };
}

function resetTurnTimer(
  session: ActiveSession,
  broadcastStateCallback: (roomId: string) => void,
  onGameCompletedCallback: (roomId: string, winnerId: string, standings: { userId: string; username: string; rank: number; cardsRemaining: number }[]) => void
) {
  if (session.turnTimeoutTimer) {
    clearTimeout(session.turnTimeoutTimer);
    session.turnTimeoutTimer = undefined;
  }

  const timerSec = session.engineState.ruleset.turnTimerSec;
  if (timerSec <= 0 || session.engineState.gameStatus !== 'playing') return;

  session.turnTimeoutTimer = setTimeout(() => {
    // Auto-draw or force skip on timeout
    const activePlayer = session.engineState.players[session.engineState.activePlayerIndex];
    if (activePlayer && !activePlayer.isForfeited) {
      drawCard(session.engineState, { userId: activePlayer.userId, forced: true });
      saveSnapshot(session.roomId, session.engineState);

      if (session.engineState.gameStatus === 'completed') {
        handleGameOver(session, onGameCompletedCallback);
      } else {
        resetTurnTimer(session, broadcastStateCallback, onGameCompletedCallback);
      }
      broadcastStateCallback(session.roomId);
    }
  }, timerSec * 1000);
}

export function handlePlayerDisconnect(
  roomId: string,
  userId: string,
  broadcastStateCallback: (roomId: string) => void,
  onGameCompletedCallback: (roomId: string, winnerId: string, standings: { userId: string; username: string; rank: number; cardsRemaining: number }[]) => void
) {
  const session = activeSessions.get(roomId);
  if (!session || session.engineState.gameStatus !== 'playing') return;

  const player = session.engineState.players.find((p) => p.userId === userId);
  if (!player || player.isForfeited) return;

  player.isConnected = false;

  const timeoutSec = session.engineState.ruleset.reconnectTimeoutSec;
  const expiresAt = Date.now() + timeoutSec * 1000;

  // Clear existing disconnect timer if any
  const existing = session.disconnectTimers.get(userId);
  if (existing) clearTimeout(existing.timer);

  const timer = setTimeout(() => {
    // Reconnect timeout expired! Forfeit player
    const forfeitRes = forfeitPlayer(session.engineState, userId);
    session.engineState = forfeitRes.state;
    saveSnapshot(roomId, session.engineState);

    if (session.engineState.gameStatus === 'completed') {
      handleGameOver(session, onGameCompletedCallback);
    } else {
      resetTurnTimer(session, broadcastStateCallback, onGameCompletedCallback);
    }
    broadcastStateCallback(roomId);
  }, timeoutSec * 1000);

  session.disconnectTimers.set(userId, { timer, expiresAt });
  broadcastStateCallback(roomId);
}

export function handlePlayerReconnect(roomId: string, userId: string, broadcastStateCallback: (roomId: string) => void) {
  const session = activeSessions.get(roomId);
  if (!session) return;

  const player = session.engineState.players.find((p) => p.userId === userId);
  if (!player) return;

  player.isConnected = true;

  const existing = session.disconnectTimers.get(userId);
  if (existing) {
    clearTimeout(existing.timer);
    session.disconnectTimers.delete(userId);
  }

  broadcastStateCallback(roomId);
}

function handleGameOver(
  session: ActiveSession,
  onGameCompletedCallback: (roomId: string, winnerId: string, standings: { userId: string; username: string; rank: number; cardsRemaining: number }[]) => void
) {
  if (session.turnTimeoutTimer) clearTimeout(session.turnTimeoutTimer);
  session.disconnectTimers.forEach((t) => clearTimeout(t.timer));
  session.disconnectTimers.clear();

  const winnerId = session.engineState.winnerUserId || '';
  const room = getRoomById(session.roomId);
  if (room) {
    room.status = 'completed';
  }

  // Calculate final standings
  const sortedPlayers = [...session.engineState.players].sort((a, b) => a.hand.length - b.hand.length);
  const standings = sortedPlayers.map((p, idx) => ({
    userId: p.userId,
    username: p.username,
    rank: idx + 1,
    cardsRemaining: p.hand.length,
  }));

  // Update statistics
  const playerIds = session.engineState.players.map((p) => p.userId);
  recordGameResult(winnerId, playerIds, session.engineState.turnStep);

  onGameCompletedCallback(session.roomId, winnerId, standings);
}

export function getPlayerSanitizedView(roomId: string, userId: string): PlayerGameView | null {
  const session = activeSessions.get(roomId);
  if (!session) return null;
  return getPlayerView(session.engineState, userId);
}
