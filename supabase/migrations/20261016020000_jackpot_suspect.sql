-- Supabase Migration: Jackpot Suspect Mechanic, Competitive Scoring, and Pressure Settings
-- Migration: 20261016020000_jackpot_suspect.sql

-- 1. Add Suspect & Competitive Scoring Settings to jackpot_matches
ALTER TABLE public.jackpot_matches
    ADD COLUMN IF NOT EXISTS suspect_tokens_per_round INTEGER NOT NULL DEFAULT 2,
    ADD COLUMN IF NOT EXISTS suspect_threshold INTEGER NOT NULL DEFAULT 3,
    ADD COLUMN IF NOT EXISTS target_points INTEGER NOT NULL DEFAULT 15,
    ADD COLUMN IF NOT EXISTS shrinking_timer BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS allow_freeze_card BOOLEAN NOT NULL DEFAULT false;

-- 2. Add Suspect state, tokens, and competition points to jackpot_player_hands
ALTER TABLE public.jackpot_player_hands
    ADD COLUMN IF NOT EXISTS points INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS suspect_tokens INTEGER NOT NULL DEFAULT 2,
    ADD COLUMN IF NOT EXISTS is_exposed BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS exposed_shape TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS has_used_freeze BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS last_suspect_at TIMESTAMPTZ DEFAULT NULL;

-- 3. Suspect Events Audit Log & Realtime Activity Feed
CREATE TABLE IF NOT EXISTS public.jackpot_suspect_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.jackpot_matches(id) ON DELETE CASCADE,
    accuser_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    accuser_name TEXT NOT NULL,
    accused_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    accused_name TEXT NOT NULL,
    shape TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jackpot_suspect_events_match_id ON public.jackpot_suspect_events(match_id);

-- Enable RLS
ALTER TABLE public.jackpot_suspect_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on jackpot suspect events"
    ON public.jackpot_suspect_events FOR SELECT
    TO authenticated, anon
    USING (true);

