-- Supabase Migration for Gbedu Games: Contact Messages Table with Anti-Spam & RLS
-- Created at 2026-10-15

-- 1. Contact Messages Table
CREATE TABLE IF NOT EXISTS public.contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    topic TEXT NOT NULL CHECK (topic IN ('Feedback', 'Bug report', 'Partnership', 'Other')),
    message TEXT NOT NULL CHECK (char_length(message) >= 3 AND char_length(message) <= 1000),
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices for rapid indexing and rate limit verification
CREATE INDEX IF NOT EXISTS idx_contact_messages_user_created ON public.contact_messages (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_email_created ON public.contact_messages (email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON public.contact_messages (status);

-- 2. Anti-Spam Rate Limit Function (Enforces max 3 submissions per user/email per hour)
CREATE OR REPLACE FUNCTION public.check_contact_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
    recent_count INTEGER;
BEGIN
    IF NEW.user_id IS NOT NULL THEN
        SELECT COUNT(*) INTO recent_count
        FROM public.contact_messages
        WHERE user_id = NEW.user_id
          AND created_at > NOW() - INTERVAL '1 hour';
    ELSE
        SELECT COUNT(*) INTO recent_count
        FROM public.contact_messages
        WHERE lower(trim(email)) = lower(trim(NEW.email))
          AND created_at > NOW() - INTERVAL '1 hour';
    END IF;

    IF recent_count >= 3 THEN
        RAISE EXCEPTION 'Rate limit reached: Maximum 3 messages per hour. Please try again later.'
            USING ERRCODE = 'P0001';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_contact_rate_limit ON public.contact_messages;
CREATE TRIGGER trg_contact_rate_limit
    BEFORE INSERT ON public.contact_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.check_contact_rate_limit();

-- 3. Row Level Security (RLS)
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Insertion Policy: Anyone authenticated can insert their own message, or unauthenticated guests can insert with null user_id
DROP POLICY IF EXISTS "Anyone can insert contact messages" ON public.contact_messages;
CREATE POLICY "Anyone can insert contact messages"
    ON public.contact_messages FOR INSERT
    TO anon, authenticated
    WITH CHECK (
        (auth.uid() IS NULL AND user_id IS NULL)
        OR
        (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR user_id IS NULL))
    );

-- STRICT CLIENT ACCESS CONTROL:
-- No SELECT, UPDATE, or DELETE policies exist for anon or authenticated roles.
-- This ensures client-side users cannot read each other's messages or tamper with submission status.
-- Only the project owner / admin using the Supabase Dashboard or Service Role Key can view and manage messages.
