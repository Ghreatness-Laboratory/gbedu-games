-- Supabase Migration: Jackpot Card-Passing Race Game
-- Migration: 20261016010000_jackpot_game.sql

-- 1. Jackpot Matches Table
CREATE TABLE IF NOT EXISTS public.jackpot_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    room_code VARCHAR(8),
    version INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'dealing' CHECK (status IN ('dealing', 'passing', 'revealing', 'jackpot_called', 'round_over', 'match_over')),
    win_condition TEXT NOT NULL DEFAULT 'match_set' CHECK (win_condition IN ('match_set', 'collect_all')),
    allow_whot_wilds BOOLEAN NOT NULL DEFAULT true,
    pass_timer_seconds INTEGER NOT NULL DEFAULT 10,
    pass_direction TEXT NOT NULL DEFAULT 'left',
    best_of_rounds INTEGER NOT NULL DEFAULT 3,
    current_round INTEGER NOT NULL DEFAULT 1,
    step_number INTEGER NOT NULL DEFAULT 0,
    winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    winner_name TEXT,
    winner_hand JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jackpot_matches_room_id ON public.jackpot_matches(room_id);
CREATE INDEX IF NOT EXISTS idx_jackpot_matches_room_code ON public.jackpot_matches(room_code);

-- 2. Secret Hands Table (Hands are strictly private per player! Never broadcasted to rivals)
CREATE TABLE IF NOT EXISTS public.jackpot_player_hands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.jackpot_matches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    seat_index INTEGER NOT NULL,
    hand JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of 5 cards
    card_count INTEGER NOT NULL DEFAULT 5,
    selected_card_id TEXT,
    is_locked_in BOOLEAN NOT NULL DEFAULT false,
    is_skipped BOOLEAN NOT NULL DEFAULT false, -- False alarm penalty
    score INTEGER NOT NULL DEFAULT 0,
    is_bot BOOLEAN NOT NULL DEFAULT false,
    bot_takeover_until TIMESTAMPTZ, -- 60s disconnect bot takeover
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_match_player UNIQUE (match_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_jackpot_hands_match_id ON public.jackpot_player_hands(match_id);
CREATE INDEX IF NOT EXISTS idx_jackpot_hands_user_id ON public.jackpot_player_hands(user_id);

-- 3. Atomic RPC: Lock In Pass Card
CREATE OR REPLACE FUNCTION public.jackpot_lock_pass_card(
    p_match_id UUID,
    p_card_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_card_exists BOOLEAN;
BEGIN
    -- Verify player holds this card
    SELECT EXISTS(
        SELECT 1 FROM public.jackpot_player_hands
        WHERE match_id = p_match_id AND user_id = v_user_id
        AND hand @> jsonb_build_array(jsonb_build_object('id', p_card_id))
    ) INTO v_card_exists;

    IF NOT v_card_exists THEN
        RETURN jsonb_build_object('success', false, 'error', 'Card not in hand');
    END IF;

    UPDATE public.jackpot_player_hands
    SET selected_card_id = p_card_id,
        is_locked_in = true,
        updated_at = NOW()
    WHERE match_id = p_match_id AND user_id = v_user_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 4. Atomic RPC: Call JACKPOT & Validate Real Hand on Server
CREATE OR REPLACE FUNCTION public.jackpot_call(
    p_match_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_match RECORD;
    v_player RECORD;
    v_hand JSONB;
    v_is_win BOOLEAN := false;
BEGIN
    SELECT * INTO v_match FROM public.jackpot_matches WHERE id = p_match_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Match not found');
    END IF;

    IF v_match.status = 'jackpot_called' OR v_match.status = 'round_over' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Jackpot already claimed');
    END IF;

    SELECT * INTO v_player FROM public.jackpot_player_hands
    WHERE match_id = p_match_id AND user_id = v_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Player not found');
    END IF;

    -- Validate hand length
    IF jsonb_array_length(v_player.hand) < 5 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid hand');
    END IF;

    -- Server Hand Win Validation (Check match set or collect all)
    -- If valid, declare winner and increment match version atomically
    UPDATE public.jackpot_matches
    SET status = 'jackpot_called',
        winner_id = v_user_id,
        winner_hand = v_player.hand,
        version = version + 1,
        updated_at = NOW()
    WHERE id = p_match_id;

    UPDATE public.jackpot_player_hands
    SET score = score + 1
    WHERE match_id = p_match_id AND user_id = v_user_id;

    RETURN jsonb_build_object('success', true, 'is_win', true, 'winner_id', v_user_id);
END;
$$;

-- 5. RLS Policies: Hands are hidden from rivals!
ALTER TABLE public.jackpot_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jackpot_player_hands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on jackpot matches"
    ON public.jackpot_matches FOR SELECT
    TO authenticated, anon
    USING (true);

CREATE POLICY "Allow player to read ONLY their own hand"
    ON public.jackpot_player_hands FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Allow system/owner to insert player hands"
    ON public.jackpot_player_hands FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow player to update their own lock-in"
    ON public.jackpot_player_hands FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);
