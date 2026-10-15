import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import {
  UserProfile,
  RoomDetails,
  PlayerGameView,
  ChatMessage,
  ClientToServerEvents,
  ServerToClientEvents,
  Ruleset,
  PresetName,
  Shape,
} from '@gbedu/shared';
import { soundEngine } from '../audio/audioEngine';

interface WhotState {
  // Auth
  user: UserProfile | null;
  token: string | null;
  stats: { gamesPlayed: number; gamesWon: number; totalCards: number; streak: number };
  setUser: (user: UserProfile, token: string) => void;
  logout: () => void;

  // Socket
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  isConnected: boolean;
  initSocket: () => void;

  // Room
  currentRoom: RoomDetails | null;
  roomError: string | null;
  createRoom: (ruleset?: Partial<Ruleset>, maxPlayers?: number) => Promise<boolean>;
  joinRoom: (code: string) => Promise<boolean>;
  leaveRoom: () => void;
  toggleReady: () => void;
  kickPlayer: (userId: string) => void;
  startGame: () => void;
  updateRules: (ruleset: Partial<Ruleset>) => void;
  applyPreset: (preset: PresetName) => void;
  resetRules: () => void;

  // Game
  gameView: PlayerGameView | null;
  chatMessages: ChatMessage[];
  unreadChatCount: number;
  playCard: (cardId: string, chosenShape?: Shape, calledLastCard?: boolean, calledCheckUp?: boolean) => void;
  drawCard: () => void;
  sendChatMessage: (text: string) => void;
  resetChatUnread: () => void;

  // Notifications
  notification: { title: string; body: string; type?: string } | null;
  clearNotification: () => void;

  // Sound
  isMuted: boolean;
  toggleMute: () => void;
}