-- 4. Server Authority Atomic RPC: Execute Suspect Accusation
-- Hand is validated strictly inside server memory; never returned or broadcast to clients!
CREATE OR REPLACE FUNCTION public.jackpot_accuse_suspect(
    p_match_id UUID,
    p_accused_id UUID,
    p_shape TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_accuser_id UUID := auth.uid();
    v_match RECORD;
    v_accuser RECORD;
    v_accused RECORD;
    v_accuser_profile RECORD;
    v_accused_profile RECORD;
    v_card JSONB;
    v_match_count INTEGER := 0;
    v_threshold INTEGER := 3;
    v_is_correct BOOLEAN := false;
    v_allow_wilds BOOLEAN := true;
BEGIN
    -- 1. Validate Match
    SELECT * INTO v_match FROM public.jackpot_matches WHERE id = p_match_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Match not found');
    END IF;

    IF v_match.status != 'passing' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Suspect can only be called during passing phase');
    END IF;

    v_threshold := v_match.suspect_threshold;
    v_allow_wilds := v_match.allow_whot_wilds;

    -- 2. Validate Accuser
    SELECT * INTO v_accuser FROM public.jackpot_player_hands
    WHERE match_id = p_match_id AND user_id = v_accuser_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Accuser not in match');
    END IF;

    IF v_accuser.suspect_tokens <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'No Suspect tokens remaining');
    END IF;

    -- Cooldown check (5 seconds)
    IF v_accuser.last_suspect_at IS NOT NULL AND (NOW() - v_accuser.last_suspect_at) < INTERVAL '5 seconds' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Suspect is on cooldown (5s)');
    END IF;

    IF v_accuser_id = p_accused_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot accuse yourself');
    END IF;

    -- 3. Validate Accused
    SELECT * INTO v_accused FROM public.jackpot_player_hands
    WHERE match_id = p_match_id AND user_id = p_accused_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Accused player not found');
    END IF;

    IF v_accused.is_exposed THEN
        RETURN jsonb_build_object('success', false, 'error', 'Player is already exposed');
    END IF;

    -- Fetch display names for activity feed
    SELECT display_name, username INTO v_accuser_profile FROM public.profiles WHERE id = v_accuser_id;
    SELECT display_name, username INTO v_accused_profile FROM public.profiles WHERE id = p_accused_id;

    -- 4. Authoritative Secret Hand Evaluation
    FOR v_card IN SELECT * FROM jsonb_array_elements(v_accused.hand)
    LOOP
        IF (v_card->>'shape') = p_shape OR (v_allow_wilds AND (v_card->>'shape') = 'whot') THEN
            v_match_count := v_match_count + 1;
        END IF;
    END LOOP;

    v_is_correct := (v_match_count >= v_threshold);

    -- 5. Apply Results Atomically
    IF v_is_correct THEN
        -- Correct: Accuser +1 pt & keeps token; Accused is Exposed
        UPDATE public.jackpot_player_hands
        SET points = points + 1,
            last_suspect_at = NOW(),
            updated_at = NOW()
        WHERE match_id = p_match_id AND user_id = v_accuser_id;

        UPDATE public.jackpot_player_hands
        SET is_exposed = true,
            exposed_shape = p_shape,
            updated_at = NOW()
        WHERE match_id = p_match_id AND user_id = p_accused_id;
    ELSE
        -- Wrong: Accuser spends token & gets skipped next pass step; Accused suffers no penalty
        UPDATE public.jackpot_player_hands
        SET suspect_tokens = GREATEST(0, suspect_tokens - 1),
            is_skipped = true,
            last_suspect_at = NOW(),
            updated_at = NOW()
        WHERE match_id = p_match_id AND user_id = v_accuser_id;
    END IF;

    -- 6. Insert Public Event Log (Notice: secret hand cards are never stored or revealed!)
    INSERT INTO public.jackpot_suspect_events (
        match_id,
        accuser_id,
        accuser_name,
        accused_id,
        accused_name,
        shape,
        is_correct
    ) VALUES (
        p_match_id,
        v_accuser_id,
        COALESCE(v_accuser_profile.display_name, v_accuser_profile.username, 'Player'),
        p_accused_id,
        COALESCE(v_accused_profile.display_name, v_accused_profile.username, 'Opponent'),
        p_shape,
        v_is_correct
    );

    RETURN jsonb_build_object(
        'success', true,
        'is_correct', v_is_correct,
        'accuser_id', v_accuser_id,
        'accused_id', p_accused_id,
        'shape', p_shape
    );
END;
$$;

-- 5. Server Authority Atomic RPC: Freeze Opponent Card
CREATE OR REPLACE FUNCTION public.jackpot_freeze_player(
    p_match_id UUID,
    p_target_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_player RECORD;
    v_target RECORD;
BEGIN
    SELECT * INTO v_player FROM public.jackpot_player_hands
    WHERE match_id = p_match_id AND user_id = v_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Player not found');
    END IF;

    IF v_player.suspect_tokens <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Freezing requires 1 Suspect token');
    END IF;

    IF v_player.has_used_freeze THEN
        RETURN jsonb_build_object('success', false, 'error', 'Freeze already used this round');
    END IF;

    SELECT * INTO v_target FROM public.jackpot_player_hands
    WHERE match_id = p_match_id AND user_id = p_target_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Target not found');
    END IF;

    IF v_target.is_frozen THEN
        RETURN jsonb_build_object('success', false, 'error', 'Player already frozen');
    END IF;

    UPDATE public.jackpot_player_hands
    SET suspect_tokens = GREATEST(0, suspect_tokens - 1),
        has_used_freeze = true,
        updated_at = NOW()
    WHERE match_id = p_match_id AND user_id = v_user_id;

    UPDATE public.jackpot_player_hands
    SET is_frozen = true,
        updated_at = NOW()
    WHERE match_id = p_match_id AND user_id = p_target_id;

    RETURN jsonb_build_object('success', true);
END;
$$;
