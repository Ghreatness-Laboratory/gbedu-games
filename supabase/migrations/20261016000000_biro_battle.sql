-- Supabase Migration: Biro Battle Support & Turn Validation
-- Migration: 20261016000000_biro_battle.sql

-- 1. Biro Battle Matches Table (Authoritative Match & Round Logging)
CREATE TABLE IF NOT EXISTS public.biro_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    room_code VARCHAR(8),
    platform_type TEXT NOT NULL DEFAULT 'desk',
    best_of_rounds INTEGER NOT NULL DEFAULT 3,
    chaos_obstacles BOOLEAN NOT NULL DEFAULT false,
    balanced_pens BOOLEAN NOT NULL DEFAULT true,
    total_rounds INTEGER NOT NULL DEFAULT 0,
    current_round INTEGER NOT NULL DEFAULT 1,
    winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    winner_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_biro_matches_room_id ON public.biro_matches(room_id);
CREATE INDEX IF NOT EXISTS idx_biro_matches_room_code ON public.biro_matches(room_code);

-- 2. Biro Turns & Knockouts History
CREATE TABLE IF NOT EXISTS public.biro_turns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.biro_matches(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL DEFAULT 1,
    turn_number INTEGER NOT NULL DEFAULT 1,
    player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    flick_angle DOUBLE PRECISION NOT NULL,
    flick_power DOUBLE PRECISION NOT NULL CHECK (flick_power >= 0.0 AND flick_power <= 1.0),
    knockouts JSONB DEFAULT '[]'::jsonb,
    is_self_elimination BOOLEAN NOT NULL DEFAULT false,
    final_pens_state JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_biro_turns_match_id ON public.biro_turns(match_id);

-- 3. RPC: Record Authoritative Turn State
CREATE OR REPLACE FUNCTION public.record_biro_turn(
    p_match_id UUID,
    p_round_number INTEGER,
    p_turn_number INTEGER,
    p_angle DOUBLE PRECISION,
    p_power DOUBLE PRECISION,
    p_final_state JSONB,
    p_knockouts JSONB DEFAULT '[]'::jsonb,
    p_self_eliminated BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_match RECORD;
BEGIN
    SELECT * INTO v_match FROM public.biro_matches WHERE id = p_match_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Match not found');
    END IF;

    -- Validate turn limits (power <= 1.0)
    IF p_power < 0.0 OR p_power > 1.05 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid flick power exceeds physics limit');
    END IF;

    INSERT INTO public.biro_turns (
        match_id,
        round_number,
        turn_number,
        player_id,
        flick_angle,
        flick_power,
        final_pens_state,
        knockouts,
        is_self_elimination
    ) VALUES (
        p_match_id,
        p_round_number,
        p_turn_number,
        v_user_id,
        p_angle,
        LEAST(1.0, GREATEST(0.0, p_power)),
        p_final_state,
        p_knockouts,
        p_self_eliminated
    );

    UPDATE public.biro_matches
    SET updated_at = NOW()
    WHERE id = p_match_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 4. Enable RLS
ALTER TABLE public.biro_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biro_turns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated players to read biro matches"
    ON public.biro_matches FOR SELECT
    TO authenticated, anon
    USING (true);

CREATE POLICY "Allow authenticated players to create biro matches"
    ON public.biro_matches FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated players to update biro matches"
    ON public.biro_matches FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Allow players to read biro turns"
    ON public.biro_turns FOR SELECT
    TO authenticated, anon
    USING (true);

CREATE POLICY "Allow players to insert biro turns"
    ON public.biro_turns FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = player_id);
