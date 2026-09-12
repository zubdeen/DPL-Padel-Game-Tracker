-- Record forfeits separately from ordinary 5-0 results.
-- Forfeits award team points but are excluded from individual player statistics.
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS forfeited BOOLEAN NOT NULL DEFAULT FALSE;
