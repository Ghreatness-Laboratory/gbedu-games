import { create } from 'zustand';
import {
  UserProfile,
  RoomDetails,
  RoomPlayer,
  PlayerGameView,
  ChatMessage,
  Ruleset,
  PresetName,
  Shape,
} from '@gbedu/shared';
import {
  DEFAULT_RULESET,
  PRESETS,
  validateRuleset,
  detectPreset,
  newGame,
  playCard,
  drawCard,
  getPlayerView,
  EngineState,
} from '@gbedu/whot-engine';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { soundEngine } from '../audio/audioEngine';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Pre-seeded Nigerian profiles for fast demo/guest testing
const SEED_PROFILES: Record<string, UserProfile> = {
  ada: { id: 'usr_ada', username: 'ada', displayName: 'Ada Lovelace', avatarUrl: '👑', bio: 'Whot Queen of Lagos', isOnline: true },
  tobi: { id: 'usr_tobi', username: 'tobi', displayName: 'Tobi Bakre', avatarUrl: '🦁', bio: 'Log drum specialist', isOnline: true },
  chi: { id: 'usr_chi', username: 'chi', displayName: 'Chidinma', avatarUrl: '🕶️', bio: 'Never misses Last Card', isOnline: true },
  emeka: { id: 'usr_emeka', username: 'emeka', displayName: 'Emeka', avatarUrl: '🧢', bio: 'General Market master', isOnline: true },
  zainab: { id: 'usr_zainab', username: 'zainab', displayName: 'Zainab', avatarUrl: '💃', bio: 'Amapiano groove goddess', isOnline: true },
  femi: { id: 'usr_femi', username: 'femi', displayName: 'Femi Shrine', avatarUrl: '🪘', bio: 'Afrobeat rhythm elder', isOnline: true },
};

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

interface WhotState {
  // Auth
  user: UserProfile | null;
  token: string | null;
  stats: { gamesPlayed: number; gamesWon: number; totalCards: number; streak: number };
  isAuthLoading: boolean;
  setUser: (user: UserProfile, token: string) => void;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, meta: { username: string; displayName?: string; avatarUrl?: string }) => Promise<{ success: boolean; error?: string }>;
  loginDemo: (username: string, displayName?: string, avatarUrl?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  initAuth: () => void;

  // Realtime Connection
  isConnected: boolean;
  channel: RealtimeChannel | null;
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
  engineState: EngineState | null;
  gameView: PlayerGameView | null;
  chatMessages: ChatMessage[];
  unreadChatCount: number;
  playCard: (cardId: string, chosenShape?: Shape, calledLastCard?: boolean, calledCheckUp?: boolean) => void;
  drawCard: () => void;
  sendChatMessage: (text: string) => void;
  resetChatUnread: () => void;

  // Notifications & Sound
  notification: { title: string; body: string; type?: string } | null;
  clearNotification: () => void;
  isMuted: boolean;
  toggleMute: () => void;
}

