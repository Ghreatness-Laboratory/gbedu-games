import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useWhotStore } from '../store/useWhotStore';
import { getGameById, GAMES_CATALOG } from '../data/gamesCatalog';
import { soundEngine } from '../audio/audioEngine';
import { Avatar } from './Avatar';
import { RoomPlayer, RoomDetails } from '@gbedu/shared';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  Crown,
  Check,
  Copy,
  Share2,
  Users,
  LogOut,
  Play,
  Settings,
  ShieldCheck,
  AlertTriangle,
  ArrowLeft,
  Sparkles,
  Bot,
  UserX,
  Clock,
  Flame,
  Radio,
  X,
  Volume2,
} from 'lucide-react';

interface WaitingRoomScreenProps {
  onOpenPicker?: () => void;
}

export const WaitingRoomScreen: React.FC<WaitingRoomScreenProps> = () => {
  const { code: rawCode } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user, isMuted } = useWhotStore();

  const code = (rawCode || '').trim().toUpperCase();

  // Room state
  const [room, setRoom] = useState<RoomDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'not_found' | 'expired' | 'full' | 'playing' | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type?: 'info' | 'success' | 'warning' } | null>(null);

  // Settings editable state for owner
  const [roundLimit, setRoundLimit] = useState(3);
  const [allowFinishingOnSpecial, setAllowFinishingOnSpecial] = useState(false);

  // Disconnect grace timers for waiting room (30s)
  const [disconnectCounters, setDisconnectCounters] = useState<Record<string, number>>({});

  // Show toast helper
  const showToast = (message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3200);
  };

  // 1. Fetch & Seat User in Room
  const loadAndJoinRoom = async () => {
    if (!code) {
      setErrorType('not_found');
      setErrorMessage('No room code provided');
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setErrorType(null);

    try {
      // 1. Try Supabase RPC if configured
      if (isSupabaseConfigured && user) {
        const { data: joinRes, error: rpcErr } = await supabase.rpc('join_room', {
          p_code: code,
        });

        if (rpcErr) {
          console.warn('Supabase join_room RPC error:', rpcErr);
        } else if (joinRes) {
          if (!joinRes.success) {
            if (joinRes.error?.toLowerCase().includes('expired')) {
              setErrorType('expired');
            } else if (joinRes.error?.toLowerCase().includes('full')) {
              setErrorType('full');
            } else if (joinRes.error?.toLowerCase().includes('started')) {
              setErrorType('playing');
            } else {
              setErrorType('not_found');
            }
            setErrorMessage(joinRes.error || 'Failed to join room');
            setLoading(false);
            return;
          }

          // Fetch fresh full room details
          const { data: roomRes } = await supabase.rpc('get_room_by_code', {
            p_code: code,
          });

          if (roomRes?.success && roomRes.room) {
            setRoom(roomRes.room);
            setLoading(false);
            return;
          }
        }
      }

      // 2. Try Server API Route fallback (/api/rooms/lookup/:code or /api/rooms/join)
      const token = localStorage.getItem('gbedu_token') || `token_${user?.id || 'guest'}`;
      const lookupRes = await fetch(`/api/rooms/lookup/${code}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (lookupRes.ok) {
        const json = await lookupRes.json();
        if (json.success && json.room) {
          // Join the room if user is not already seated
          const existingPlayer = json.room.players.find((p: RoomPlayer) => p.userId === user?.id);
          if (!existingPlayer && user) {
            const joinApiRes = await fetch(`/api/rooms/join`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ code }),
            });
            const joinJson = await joinApiRes.json();
            if (joinJson.success && joinJson.room) {
              setRoom(joinJson.room);
              setLoading(false);
              return;
            } else if (!joinJson.success) {
              setErrorMessage(joinJson.error || 'Could not join room');
              setErrorType(joinJson.error?.includes('full') ? 'full' : 'not_found');
              setLoading(false);
              return;
            }
          }

          setRoom(json.room);
          setLoading(false);
          return;
        }
      } else if (lookupRes.status === 410) {
        setErrorType('expired');
        setErrorMessage('This waiting room has expired due to inactivity');
        setLoading(false);
        return;
      }

      // 3. In-memory / client fallback (guest / local preview)
      if (user) {
        const gameId = 'xo';
        const fallbackRoom: RoomDetails = {
          id: `room_${code}`,
          code,
          game: gameId,
          hostId: user.id,
          status: 'waiting',
          maxPlayers: 2,
          minPlayers: 2,
          players: [
            {
              userId: user.id,
              publicId: user.publicId || `#GB-${code.slice(0, 4)}`,
              username: user.username,
              displayName: user.displayName || user.username,
              avatarUrl: user.avatarUrl,
              avatarId: user.avatarId,
              avatarConfig: user.avatarConfig,
              seatIndex: 0,
              isHost: true,
              isReady: true,
              isConnected: true,
              isVerified: true,
              joinedAt: new Date().toISOString(),
            },
          ],
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
          settings: {
            roundLimit: 3,
            allowFinishingOnSpecial: false,
          },
        };
        setRoom(fallbackRoom);
        setLoading(false);
        return;
      }

      setErrorType('not_found');
      setErrorMessage('Room not found with that code');
      setLoading(false);
    } catch (err) {
      console.error('Error loading room:', err);
      setErrorMessage('Failed to connect to room. Please check your connection.');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAndJoinRoom();
  }, [code, user?.id]);

  // 2. Realtime Synchronization & Presence
  useEffect(() => {
    if (!room || !user) return;

    let cleanup = () => {};

    if (isSupabaseConfigured) {
      const channel = supabase.channel(`waiting_room:${room.code}`, {
        config: {
          broadcast: { ack: true, self: false },
          presence: { key: user.id },
        },
      });

      channel
        .on('presence', { event: 'sync' }, () => {
          const presenceState = channel.presenceState();
          const activeUserIds = new Set(Object.keys(presenceState));

          setRoom((prev) => {
            if (!prev) return prev;
            const updated = prev.players.map((p) => {
              const isPresent = activeUserIds.has(p.userId);
              return {
                ...p,
                isConnected: isPresent,
                disconnectedAt: isPresent ? null : p.disconnectedAt || Date.now(),
              };
            });
            return { ...prev, players: updated };
          });
        })
        .on('presence', { event: 'join' }, ({ newPresences }) => {
          const joinedUser = newPresences[0];
          if (joinedUser && joinedUser.username && joinedUser.key !== user.id) {
            soundEngine.playAgogo(true);
            showToast(`${joinedUser.username} connected`, 'success');
          }
        })
        .on('presence', { event: 'leave' }, ({ leftPresences }) => {
          const leftUser = leftPresences[0];
          if (leftUser && leftUser.username) {
            soundEngine.playTalkingDrum(false);
            showToast(`${leftUser.username} disconnected`, 'warning');
          }
        })
        .on('broadcast', { event: 'room:update' }, ({ payload }) => {
          if (payload) {
            setRoom(payload);
          }
        })
        .on('broadcast', { event: 'room:playerJoined' }, ({ payload }) => {
          if (!payload) return;
          soundEngine.playAgogo(true);
          showToast(`${payload.displayName || payload.username} joined!`, 'success');

          setRoom((prev) => {
            if (!prev) return prev;
            const exists = prev.players.some((p) => p.userId === payload.userId);
            if (exists) return prev;
            return {
              ...prev,
              players: [...prev.players, payload],
            };
          });
        })
        .on('broadcast', { event: 'room:playerLeft' }, ({ payload }) => {
          if (!payload) return;
          soundEngine.playTalkingDrum(false);
          showToast(`${payload.username || 'A player'} left the room`, 'info');

          setRoom((prev) => {
            if (!prev) return prev;
            const remaining = prev.players.filter((p) => p.userId !== payload.userId);
            let nextHostId = prev.hostId;
            if (payload.userId === prev.hostId && remaining.length > 0) {
              remaining[0].isHost = true;
              nextHostId = remaining[0].userId;
              showToast(`New owner: ${remaining[0].displayName || remaining[0].username}`, 'info');
            }
            return {
              ...prev,
              hostId: nextHostId,
              players: remaining,
            };
          });
        })
        .on('broadcast', { event: 'room:kicked' }, ({ payload }) => {
          if (payload.userId === user.id) {
            soundEngine.playWrongSound();
            navigate('/home');
            useWhotStore.setState({
              notification: {
                title: 'Removed from Room',
                body: 'You were removed by the room owner.',
                type: 'warning',
              },
            });
          } else {
            setRoom((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                players: prev.players.filter((p) => p.userId !== payload.userId),
              };
            });
          }
        })
        .on('broadcast', { event: 'room:startCountdown' }, ({ payload }) => {
          triggerCountdown(payload.room || room);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({
              userId: user.id,
              username: user.username,
              displayName: user.displayName,
              avatarUrl: user.avatarUrl,
            });

            // Announce join broadcast
            const currentPlayer = room.players.find((p) => p.userId === user.id);
            if (currentPlayer) {
              channel.send({
                type: 'broadcast',
                event: 'room:playerJoined',
                payload: currentPlayer,
              });
            }
          }
        });

      cleanup = () => {
        channel.unsubscribe();
      };
    }

    return () => {
      cleanup();
    };
  }, [room?.code, user?.id]);

  // 3. Disconnection countdown timer (30s)
  useEffect(() => {
    if (!room) return;

    const timer = setInterval(() => {
      setRoom((prev) => {
        if (!prev) return prev;
        const now = Date.now();
        let changed = false;

        const updatedPlayers = prev.players.filter((p) => {
          if (p.isConnected || !p.disconnectedAt) return true;
          const elapsed = (now - p.disconnectedAt) / 1000;
          if (elapsed >= 30) {
            changed = true;
            showToast(`${p.displayName || p.username} seat freed after 30s timeout`, 'info');
            return false;
          }
          return true;
        });

        if (!changed) return prev;
        return { ...prev, players: updatedPlayers };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [room]);

  // Trigger 3-2-1 Countdown and transition
  const triggerCountdown = (targetRoom: RoomDetails) => {
    setIsStarting(true);
    let count = 3;
    setCountdown(count);
    soundEngine.playCountdown(count);

    const interval = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
        soundEngine.playCountdown(count);
      } else if (count === 0) {
        setCountdown(0);
        soundEngine.playCountdown(0);
      } else {
        clearInterval(interval);
        // Move into game together!
        const gameId = targetRoom.game || 'xo';
        navigate(`/game/${gameId}?room=${targetRoom.code}`);
      }
    }, 900);
  };

  const handleCopyCode = () => {
    soundEngine.playClick();
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleShare = async () => {
    soundEngine.playClick();
    const shareUrl = `${window.location.origin}/room/${code}`;
    const gameDef = getGameById(room?.game || 'xo');
    const shareTitle = `Play ${gameDef?.name || 'Gbedu Games'} with me!`;
    const shareText = `Join my room on Gbedu Games! Room Code: ${code}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // User cancelled or unsupported; fallback to copy link
      }
    }

    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    showToast('Share link copied to clipboard!', 'success');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleLeaveRoom = async () => {
    soundEngine.playTalkingDrum(false);
    if (room && user) {
      if (isSupabaseConfigured) {
        await supabase.rpc('leave_room', { p_room_id: room.id });
      }
      try {
        const token = localStorage.getItem('gbedu_token') || `token_${user.id}`;
        await fetch(`/api/rooms/${room.id}/leave`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (e) {
        // Safe fallback
      }
    }
    navigate('/home');
  };

  const handleKickPlayer = async (targetUserId: string) => {
    soundEngine.playClick();
    if (!room || !user || room.hostId !== user.id) return;

    if (isSupabaseConfigured) {
      await supabase.rpc('kick_player', {
        p_room_id: room.id,
        p_target_user_id: targetUserId,
      });
    }

    try {
      const token = localStorage.getItem('gbedu_token') || `token_${user.id}`;
      await fetch(`/api/rooms/${room.id}/kick`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId }),
      });
    } catch (e) {
      // Safe fallback
    }

    setRoom((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        players: prev.players.filter((p) => p.userId !== targetUserId),
      };
    });
    showToast('Player removed', 'info');
  };

  const handleAddBot = () => {
    if (!room || !user || room.hostId !== user.id) return;
    if (room.players.length >= room.maxPlayers) return;

    soundEngine.playAgogo(true);
    const botIndex = room.players.length;
    const botNames = ['Tobi (AI)', 'Chi (AI)', 'Emeka (AI)', 'Zainab (AI)'];
    const botAvatars = ['avatar-02', 'avatar-04', 'avatar-07', 'avatar-09'];
    const name = botNames[botIndex % botNames.length];
    const avatarId = botAvatars[botIndex % botAvatars.length];

    const botPlayer: RoomPlayer = {
      userId: `bot_${Date.now()}`,
      publicId: `#GB-BOT${botIndex + 1}`,
      username: name,
      displayName: name,
      avatarUrl: avatarId,
      avatarId: avatarId,
      seatIndex: botIndex,
      isHost: false,
      isReady: true,
      isConnected: true,
      isVerified: true,
      joinedAt: new Date().toISOString(),
    };

    setRoom((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        players: [...prev.players, botPlayer],
      };
    });
    showToast(`${name} took a seat`, 'info');
  };

  const handleStartGame = async () => {
    if (!room || !user || room.hostId !== user.id) return;
    const min = room.minPlayers || 2;
    if (room.players.length < min) {
      soundEngine.playWrongSound();
      showToast(`Need at least ${min} players to start!`, 'warning');
      return;
    }

    soundEngine.playClick();
    setIsStarting(true);

    // Call server API or Supabase RPC to enforce owner check on server
    let serverOk = true;
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('start_room', {
        p_room_id: room.id,
      });
      if (error || !data?.success) {
        serverOk = false;
        soundEngine.playWrongSound();
        showToast(data?.error || error?.message || 'Server rejected start request', 'warning');
        setIsStarting(false);
        return;
      }
    } else {
      try {
        const token = localStorage.getItem('gbedu_token') || `token_${user.id}`;
        const res = await fetch(`/api/rooms/${room.id}/start`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!json.success) {
          serverOk = false;
          soundEngine.playWrongSound();
          showToast(json.error || 'Server rejected start request', 'warning');
          setIsStarting(false);
          return;
        }
      } catch (e) {
        // Fallback permitted in offline preview
      }
    }

    if (serverOk) {
      // Broadcast countdown to channel
      if (isSupabaseConfigured) {
        const channel = supabase.channel(`waiting_room:${room.code}`);
        channel.send({
          type: 'broadcast',
          event: 'room:startCountdown',
          payload: { room: { ...room, status: 'playing' } },
        });
      }

      triggerCountdown({ ...room, status: 'playing' });
    }
  };

  // Handle Loading
  if (loading) {
    return (
      <div className="flex-1 w-full flex flex-col items-center justify-center py-12 px-4 select-none">
        <div className="w-16 h-16 rounded-3xl bg-[#141d33] border border-[#26314d] flex items-center justify-center animate-pulse mb-4 shadow-xl">
          <Radio className="w-8 h-8 text-[#ff7a00] animate-spin" />
        </div>
        <h2 className="text-lg font-black text-white font-display">ENTERING ROOM...</h2>
        <p className="text-xs text-gray-400 mt-1">Connecting to room #{code}</p>
      </div>
    );
  }

  // Handle Error (Invalid, Expired, Full, Started)
  if (errorMessage || !room) {
    const errorIcons = {
      expired: <Clock className="w-8 h-8 text-[#ffb703]" />,
      full: <Users className="w-8 h-8 text-rose-400" />,
      playing: <Flame className="w-8 h-8 text-[#ff7a00]" />,
      not_found: <AlertTriangle className="w-8 h-8 text-[#ff7a00]" />,
    };

    const errorTitles = {
      expired: 'Waiting Room Expired',
      full: 'Room is Full',
      playing: 'Match Already Started',
      not_found: 'Room Not Found',
    };

    const currentType = errorType || 'not_found';

    return (
      <div className="flex-1 w-full max-w-md mx-auto px-4 py-12 flex flex-col items-center justify-center text-center select-none animate-fade-in">
        <div className="w-20 h-20 rounded-3xl bg-[#141d33] border-2 border-[#26314d] flex items-center justify-center mb-5 shadow-2xl">
          {errorIcons[currentType]}
        </div>

        <h2 className="text-2xl font-black font-display text-white tracking-tight">
          {errorTitles[currentType]}
        </h2>

        <p className="text-sm text-gray-300 mt-2 max-w-xs leading-relaxed">
          {errorMessage || 'This game room could not be joined.'}
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 mt-7 w-full max-w-xs">
          <button
            onClick={() => {
              soundEngine.playClick();
              navigate('/home');
            }}
            className="w-full min-h-[48px] px-6 py-3 rounded-2xl bg-[#ff7a00] hover:bg-[#ff7a00]/90 text-black font-black text-sm tracking-wide shadow-lg shadow-[#ff7a00]/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span>BACK TO HOME</span>
          </button>
        </div>
      </div>
    );
  }

  const game = getGameById(room.game || 'xo') || GAMES_CATALOG[0];
  const isOwner = room.hostId === user?.id;
  const minPlayers = room.minPlayers || 2;
  const isFull = room.players.length >= room.maxPlayers;
  const canStart = isOwner && room.players.length >= minPlayers;
  const playersNeeded = Math.max(0, minPlayers - room.players.length);

  // Seat array matching room.maxPlayers
  const seats = Array.from({ length: room.maxPlayers }, (_, index) => {
    return room.players.find((p) => p.seatIndex === index) || null;
  });

  return (
    <div className="flex-1 w-full max-w-3xl mx-auto px-4 py-4 sm:py-6 space-y-6 select-none animate-fade-in overflow-y-auto">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl text-xs font-black shadow-2xl flex items-center gap-2 border ${
              toast.type === 'success'
                ? 'bg-[#141d33] text-[#1fd1a0] border-[#1fd1a0]/40'
                : toast.type === 'warning'
                ? 'bg-[#141d33] text-[#ffb703] border-[#ffb703]/40'
                : 'bg-[#141d33] text-white border-[#26314d]'
            }`}
          >
            <Sparkles className="w-4 h-4 text-[#ff7a00]" />
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3-2-1 Fullscreen Countdown Overlay */}
      <AnimatePresence>
        {countdown !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#0d1426]/95 backdrop-blur-md flex flex-col items-center justify-center select-none"
          >
            <motion.div
              key={countdown}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ type: 'spring', damping: 14, stiffness: 260 }}
              className="text-center"
            >
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-tr from-[#ff7a00] to-[#ffb703] text-black font-black font-display text-6xl sm:text-7xl flex items-center justify-center mx-auto shadow-2xl shadow-[#ff7a00]/40 border-4 border-white/20">
                {countdown === 0 ? '🔥' : countdown}
              </div>
              <h2 className="text-3xl sm:text-4xl font-black font-display text-white mt-6 tracking-wider">
                {countdown === 0 ? 'GBEDU! LET\'S GO!' : `STARTING IN ${countdown}...`}
              </h2>
              <p className="text-xs uppercase font-bold text-[#ffb703] mt-2 tracking-widest">
                {game.name} • Match Locked
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. ROOM HEADER: Game details, Code with Copy & Share, and Rules Summary Chip */}
      <div className="bg-[#141d33] border border-[#26314d] rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        {/* Subtle glow accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[#ff7a00]/10 via-[#ffb703]/5 to-transparent pointer-events-none rounded-full blur-2xl" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5">
          {/* Left: Game Identity & Rules summary */}
          <div className="flex items-center sm:items-start gap-4 text-center sm:text-left">
            <div className="w-16 h-16 rounded-2xl bg-[#0d1426] border border-[#26314d] flex items-center justify-center text-3xl shrink-0 shadow-lg">
              {game.icon}
            </div>

            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#ffb703] px-2 py-0.5 rounded-full bg-[#ffb703]/10 border border-[#ffb703]/20">
                  {game.category}
                </span>
                <span className="text-[10px] font-bold text-[#1fd1a0] px-2 py-0.5 rounded-full bg-[#1fd1a0]/10 border border-[#1fd1a0]/20">
                  {room.players.length}/{room.maxPlayers} Players Seated
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-black font-display text-white mt-1">
                {game.name} Waiting Room
              </h1>

              {/* House Rules Summary Chip */}
              <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-xl bg-[#0d1426] border border-[#26314d] text-[11px] text-gray-300">
                <Sparkles className="w-3.5 h-3.5 text-[#ff7a00]" />
                <span>
                  {room.game === 'whot'
                    ? 'Special card finishes: Off • 2-6 Players'
                    : room.game === 'xo'
                    ? 'Best of 3 • 2 Players • Street Duel'
                    : `${game.playerCount} • Classic Naija Mode`}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Room Code Box, Copy & Share Buttons */}
          <div className="flex flex-col items-center sm:items-end gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-2 bg-[#0d1426] border-2 border-[#ff7a00]/40 rounded-2xl px-4 py-2.5 shadow-inner">
              <div className="text-right">
                <p className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">ROOM CODE</p>
                <p className="text-2xl sm:text-3xl font-black tracking-widest text-[#ff7a00] font-display">
                  {code}
                </p>
              </div>

              {/* Copy Code */}
              <button
                onClick={handleCopyCode}
                className="w-10 h-10 rounded-xl bg-[#ff7a00] hover:bg-[#ff7a00]/90 text-black flex items-center justify-center cursor-pointer transition-all active:scale-90 shadow-md shadow-[#ff7a00]/20 ml-1"
                title="Copy Room Code"
                aria-label="Copy Room Code"
              >
                {copiedCode ? <Check className="w-5 h-5 stroke-[3]" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>

            {/* Share Link Button */}
            <button
              onClick={handleShare}
              className="w-full sm:w-auto min-h-[40px] px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold border border-white/10 flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              {copiedLink ? <Check className="w-4 h-4 text-[#1fd1a0]" /> : <Share2 className="w-4 h-4 text-[#ffb703]" />}
              <span>{copiedLink ? 'LINK COPIED' : 'INVITE OPPONENTS'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. PLAYER LIST: One Card per Seat (Staggered Animation, Verified Badges, Aura Rings) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#ff7a00]" />
            <span className="text-xs font-black uppercase tracking-wider text-white">
              Player Seats ({room.players.length} / {room.maxPlayers})
            </span>
          </div>
          {isOwner && !isFull && (
            <button
              onClick={handleAddBot}
              className="text-xs font-bold text-[#ffb703] hover:text-white flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Add AI Bot</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {seats.map((seatPlayer, idx) => {
            if (!seatPlayer) {
              // Empty seat with pulsing placeholder
              return (
                <div
                  key={`empty_seat_${idx}`}
                  className="bg-[#141d33]/50 border-2 border-dashed border-[#26314d] rounded-2xl p-4 flex items-center justify-between gap-3 text-gray-500 animate-pulse"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-[#0d1426] border border-[#26314d] flex items-center justify-center text-gray-600">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400">Waiting for player...</p>
                      <p className="text-[10px] text-gray-600 uppercase font-mono">Seat {idx + 1}</p>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-white/5 text-gray-500">
                    OPEN
                  </span>
                </div>
              );
            }

            const isCurrentPlayer = seatPlayer.userId === user?.id;
            const isSeatOwner = seatPlayer.userId === room.hostId || seatPlayer.isHost;
            const isDisconnected = !seatPlayer.isConnected;

            return (
              <motion.div
                key={seatPlayer.userId}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.08 }}
                className={`bg-[#141d33] border rounded-2xl p-4 shadow-lg flex items-center justify-between gap-3 relative transition-all ${
                  isCurrentPlayer ? 'border-[#ff7a00]/70 bg-gradient-to-r from-[#ff7a00]/10 via-[#141d33] to-[#141d33]' : 'border-[#26314d]'
                }`}
              >
                {/* Left: Avatar with Aura Ring & User info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <Avatar
                      avatarId={seatPlayer.avatarId || seatPlayer.avatarUrl}
                      avatarUrl={seatPlayer.avatarUrl}
                      config={seatPlayer.avatarConfig}
                      size="md"
                      showAura={true}
                    />

                    {/* Owner Crown with bounce-in */}
                    {isSeatOwner && (
                      <motion.div
                        initial={{ scale: 0, rotate: -30 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', damping: 10, stiffness: 220 }}
                        className="absolute -top-2.5 -right-1.5 w-6 h-6 rounded-full bg-[#ffb703] text-black flex items-center justify-center shadow-lg border border-black/40"
                        title="Room Owner"
                      >
                        <Crown className="w-3.5 h-3.5 fill-current" />
                      </motion.div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-black text-white truncate max-w-[130px] sm:max-w-[160px]">
                        {seatPlayer.displayName || seatPlayer.username}
                      </span>

                      {/* Verified Badge */}
                      <span
                        className="inline-flex items-center gap-0.5 text-[10px] font-extrabold text-[#1fd1a0] bg-[#1fd1a0]/15 border border-[#1fd1a0]/30 px-1.5 py-0.5 rounded-full"
                        title="Verified authenticated player"
                      >
                        <ShieldCheck className="w-3 h-3 stroke-[2.5]" />
                        <span>Verified</span>
                      </span>

                      {/* "You" Tag */}
                      {isCurrentPlayer && (
                        <span className="text-[10px] font-black uppercase px-1.5 py-0.2 rounded bg-[#ff7a00] text-black">
                          YOU
                        </span>
                      )}
                    </div>

                    {/* Short Player Public ID (NEVER raw auth UUID or email) */}
                    <p className="text-[11px] font-mono font-bold text-gray-400 mt-0.5">
                      {seatPlayer.publicId || `#GB-${seatPlayer.userId.slice(0, 4).toUpperCase()}`}
                    </p>
                  </div>
                </div>

                {/* Right: Badges & Kick Action */}
                <div className="flex items-center gap-2 shrink-0">
                  {isDisconnected ? (
                    <span className="text-[10px] font-bold text-[#ffb703] bg-[#ffb703]/10 border border-[#ffb703]/30 px-2 py-1 rounded-lg animate-pulse">
                      Reconnecting...
                    </span>
                  ) : isSeatOwner ? (
                    <span className="text-[10px] font-black uppercase text-[#ffb703] bg-[#ffb703]/15 border border-[#ffb703]/30 px-2 py-1 rounded-lg flex items-center gap-1">
                      <Crown className="w-3 h-3 fill-current" />
                      <span>Owner</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-[#1fd1a0] bg-[#1fd1a0]/15 border border-[#1fd1a0]/30 px-2 py-1 rounded-lg flex items-center gap-1">
                      <Check className="w-3 h-3 stroke-[2.5]" />
                      <span>Joined</span>
                    </span>
                  )}

                  {/* Owner Kick Button (cannot kick self) */}
                  {isOwner && !isCurrentPlayer && (
                    <button
                      onClick={() => handleKickPlayer(seatPlayer.userId)}
                      className="p-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Remove player from room"
                      aria-label="Remove player"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* 3. START CONTROLS (Owner Only) & WAITING INDICATOR */}
      <div className="bg-[#141d33] border border-[#26314d] rounded-3xl p-5 shadow-2xl">
        {isOwner ? (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase font-extrabold text-[#ffb703] tracking-wide">
                Host Match Controls
              </p>
              <p className="text-xs text-gray-300 mt-0.5">
                {canStart
                  ? 'All requirements met! Hit Start Match to begin.'
                  : `Waiting for challengers. Need ${playersNeeded} more player${playersNeeded > 1 ? 's' : ''} to start.`}
              </p>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="min-h-[48px] px-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-[#26314d] flex items-center justify-center gap-1.5 text-xs font-bold transition-colors cursor-pointer"
                title="Room Settings"
              >
                <Settings className="w-4 h-4 text-[#ff7a00]" />
                <span className="hidden sm:inline">Settings</span>
              </button>

              <button
                onClick={handleStartGame}
                disabled={!canStart || isStarting}
                className={`flex-1 sm:flex-none min-h-[48px] px-7 py-3 rounded-2xl font-black text-sm tracking-wide flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  canStart
                    ? 'bg-gradient-to-r from-[#ff7a00] to-[#ffb703] text-black shadow-xl shadow-[#ff7a00]/30 hover:opacity-95 active:scale-95 animate-pulse'
                    : 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed'
                }`}
              >
                <Play className="w-4 h-4 fill-current" />
                <span>
                  {canStart ? 'START MATCH' : `NEED ${playersNeeded} MORE PLAYER${playersNeeded > 1 ? 'S' : ''}`}
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3 py-3 text-center">
            <Radio className="w-5 h-5 text-[#ff7a00] animate-pulse" />
            <p className="text-xs sm:text-sm font-black text-white font-display tracking-wide">
              WAITING FOR THE OWNER TO START THE MATCH...
            </p>
          </div>
        )}
      </div>

      {/* 4. FOOTER: Leave Room & Navigation */}
      <div className="flex items-center justify-between border-t border-[#26314d] pt-4">
        <button
          onClick={handleLeaveRoom}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-extrabold border border-rose-500/20 cursor-pointer transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Leave Room</span>
        </button>

        <p className="text-[11px] text-gray-500">
          Room expires after 15 min of inactivity
        </p>
      </div>

      {/* Settings Modal (Owner Only) */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-[#141d33] border border-[#26314d] rounded-3xl p-6 shadow-2xl z-10 text-white"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#26314d]">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-[#ff7a00]" />
                  <h3 className="text-base font-black font-display">Room Settings</h3>
                </div>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="text-gray-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-4 space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">
                    Match Length (Rounds)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 3, 5].map((rounds) => (
                      <button
                        key={rounds}
                        onClick={() => setRoundLimit(rounds)}
                        className={`py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                          roundLimit === rounds
                            ? 'bg-[#ff7a00] text-black border-[#ff7a00]'
                            : 'bg-[#0d1426] text-gray-400 border-[#26314d]'
                        }`}
                      >
                        {rounds} {rounds === 1 ? 'Round' : 'Rounds'}
                      </button>
                    ))}
                  </div>
                </div>

                {room.game === 'whot' && (
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-[#0d1426] border border-[#26314d]">
                    <div>
                      <p className="text-xs font-bold text-white">Allow Finishing on Special</p>
                      <p className="text-[10px] text-gray-400">Can win by playing card 1, 2, 5, 8, 14, 20</p>
                    </div>
                    <button
                      onClick={() => setAllowFinishingOnSpecial(!allowFinishingOnSpecial)}
                      className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                        allowFinishingOnSpecial ? 'bg-[#1fd1a0]' : 'bg-gray-700'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                          allowFinishingOnSpecial ? 'left-6' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  soundEngine.playClick();
                  setIsSettingsOpen(false);
                  showToast('Room settings updated', 'success');
                }}
                className="w-full py-3 rounded-xl bg-[#ff7a00] text-black font-extrabold text-xs tracking-wide shadow-lg shadow-[#ff7a00]/20 cursor-pointer"
              >
                SAVE SETTINGS
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WaitingRoomScreen;
