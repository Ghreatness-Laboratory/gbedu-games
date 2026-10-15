-- Supabase Migration for Gbedu Games: Naija Whot Platform
-- Created at 2026-10-15

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username CITEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT DEFAULT '👑',
    bio TEXT DEFAULT 'Gbedu Whot Master',
    is_online BOOLEAN DEFAULT false,
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 24)
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles (username);

-- 2. Player Statistics
CREATE TABLE IF NOT EXISTS public.player_statistics (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    games_played INTEGER DEFAULT 0 NOT NULL,
    games_won INTEGER DEFAULT 0 NOT NULL,
    total_cards_played INTEGER DEFAULT 0 NOT NULL,
    current_streak INTEGER DEFAULT 0 NOT NULL,
    best_streak INTEGER DEFAULT 0 NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Friendships (Normalized: user_id_1 < user_id_2)
CREATE TABLE IF NOT EXISTS public.friendships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id_1 UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_id_2 UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_user_order CHECK (user_id_1 < user_id_2),
    CONSTRAINT unique_friendship UNIQUE (user_id_1, user_id_2)
);

CREATE INDEX IF NOT EXISTS idx_friendships_user1 ON public.friendships (user_id_1);
CREATE INDEX IF NOT EXISTS idx_friendships_user2 ON public.friendships (user_id_2);

-- 4. Friend Requests
CREATE TABLE IF NOT EXISTS public.friend_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT no_self_request CHECK (sender_id <> receiver_id),
    CONSTRAINT unique_pending_request UNIQUE (sender_id, receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON public.friend_requests (receiver_id, status);

-- 5. Game Rooms
CREATE TABLE IF NOT EXISTS public.game_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby', 'in_progress', 'completed', 'abandoned')),
    ruleset JSONB NOT NULL,
    max_players INTEGER NOT NULL DEFAULT 6 CHECK (max_players >= 2 AND max_players <= 6),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_rooms_code ON public.game_rooms (code);

-- 6. Game Players (Room Members)
CREATE TABLE IF NOT EXISTS public.game_players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    seat_index INTEGER NOT NULL CHECK (seat_index >= 0 AND seat_index <= 5),
    is_ready BOOLEAN NOT NULL DEFAULT false,
    is_connected BOOLEAN NOT NULL DEFAULT true,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_room_user UNIQUE (room_id, user_id),
    CONSTRAINT unique_room_seat UNIQUE (room_id, seat_index)
);

CREATE INDEX IF NOT EXISTS idx_game_players_room ON public.game_players (room_id);

-- 7. Game Invitations
CREATE TABLE IF NOT EXISTS public.game_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_invites_receiver ON public.game_invitations (receiver_id, status);

-- 8. Game History
CREATE TABLE IF NOT EXISTS public.game_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
    ruleset JSONB NOT NULL,
    winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    total_turns INTEGER NOT NULL DEFAULT 0,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    final_standings JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Server-Only Game State Snapshots (Clients NEVER access this table directly)
CREATE TABLE IF NOT EXISTS public.game_snapshots (
    room_id UUID PRIMARY KEY REFERENCES public.game_rooms(id) ON DELETE CASCADE,
    engine_state JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_snapshots ENABLE ROW LEVEL SECURITY;

-- Profiles: Publicly readable (excluding private emails which are in auth.users), users update own profile
CREATE POLICY "Profiles readable by authenticated users" 
    ON public.profiles FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    TO authenticated 
    USING (auth.uid() = id);

-- Player Statistics: Publicly readable, updated by service role or system
CREATE POLICY "Stats readable by authenticated users" 
    ON public.player_statistics FOR SELECT 
    TO authenticated 
    USING (true);

-- Friendships: Users see their own friendships
CREATE POLICY "Users see own friendships" 
    ON public.friendships FOR SELECT 
    TO authenticated 
    USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

-- Friend Requests: Sender or Receiver can view
CREATE POLICY "Users see related friend requests" 
    ON public.friend_requests FOR SELECT 
    TO authenticated 
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create friend requests" 
    ON public.friend_requests FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Receiver can update request status" 
    ON public.friend_requests FOR UPDATE 
    TO authenticated 
    USING (auth.uid() = receiver_id);

-- Game Rooms: Members or anyone with code can view
CREATE POLICY "Rooms viewable by authenticated users" 
    ON public.game_rooms FOR SELECT 
    TO authenticated 
    USING (true);

-- Game Snapshots: STRICT SERVER-ONLY TABLE (Clients have zero direct access)
-- No SELECT, INSERT, UPDATE, or DELETE policies for authenticated users.
-- Only accessible with Supabase service_role key.
