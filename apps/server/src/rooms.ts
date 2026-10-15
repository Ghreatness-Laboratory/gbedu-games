import { RoomDetails, RoomPlayer, Ruleset, PresetName } from '@gbedu/shared';
import { DEFAULT_RULESET, PRESETS, validateRuleset, detectPreset } from '@gbedu/whot-engine';
import { getProfileById } from './auth';

const roomsById = new Map<string, RoomDetails>();
const roomsByCode = new Map<string, RoomDetails>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function createRoom(hostId: string, initialRuleset?: Partial<Ruleset>, maxPlayers: number = 6): RoomDetails {
  const hostProfile = getProfileById(hostId);
  if (!hostProfile) {
    throw new Error('Host user profile not found');
  }

  let code = generateRoomCode();
  while (roomsByCode.has(code)) {
    code = generateRoomCode();
  }

  const validated = validateRuleset(initialRuleset || DEFAULT_RULESET);
  const ruleset = validated.ruleset;
  const preset = detectPreset(ruleset);

  const safeMaxPlayers = Math.max(2, Math.min(6, maxPlayers));

  const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const hostPlayer: RoomPlayer = {
    userId: hostProfile.id,
    username: hostProfile.username,
    displayName: hostProfile.displayName,
    avatarUrl: hostProfile.avatarUrl,
    seatIndex: 0,
    isHost: true,
    isReady: true,
    isConnected: true,
  };

  const room: RoomDetails = {
    id: roomId,
    code,
    hostId,
    status: 'lobby',
    ruleset,
    preset,
    maxPlayers: safeMaxPlayers,
    players: [hostPlayer],
    createdAt: new Date().toISOString(),
  };

  roomsById.set(roomId, room);
  roomsByCode.set(code, room);

  return room;
}

export function getRoomById(roomId: string): RoomDetails | null {
  return roomsById.get(roomId) || null;
}

export function getRoomByCode(code: string): RoomDetails | null {
  return roomsByCode.get(code.trim().toUpperCase()) || null;
}

export function joinRoom(code: string, userId: string): { success: boolean; room?: RoomDetails; error?: string } {
  const room = getRoomByCode(code);
  if (!room) {
    return { success: false, error: 'Room not found with that code' };
  }

  if (room.status !== 'lobby') {
    return { success: false, error: 'Game is already in progress or completed' };
  }

  const existingPlayer = room.players.find((p) => p.userId === userId);
  if (existingPlayer) {
    existingPlayer.isConnected = true;
    return { success: true, room };
  }

  // Hard cap of 6 (or room.maxPlayers) enforced strictly server-side
  if (room.players.length >= room.maxPlayers) {
    return { success: false, error: `Room is full (max ${room.maxPlayers} players)` };
  }

  const userProfile = getProfileById(userId);
  if (!userProfile) {
    return { success: false, error: 'User profile not found' };
  }

  // Assign next available seat index
  const usedSeats = new Set(room.players.map((p) => p.seatIndex));
  let seatIndex = 0;
  while (usedSeats.has(seatIndex)) {
    seatIndex++;
  }

  const newPlayer: RoomPlayer = {
    userId: userProfile.id,
    username: userProfile.username,
    displayName: userProfile.displayName,
    avatarUrl: userProfile.avatarUrl,
    seatIndex,
    isHost: false,
    isReady: false,
    isConnected: true,
  };

  room.players.push(newPlayer);
  return { success: true, room };
}

export function leaveRoom(roomId: string, userId: string): { success: boolean; room?: RoomDetails; roomDeleted?: boolean } {
  const room = roomsById.get(roomId);
  if (!room) return { success: false };

  room.players = room.players.filter((p) => p.userId !== userId);

  // If no players remain, delete room
  if (room.players.length === 0) {
    roomsById.delete(roomId);
    roomsByCode.delete(room.code);
    return { success: true, roomDeleted: true };
  }

  // If host leaves in lobby, promote first player
  if (room.hostId === userId && room.status === 'lobby') {
    room.players[0].isHost = true;
    room.hostId = room.players[0].userId;
  }

  return { success: true, room };
}

export function setPlayerReady(roomId: string, userId: string, isReady: boolean): { success: boolean; room?: RoomDetails } {
  const room = roomsById.get(roomId);
  if (!room || room.status !== 'lobby') return { success: false };

  const player = room.players.find((p) => p.userId === userId);
  if (!player) return { success: false };

  player.isReady = isReady;
  return { success: true, room };
}

export function kickPlayer(roomId: string, hostId: string, targetUserId: string): { success: boolean; room?: RoomDetails; error?: string } {
  const room = roomsById.get(roomId);
  if (!room) return { success: false, error: 'Room not found' };
  if (room.hostId !== hostId) return { success: false, error: 'Only the host can kick players' };
  if (hostId === targetUserId) return { success: false, error: 'Host cannot kick themselves' };

  room.players = room.players.filter((p) => p.userId !== targetUserId);
  return { success: true, room };
}

// Updating house rules: validates strictly, resets ready states for all non-hosts
export function updateHouseRules(
  roomId: string,
  hostId: string,
  proposed: Partial<Ruleset>
): { success: boolean; room?: RoomDetails; error?: string } {
  const room = roomsById.get(roomId);
  if (!room) return { success: false, error: 'Room not found' };
  if (room.hostId !== hostId) return { success: false, error: 'Only the host can configure house rules' };
  if (room.status !== 'lobby') return { success: false, error: 'Cannot change rules after game has started' };

  const merged = { ...room.ruleset, ...proposed };
  const validated = validateRuleset(merged);
  if (!validated.valid) {
    return { success: false, error: validated.error };
  }

  room.ruleset = validated.ruleset;
  room.preset = detectPreset(room.ruleset);

  // Clear all players' ready states so everyone must re-confirm new rules!
  room.players.forEach((p) => {
    if (!p.isHost) {
      p.isReady = false;
    }
  });

  return { success: true, room };
}

export function applyPresetRules(
  roomId: string,
  hostId: string,
  preset: PresetName
): { success: boolean; room?: RoomDetails; error?: string } {
  if (preset === 'custom') return { success: true };
  const targetRuleset = PRESETS[preset];
  return updateHouseRules(roomId, hostId, targetRuleset);
}
