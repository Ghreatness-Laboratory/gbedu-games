-- Migration: Add avatar_config (JSONB) and avatar_id (TEXT) to public.profiles
-- Supports code-generated SVG avatar system for Gbedu Games

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_config JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS avatar_id TEXT DEFAULT 'avatar-01';

COMMENT ON COLUMN public.profiles.avatar_config IS 'Code-generated SVG avatar configuration (skin, hair, outfit, accessory, aura)';
COMMENT ON COLUMN public.profiles.avatar_id IS 'Selected avatar preset ID (avatar-01 to avatar-12 or custom)';

-- Optional: Update any existing rows that still have default emoji
UPDATE public.profiles
SET avatar_id = 'avatar-01'
WHERE avatar_id IS NULL;
