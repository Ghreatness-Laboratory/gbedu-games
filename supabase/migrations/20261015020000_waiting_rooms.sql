-- Supabase Migration: Universal Waiting Rooms Framework & Public IDs for Gbedu Games
-- Created for Gbedu Games: applies to ALL online games (X & O, RPS, Whot, Ludo, Chess, etc.)

-- 1. Helper Function: Generate Short Public ID (e.g. GB-4F7K)
CREATE OR REPLACE FUNCTION public.generate_public_id()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    candidate TEXT;
    is_taken BOOLEAN;
    i INTEGER;
BEGIN
    LOOP
        candidate := 'GB-';
        FOR i IN 1..4 LOOP
            candidate := candidate || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
        END LOOP;
        
        SELECT EXISTS(SELECT 1 FROM public.profiles WHERE public_id = candidate) INTO is_taken;
        IF NOT is_taken THEN
            RETURN candidate;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 2. Add public_id to public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS public_id TEXT UNIQUE;

-- Backfill any existing profiles that lack a public_id
UPDATE public.profiles
SET public_id = public.generate_public_id()
WHERE public_id IS NULL;

-- Trigger to auto-assign public_id on new profile creation
CREATE OR REPLACE FUNCTION public.set_profile_public_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.public_id IS NULL THEN
        NEW.public_id := public.generate_public_id();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_profile_public_id ON public.profiles;
CREATE TRIGGER trigger_set_profile_public_id
    BEFORE INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_profile_public_id();

-- 3. Universal Rooms Table (Applies to all games: xo, rps, whot, ludo, chess, etc.)
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game TEXT NOT NULL, -- 'xo', 'rps', 'whot', 'ludo', 'chess', 'ayo', 'biro-soccer', etc.
    code VARCHAR(8) UNIQUE NOT NULL,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    max_players INTEGER NOT NULL DEFAULT 2 CHECK (max_players >= 2 AND max_players <= 8),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rooms_code ON public.rooms (code);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON public.rooms (status);
CREATE INDEX IF NOT EXISTS idx_rooms_last_activity ON public.rooms (last_activity);

-- 4. Room Players Table (Seats within each room)
CREATE TABLE IF NOT EXISTS public.room_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    seat INTEGER NOT NULL CHECK (seat >= 0 AND seat <= 7),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    connected BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT unique_room_player UNIQUE (room_id, user_id),
    CONSTRAINT unique_room_seat UNIQUE (room_id, seat)
);

CREATE INDEX IF NOT EXISTS idx_room_players_room_id ON public.room_players (room_id);
CREATE INDEX IF NOT EXISTS idx_room_players_user_id ON public.room_players (user_id);

