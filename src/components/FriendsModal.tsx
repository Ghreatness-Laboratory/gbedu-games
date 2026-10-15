import React, { useState, useEffect } from 'react';
import { useWhotStore } from '../store/useWhotStore';
import { UserProfile } from '@gbedu/shared';
import {
  Users,
  Search,
  UserPlus,
  Check,
  X,
  Radio,
  Send,
  Trash2,
} from 'lucide-react';

interface FriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FriendRequestItem {
  id: string;
  senderId: string;
  receiverId: string;
  sender: UserProfile;
  receiver: UserProfile;
  status: string;
}

export const FriendsModal: React.FC<FriendsModalProps> = ({ isOpen, onClose }) => {
  const { user, token, currentRoom } = useWhotStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [requests, setRequests] = useState<{ incoming: FriendRequestItem[]; outgoing: FriendRequestItem[] }>({
    incoming: [],
    outgoing: [],
  });
  const [activeTab, setActiveTab] = useState<'friends' | 'search' | 'requests'>('friends');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const fetchFriendsAndRequests = async () => {
    if (!token) return;
    try {
      const [friendsRes, requestsRes] = await Promise.all([
        fetch('/api/friends', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/friends/requests', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (friendsRes.ok) {
        const d = await friendsRes.json();
        setFriends(d.friends || []);
      }
      if (requestsRes.ok) {
        const d = await requestsRes.json();
        setRequests(d);
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFriendsAndRequests();
    }
  }, [isOpen]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !token) return;

    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery.trim())}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setSearchResults(d.results || []);
      }
    } catch {
      // Ignore
    }
  };

  const handleSendRequest = async (targetUserId: string) => {
    if (!token) return;
    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId }),
      });

      const d = await res.json();
      if (res.ok) {
        setActionNotice('Friend request sent!');
        fetchFriendsAndRequests();
      } else {
        setActionNotice(d.error || 'Failed to send request');
      }
      setTimeout(() => setActionNotice(null), 3000);
    } catch {
      setActionNotice('Network error');
    }
  };

  const handleRespondRequest = async (requestId: string, accept: boolean) => {
    if (!token) return;
    try {
      const res = await fetch('/api/friends/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ requestId, accept }),
      });

      if (res.ok) {
        setActionNotice(accept ? 'Friend request accepted!' : 'Friend request declined');
        fetchFriendsAndRequests();
      }
      setTimeout(() => setActionNotice(null), 3000);
    } catch {
      // Ignore
    }
  };

  const handleInviteToRoom = async (friendId: string) => {
    if (!token || !currentRoom) return;
    try {
      const res = await fetch('/api/rooms/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ roomId: currentRoom.id, receiverId: friendId }),
      });
      if (res.ok) {
        setActionNotice('Game invitation sent to friend!');
      }
      setTimeout(() => setActionNotice(null), 3000);
    } catch {
      // Ignore
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#121927] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4 animate-scale-up">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-black font-display text-white">Friends & Social</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {actionNotice && (
          <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold text-center">
            {actionNotice}
          </div>
        )}

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 gap-1 bg-black/40 p-1 rounded-2xl border border-white/10 text-xs font-bold">
          <button
            onClick={() => setActiveTab('friends')}
            className={`py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'friends' ? 'bg-amber-500 text-black shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            Friends ({friends.length})
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'search' ? 'bg-amber-500 text-black shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            Search
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`py-2 rounded-xl transition-all cursor-pointer relative ${
              activeTab === 'requests' ? 'bg-amber-500 text-black shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            Requests
            {requests.incoming.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px]">
                {requests.incoming.length}
              </span>
            )}
          </button>
        </div>

        {/* Content Area */}
        <div className="min-h-[240px] max-h-[360px] overflow-y-auto space-y-2 pr-1">
          {activeTab === 'friends' && (
            <div>
              {friends.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-xs space-y-2">
                  <p>No friends added yet.</p>
                  <p className="text-gray-500">Search by username to add friends and play Whot together!</p>
                </div>
              ) : (
                friends.map((f) => (
                  <div
                    key={f.id}
                    className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{f.avatarUrl}</span>
                      <div>
                        <p className="text-xs font-extrabold text-white">{f.username}</p>
                        <p className="text-[11px] text-gray-400">{f.displayName}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {currentRoom && (
                        <button
                          onClick={() => handleInviteToRoom(f.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/30 cursor-pointer"
                        >
                          <Send className="w-3 h-3" />
                          <span>Invite</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'search' && (
            <div className="space-y-3">
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search player username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 text-black font-black text-xs rounded-xl hover:bg-amber-400 transition-colors cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                </button>
              </form>

              <div className="space-y-2 pt-1">
                {searchResults.map((sr) => (
                  <div
                    key={sr.id}
                    className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{sr.avatarUrl}</span>
                      <div>
                        <p className="text-xs font-extrabold text-white">{sr.username}</p>
                        <p className="text-[10px] text-gray-400">{sr.bio || 'Whot Player'}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSendRequest(sr.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 text-black font-black text-xs hover:bg-amber-400 transition-colors cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Incoming Requests ({requests.incoming.length})
                </p>
                {requests.incoming.length === 0 ? (
                  <p className="text-xs text-gray-500">No incoming friend requests.</p>
                ) : (
                  requests.incoming.map((req) => (
                    <div
                      key={req.id}
                      className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between mb-2"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{req.sender.avatarUrl}</span>
                        <div>
                          <p className="text-xs font-extrabold text-white">{req.sender.username}</p>
                          <p className="text-[10px] text-gray-400">Wants to be friends</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleRespondRequest(req.id, true)}
                          className="p-1.5 rounded-lg bg-emerald-500 text-black font-bold hover:bg-emerald-400 transition-colors cursor-pointer"
                          title="Accept"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRespondRequest(req.id, false)}
                          className="p-1.5 rounded-lg bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                          title="Decline"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
