-- DPL Season 5: 8-player roster, one sit-out, one-tier temporary promotions.

CREATE TABLE IF NOT EXISTS public.season5_sit_out_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team text NOT NULL,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  official_tier text NOT NULL CHECK (official_tier IN ('M1', 'M2', 'Star', 'Core', 'Dev')),
  total_sit_outs integer NOT NULL DEFAULT 0 CHECK (total_sit_outs BETWEEN 0 AND 2),
  previous_sit_out_night timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team, player_id)
);

CREATE INDEX IF NOT EXISTS season5_sit_out_ledger_team_priority_idx
  ON public.season5_sit_out_ledger (team, total_sit_outs, previous_sit_out_night, player_id);

CREATE TABLE IF NOT EXISTS public.season5_lineup_nights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team text NOT NULL,
  night_date date NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'LOCKED', 'COMPLETED')),
  exception_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  locked_at timestamptz,
  locked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at timestamptz,
  UNIQUE (team, night_date)
);

ALTER TABLE public.season5_lineup_nights
  ADD COLUMN IF NOT EXISTS exception_reason text;

CREATE TABLE IF NOT EXISTS public.season5_lineup_players (
  lineup_id uuid NOT NULL REFERENCES public.season5_lineup_nights(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE RESTRICT,
  official_tier text NOT NULL CHECK (official_tier IN ('M1', 'M2', 'Star', 'Core', 'Dev')),
  nightly_playing_tier text NOT NULL CHECK (nightly_playing_tier IN ('M1', 'M2', 'Star', 'Core', 'Dev')),
  lineup_status text NOT NULL CHECK (lineup_status IN ('ACTIVE', 'SIT_OUT')),
  promotion_source_tier text CHECK (promotion_source_tier IN ('M1', 'M2', 'Star', 'Core', 'Dev')),
  sort_order integer NOT NULL,
  PRIMARY KEY (lineup_id, player_id),
  UNIQUE (lineup_id, sort_order),
  CHECK (
    promotion_source_tier IS NULL
    OR (promotion_source_tier, nightly_playing_tier) IN (
      ('M2', 'M1'), ('Star', 'M2'), ('Core', 'Star'), ('Dev', 'Core')
    )
  ),
  CHECK (lineup_status = 'SIT_OUT' OR promotion_source_tier IS NULL OR official_tier = promotion_source_tier)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.season5_sit_out_ledger TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.season5_lineup_nights TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.season5_lineup_players TO authenticated;

ALTER TABLE public.season5_sit_out_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season5_lineup_nights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season5_lineup_players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage Season 5 sit-out ledger" ON public.season5_sit_out_ledger;
CREATE POLICY "Admins can manage Season 5 sit-out ledger"
ON public.season5_sit_out_ledger FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage Season 5 lineup nights" ON public.season5_lineup_nights;
CREATE POLICY "Admins can manage Season 5 lineup nights"
ON public.season5_lineup_nights FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage Season 5 lineup players" ON public.season5_lineup_players;
CREATE POLICY "Admins can manage Season 5 lineup players"
ON public.season5_lineup_players FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.season5_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS season5_sit_out_ledger_touch_updated_at ON public.season5_sit_out_ledger;
CREATE TRIGGER season5_sit_out_ledger_touch_updated_at
BEFORE UPDATE ON public.season5_sit_out_ledger
FOR EACH ROW EXECUTE FUNCTION public.season5_touch_updated_at();

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

DROP TRIGGER IF EXISTS validate_season5_locked_lineup ON public.season5_lineup_nights;
CREATE TRIGGER validate_season5_locked_lineup
BEFORE UPDATE ON public.season5_lineup_nights
FOR EACH ROW EXECUTE FUNCTION public.validate_season5_locked_lineup();

CREATE OR REPLACE FUNCTION public.prevent_season5_locked_lineup_player_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lineup_status text;
BEGIN
  SELECT status INTO lineup_status FROM public.season5_lineup_nights WHERE id = coalesce(NEW.lineup_id, OLD.lineup_id);
  IF lineup_status IN ('LOCKED', 'COMPLETED') THEN
    RAISE EXCEPTION 'Players in a locked Season 5 lineup cannot be changed';
  END IF;
  RETURN coalesce(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS prevent_season5_locked_lineup_player_edit ON public.season5_lineup_players;
CREATE TRIGGER prevent_season5_locked_lineup_player_edit
BEFORE INSERT OR UPDATE OR DELETE ON public.season5_lineup_players
FOR EACH ROW EXECUTE FUNCTION public.prevent_season5_locked_lineup_player_edit();

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
  WHERE lineup_id = target_lineup_id AND lineup_status = 'SIT_OUT';

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

  INSERT INTO public.season5_sit_out_ledger (team, player_id, official_tier, total_sit_outs, previous_sit_out_night, current_sit_out_priority)
  SELECT lineup.team, p.id, p.category, CASE WHEN p.id = sit_out_player THEN 1 ELSE 0 END,
    CASE WHEN p.id = sit_out_player THEN lineup.night_date::timestamptz ELSE NULL END,
    CASE WHEN p.id = sit_out_player THEN 1 ELSE 2 END
  FROM public.players p
  WHERE p.team = lineup.team
  ON CONFLICT (team, player_id) DO UPDATE SET
    total_sit_outs = CASE WHEN EXCLUDED.player_id = sit_out_player THEN public.season5_sit_out_ledger.total_sit_outs + 1 ELSE public.season5_sit_out_ledger.total_sit_outs END,
    previous_sit_out_night = CASE WHEN EXCLUDED.player_id = sit_out_player THEN lineup.night_date::timestamptz ELSE public.season5_sit_out_ledger.previous_sit_out_night END;

  UPDATE public.season5_lineup_nights
  SET status = 'COMPLETED', completed_at = coalesce(completed_at, now())
  WHERE id = target_lineup_id;

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.complete_season5_lineup(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_season5_lineup(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.validate_season5_match_players()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lineup_id uuid;
  side_team text;
  selected_player uuid;
BEGIN
  FOREACH side_team IN ARRAY ARRAY[NEW.team1_name, NEW.team2_name] LOOP
    IF side_team IS NULL OR btrim(side_team) = '' THEN
      CONTINUE;
    END IF;

    SELECT id INTO v_lineup_id
    FROM public.season5_lineup_nights
    WHERE team = side_team
      AND night_date = (NEW.played_at AT TIME ZONE 'UTC')::date
      AND status IN ('LOCKED', 'COMPLETED')
    LIMIT 1;

    IF v_lineup_id IS NULL THEN
      CONTINUE;
    END IF;

    IF side_team = NEW.team1_name THEN
      FOREACH selected_player IN ARRAY ARRAY[NEW.team1_player1_id, NEW.team1_player2_id] LOOP
        IF NOT EXISTS (
          SELECT 1 FROM public.season5_lineup_players
          WHERE lineup_id = v_lineup_id
            AND player_id = selected_player
            AND lineup_status = 'ACTIVE'
        ) THEN
          RAISE EXCEPTION 'Match player is not active in the locked Season 5 lineup for %', side_team;
        END IF;
      END LOOP;
    ELSE
      FOREACH selected_player IN ARRAY ARRAY[NEW.team2_player1_id, NEW.team2_player2_id] LOOP
        IF NOT EXISTS (
          SELECT 1 FROM public.season5_lineup_players
          WHERE lineup_id = v_lineup_id
            AND player_id = selected_player
            AND lineup_status = 'ACTIVE'
        ) THEN
          RAISE EXCEPTION 'Match player is not active in the locked Season 5 lineup for %', side_team;
        END IF;
      END LOOP;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_season5_match_players ON public.matches;
CREATE TRIGGER validate_season5_match_players
BEFORE INSERT OR UPDATE ON public.matches
FOR EACH ROW EXECUTE FUNCTION public.validate_season5_match_players();

REVOKE EXECUTE ON FUNCTION public.validate_season5_match_players() FROM PUBLIC, anon;

REVOKE EXECUTE ON FUNCTION public.season5_touch_updated_at() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.validate_season5_locked_lineup() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.prevent_season5_locked_lineup_player_edit() FROM PUBLIC, anon;

NOTIFY pgrst, 'reload schema';
