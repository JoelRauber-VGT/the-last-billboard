-- App-wide settings table. Single-row-per-key store for runtime-mutable
-- config that admins control from the dashboard (currently: freeze date).
CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  updated_by uuid REFERENCES public.profiles(id)
);

-- Seed the freeze date with the value previously hardcoded in
-- src/lib/config.ts so existing behavior is preserved on first run.
-- Stored at minute precision because the admin form only edits at minute
-- resolution; otherwise a stray 59s creates a false "moving earlier" diff
-- on every form load.
INSERT INTO public.app_settings (key, value)
VALUES ('billboard_ends_at', to_jsonb('2026-06-30T23:59:00Z'::text))
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Public read: the freeze date powers the public countdown and the
-- freeze gate, both of which need to be visible to anonymous visitors.
CREATE POLICY "Anyone can read app settings"
  ON public.app_settings FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only admins may insert or update settings.
CREATE POLICY "Admins can insert app settings"
  ON public.app_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can update app settings"
  ON public.app_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Auto-bump updated_at on any change.
CREATE OR REPLACE FUNCTION public.set_app_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_app_settings_updated_at();
