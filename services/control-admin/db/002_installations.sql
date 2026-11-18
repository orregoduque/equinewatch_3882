-- Additive, isolated migration. Does not import or change any production resource.
CREATE TABLE se_control_v1.inventory_observations (
 id uuid PRIMARY KEY, source text NOT NULL CHECK(length(source) BETWEEN 1 AND 120),
 fingerprint text NOT NULL UNIQUE CHECK(length(fingerprint)=64),
 entries jsonb NOT NULL CHECK(jsonb_typeof(entries)='array'),
 created_by uuid NOT NULL REFERENCES auth.users(id), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE se_control_v1.installation_plans (
 id uuid PRIMARY KEY, camera_id uuid NOT NULL UNIQUE REFERENCES se_control_v1.cameras(id),
 spec jsonb NOT NULL, spec_hash text NOT NULL CHECK(length(spec_hash)=64),
 created_by uuid NOT NULL REFERENCES auth.users(id), created_at timestamptz NOT NULL DEFAULT now(),
 executable boolean NOT NULL DEFAULT false CHECK(NOT executable));
CREATE TABLE se_control_v1.resource_claims (
 kind text NOT NULL CHECK(kind IN ('camera_id','mac','ip','horse','node')),
 scope uuid NOT NULL, value text NOT NULL,
 observation_id uuid REFERENCES se_control_v1.inventory_observations(id),
 plan_id uuid REFERENCES se_control_v1.installation_plans(id),
 PRIMARY KEY(kind,scope,value), CHECK(num_nonnulls(observation_id,plan_id)=1));
CREATE INDEX resource_claims_plan ON se_control_v1.resource_claims(plan_id);
CREATE INDEX resource_claims_observation ON se_control_v1.resource_claims(observation_id);
CREATE TABLE se_control_v1.installation_runs (
 id uuid PRIMARY KEY, plan_id uuid NOT NULL REFERENCES se_control_v1.installation_plans(id),
 mode text NOT NULL DEFAULT 'simulation' CHECK(mode='simulation'),
 state text NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','running','retry_wait','simulated','failed','cancelled')),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 3),
 total_claims integer NOT NULL DEFAULT 0, lease_token uuid, lease_until timestamptz,
 next_attempt_at timestamptz NOT NULL DEFAULT now(), last_error text,
 created_by uuid NOT NULL REFERENCES auth.users(id), created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK((state='running' AND lease_token IS NOT NULL AND lease_until IS NOT NULL)
    OR (state<>'running' AND lease_token IS NULL AND lease_until IS NULL)));
CREATE UNIQUE INDEX installation_one_active_run ON se_control_v1.installation_runs(plan_id)
 WHERE state IN ('queued','running','retry_wait');
CREATE INDEX installation_run_queue ON se_control_v1.installation_runs(next_attempt_at,id)
 WHERE state IN ('queued','running','retry_wait');
CREATE INDEX installation_run_plan ON se_control_v1.installation_runs(plan_id,id);
CREATE INDEX device_site_lookup ON se_control_v1.devices(site_id,id);
CREATE INDEX camera_device_lookup ON se_control_v1.cameras(device_id,id);
CREATE INDEX binding_history_lookup ON se_control_v1.bindings(horse_id,starts_at);
CREATE INDEX audit_timeline_lookup ON se_control_v1.audit(created_at DESC,id);
CREATE TABLE se_control_v1.installation_steps (
 run_id uuid NOT NULL REFERENCES se_control_v1.installation_runs(id),
 ordinal integer NOT NULL CHECK(ordinal BETWEEN 1 AND 20), step_key text NOT NULL,
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','simulated')),
 evidence jsonb, PRIMARY KEY(run_id,ordinal), UNIQUE(run_id,step_key));
REVOKE ALL ON ALL TABLES IN SCHEMA se_control_v1 FROM PUBLIC;
GRANT SELECT,INSERT ON se_control_v1.inventory_observations,se_control_v1.installation_plans,se_control_v1.resource_claims TO se_control_runtime;
GRANT SELECT,INSERT,UPDATE ON se_control_v1.installation_runs,se_control_v1.installation_steps TO se_control_runtime;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['inventory_observations','installation_plans','resource_claims','installation_runs','installation_steps'] LOOP
  EXECUTE format('ALTER TABLE se_control_v1.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE se_control_v1.%I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('CREATE POLICY admin_only ON se_control_v1.%I TO se_control_runtime USING '
   ||'(EXISTS(SELECT 1 FROM se_control_v1.admin_users WHERE user_id=nullif(current_setting(''se_control.actor_id'',true),'''')::uuid)) '
   ||'WITH CHECK(EXISTS(SELECT 1 FROM se_control_v1.admin_users WHERE user_id=nullif(current_setting(''se_control.actor_id'',true),'''')::uuid))',t);
 END LOOP;
END $$;

-- Narrow catalog pagination; no write privileges on existing public/auth tables.
CREATE FUNCTION se_control_v1.operator_catalog_page(requested_kind text, after_id uuid, page_size integer, search_text text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM se_control_v1.admin_users
  WHERE user_id=nullif(current_setting('se_control.actor_id',true),'')::uuid) THEN
  RAISE EXCEPTION 'CONTROL_ADMIN_REQUIRED' USING ERRCODE='42501';
 END IF;
 IF page_size<1 OR page_size>101 OR length(search_text)>120 OR requested_kind NOT IN ('horses','users') THEN
  RAISE EXCEPTION 'INVALID_CATALOG_PAGE' USING ERRCODE='22023';
 END IF;
 IF requested_kind='horses' THEN
  RETURN (SELECT coalesce(jsonb_agg(row_to_json(p) ORDER BY p.id),'[]'::jsonb) FROM
   (SELECT id,name,is_active FROM public.horses WHERE (after_id IS NULL OR id>after_id)
    AND (search_text='' OR strpos(lower(name),lower(search_text))>0) ORDER BY id LIMIT page_size) p);
 ELSE
  RETURN (SELECT coalesce(jsonb_agg(row_to_json(p) ORDER BY p.id),'[]'::jsonb) FROM
   (SELECT id,email,full_name,is_active FROM public.user_profiles WHERE (after_id IS NULL OR id>after_id)
    AND (search_text='' OR strpos(lower(full_name),lower(search_text))>0 OR strpos(lower(email),lower(search_text))>0)
    ORDER BY id LIMIT page_size) p);
 END IF;
 END $$;
REVOKE ALL ON FUNCTION se_control_v1.operator_catalog_page(text,uuid,integer,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION se_control_v1.operator_catalog_page(text,uuid,integer,text) TO se_control_runtime;
