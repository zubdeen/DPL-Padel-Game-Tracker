-- Update Season 5 lineup enforcement to match the revised roster shape:
-- 1 M1, 1 M2, 2 Star, 2 Core, 2 Dev, with 7 active players after one sit-out.

CREATE OR REPLACE FUNCTION public.validate_season5_locked_lineup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_count integer;
  sit_out_count integer;
  m1_count integer;
  m2_count integer;
  star_count integer;
  core_count integer;
  dev_count integer;
  player_count integer;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status = 'COMPLETED' AND (
    NEW.status <> OLD.status OR NEW.team <> OLD.team OR NEW.night_date <> OLD.night_date
  ) THEN
    RAISE EXCEPTION 'A completed Season 5 lineup cannot be changed';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'LOCKED' AND (
    NEW.status NOT IN ('LOCKED', 'COMPLETED') OR NEW.team <> OLD.team OR NEW.night_date <> OLD.night_date
  ) THEN
    RAISE EXCEPTION 'A locked Season 5 lineup can only be completed';
  END IF;

  IF TG_OP = 'INSERT' AND NEW.status <> 'DRAFT' THEN
    RAISE EXCEPTION 'Season 5 lineups must be created as drafts before they can be locked';
  END IF;

  IF NEW.status IN ('LOCKED', 'COMPLETED') AND (TG_OP = 'INSERT' OR OLD.status = 'DRAFT') THEN
    SELECT
      count(*),
      count(*) FILTER (WHERE lineup_status = 'ACTIVE'),
      count(*) FILTER (WHERE lineup_status = 'SIT_OUT'),
      count(*) FILTER (WHERE lineup_status = 'ACTIVE' AND nightly_playing_tier = 'M1'),
      count(*) FILTER (WHERE lineup_status = 'ACTIVE' AND nightly_playing_tier = 'M2'),
      count(*) FILTER (WHERE lineup_status = 'ACTIVE' AND nightly_playing_tier = 'Star'),
      count(*) FILTER (WHERE lineup_status = 'ACTIVE' AND nightly_playing_tier = 'Core'),
      count(*) FILTER (WHERE lineup_status = 'ACTIVE' AND nightly_playing_tier = 'Dev')
    INTO player_count, active_count, sit_out_count, m1_count, m2_count, star_count, core_count, dev_count
    FROM public.season5_lineup_players
    WHERE lineup_id = NEW.id;

    IF player_count <> 8 OR active_count <> 7 OR sit_out_count <> 1
      OR m1_count <> 1 OR m2_count <> 1 OR star_count <> 2 OR core_count <> 2 OR dev_count <> 1 THEN
      RAISE EXCEPTION 'Season 5 lineup must contain 8 rostered players, 1 sit-out, and active structure M1=1 M2=1 Star=2 Core=2 Dev=1';
    END IF;

    NEW.locked_at = coalesce(NEW.locked_at, now());
    NEW.locked_by = coalesce(NEW.locked_by, auth.uid());
  END IF;

  IF NEW.status = 'COMPLETED' AND OLD.status <> 'COMPLETED' THEN
    NEW.completed_at = coalesce(NEW.completed_at, now());
  END IF;

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