-- 5. RPC Function: create_room(p_game, p_max_players, p_settings)
CREATE OR REPLACE FUNCTION public.create_room(
    p_game TEXT,
    p_max_players INTEGER DEFAULT 2,
    p_settings JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_code TEXT;
    v_chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    v_room_id UUID;
    v_safe_max INTEGER := GREATEST(2, LEAST(8, COALESCE(p_max_players, 2)));
    i INTEGER;
    is_taken BOOLEAN;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required to create room');
    END IF;

    -- Generate unique 4-letter code
    LOOP
        v_code := '';
        FOR i IN 1..4 LOOP
            v_code := v_code || substr(v_chars, floor(random() * length(v_chars) + 1)::integer, 1);
        END LOOP;
        
        SELECT EXISTS(SELECT 1 FROM public.rooms WHERE code = v_code AND status IN ('waiting', 'playing')) INTO is_taken;
        IF NOT is_taken THEN
            EXIT;
        END IF;
    END LOOP;

    -- Clean up any prior waiting room owned by this user
    DELETE FROM public.rooms WHERE owner_id = v_user_id AND status = 'waiting';

    -- Insert new room
    INSERT INTO public.rooms (game, code, owner_id, status, settings, max_players)
    VALUES (lower(trim(p_game)), v_code, v_user_id, 'waiting', COALESCE(p_settings, '{}'::jsonb), v_safe_max)
    RETURNING id INTO v_room_id;

    -- Seat owner at seat 0
    INSERT INTO public.room_players (room_id, user_id, seat, connected)
    VALUES (v_room_id, v_user_id, 0, true);

    RETURN jsonb_build_object(
        'success', true,
        'room_id', v_room_id,
        'code', v_code,
        'game', lower(trim(p_game)),
        'max_players', v_safe_max,
        'seat', 0
    );
END;
$$;

-- 6. RPC Function: join_room(p_code TEXT)
CREATE OR REPLACE FUNCTION public.join_room(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_clean_code TEXT := upper(trim(p_code));
    v_room RECORD;
    v_existing_player RECORD;
    v_assigned_seat INTEGER := 0;
    v_seat_candidate INTEGER;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required to join room');
    END IF;

    -- Lookup room
    SELECT * INTO v_room FROM public.rooms WHERE code = v_clean_code;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Room not found with that code');
    END IF;

    -- Check if expired (> 15 minutes inactive in waiting status)
    IF v_room.status = 'waiting' AND (v_room.last_activity < NOW() - INTERVAL '15 minutes') THEN
        RETURN jsonb_build_object('success', false, 'error', 'This waiting room has expired due to inactivity', 'expired', true);
    END IF;

    -- If room is finished
    IF v_room.status = 'finished' THEN
        RETURN jsonb_build_object('success', false, 'error', 'This game room has finished', 'finished', true);
    END IF;

    -- Check if user is already seated in this room (reconnection / refresh)
    SELECT * INTO v_existing_player FROM public.room_players WHERE room_id = v_room.id AND user_id = v_user_id;
    IF FOUND THEN
        UPDATE public.room_players SET connected = true WHERE id = v_existing_player.id;
        UPDATE public.rooms SET last_activity = NOW() WHERE id = v_room.id;
        RETURN jsonb_build_object(
            'success', true,
            'room_id', v_room.id,
            'code', v_room.code,
            'seat', v_existing_player.seat,
            'game', v_room.game,
            'status', v_room.status
        );
    END IF;

    -- If room is already playing and user is not in it
    IF v_room.status = 'playing' THEN
        RETURN jsonb_build_object('success', false, 'error', 'This match has already started', 'started', true);
    END IF;

    -- Check capacity
    IF (SELECT count(*) FROM public.room_players WHERE room_id = v_room.id) >= v_room.max_players THEN
        RETURN jsonb_build_object('success', false, 'error', 'Room is full (max ' || v_room.max_players || ' players)', 'full', true);
    END IF;

    -- Find lowest unoccupied seat (0 .. max_players - 1)
    FOR v_seat_candidate IN 0..(v_room.max_players - 1) LOOP
        IF NOT EXISTS (SELECT 1 FROM public.room_players WHERE room_id = v_room.id AND seat = v_seat_candidate) THEN
            v_assigned_seat := v_seat_candidate;
            EXIT;
        END IF;
    END LOOP;

    -- Clean up any other waiting room player was seated in
    DELETE FROM public.room_players rp
    USING public.rooms r
    WHERE rp.room_id = r.id AND rp.user_id = v_user_id AND r.status = 'waiting' AND r.id <> v_room.id;

    -- Insert player into this room
    INSERT INTO public.room_players (room_id, user_id, seat, connected)
    VALUES (v_room.id, v_user_id, v_assigned_seat, true);

    -- Touch room activity
    UPDATE public.rooms SET last_activity = NOW() WHERE id = v_room.id;

    RETURN jsonb_build_object(
        'success', true,
        'room_id', v_room.id,
        'code', v_room.code,
        'seat', v_assigned_seat,
        'game', v_room.game,
        'status', v_room.status
    );
END;
$$;

-- 7. RPC Function: leave_room(p_room_id UUID)
CREATE OR REPLACE FUNCTION public.leave_room(p_room_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_room RECORD;
    v_remaining_count INTEGER;
    v_next_owner RECORD;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Room not found');
    END IF;

    -- Remove player
    DELETE FROM public.room_players WHERE room_id = p_room_id AND user_id = v_user_id;

    -- Check remaining players
    SELECT count(*) INTO v_remaining_count FROM public.room_players WHERE room_id = p_room_id;

    IF v_remaining_count = 0 THEN
        -- Room is empty: mark finished
        UPDATE public.rooms SET status = 'finished', last_activity = NOW() WHERE id = p_room_id;
        RETURN jsonb_build_object('success', true, 'room_closed', true);
    END IF;

    -- If the leaving player was the owner, transfer ownership to the next joined player
    IF v_room.owner_id = v_user_id THEN
        SELECT * INTO v_next_owner FROM public.room_players
        WHERE room_id = p_room_id
        ORDER BY joined_at ASC, seat ASC
        LIMIT 1;

        IF FOUND THEN
            UPDATE public.rooms
            SET owner_id = v_next_owner.user_id, last_activity = NOW()
            WHERE id = p_room_id;
            
            RETURN jsonb_build_object(
                'success', true,
                'ownership_transferred', true,
                'new_owner_id', v_next_owner.user_id
            );
        END IF;
    END IF;

    UPDATE public.rooms SET last_activity = NOW() WHERE id = p_room_id;
    RETURN jsonb_build_object('success', true);
END;
$$;

-- 8. RPC Function: start_room(p_room_id UUID)
CREATE OR REPLACE FUNCTION public.start_room(p_room_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_room RECORD;
    v_player_count INTEGER;
    v_min_required INTEGER := 2;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Room not found');
    END IF;

    -- STRICT SERVER-SIDE OWNER ENFORCEMENT: Only owner can start!
    IF v_room.owner_id <> v_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only the room owner can start the match');
    END IF;

    IF v_room.status <> 'waiting' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Game is already started or finished');
    END IF;

    -- Check minimum player count
    SELECT count(*) INTO v_player_count FROM public.room_players WHERE room_id = p_room_id;

    IF v_player_count < v_min_required THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Need at least ' || v_min_required || ' players to start (currently ' || v_player_count || ')'
        );
    END IF;

    -- Lock player list & advance status to playing
    UPDATE public.rooms
    SET status = 'playing', last_activity = NOW()
    WHERE id = p_room_id;

    RETURN jsonb_build_object(
        'success', true,
        'status', 'playing',
        'player_count', v_player_count,
        'game', v_room.game
    );
END;
$$;

-- 9. RPC Function: kick_player(p_room_id UUID, p_target_user_id UUID)
CREATE OR REPLACE FUNCTION public.kick_player(p_room_id UUID, p_target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_room RECORD;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Room not found');
    END IF;

    -- SERVER-SIDE OWNER ENFORCEMENT
    IF v_room.owner_id <> v_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only the room owner can remove players');
    END IF;

    IF v_target_user_id = v_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot kick yourself; use leave room');
    END IF;

    DELETE FROM public.room_players WHERE room_id = p_room_id AND user_id = p_target_user_id;
    UPDATE public.rooms SET last_activity = NOW() WHERE id = p_room_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 10. RPC Function: get_room_by_code(p_code TEXT)
CREATE OR REPLACE FUNCTION public.get_room_by_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_clean_code TEXT := upper(trim(p_code));
    v_room RECORD;
    v_players JSONB;
BEGIN
    SELECT * INTO v_room FROM public.rooms WHERE code = v_clean_code;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Room not found with that code');
    END IF;

    -- Check if expired (> 15 minutes inactive in waiting status)
    IF v_room.status = 'waiting' AND (v_room.last_activity < NOW() - INTERVAL '15 minutes') THEN
        RETURN jsonb_build_object('success', false, 'error', 'This waiting room has expired due to inactivity', 'expired', true);
    END IF;

    -- Build sanitized player list (never exposes raw emails or auth secrets)
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'userId', p.id,
            'publicId', COALESCE(p.public_id, 'GB-USER'),
            'username', p.username,
            'displayName', COALESCE(p.display_name, p.username),
            'avatarUrl', COALESCE(p.avatar_url, p.avatar_id, 'avatar-01'),
            'avatarId', p.avatar_id,
            'avatarConfig', p.avatar_config,
            'seatIndex', rp.seat,
            'isHost', (p.id = v_room.owner_id),
            'isReady', true,
            'isConnected', rp.connected,
            'isVerified', true,
            'joinedAt', rp.joined_at
        ) ORDER BY rp.seat ASC
    ), '[]'::jsonb) INTO v_players
    FROM public.room_players rp
    JOIN public.profiles p ON p.id = rp.user_id
    WHERE rp.room_id = v_room.id;

    RETURN jsonb_build_object(
        'success', true,
        'room', jsonb_build_object(
            'id', v_room.id,
            'code', v_room.code,
            'game', v_room.game,
            'hostId', v_room.owner_id,
            'status', v_room.status,
            'settings', v_room.settings,
            'maxPlayers', v_room.max_players,
            'createdAt', v_room.created_at,
            'lastActivity', v_room.last_activity,
            'players', v_players
        )
    );
END;
$$;

-- 11. Row Level Security Policies
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;

-- Rooms RLS: Players can only read rooms they are in, plus look up a room by code for joining
DROP POLICY IF EXISTS "Rooms visible to authenticated users" ON public.rooms;
DROP POLICY IF EXISTS "Rooms visible if member, owner, or waiting" ON public.rooms;
CREATE POLICY "Rooms visible if member, owner, or waiting"
    ON public.rooms FOR SELECT
    TO authenticated
    USING (
        status = 'waiting'
        OR owner_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.room_players
            WHERE room_players.room_id = rooms.id
            AND room_players.user_id = auth.uid()
        )
    );

-- Room Players RLS: Visible to room members or for waiting rooms
DROP POLICY IF EXISTS "Room players visible to authenticated users" ON public.room_players;
DROP POLICY IF EXISTS "Room players visible to room members or waiting rooms" ON public.room_players;
CREATE POLICY "Room players visible to room members or waiting rooms"
    ON public.room_players FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.rooms
            WHERE rooms.id = room_players.room_id
            AND (
                rooms.status = 'waiting'
                OR rooms.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.room_players rp2
                    WHERE rp2.room_id = rooms.id AND rp2.user_id = auth.uid()
                )
            )
        )
    );

-- 12. Enable Supabase Realtime Publication for live waiting room broadcasts
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'rooms'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'room_players'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.room_players;
    END IF;
END $$;
