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

export function createRoom(
  hostId: string,
  initialRuleset?: Partial<Ruleset>,
  maxPlayers: number = 6,
  game: string = 'whot',
  settings?: Record<string, any>
): RoomDetails {
  const hostProfile = getProfileById(hostId);
  if (!hostProfile) {
    throw new Error('Host user profile not found');
  }

  // Check if host already has an active waiting room; if so, close or clean it
  const existingActive = getActiveRoomForUser(hostId);
  if (existingActive && existingActive.status === 'waiting') {
    leaveRoom(existingActive.id, hostId);
  }

  let code = generateRoomCode();
  while (roomsByCode.has(code)) {
    code = generateRoomCode();
  }

  const validated = validateRuleset(initialRuleset || DEFAULT_RULESET);
  const ruleset = validated.ruleset;
  const preset = detectPreset(ruleset);

  const safeMaxPlayers = Math.max(2, Math.min(8, maxPlayers));

  const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  // Generate clean public ID (e.g. #GB-4F7K)
  const hostPublicId = hostProfile.publicId || generatePublicIdFromId(hostProfile.id);

  const hostPlayer: RoomPlayer = {
    userId: hostProfile.id,
    publicId: hostPublicId,
    username: hostProfile.username,
    displayName: hostProfile.displayName,
    avatarUrl: hostProfile.avatarUrl,
    avatarId: hostProfile.avatarId,
    seatIndex: 0,
    isHost: true,
    isReady: true,
    isConnected: true,
    isVerified: true,
    joinedAt: new Date().toISOString(),
  };

  const room: RoomDetails = {
    id: roomId,
    code,
    game,
    hostId,
    status: 'waiting',
    ruleset,
    settings: settings || {},
    preset,
    maxPlayers: safeMaxPlayers,
    minPlayers: 2,
    players: [hostPlayer],
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
  };

  roomsById.set(roomId, room);
  roomsByCode.set(code, room);

  return room;
}

function generatePublicIdFromId(userId: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[(hash + i * 13) % chars.length];
  }
  return `#GB-${code}`;
}

export function getActiveRoomForUser(userId: string): RoomDetails | null {
  for (const room of roomsById.values()) {
    if (room.status === 'waiting' || room.status === 'playing' || room.status === 'lobby' || room.status === 'in_progress') {
      if (room.players.some((p) => p.userId === userId)) {
        return room;
      }
    }
  }
  return null;
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

  // 15-minute inactivity expiration check for waiting rooms
  if (room.lastActivity) {
    const elapsedMs = Date.now() - new Date(room.lastActivity).getTime();
    if (elapsedMs > 15 * 60 * 1000 && (room.status === 'waiting' || room.status === 'lobby')) {
      room.status = 'abandoned';
      return { success: false, error: 'This waiting room has expired due to inactivity' };
    }
  }

  if (room.status === 'playing' || room.status === 'in_progress' || room.status === 'completed' || room.status === 'finished') {
    // If user was already seated in this room, allow them to reconnect/re-seat!
    const existing = room.players.find((p) => p.userId === userId);
    if (existing) {
      existing.isConnected = true;
      existing.disconnectedAt = null;
      room.lastActivity = new Date().toISOString();
      return { success: true, room };
    }
    return { success: false, error: 'Game is already in progress or completed' };
  }

  const existingPlayer = room.players.find((p) => p.userId === userId);
  if (existingPlayer) {
    existingPlayer.isConnected = true;
    existingPlayer.disconnectedAt = null;
    room.lastActivity = new Date().toISOString();
    return { success: true, room };
  }

  // Check if player is already in another waiting room; if so, cleanly leave that other room
  const otherActive = getActiveRoomForUser(userId);
  if (otherActive && otherActive.id !== room.id && otherActive.status === 'waiting') {
    leaveRoom(otherActive.id, userId);
  }

  // Capacity check
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

  const publicId = userProfile.publicId || generatePublicIdFromId(userProfile.id);

  const newPlayer: RoomPlayer = {
    userId: userProfile.id,
    publicId,
    username: userProfile.username,
    displayName: userProfile.displayName,
    avatarUrl: userProfile.avatarUrl,
    avatarId: userProfile.avatarId,
    seatIndex,
    isHost: false,
    isReady: false,
    isConnected: true,
    isVerified: true,
    joinedAt: new Date().toISOString(),
  };

  room.players.push(newPlayer);
  room.lastActivity = new Date().toISOString();
  return { success: true, room };
}

export function leaveRoom(
  roomId: string,
  userId: string
): { success: boolean; room?: RoomDetails; roomDeleted?: boolean; ownershipTransferred?: boolean; newOwner?: RoomPlayer } {
  const room = roomsById.get(roomId);
  if (!room) return { success: false };

  room.players = room.players.filter((p) => p.userId !== userId);
  room.lastActivity = new Date().toISOString();

  // If no players remain, delete room
  if (room.players.length === 0) {
    roomsById.delete(roomId);
    roomsByCode.delete(room.code);
    return { success: true, roomDeleted: true };
  }

  // If host leaves in waiting/lobby, transfer ownership to the next joined player
  let ownershipTransferred = false;
  let newOwner: RoomPlayer | undefined;
  if (room.hostId === userId) {
    room.players[0].isHost = true;
    room.hostId = room.players[0].userId;
    ownershipTransferred = true;
    newOwner = room.players[0];
  }

  return { success: true, room, ownershipTransferred, newOwner };
}

export function startRoom(
  roomId: string,
  callerId: string
): { success: boolean; room?: RoomDetails; error?: string } {
  const room = roomsById.get(roomId);
  if (!room) return { success: false, error: 'Room not found' };

  // SERVER-SIDE OWNER VALIDATION: Only room owner can start!
  if (room.hostId !== callerId) {
    return { success: false, error: 'Only the room owner can start the match' };
  }

  if (room.status !== 'waiting' && room.status !== 'lobby') {
    return { success: false, error: 'Match has already started or finished' };
  }

  const minPlayers = room.minPlayers || 2;
  if (room.players.length < minPlayers) {
    return {
      success: false,
      error: `Need at least ${minPlayers} players to start (currently ${room.players.length})`,
    };
  }

  // Advance status to playing and lock roster
  room.status = 'playing';
  room.lastActivity = new Date().toISOString();

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

export function updateRoomSettings(
  roomId: string,
  hostId: string,
  settings: Record<string, any>
): { success: boolean; room?: RoomDetails; error?: string } {
  const room = roomsById.get(roomId);
  if (!room) return { success: false, error: 'Room not found' };
  if (room.hostId !== hostId) return { success: false, error: 'Only the room owner can change settings' };
  if (room.status !== 'waiting' && room.status !== 'lobby') return { success: false, error: 'Cannot change settings after match has started' };

  room.settings = { ...(room.settings || {}), ...settings };
  room.lastActivity = new Date().toISOString();
  return { success: true, room };
}

