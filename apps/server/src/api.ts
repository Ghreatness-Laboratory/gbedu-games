import { Router, Request, Response } from 'express';
import {
  registerOrLoginUser,
  searchProfiles,
  verifyUserToken,
  getProfileById,
  getStatsById,
} from './auth';
import {
  getFriends,
  getPendingRequests,
  sendFriendRequest,
  respondFriendRequest,
  removeFriend,
  createGameInvite,
  getActiveGameInvites,
} from './friends';
import { getRoomById } from './rooms';

export const apiRouter = Router();

// Middleware to extract and verify auth token
async function authMiddleware(req: Request, res: Response, next: () => void) {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.replace('Bearer ', '') : (req.query.token as string);

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const profile = await verifyUserToken(token);
  if (!profile) {
    res.status(401).json({ error: 'Invalid or expired session' });
    return;
  }

  (req as unknown as { user: typeof profile }).user = profile;
  next();
}

// 1. Auth: Register or Login
apiRouter.post('/auth/login', (req, res) => {
  const { username, displayName, avatarUrl } = req.body;
  if (!username) {
    res.status(400).json({ error: 'Username is required' });
    return;
  }

  const result = registerOrLoginUser({ username, displayName, avatarUrl });
  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.json(result);
});

// 2. Auth: Get Current Profile
apiRouter.get('/auth/me', authMiddleware, (req, res) => {
  const user = (req as unknown as { user: { id: string } }).user;
  const profile = getProfileById(user.id);
  const stats = getStatsById(user.id);
  res.json({ profile, stats });
});

// 3. Users: Search (Never returns email addresses!)
apiRouter.get('/users/search', authMiddleware, (req, res) => {
  const user = (req as unknown as { user: { id: string } }).user;
  const q = (req.query.q as string) || '';
  const results = searchProfiles(q, user.id);
  res.json({ results });
});

// 4. Friends: List
apiRouter.get('/friends', authMiddleware, (req, res) => {
  const user = (req as unknown as { user: { id: string } }).user;
  const friends = getFriends(user.id);
  res.json({ friends });
});

// 5. Friends: Requests
apiRouter.get('/friends/requests', authMiddleware, (req, res) => {
  const user = (req as unknown as { user: { id: string } }).user;
  const requests = getPendingRequests(user.id);
  res.json(requests);
});

// 6. Friends: Send Request
apiRouter.post('/friends/request', authMiddleware, (req, res) => {
  const user = (req as unknown as { user: { id: string } }).user;
  const { targetUserId } = req.body;
  if (!targetUserId) {
    res.status(400).json({ error: 'targetUserId is required' });
    return;
  }

  const result = sendFriendRequest(user.id, targetUserId);
  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.json({ success: true });
});

// 7. Friends: Respond to Request
apiRouter.post('/friends/respond', authMiddleware, (req, res) => {
  const user = (req as unknown as { user: { id: string } }).user;
  const { requestId, accept } = req.body;
  if (!requestId) {
    res.status(400).json({ error: 'requestId is required' });
    return;
  }

  const result = respondFriendRequest(requestId, user.id, Boolean(accept));
  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.json({ success: true });
});

// 8. Friends: Remove
apiRouter.delete('/friends/:targetId', authMiddleware, (req, res) => {
  const user = (req as unknown as { user: { id: string } }).user;
  const targetId = String(req.params.targetId);
  removeFriend(user.id, targetId);
  res.json({ success: true });
});

// 9. Rooms: Invitations
apiRouter.get('/rooms/invites', authMiddleware, (req, res) => {
  const user = (req as unknown as { user: { id: string } }).user;
  const invites = getActiveGameInvites(user.id);
  res.json({ invites });
});

