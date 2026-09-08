-- The Season 5 ledger and completion RPC use this value for deterministic
-- sit-out rotation. Add it for projects that already ran the original table
-- migration before the priority field was introduced.
ALTER TABLE public.season5_sit_out_ledger
  ADD COLUMN IF NOT EXISTS current_sit_out_priority integer NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS season5_sit_out_ledger_team_priority_value_idx
  ON public.season5_sit_out_ledger (team, current_sit_out_priority);

NOTIFY pgrst, 'reload schema';
