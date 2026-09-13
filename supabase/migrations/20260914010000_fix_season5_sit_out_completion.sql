-- Fix Season 5 sit-out completion for existing deployments.
-- Ledger writes happen inside the secured completion RPC, official tiers are normalized,
-- and an authorized third sit-out is allowed by the ledger constraint.

ALTER TABLE public.season5_sit_out_ledger
  DROP CONSTRAINT IF EXISTS season5_sit_out_ledger_total_sit_outs_check;

ALTER TABLE public.season5_sit_out_ledger
  ADD CONSTRAINT season5_sit_out_ledger_total_sit_outs_check
  CHECK (total_sit_outs BETWEEN 0 AND 8);

CREATE OR REPLACE FUNCTION public.complete_season5_lineup(target_lineup_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lineup public.season5_lineup_nights%ROWTYPE;
  sit_out_player uuid;
  current_sit_outs integer;
  unserved_player_exists boolean;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Administrator access is required';
  END IF;

  SELECT * INTO lineup
  FROM public.season5_lineup_nights
  WHERE id = target_lineup_id
  FOR UPDATE;

  IF lineup.id IS NULL OR lineup.status <> 'LOCKED' THEN
    RAISE EXCEPTION 'Only a locked Season 5 lineup can be completed';
  END IF;

  SELECT player_id INTO sit_out_player
  FROM public.season5_lineup_players
  WHERE lineup_id = target_lineup_id AND lineup_status = 'SIT_OUT'
  LIMIT 1;

  IF sit_out_player IS NULL THEN
    RAISE EXCEPTION 'A Season 5 lineup must have exactly one sit-out player';
  END IF;

  SELECT total_sit_outs INTO current_sit_outs
  FROM public.season5_sit_out_ledger
  WHERE team = lineup.team AND player_id = sit_out_player
  FOR UPDATE;
  current_sit_outs := coalesce(current_sit_outs, 0);

  SELECT EXISTS (
    SELECT 1
    FROM public.players p
    LEFT JOIN public.season5_sit_out_ledger l
      ON l.team = lineup.team AND l.player_id = p.id
    WHERE p.team = lineup.team
      AND p.id <> sit_out_player
      AND coalesce(l.total_sit_outs, 0) = 0
  ) INTO unserved_player_exists;

  IF current_sit_outs >= 2 AND unserved_player_exists AND nullif(btrim(lineup.exception_reason), '') IS NULL THEN
    RAISE EXCEPTION 'A third sit-out requires an authorized exception reason';
  END IF;

  INSERT INTO public.season5_sit_out_ledger (
    team,
    player_id,
    official_tier,
    total_sit_outs,
    previous_sit_out_night,
    current_sit_out_priority
  )
  SELECT
    lineup.team,
    p.id,
    CASE lower(btrim(coalesce(p.category, 'Dev')))
      WHEN 'm1' THEN 'M1'
      WHEN 'm2' THEN 'M2'
      WHEN 'star' THEN 'Star'
      WHEN 'stars' THEN 'Star'
      WHEN 'core' THEN 'Core'
      WHEN 'cores' THEN 'Core'
      WHEN 'dev' THEN 'Dev'
      WHEN 'developing' THEN 'Dev'
      ELSE 'Dev'
    END,
    CASE WHEN p.id = sit_out_player THEN current_sit_outs + 1 ELSE 0 END,
    CASE WHEN p.id = sit_out_player THEN lineup.night_date::timestamptz ELSE NULL END,
    CASE WHEN p.id = sit_out_player THEN 1 ELSE 2 END
  FROM public.players p
  WHERE p.team = lineup.team
  ON CONFLICT (team, player_id) DO UPDATE SET
    official_tier = EXCLUDED.official_tier,
    total_sit_outs = CASE
      WHEN EXCLUDED.player_id = sit_out_player THEN public.season5_sit_out_ledger.total_sit_outs + 1
      ELSE public.season5_sit_out_ledger.total_sit_outs
    END,
    previous_sit_out_night = CASE
      WHEN EXCLUDED.player_id = sit_out_player THEN lineup.night_date::timestamptz
      ELSE public.season5_sit_out_ledger.previous_sit_out_night
    END,
    current_sit_out_priority = EXCLUDED.current_sit_out_priority;

  UPDATE public.season5_lineup_nights
  SET status = 'COMPLETED', completed_at = coalesce(completed_at, now())
  WHERE id = target_lineup_id;

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.complete_season5_lineup(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_season5_lineup(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