// 10. Rooms: Send Invite
apiRouter.post('/rooms/invite', authMiddleware, (req, res) => {
  const user = (req as unknown as { user: { id: string; username: string } }).user;
  const { roomId, receiverId } = req.body;

  const room = getRoomById(roomId);
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }

  const invite = createGameInvite({
    roomId,
    roomCode: room.code,
    senderId: user.id,
    receiverId,
    senderName: user.username,
  });

  res.json({ success: true, invite });
});

// 11. Rooms: Lookup by code (publicly accessible or with auth)
apiRouter.get('/rooms/lookup/:code', (req, res) => {
  const { code } = req.params;
  const cleanCode = code ? String(code).trim().toUpperCase() : '';
  const { getRoomByCode } = require('./rooms');
  const room = getRoomByCode(cleanCode);

  if (!room) {
    res.status(404).json({ success: false, error: 'Room not found with that code' });
    return;
  }

  // Check 15-minute expiration
  if (room.lastActivity) {
    const elapsedMs = Date.now() - new Date(room.lastActivity).getTime();
    if (elapsedMs > 15 * 60 * 1000 && (room.status === 'waiting' || room.status === 'lobby')) {
      res.status(410).json({ success: false, error: 'This waiting room has expired due to inactivity', expired: true });
      return;
    }
  }

  res.json({ success: true, room });
});

// 12. Rooms: Create Room
apiRouter.post('/rooms/create', authMiddleware, (req, res) => {
  const user = (req as unknown as { user: { id: string } }).user;
  const { game, ruleset, maxPlayers, settings } = req.body;
  const { createRoom } = require('./rooms');

  try {
    const room = createRoom(user.id, ruleset, maxPlayers || 4, game || 'xo', settings);
    res.json({ success: true, room });
  } catch (err) {
    res.status(400).json({ success: false, error: (err as Error).message });
  }
});

// 13. Rooms: Start Room (Enforces owner validation)
apiRouter.post('/rooms/:roomId/start', authMiddleware, (req, res) => {
  const user = (req as unknown as { user: { id: string } }).user;
  const { roomId } = req.params;
  const { startRoom } = require('./rooms');

  const result = startRoom(roomId, user.id);
  if (!result.success) {
    res.status(403).json(result);
    return;
  }
  res.json(result);
});

// 14. Rooms: Kick Player (Enforces owner validation)
apiRouter.post('/rooms/:roomId/kick', authMiddleware, (req, res) => {
  const user = (req as unknown as { user: { id: string } }).user;
  const { roomId } = req.params;
  const { targetUserId } = req.body;
  const { kickPlayer } = require('./rooms');

  const result = kickPlayer(roomId, user.id, targetUserId);
  if (!result.success) {
    res.status(403).json(result);
    return;
  }
  res.json(result);
});

// 15. Rooms: Join Room
apiRouter.post('/rooms/join', authMiddleware, (req, res) => {
  const user = (req as unknown as { user: { id: string } }).user;
  const { code } = req.body;
  const { joinRoom } = require('./rooms');

  if (!code) {
    res.status(400).json({ success: false, error: 'Room code is required' });
    return;
  }

  const result = joinRoom(code, user.id);
  if (!result.success) {
    res.status(400).json(result);
    return;
  }
  res.json(result);
});

// 16. Rooms: Leave Room
apiRouter.post('/rooms/:roomId/leave', authMiddleware, (req, res) => {
  const user = (req as unknown as { user: { id: string } }).user;
  const { roomId } = req.params;
  const { leaveRoom } = require('./rooms');

  const result = leaveRoom(roomId, user.id);
  res.json(result);
});

// 17. Rooms: Update Settings (Owner only)
apiRouter.post('/rooms/:roomId/settings', authMiddleware, (req, res) => {
  const user = (req as unknown as { user: { id: string } }).user;
  const { roomId } = req.params;
  const { settings } = req.body;
  const { updateRoomSettings } = require('./rooms');

  const result = updateRoomSettings(roomId, user.id, settings || {});
  if (!result.success) {
    res.status(403).json(result);
    return;
  }
  res.json(result);
});

