import { Server as SocketIOServer, Socket } from 'socket.io';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  UserProfile,
  ChatMessage,
  PresetName,
  Ruleset,
} from '@gbedu/shared';
import { verifyUserToken } from './auth';
import {
  createRoom,
  joinRoom,
  leaveRoom,
  setPlayerReady,
  kickPlayer,
  updateHouseRules,
  applyPresetRules,
  getRoomById,
  startRoom,
} from './rooms';
import {
  startGameSession,
  executePlayerMove,
  executePlayerDraw,
  handlePlayerDisconnect,
  handlePlayerReconnect,
  getPlayerSanitizedView,
  getActiveSession,
} from './gameManager';

export function setupSocketIO(io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>) {
  // Authentication Middleware: Verifies token on handshake
  io.use(async (socket, next) => {
    const token = (socket.handshake.auth?.token as string) || (socket.handshake.headers?.authorization?.replace('Bearer ', '') as string);
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const user = await verifyUserToken(token);
    if (!user) {
      return next(new Error('Invalid or expired authentication token'));
    }

    // Attach user to socket data
    (socket.data as unknown as { user: UserProfile }).user = user;
    next();
  });

  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    const user = (socket.data as unknown as { user: UserProfile }).user;
    let currentRoomId: string | null = null;

    const broadcastRoomUpdate = (roomId: string) => {
      const room = getRoomById(roomId);
      if (room) {
        io.to(roomId).emit('room:updated', room);
      }
    };

    const broadcastGameState = (roomId: string) => {
      const room = getRoomById(roomId);
      if (!room) return;

      // Send each player their own private sanitized view (no leaking cards!)
      room.players.forEach((p) => {
        const view = getPlayerSanitizedView(roomId, p.userId);
        if (view) {
          // Find matching socket for this user
          io.to(`user_${p.userId}`).emit('game:state', view);
        }
      });
    };

    const onGameCompleted = (
      roomId: string,
      winnerId: string,
      standings: { userId: string; username: string; rank: number; cardsRemaining: number }[]
    ) => {
      const room = getRoomById(roomId);
      const winner = room?.players.find((p) => p.userId === winnerId);
      io.to(roomId).emit('game:completed', {
        winnerId,
        winnerName: winner?.username || 'Winner',
        standings,
      });
      broadcastRoomUpdate(roomId);
      broadcastGameState(roomId);
    };

    // Join personal room for targeted user events
    socket.join(`user_${user.id}`);

    // Check if player was in an active game and reconnected
    // (Handled when player joins/reconnects to the room)

    // 1. Room Creation
    socket.on('room:create', (data, callback) => {
      try {
        const room = createRoom(user.id, data.ruleset, data.maxPlayers || 6);
        currentRoomId = room.id;
        socket.join(room.id);
        callback({ success: true, room });
      } catch (err) {
        callback({ success: false, error: (err as Error).message });
      }
    });

    // 2. Room Joining
    socket.on('room:join', (data, callback) => {
      const res = joinRoom(data.code, user.id);
      if (!res.success || !res.room) {
        callback({ success: false, error: res.error });
        return;
      }

      currentRoomId = res.room.id;
      socket.join(res.room.id);

      // If game is in progress, mark player reconnected
      const active = getActiveSession(res.room.id);
      if (active) {
        handlePlayerReconnect(res.room.id, user.id, broadcastGameState);
      }

      broadcastRoomUpdate(res.room.id);
      callback({ success: true, room: res.room });

      // If active game, send view immediately
      if (active) {
        const view = getPlayerSanitizedView(res.room.id, user.id);
        if (view) {
          socket.emit('game:state', view);
        }
      }
    });

    // 3. Room Leaving
    socket.on('room:leave', () => {
      if (currentRoomId) {
        leaveRoom(currentRoomId, user.id);
        socket.leave(currentRoomId);
        broadcastRoomUpdate(currentRoomId);
        currentRoomId = null;
      }
    });

    // 4. Ready State
    socket.on('room:ready', (data) => {
      if (!currentRoomId) return;
      const res = setPlayerReady(currentRoomId, user.id, data.isReady);
      if (res.success) {
        broadcastRoomUpdate(currentRoomId);
      }
    });

    // 5. Host Kick Player
    socket.on('room:kick', (data) => {
      if (!currentRoomId) return;
      const res = kickPlayer(currentRoomId, user.id, data.userId);
      if (res.success) {
        io.to(`user_${data.userId}`).emit('room:kicked', { reason: 'Removed by host' });
        broadcastRoomUpdate(currentRoomId);
      }
    });

    // 6. House Rules Update (Host Only)
    socket.on('rules:update', (data) => {
      if (!currentRoomId) return;
      const res = updateHouseRules(currentRoomId, user.id, data.ruleset);
      if (res.success && res.room && res.room.ruleset && res.room.preset) {
        io.to(currentRoomId).emit('rules:changed', { ruleset: res.room.ruleset, preset: res.room.preset as PresetName });
        io.to(currentRoomId).emit('room:readyCleared');
        broadcastRoomUpdate(currentRoomId);
      }
    });

    // 7. House Rules Preset (Host Only)
    socket.on('rules:preset', (data) => {
      if (!currentRoomId) return;
      const res = applyPresetRules(currentRoomId, user.id, data.preset);
      if (res.success && res.room && res.room.ruleset && res.room.preset) {
        io.to(currentRoomId).emit('rules:changed', { ruleset: res.room.ruleset, preset: res.room.preset as PresetName });
        io.to(currentRoomId).emit('room:readyCleared');
        broadcastRoomUpdate(currentRoomId);
      }
    });

    // 8. House Rules Reset to Naija Classic
    socket.on('rules:reset', () => {
      if (!currentRoomId) return;
      const res = applyPresetRules(currentRoomId, user.id, 'naija_classic');
      if (res.success && res.room && res.room.ruleset && res.room.preset) {
        io.to(currentRoomId).emit('rules:changed', { ruleset: res.room.ruleset, preset: res.room.preset as PresetName });
        io.to(currentRoomId).emit('room:readyCleared');
        broadcastRoomUpdate(currentRoomId);
      }
    });

    // 9. Host Start Game
    socket.on('room:start', () => {
      if (!currentRoomId) return;
      const room = getRoomById(currentRoomId);
      if (!room) return;

      if (room.game === 'whot') {
        const res = startGameSession(currentRoomId, user.id, broadcastGameState, onGameCompleted);
        if (res.success) {
          io.to(currentRoomId).emit('game:started');
          broadcastRoomUpdate(currentRoomId);
          broadcastGameState(currentRoomId);
        } else {
          socket.emit('notification', {
            type: 'error',
            title: 'Cannot Start Game',
            body: res.error || 'Failed to start game',
          });
        }
      } else {
        const res = startRoom(currentRoomId, user.id);
        if (res.success) {
          io.to(currentRoomId).emit('game:started');
          broadcastRoomUpdate(currentRoomId);
        } else {
          socket.emit('notification', {
            type: 'error',
            title: 'Cannot Start Game',
            body: res.error || 'Failed to start game',
          });
        }
      }
    });

    // 10. Game: Play Card
    socket.on('game:play', (data) => {
      if (!currentRoomId) return;
      const res = executePlayerMove(currentRoomId, user.id, data, broadcastGameState, onGameCompleted);
      if (!res.success) {
        socket.emit('notification', {
          type: 'warning',
          title: 'Invalid Move',
          body: res.error || 'Cannot play that card',
        });
      }
    });

    // 11. Game: Draw Card
    socket.on('game:draw', () => {
      if (!currentRoomId) return;
      const res = executePlayerDraw(currentRoomId, user.id, broadcastGameState, onGameCompleted);
      if (!res.success) {
        socket.emit('notification', {
          type: 'warning',
          title: 'Cannot Draw',
          body: res.error || 'Drawing is not permitted right now',
        });
      }
    });

    // 12. Chat message
    socket.on('chat:send', (data) => {
      if (!currentRoomId || !data.text.trim()) return;
      const msg: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        roomId: currentRoomId,
        senderId: user.id,
        senderName: user.username,
        avatarUrl: user.avatarUrl,
        text: data.text.trim().substring(0, 200),
        timestamp: Date.now(),
      };
      io.to(currentRoomId).emit('chat:message', msg);
    });

    // 13. Disconnect
    socket.on('disconnect', () => {
      if (currentRoomId) {
        handlePlayerDisconnect(currentRoomId, user.id, broadcastGameState, onGameCompleted);
        const room = getRoomById(currentRoomId);
        if (room) {
          const p = room.players.find((pl) => pl.userId === user.id);
          if (p) p.isConnected = false;
          broadcastRoomUpdate(currentRoomId);
        }
      }
    });
  });
}
