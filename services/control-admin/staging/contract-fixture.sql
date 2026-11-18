-- Integration contract only, on an EMPTY dedicated branch. Never run on production.
-- This is not a replacement for the legacy application's full migration history.
DO $$ BEGIN
 IF to_regclass('public.horses') IS NOT NULL OR to_regclass('public.user_profiles') IS NOT NULL THEN
  RAISE EXCEPTION 'EMPTY_CONTRACT_DATABASE_REQUIRED'; END IF;
END $$;
CREATE TYPE public.user_role AS ENUM ('owner','caretaker','admin');
CREATE TABLE public.user_profiles(
 id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 email text NOT NULL UNIQUE, full_name text NOT NULL, role public.user_role DEFAULT 'owner',
 avatar_url text,phone text,is_active boolean DEFAULT true,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
CREATE TABLE public.horses(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL,stall_number text NOT NULL UNIQUE,
 owner_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE,is_active boolean DEFAULT true,
 photo_backend text NOT NULL DEFAULT 'supabase' CHECK(photo_backend IN ('supabase','wasabi')),
 created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
CREATE INDEX control_fixture_horse_owner ON public.horses(owner_id,id);
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horses ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.user_profiles,public.horses TO authenticated;
REVOKE ALL ON public.user_profiles,public.horses FROM anon;
CREATE POLICY fixture_profile_self ON public.user_profiles FOR SELECT TO authenticated USING(id=(select auth.uid()));
CREATE POLICY fixture_horse_owner ON public.horses FOR SELECT TO authenticated USING(owner_id=(select auth.uid()));
CREATE FUNCTION public.control_fixture_profile_trigger() RETURNS trigger LANGUAGE plpgsql
 SECURITY DEFINER SET search_path=pg_catalog AS $$ BEGIN
 INSERT INTO public.user_profiles(id,email,full_name,role,avatar_url)
 VALUES(new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name',split_part(new.email,'@',1)),'owner','');
 RETURN new; END $$;
REVOKE ALL ON FUNCTION public.control_fixture_profile_trigger() FROM PUBLIC;
CREATE TRIGGER control_fixture_new_user AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.control_fixture_profile_trigger();
