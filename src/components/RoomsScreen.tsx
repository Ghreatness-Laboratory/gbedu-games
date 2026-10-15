import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWhotStore } from '../store/useWhotStore';
import { soundEngine } from '../audio/audioEngine';
import {
  DoorOpen,
  Plus,
  Users,
  ArrowLeft,
  Sparkles,
  ArrowRight,
  LogOut,
  Gamepad2,
  Lock,
} from 'lucide-react';

interface RoomsScreenProps {
  onOpenPicker: () => void;
}

export const RoomsScreen: React.FC<RoomsScreenProps> = ({ onOpenPicker }) => {
  const navigate = useNavigate();
  const { currentRoom, joinRoom, createRoom, leaveRoom, roomError } = useWhotStore();

  const [inputCode, setInputCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Demo public party rooms for fast matchmaking
  const publicRooms = [
    { code: 'WHOT', name: 'Lagos Island Whot Club', players: 3, max: 4, game: 'Naija Whot', isHot: true },
    { code: 'GBED', name: 'Amapiano Grooves Arena', players: 2, max: 4, game: 'Rhythm Tap', isHot: false },
    { code: 'AFRO', name: 'Burnaboy Lyrics Face-off', players: 4, max: 6, game: 'Lyrics Quiz', isHot: true },
  ];

  const handleJoin = async (codeToJoin: string) => {
    const cleanCode = codeToJoin.trim().toUpperCase();
    if (!cleanCode) return;
    setIsJoining(true);
    setErrorText(null);
    soundEngine.playAgogo(true);

    try {
      const success = await joinRoom(cleanCode);
      if (success) {
        navigate(`/game/whot?room=${cleanCode}`);
      } else {
        setErrorText(roomError || 'Room not found or game already started');
      }
    } catch {
      setErrorText('Failed to connect to room. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleCreate = async () => {
    setIsCreating(true);
    setErrorText(null);
    soundEngine.playAgogo(true);

    try {
      const success = await createRoom();
      if (success) {
        const room = useWhotStore.getState().currentRoom;
        if (room) {
          navigate(`/game/whot?room=${room.code}`);
        }
      } else {
        setErrorText('Could not create room. Please try again.');
      }
    } catch {
      setErrorText('Error creating room');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex-1 w-full max-w-2xl mx-auto px-4 py-4 space-y-6 animate-fade-in select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#26314d] pb-3">
        <button
          onClick={() => {
            soundEngine.playClick();
            navigate('/home');
          }}
          className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-white transition-colors cursor-pointer py-1.5 px-2 rounded-lg hover:bg-white/5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>
        <div className="flex items-center gap-2">
          <DoorOpen className="w-4 h-4 text-[#ff7a00]" />
          <h1 className="text-base font-black uppercase tracking-wider text-white">Party Rooms</h1>
        </div>
        <div className="w-16" />
      </div>

      {/* 1. ACTIVE ROOM BANNER (If currently in a room) */}
      {currentRoom && (
        <div className="bg-gradient-to-r from-[#ff7a00]/20 via-[#141d33] to-[#ff7a00]/10 border-2 border-[#ff7a00]/50 rounded-2xl p-4 sm:p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#ff7a00] text-black">
              Active Room
            </span>
            <span className="text-xs font-mono font-bold text-gray-400">
              Code: <strong className="text-white text-sm">{currentRoom.code}</strong>
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-black text-white">
                {currentRoom.game || `Party Room ${currentRoom.code}`}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-300 mt-0.5">
                <Users className="w-3.5 h-3.5 text-[#ff7a00]" />
                <span>
                  {currentRoom.players.length} / {currentRoom.maxPlayers} Players
                </span>
                <span>•</span>
                <span className="uppercase text-[10px] font-bold text-[#1fd1a0]">
                  {currentRoom.status}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  soundEngine.playAgogo(true);
                  navigate(`/game/whot?room=${currentRoom.code}`);
                }}
                className="px-3.5 py-2 rounded-xl bg-[#ff7a00] text-black font-extrabold text-xs shadow-md shadow-[#ff7a00]/20 hover:opacity-95 cursor-pointer"
              >
                Rejoin Room
              </button>
              <button
                onClick={() => {
                  soundEngine.playClick();
                  leaveRoom();
                }}
                className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 border border-white/5 transition-colors cursor-pointer"
                title="Leave Room"
                aria-label="Leave Room"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. JOIN WITH CODE & CREATE ACTIONS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Join Code Card */}
        <div className="bg-[#141d33] border border-[#26314d] rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#ff7a00] mb-2">
              <Lock className="w-4 h-4" />
              <span>Join with Code</span>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              Enter a 4-letter room code shared by your friend or party host.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleJoin(inputCode);
            }}
            className="space-y-2.5"
          >
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase().slice(0, 4))}
              placeholder="e.g. WHOT"
              maxLength={4}
              className="w-full bg-[#0d1426] border border-[#26314d] focus:border-[#ff7a00] rounded-xl px-4 py-2.5 text-center font-mono font-black text-lg tracking-widest text-white uppercase placeholder-gray-600 focus:outline-none transition-colors"
            />
            {errorText && <p className="text-xs text-rose-400 font-bold text-center">{errorText}</p>}
            <button
              type="submit"
              disabled={isJoining || inputCode.length < 3}
              className="w-full py-2.5 rounded-xl bg-[#ff7a00] disabled:bg-gray-700 text-black font-extrabold text-xs shadow-md shadow-[#ff7a00]/10 hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              <span>{isJoining ? 'Joining...' : 'Enter Room'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Create Room Card */}
        <div className="bg-[#141d33] border border-[#26314d] rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#1fd1a0] mb-2">
              <Plus className="w-4 h-4" />
              <span>Create New Room</span>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              Host your own multiplayer room. Invite friends, add smart bots, and customize rules.
            </p>
          </div>

          <div className="space-y-2">
            <button
              onClick={handleCreate}
              disabled={isCreating}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#1fd1a0] to-[#17a37c] text-black font-extrabold text-xs shadow-md shadow-[#1fd1a0]/15 hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{isCreating ? 'Creating Room...' : 'Host Naija Whot Room'}</span>
            </button>

            <button
              onClick={() => {
                soundEngine.playClick();
                onOpenPicker();
              }}
              className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold transition-all border border-white/5 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Gamepad2 className="w-3.5 h-3.5 text-[#ff7a00]" />
              <span>Browse All Games</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. RECENT / PUBLIC PARTY ROOMS */}
      <div className="bg-[#141d33] border border-[#26314d] rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-300">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Active Public Rooms</span>
          </div>
          <span className="text-[10px] font-bold text-gray-400">Live Matchmaking</span>
        </div>

        <div className="space-y-2">
          {publicRooms.map((room) => (
            <div
              key={room.code}
              className="flex items-center justify-between p-3 rounded-xl bg-[#0d1426] border border-[#26314d] hover:border-[#ff7a00]/40 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#ff7a00]/10 border border-[#ff7a00]/30 flex items-center justify-center text-[#ff7a00] font-mono font-black text-xs">
                  {room.code}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">{room.name}</span>
                    {room.isHot && (
                      <span className="text-[9px] font-black uppercase px-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        HOT
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-400 flex items-center gap-2">
                    <span>{room.game}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-gray-300">
                      <Users className="w-3 h-3 text-[#ff7a00]" />
                      {room.players}/{room.max}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleJoin(room.code)}
                className="px-3 py-1.5 rounded-lg bg-[#ff7a00]/15 hover:bg-[#ff7a00] text-[#ff7a00] hover:text-black font-extrabold text-xs border border-[#ff7a00]/30 transition-all cursor-pointer"
              >
                Join
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