export const useWhotStore = create<WhotState>((set, get) => {
  // Local storage cache for instant hydration
  const savedUserStr = localStorage.getItem('gbedu_user');
  const savedToken = localStorage.getItem('gbedu_token');
  const initialUser = savedUserStr ? JSON.parse(savedUserStr) : null;

  return {
    user: initialUser,
    token: savedToken,
    stats: { gamesPlayed: 0, gamesWon: 0, totalCards: 0, streak: 0 },
    isAuthLoading: false,

    isConnected: false,
    channel: null,

    currentRoom: null,
    roomError: null,
    engineState: null,
    gameView: null,
    chatMessages: [],
    unreadChatCount: 0,
    notification: null,
    isMuted: false,

    initAuth: () => {
      if (!isSupabaseConfigured) return;

      // Listen for Supabase session changes
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (!error && session?.user) {
          get().setUser(
            {
              id: session.user.id,
              username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'player',
              displayName: session.user.user_metadata?.display_name || session.user.user_metadata?.username || 'Player',
              avatarUrl: session.user.user_metadata?.avatar_url || '👑',
              bio: session.user.user_metadata?.bio || 'Gbedu Whot Contender',
              isOnline: true,
            },
            session.access_token
          );
        }
      });

      supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          get().setUser(
            {
              id: session.user.id,
              username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'player',
              displayName: session.user.user_metadata?.display_name || session.user.user_metadata?.username || 'Player',
              avatarUrl: session.user.user_metadata?.avatar_url || '👑',
              bio: session.user.user_metadata?.bio || 'Gbedu Whot Contender',
              isOnline: true,
            },
            session.access_token
          );
        }
      });
    },

    setUser: (user, token) => {
      localStorage.setItem('gbedu_user', JSON.stringify(user));
      localStorage.setItem('gbedu_token', token);
      set({ user, token });

      // Fetch stats from Supabase if configured
      if (isSupabaseConfigured) {
        supabase
          .from('player_statistics')
          .select('*')
          .eq('user_id', user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              set({
                stats: {
                  gamesPlayed: data.games_played || 0,
                  gamesWon: data.games_won || 0,
                  totalCards: data.total_cards_played || 0,
                  streak: data.current_streak || 0,
                },
              });
            }
          });
      }
    },

    signIn: async (email, password) => {
      set({ isAuthLoading: true });
      try {
        if (!isSupabaseConfigured) {
          // Fallback if env vars not yet configured in Vercel
          const cleanUser = email.split('@')[0].toLowerCase();
          const seed = SEED_PROFILES[cleanUser] || {
            id: `usr_${Date.now()}`,
            username: cleanUser,
            displayName: cleanUser,
            avatarUrl: '👑',
            isOnline: true,
          };
          get().setUser(seed, `demo_token_${seed.id}`);
          set({ isAuthLoading: false });
          return { success: true };
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          set({ isAuthLoading: false });
          return { success: false, error: error.message };
        }

        if (data.user && data.session) {
          // Fetch user profile from public.profiles
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          const userProfile: UserProfile = {
            id: data.user.id,
            username: profile?.username || data.user.user_metadata?.username || email.split('@')[0],
            displayName: profile?.display_name || data.user.user_metadata?.display_name || email.split('@')[0],
            avatarUrl: profile?.avatar_url || data.user.user_metadata?.avatar_url || '👑',
            bio: profile?.bio || 'Gbedu Whot Contender',
            isOnline: true,
          };

          get().setUser(userProfile, data.session.access_token);
        }

        set({ isAuthLoading: false });
        return { success: true };
      } catch (err) {
        set({ isAuthLoading: false });
        return { success: false, error: (err as Error).message || 'Authentication error' };
      }
    },

    signUp: async (email, password, meta) => {
      set({ isAuthLoading: true });
      try {
        if (!isSupabaseConfigured) {
          const seed: UserProfile = {
            id: `usr_${Date.now()}`,
            username: meta.username.toLowerCase(),
            displayName: meta.displayName || meta.username,
            avatarUrl: meta.avatarUrl || '👑',
            bio: 'New Whot Contender',
            isOnline: true,
          };
          get().setUser(seed, `demo_token_${seed.id}`);
          set({ isAuthLoading: false });
          return { success: true };
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: meta.username.toLowerCase(),
              display_name: meta.displayName || meta.username,
              avatar_url: meta.avatarUrl || '👑',
            },
          },
        });

        if (error) {
          set({ isAuthLoading: false });
          return { success: false, error: error.message };
        }

        if (data.user) {
          const userProfile: UserProfile = {
            id: data.user.id,
            username: meta.username.toLowerCase(),
            displayName: meta.displayName || meta.username,
            avatarUrl: meta.avatarUrl || '👑',
            bio: 'Gbedu Whot Master',
            isOnline: true,
          };

          // Upsert into public.profiles
          await supabase.from('profiles').upsert({
            id: data.user.id,
            username: userProfile.username,
            display_name: userProfile.displayName,
            avatar_url: userProfile.avatarUrl,
            bio: userProfile.bio,
            is_online: true,
            updated_at: new Date().toISOString(),
          });

          // Initialize stats
          await supabase.from('player_statistics').upsert({
            user_id: data.user.id,
            games_played: 0,
            games_won: 0,
            total_cards_played: 0,
            current_streak: 0,
            best_streak: 0,
          });

          if (data.session) {
            get().setUser(userProfile, data.session.access_token);
          } else {
            get().setUser(userProfile, `token_${data.user.id}`);
          }
        }

        set({ isAuthLoading: false });
        return { success: true };
      } catch (err) {
        set({ isAuthLoading: false });
        return { success: false, error: (err as Error).message || 'Signup failed' };
      }
    },

    loginDemo: async (username, displayName, avatarUrl) => {
      const cleanUser = username.toLowerCase();
      const email = `${cleanUser}@gbedugames.com`;
      const password = 'gbedu_demo_password_123';

      if (!isSupabaseConfigured) {
        const seed = SEED_PROFILES[cleanUser] || {
          id: `usr_${cleanUser}`,
          username: cleanUser,
          displayName: displayName || cleanUser,
          avatarUrl: avatarUrl || '👑',
          isOnline: true,
        };
        get().setUser(seed, `token_${seed.id}`);
        return { success: true };
      }

      // Attempt signIn, or auto-signUp if not created yet
      const loginRes = await get().signIn(email, password);
      if (loginRes.success) return { success: true };

      // Otherwise create the demo account
      return get().signUp(email, password, {
        username: cleanUser,
        displayName: displayName || cleanUser,
        avatarUrl: avatarUrl || '👑',
      });
    },

    logout: async () => {
      const { channel } = get();
      if (channel) {
        channel.unsubscribe();
      }
      if (isSupabaseConfigured) {
        await supabase.auth.signOut().catch(() => {});
      }
      localStorage.removeItem('gbedu_user');
      localStorage.removeItem('gbedu_token');
      set({
        user: null,
        token: null,
        currentRoom: null,
        gameView: null,
        channel: null,
        isConnected: false,
        engineState: null,
        chatMessages: [],
      });
    },

    initSocket: () => {
      // Compatibility no-op: Supabase Realtime channel is initialized when entering room
    },

    // Room Management with Supabase & Supabase Realtime
    createRoom: async (rulesetParam, maxPlayersParam = 6) => {
      const { user } = get();
      if (!user) return false;

      const code = generateRoomCode();
      const validated = validateRuleset(rulesetParam || DEFAULT_RULESET);
      const ruleset = validated.ruleset;
      const preset = detectPreset(ruleset);
      const maxPlayers = Math.max(2, Math.min(6, maxPlayersParam));

      const hostPlayer: RoomPlayer = {
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        seatIndex: 0,
        isHost: true,
        isReady: true,
        isConnected: true,
      };

      const roomId = `room_${Date.now()}_${code}`;

      const room: RoomDetails = {
        id: roomId,
        code,
        hostId: user.id,
        status: 'lobby',
        ruleset,
        preset,
        maxPlayers,
        players: [hostPlayer],
        createdAt: new Date().toISOString(),
      };

      // Persist to Supabase if configured
      if (isSupabaseConfigured) {
        supabase
          .from('game_rooms')
          .insert({
            code,
            host_id: user.id,
            status: 'lobby',
            ruleset,
            max_players: maxPlayers,
          })
          .then(() => {}, () => {});
      }

      set({ currentRoom: room, roomError: null, chatMessages: [], engineState: null, gameView: null });

      // Join Supabase Realtime Channel
      setupRoomRealtime(code, room);
      return true;
    },

    joinRoom: async (code) => {
      const { user } = get();
      if (!user) return false;

      const cleanCode = code.trim().toUpperCase();

      // Check if room exists in Supabase
      if (isSupabaseConfigured) {
        const { data: dbRoom, error } = await supabase
          .from('game_rooms')
          .select('*')
          .eq('code', cleanCode)
          .single();

        if (error && error.code !== 'PGRST116') {
          // If error occurs and not just missing record
        }

        if (dbRoom) {
          const validated = validateRuleset(dbRoom.ruleset || DEFAULT_RULESET);
          const room: RoomDetails = {
            id: dbRoom.id || `room_${cleanCode}`,
            code: cleanCode,
            hostId: dbRoom.host_id,
            status: dbRoom.status || 'lobby',
            ruleset: validated.ruleset,
            preset: detectPreset(validated.ruleset),
            maxPlayers: dbRoom.max_players || 6,
            players: [
              {
                userId: user.id,
                username: user.username,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl,
                seatIndex: 1,
                isHost: dbRoom.host_id === user.id,
                isReady: dbRoom.host_id === user.id,
                isConnected: true,
              },
            ],
            createdAt: dbRoom.created_at || new Date().toISOString(),
          };

          set({ currentRoom: room, roomError: null, chatMessages: [] });
          setupRoomRealtime(cleanCode, room);
          return true;
        }
      }

      // If playing locally/in-memory, create/join room with this code
      const defaultRoom: RoomDetails = {
        id: `room_${cleanCode}`,
        code: cleanCode,
        hostId: user.id,
        status: 'lobby',
        ruleset: DEFAULT_RULESET,
        preset: 'naija_classic',
        maxPlayers: 6,
        players: [
          {
            userId: user.id,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            seatIndex: 0,
            isHost: true,
            isReady: true,
            isConnected: true,
          },
        ],
        createdAt: new Date().toISOString(),
      };

      set({ currentRoom: defaultRoom, roomError: null, chatMessages: [] });
      setupRoomRealtime(cleanCode, defaultRoom);
      return true;
    },

    leaveRoom: () => {
      const { channel, currentRoom } = get();
      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'room:playerLeft',
          payload: { userId: get().user?.id },
        });
        channel.unsubscribe();
      }
      set({
        currentRoom: null,
        gameView: null,
        engineState: null,
        chatMessages: [],
        channel: null,
        isConnected: false,
      });
    },

    toggleReady: () => {
      const { currentRoom, user, channel } = get();
      if (!currentRoom || !user) return;

      const updatedPlayers = currentRoom.players.map((p) =>
        p.userId === user.id ? { ...p, isReady: !p.isReady } : p
      );
      const updatedRoom = { ...currentRoom, players: updatedPlayers };
      set({ currentRoom: updatedRoom });

      soundEngine.playShekere();

      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'room:update',
          payload: updatedRoom,
        });
      }
    },

    kickPlayer: (targetUserId) => {
      const { currentRoom, user, channel } = get();
      if (!currentRoom || !user || currentRoom.hostId !== user.id) return;

      const updatedPlayers = currentRoom.players.filter((p) => p.userId !== targetUserId);
      const updatedRoom = { ...currentRoom, players: updatedPlayers };
      set({ currentRoom: updatedRoom });

      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'room:kicked',
          payload: { userId: targetUserId, reason: 'Removed by room host' },
        });
        channel.send({
          type: 'broadcast',
          event: 'room:update',
          payload: updatedRoom,
        });
      }
    },

    updateRules: (proposedRuleset) => {
      const { currentRoom, user, channel } = get();
      if (!currentRoom || !user || currentRoom.hostId !== user.id) return;

      const merged = { ...currentRoom.ruleset, ...proposedRuleset };
      const validated = validateRuleset(merged);
      if (!validated.valid) return;

      const updatedPlayers = currentRoom.players.map((p) => (p.isHost ? p : { ...p, isReady: false }));
      const updatedRoom: RoomDetails = {
        ...currentRoom,
        ruleset: validated.ruleset,
        preset: detectPreset(validated.ruleset),
        players: updatedPlayers,
      };

      set({ currentRoom: updatedRoom });

      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'room:update',
          payload: updatedRoom,
        });
      }
    },

    applyPreset: (preset) => {
      if (preset === 'custom') return;
      const target = PRESETS[preset];
      get().updateRules(target);
    },

    resetRules: () => {
      get().updateRules(DEFAULT_RULESET);
    },

    startGame: () => {
      const { currentRoom, user, channel } = get();
      if (!currentRoom || !user || currentRoom.hostId !== user.id) return;

      if (currentRoom.players.length < 2) {
        set({
          notification: {
            title: 'Need More Players',
            body: 'At least 2 players are required to start Naija Whot.',
            type: 'warning',
          },
        });
        return;
      }

      // Initialize deterministic Whot Engine
      const rawPlayers = currentRoom.players.map((p) => ({
        userId: p.userId,
        username: p.username,
        displayName: p.displayName,
        avatarUrl: p.avatarUrl,
      }));

      const res = newGame({
        roomId: currentRoom.id,
        players: rawPlayers,
        ruleset: currentRoom.ruleset,
      });

      const updatedRoom: RoomDetails = {
        ...currentRoom,
        status: 'in_progress',
      };

      const myView = getPlayerView(res.state, user.id);
      soundEngine.playAgogo(true);

      set({
        currentRoom: updatedRoom,
        engineState: res.state,
        gameView: myView,
      });

      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'game:started',
          payload: { room: updatedRoom, engineState: res.state },
        });
      }
    },

    playCard: (cardId, chosenShape, calledLastCard, calledCheckUp) => {
      const { engineState, user, channel, currentRoom } = get();
      if (!engineState || !user) return;

      const res = playCard(engineState, {
        userId: user.id,
        cardId,
        chosenShape,
        calledLastCard,
        calledCheckUp,
      });

      if (!res.success) {
        set({
          notification: {
            title: 'Invalid Move',
            body: res.error || 'Cannot play that card right now',
            type: 'warning',
          },
        });
        return;
      }

      soundEngine.playHitSound('perfect');
      const myView = getPlayerView(res.state, user.id);
      set({ engineState: res.state, gameView: myView });

      if (res.state.gameStatus === 'completed') {
        handleGameWon(res.state);
      }

      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'game:stateSync',
          payload: { engineState: res.state },
        });
      }
    },

    drawCard: () => {
      const { engineState, user, channel } = get();
      if (!engineState || !user) return;

      const res = drawCard(engineState, { userId: user.id });
      if (!res.success) {
        set({
          notification: {
            title: 'Cannot Draw',
            body: res.error || 'Drawing is not permitted right now',
            type: 'warning',
          },
        });
        return;
      }

      soundEngine.playShekere();
      const myView = getPlayerView(res.state, user.id);
      set({ engineState: res.state, gameView: myView });

      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'game:stateSync',
          payload: { engineState: res.state },
        });
      }
    },

    sendChatMessage: (text) => {
      const { currentRoom, user, channel, chatMessages } = get();
      if (!currentRoom || !user || !text.trim()) return;

      const msg: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        roomId: currentRoom.id,
        senderId: user.id,
        senderName: user.username,
        avatarUrl: user.avatarUrl,
        text: text.trim().substring(0, 200),
        timestamp: Date.now(),
      };

      set({ chatMessages: [...chatMessages, msg] });

      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'chat:message',
          payload: msg,
        });
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

