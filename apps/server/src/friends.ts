import { UserProfile } from '@gbedu/shared';
import { getProfileById } from './auth';

export interface FriendRequestItem {
  id: string;
  senderId: string;
  receiverId: string;
  sender: UserProfile;
  receiver: UserProfile;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: number;
}

export interface GameInviteItem {
  id: string;
  roomId: string;
  roomCode: string;
  senderId: string;
  receiverId: string;
  senderName: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt: number;
  createdAt: number;
}

// In-Memory Normalized Friendships (user1 < user2)
const friendships = new Set<string>();
const friendRequests: FriendRequestItem[] = [];
const gameInvites: GameInviteItem[] = [];

// Seed default friendship between Ada and Tobi
friendships.add('usr_ada:usr_tobi');
friendships.add('usr_ada:usr_chi');

function getFriendshipKey(u1: string, u2: string): string {
  return u1 < u2 ? `${u1}:${u2}` : `${u2}:${u1}`;
}

export function areFriends(u1: string, u2: string): boolean {
  return friendships.has(getFriendshipKey(u1, u2));
}

export function sendFriendRequest(senderId: string, receiverId: string): { success: boolean; error?: string } {
  if (senderId === receiverId) {
    return { success: false, error: 'Cannot send a friend request to yourself' };
  }

  if (areFriends(senderId, receiverId)) {
    return { success: false, error: 'You are already friends' };
  }

  const existing = friendRequests.find(
    (r) =>
      r.status === 'pending' &&
      ((r.senderId === senderId && r.receiverId === receiverId) ||
        (r.senderId === receiverId && r.receiverId === senderId))
  );

  if (existing) {
    return { success: false, error: 'A pending friend request already exists between you' };
  }

  const sender = getProfileById(senderId);
  const receiver = getProfileById(receiverId);

  if (!sender || !receiver) {
    return { success: false, error: 'User profile not found' };
  }

  friendRequests.push({
    id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    senderId,
    receiverId,
    sender,
    receiver,
    status: 'pending',
    createdAt: Date.now(),
  });

  return { success: true };
}

export function respondFriendRequest(requestId: string, userId: string, accept: boolean): { success: boolean; error?: string } {
  const req = friendRequests.find((r) => r.id === requestId && r.receiverId === userId);
  if (!req || req.status !== 'pending') {
    return { success: false, error: 'Pending request not found or already processed' };
  }

  if (accept) {
    req.status = 'accepted';
    friendships.add(getFriendshipKey(req.senderId, req.receiverId));
  } else {
    req.status = 'declined';
  }

  return { success: true };
}

export function removeFriend(u1: string, u2: string): { success: boolean } {
  friendships.delete(getFriendshipKey(u1, u2));
  return { success: true };
}

export function getFriends(userId: string): UserProfile[] {
  const friends: UserProfile[] = [];
  friendships.forEach((pair) => {
    const [id1, id2] = pair.split(':');
    if (id1 === userId) {
      const p = getProfileById(id2);
      if (p) friends.push(p);
    } else if (id2 === userId) {
      const p = getProfileById(id1);
      if (p) friends.push(p);
    }
  });
  return friends;
}

export function getPendingRequests(userId: string): { incoming: FriendRequestItem[]; outgoing: FriendRequestItem[] } {
  const incoming = friendRequests.filter((r) => r.receiverId === userId && r.status === 'pending');
  const outgoing = friendRequests.filter((r) => r.senderId === userId && r.status === 'pending');
  return { incoming, outgoing };
}

export function createGameInvite(params: {
  roomId: string;
  roomCode: string;
  senderId: string;
  receiverId: string;
  senderName: string;
}): GameInviteItem {
  const invite: GameInviteItem = {
    id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    roomId: params.roomId,
    roomCode: params.roomCode,
    senderId: params.senderId,
    receiverId: params.receiverId,
    senderName: params.senderName,
    status: 'pending',
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    createdAt: Date.now(),
  };

  gameInvites.push(invite);
  return invite;
}

export function getActiveGameInvites(userId: string): GameInviteItem[] {
  const now = Date.now();
  return gameInvites.filter((inv) => inv.receiverId === userId && inv.status === 'pending' && inv.expiresAt > now);
}
