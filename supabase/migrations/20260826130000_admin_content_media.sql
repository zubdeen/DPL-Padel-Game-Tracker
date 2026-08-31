-- Season administration bootstrap: this migration is safe to run after or instead of
-- the earlier site-content migration when a fresh project has no content table yet.

-- Repair the role helper if the base migration was only partially applied.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE TABLE IF NOT EXISTS public.site_content (
  id text PRIMARY KEY DEFAULT 'primary' CHECK (id = 'primary'),
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read site content" ON public.site_content;
CREATE POLICY "Public can read site content"
ON public.site_content FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins can insert site content" ON public.site_content;
CREATE POLICY "Admins can insert site content"
ON public.site_content FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update site content" ON public.site_content;
CREATE POLICY "Admins can update site content"
ON public.site_content FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.site_content_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS site_content_audit ON public.site_content;
CREATE TRIGGER site_content_audit
BEFORE INSERT OR UPDATE ON public.site_content
FOR EACH ROW EXECUTE FUNCTION public.site_content_audit();

ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Public media is intentional: the public tracker must display player and team images.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dpl-media',
  'dpl-media',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public can view DPL media" ON storage.objects;
CREATE POLICY "Public can view DPL media"
ON storage.objects FOR SELECT
USING (bucket_id = 'dpl-media');

DROP POLICY IF EXISTS "Admins can upload DPL media" ON storage.objects;
CREATE POLICY "Admins can upload DPL media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'dpl-media'
  AND public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Admins can update DPL media" ON storage.objects;
CREATE POLICY "Admins can update DPL media"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'dpl-media'
  AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id = 'dpl-media'
  AND public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Admins can delete DPL media" ON storage.objects;
CREATE POLICY "Admins can delete DPL media"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'dpl-media'
  AND public.has_role(auth.uid(), 'admin')
);

-- Rename an existing team atomically across the data that stores team text.
CREATE OR REPLACE FUNCTION public.rename_team(old_team text, new_team text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Administrator access is required';
  END IF;

  old_team := btrim(old_team);
  new_team := btrim(new_team);

  IF old_team = '' OR new_team = '' THEN
    RAISE EXCEPTION 'Team names cannot be empty';
  END IF;

  IF old_team = new_team THEN
    RETURN true;
  END IF;

  UPDATE public.players SET team = new_team WHERE team = old_team;
  UPDATE public.matches SET team1_name = new_team WHERE team1_name = old_team;
  UPDATE public.matches SET team2_name = new_team WHERE team2_name = old_team;
  UPDATE public.team_rankings SET team = new_team WHERE team = old_team;

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rename_team(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rename_team(text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