export const useWhotStore = create<WhotState>((set, get) => {
  const savedToken = localStorage.getItem('gbedu_token');
  const savedUser = localStorage.getItem('gbedu_user');

  return {
    user: savedUser ? JSON.parse(savedUser) : null,
    token: savedToken || null,
    stats: { gamesPlayed: 0, gamesWon: 0, totalCards: 0, streak: 0 },

    socket: null,
    isConnected: false,

    currentRoom: null,
    roomError: null,
    gameView: null,
    chatMessages: [],
    unreadChatCount: 0,
    notification: null,
    isMuted: false,

    setUser: (user, token) => {
      localStorage.setItem('gbedu_token', token);
      localStorage.setItem('gbedu_user', JSON.stringify(user));
      set({ user, token });
      get().initSocket();
    },

    logout: () => {
      const { socket } = get();
      if (socket) socket.disconnect();
      localStorage.removeItem('gbedu_token');
      localStorage.removeItem('gbedu_user');
      set({ user: null, token: null, socket: null, currentRoom: null, gameView: null });
    },

    initSocket: () => {
      const { token, socket: existingSocket } = get();
      if (!token) return;

      if (existingSocket) {
        existingSocket.disconnect();
      }

      // Connect to unified Socket.IO server on current window origin
      const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({
        auth: { token },
        transports: ['websocket', 'polling'],
      });

      socket.on('connect', () => {
        set({ isConnected: true });
      });

      socket.on('disconnect', () => {
        set({ isConnected: false });
      });

      socket.on('room:updated', (room) => {
        set({ currentRoom: room });
      });

      socket.on('rules:changed', ({ ruleset, preset }) => {
        const { currentRoom } = get();
        if (currentRoom) {
          set({ currentRoom: { ...currentRoom, ruleset, preset } });
        }
      });

      socket.on('room:readyCleared', () => {
        const { currentRoom } = get();
        if (currentRoom) {
          const updatedPlayers = currentRoom.players.map((p) => (p.isHost ? p : { ...p, isReady: false }));
          set({ currentRoom: { ...currentRoom, players: updatedPlayers } });
        }
      });

      socket.on('room:kicked', ({ reason }) => {
        set({
          currentRoom: null,
          gameView: null,
          notification: { title: 'Removed from Room', body: reason, type: 'warning' },
        });
      });

      socket.on('game:started', () => {
        soundEngine.playAgogo(true);
      });

      socket.on('game:state', (view) => {
        set({ gameView: view });
        // Play turn chime if it's now our turn
        const { user } = get();
        if (user && view.activeUserId === user.id && !view.isGameOver) {
          soundEngine.playAgogo(true);
        }
      });

      socket.on('game:completed', ({ winnerName }) => {
        soundEngine.playCheerSound();
        set({
          notification: {
            title: 'Game Over!',
            body: `${winnerName} has won the match!`,
            type: 'success',
          },
        });
      });

      socket.on('chat:message', (message) => {
        set((state) => ({
          chatMessages: [...state.chatMessages, message],
          unreadChatCount: state.unreadChatCount + 1,
        }));
      });

      socket.on('notification', ({ title, body, type }) => {
        set({ notification: { title, body, type } });
      });

      set({ socket });
    },

    createRoom: async (ruleset, maxPlayers) => {
      const { socket } = get();
      if (!socket) return false;

      return new Promise((resolve) => {
        socket.emit('room:create', { ruleset, maxPlayers }, (res) => {
          if (res.success && res.room) {
            set({ currentRoom: res.room, roomError: null, chatMessages: [] });
            resolve(true);
          } else {
            set({ roomError: res.error || 'Failed to create room' });
            resolve(false);
          }
        });
      });
    },

    joinRoom: async (code) => {
      const { socket } = get();
      if (!socket) return false;

      return new Promise((resolve) => {
        socket.emit('room:join', { code }, (res) => {
          if (res.success && res.room) {
            set({ currentRoom: res.room, roomError: null, chatMessages: [] });
            resolve(true);
          } else {
            set({ roomError: res.error || 'Failed to join room' });
            resolve(false);
          }
        });
      });
    },

    leaveRoom: () => {
      const { socket } = get();
      if (socket) socket.emit('room:leave');
      set({ currentRoom: null, gameView: null, chatMessages: [] });
    },

    toggleReady: () => {
      const { socket, currentRoom, user } = get();
      if (!socket || !currentRoom || !user) return;
      const me = currentRoom.players.find((p) => p.userId === user.id);
      if (me) {
        soundEngine.playShekere();
        socket.emit('room:ready', { isReady: !me.isReady });
      }
    },

    kickPlayer: (userId) => {
      const { socket } = get();
      if (socket) socket.emit('room:kick', { userId });
    },

    startGame: () => {
      const { socket } = get();
      if (socket) {
        soundEngine.playAgogo(true);
        socket.emit('room:start');
      }
    },

    updateRules: (ruleset) => {
      const { socket } = get();
      if (socket) socket.emit('rules:update', { ruleset });
    },

    applyPreset: (preset) => {
      const { socket } = get();
      if (socket) socket.emit('rules:preset', { preset });
    },

    resetRules: () => {
      const { socket } = get();
      if (socket) socket.emit('rules:reset');
    },

    playCard: (cardId, chosenShape, calledLastCard, calledCheckUp) => {
      const { socket } = get();
      if (socket) {
        soundEngine.playHitSound('perfect');
        socket.emit('game:play', { cardId, chosenShape, calledLastCard, calledCheckUp });
      }
    },

    drawCard: () => {
      const { socket } = get();
      if (socket) {
        soundEngine.playShekere();
        socket.emit('game:draw');
      }
    },

    sendChatMessage: (text) => {
      const { socket } = get();
      if (socket && text.trim()) {
        socket.emit('chat:send', { text: text.trim() });
      }
    },

    resetChatUnread: () => {
      set({ unreadChatCount: 0 });
    },

    clearNotification: () => {
      set({ notification: null });
    },

    toggleMute: () => {
      const nextMuted = !get().isMuted;
      soundEngine.setMuted(nextMuted);
      set({ isMuted: nextMuted });
    },
  };
});
