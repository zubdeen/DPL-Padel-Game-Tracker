-- Sit-out counts are governed by the completion rule and exception reason,
-- not by an arbitrary maximum number of nights.

ALTER TABLE public.season5_sit_out_ledger
  DROP CONSTRAINT IF EXISTS season5_sit_out_ledger_total_sit_outs_check;

ALTER TABLE public.season5_sit_out_ledger
  ADD CONSTRAINT season5_sit_out_ledger_total_sit_outs_check
  CHECK (total_sit_outs >= 0);

NOTIFY pgrst, 'reload schema';
