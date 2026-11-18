-- Staged migration. Never automatically applied to the production Supabase project.
-- Only new private objects; no alteration of public.horses, images or HLS settings.
CREATE SCHEMA se_control_v1;
REVOKE ALL ON SCHEMA se_control_v1 FROM PUBLIC;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='se_control_runtime') THEN
  CREATE ROLE se_control_runtime NOLOGIN NOSUPERUSER NOBYPASSRLS;
 END IF;
END $$;
GRANT USAGE ON SCHEMA se_control_v1 TO se_control_runtime;
GRANT USAGE ON SCHEMA public, auth TO se_control_runtime;

CREATE TABLE se_control_v1.migrations(version integer PRIMARY KEY, checksum text NOT NULL);
CREATE TABLE se_control_v1.admin_users(user_id uuid PRIMARY KEY REFERENCES auth.users(id));
CREATE TABLE se_control_v1.sites(
 id uuid PRIMARY KEY, name text NOT NULL CHECK(length(name) BETWEEN 1 AND 120), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE se_control_v1.devices(
 id uuid PRIMARY KEY, site_id uuid NOT NULL REFERENCES se_control_v1.sites(id),
 name text NOT NULL CHECK(length(name) BETWEEN 1 AND 120),
 state text NOT NULL DEFAULT 'draft' CHECK(state='draft'), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(id,site_id));
CREATE TABLE se_control_v1.cameras(
 id uuid PRIMARY KEY, device_id uuid NOT NULL, site_id uuid NOT NULL,
 technical_id text NOT NULL UNIQUE CHECK(technical_id ~ '^[a-z0-9][a-z0-9-]{2,47}$'),
 mac text NOT NULL UNIQUE CHECK(mac ~ '^([0-9a-f]{2}:){5}[0-9a-f]{2}$'), ip_address inet NOT NULL,
 state text NOT NULL DEFAULT 'draft' CHECK(state='draft'),
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(device_id,site_id) REFERENCES se_control_v1.devices(id,site_id),
 UNIQUE(site_id,ip_address));
CREATE TABLE se_control_v1.bindings(
 id uuid PRIMARY KEY, camera_id uuid NOT NULL REFERENCES se_control_v1.cameras(id),
 horse_id uuid NOT NULL REFERENCES public.horses(id),
 starts_at timestamptz NOT NULL DEFAULT now(), ends_at timestamptz,
 CHECK(ends_at IS NULL OR ends_at>=starts_at));
CREATE UNIQUE INDEX binding_current_camera ON se_control_v1.bindings(camera_id) WHERE ends_at IS NULL;
CREATE UNIQUE INDEX binding_current_horse ON se_control_v1.bindings(horse_id) WHERE ends_at IS NULL;
CREATE TABLE se_control_v1.grants(
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES auth.users(id), horse_id uuid NOT NULL REFERENCES public.horses(id),
 photos boolean NOT NULL, live boolean NOT NULL, expires_at timestamptz,
 revoked_at timestamptz, revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 created_by uuid NOT NULL REFERENCES auth.users(id), updated_at timestamptz NOT NULL DEFAULT now(),
 reason text NOT NULL CHECK(length(reason) BETWEEN 1 AND 500), CHECK(photos OR live));
CREATE UNIQUE INDEX grant_current_user_horse ON se_control_v1.grants(user_id,horse_id) WHERE revoked_at IS NULL;
CREATE INDEX grants_horse ON se_control_v1.grants(horse_id,user_id);
CREATE TABLE se_control_v1.audit(
 id uuid PRIMARY KEY, actor_id uuid NOT NULL REFERENCES auth.users(id),
 operation text NOT NULL, entity_id uuid NOT NULL, details jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE se_control_v1.idempotency(
 actor_id uuid NOT NULL, key text NOT NULL, request_hash text NOT NULL, response jsonb,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(actor_id,key));
CREATE TABLE se_control_v1.release_guard(
 id integer PRIMARY KEY CHECK(id=1), production_authority_enabled boolean NOT NULL CHECK(NOT production_authority_enabled));
INSERT INTO se_control_v1.release_guard VALUES(1,false);

REVOKE ALL ON ALL TABLES IN SCHEMA se_control_v1 FROM PUBLIC;
GRANT SELECT ON se_control_v1.admin_users,se_control_v1.release_guard TO se_control_runtime;
GRANT SELECT,INSERT ON se_control_v1.sites,se_control_v1.devices,se_control_v1.cameras,se_control_v1.audit TO se_control_runtime;
GRANT SELECT,INSERT,UPDATE ON se_control_v1.bindings,se_control_v1.grants,se_control_v1.idempotency TO se_control_runtime;
-- No delete privileges. Historical grants/bindings and audit records are preserved.
ALTER TABLE se_control_v1.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE se_control_v1.admin_users FORCE ROW LEVEL SECURITY;
CREATE POLICY own_admin_membership ON se_control_v1.admin_users FOR SELECT TO se_control_runtime
 USING(user_id=nullif(current_setting('se_control.actor_id',true),'')::uuid);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['sites','devices','cameras','bindings','grants','audit','idempotency','release_guard'] LOOP
  EXECUTE format('ALTER TABLE se_control_v1.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE se_control_v1.%I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('CREATE POLICY admin_only ON se_control_v1.%I TO se_control_runtime USING '
   ||'(EXISTS(SELECT 1 FROM se_control_v1.admin_users WHERE user_id=nullif(current_setting(''se_control.actor_id'',true),'''')::uuid)) '
   ||'WITH CHECK(EXISTS(SELECT 1 FROM se_control_v1.admin_users WHERE user_id=nullif(current_setting(''se_control.actor_id'',true),'''')::uuid))',t);
 END LOOP;
END $$;
CREATE POLICY own_grant_read ON se_control_v1.grants FOR SELECT TO se_control_runtime
 USING(user_id=nullif(current_setting('se_control.actor_id',true),'')::uuid);
-- Viewer decisions expose only a boolean for an authorized horse, not device/network data.
-- Narrow, private catalog projection: the runtime cannot read or write public tables.
-- Definer privileges are needed to read the existing catalog without changing its RLS.
CREATE FUNCTION se_control_v1.operator_catalog() RETURNS jsonb LANGUAGE plpgsql
 SECURITY DEFINER SET search_path=pg_catalog AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM se_control_v1.admin_users
  WHERE user_id=nullif(current_setting('se_control.actor_id',true),'')::uuid) THEN
  RAISE EXCEPTION 'CONTROL_ADMIN_REQUIRED' USING ERRCODE='42501';
 END IF;
 RETURN jsonb_build_object(
  'horses',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'is_active',is_active) ORDER BY name),'[]'::jsonb) FROM public.horses),
  'users',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'email',email,'full_name',full_name,'is_active',is_active) ORDER BY full_name),'[]'::jsonb) FROM public.user_profiles));
 END $$;
CREATE FUNCTION se_control_v1.current_profile_active() RETURNS boolean LANGUAGE sql
 SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT EXISTS(SELECT 1 FROM public.user_profiles
  WHERE id=nullif(current_setting('se_control.actor_id',true),'')::uuid AND is_active=true) $$;
CREATE FUNCTION se_control_v1.current_resource_active(requested_horse uuid) RETURNS boolean LANGUAGE sql
 SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT EXISTS(SELECT 1 FROM public.horses WHERE id=requested_horse AND is_active=true) $$;
REVOKE ALL ON FUNCTION se_control_v1.operator_catalog(),se_control_v1.current_profile_active(),se_control_v1.current_resource_active(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION se_control_v1.operator_catalog(),se_control_v1.current_profile_active(),se_control_v1.current_resource_active(uuid) TO se_control_runtime;