// Helper to configure Supabase Realtime channel for live multiplayer
function setupRoomRealtime(roomCode: string, initialRoom: RoomDetails) {
  const store = useWhotStore.getState();
  const user = store.user;
  if (!user) return;

  if (store.channel) {
    store.channel.unsubscribe();
  }

  const channel = supabase.channel(`room:${roomCode}`, {
    config: {
      broadcast: { ack: true, self: false },
      presence: { key: user.id },
    },
  });

  channel
    .on('broadcast', { event: 'room:update' }, ({ payload }) => {
      useWhotStore.setState({ currentRoom: payload });
    })
    .on('broadcast', { event: 'room:playerJoined' }, ({ payload }) => {
      const { currentRoom } = useWhotStore.getState();
      if (!currentRoom) return;
      const exists = currentRoom.players.some((p) => p.userId === payload.userId);
      if (!exists && currentRoom.players.length < currentRoom.maxPlayers) {
        const updated = { ...currentRoom, players: [...currentRoom.players, payload] };
        useWhotStore.setState({ currentRoom: updated });
      }
    })
    .on('broadcast', { event: 'room:playerLeft' }, ({ payload }) => {
      const { currentRoom } = useWhotStore.getState();
      if (!currentRoom) return;
      const updated = {
        ...currentRoom,
        players: currentRoom.players.filter((p) => p.userId !== payload.userId),
      };
      useWhotStore.setState({ currentRoom: updated });
    })
    .on('broadcast', { event: 'room:kicked' }, ({ payload }) => {
      const currentUserId = useWhotStore.getState().user?.id;
      if (payload.userId === currentUserId) {
        useWhotStore.getState().leaveRoom();
        useWhotStore.setState({
          notification: {
            title: 'Removed from Room',
            body: payload.reason || 'You have been removed by the host',
            type: 'warning',
          },
        });
      }
    })
    .on('broadcast', { event: 'game:started' }, ({ payload }) => {
      const currentUserId = useWhotStore.getState().user?.id;
      if (!currentUserId) return;
      soundEngine.playAgogo(true);
      const myView = getPlayerView(payload.engineState, currentUserId);
      useWhotStore.setState({
        currentRoom: payload.room,
        engineState: payload.engineState,
        gameView: myView,
      });
    })
    .on('broadcast', { event: 'game:stateSync' }, ({ payload }) => {
      const currentUserId = useWhotStore.getState().user?.id;
      if (!currentUserId || !payload.engineState) return;

      const myView = getPlayerView(payload.engineState, currentUserId);
      if (myView.activeUserId === currentUserId && !myView.isGameOver) {
        soundEngine.playAgogo(true);
      }

      useWhotStore.setState({
        engineState: payload.engineState,
        gameView: myView,
      });

      if (payload.engineState.gameStatus === 'completed') {
        handleGameWon(payload.engineState);
      }
    })
    .on('broadcast', { event: 'chat:message' }, ({ payload }) => {
      useWhotStore.setState((state) => ({
        chatMessages: [...state.chatMessages, payload],
        unreadChatCount: state.unreadChatCount + 1,
      }));
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        useWhotStore.setState({ isConnected: true, channel });

        // Announce presence to other players
        channel.send({
          type: 'broadcast',
          event: 'room:playerJoined',
          payload: {
            userId: user.id,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            seatIndex: initialRoom.players.length,
            isHost: initialRoom.hostId === user.id,
            isReady: initialRoom.hostId === user.id,
            isConnected: true,
          },
        });
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        useWhotStore.setState({ isConnected: false });
      }
    });

  useWhotStore.setState({ channel, isConnected: true });
}

function handleGameWon(state: EngineState) {
  soundEngine.playCheerSound();
  const winner = state.players.find((p) => p.userId === state.winnerUserId);
  const winnerName = winner?.username || 'Champion';

  useWhotStore.setState({
    notification: {
      title: 'Game Over!',
      body: `${winnerName} has won the match!`,
      type: 'success',
    },
  });

  // Record to Supabase if configured
  if (isSupabaseConfigured && state.winnerUserId) {
    const isWinner = useWhotStore.getState().user?.id === state.winnerUserId;
    supabase
      .from('player_statistics')
      .select('*')
      .eq('user_id', state.winnerUserId)
      .single()
      .then(({ data }) => {
        if (data) {
          supabase
            .from('player_statistics')
            .update({
              games_played: (data.games_played || 0) + 1,
              games_won: (data.games_won || 0) + (isWinner ? 1 : 0),
              current_streak: isWinner ? (data.current_streak || 0) + 1 : 0,
            })
            .eq('user_id', state.winnerUserId)
            .then(() => {});
        }
      });
  }
}
