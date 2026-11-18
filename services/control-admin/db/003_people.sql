-- Private, additive administration objects. No production catalog DDL.
CREATE TABLE se_control_v1.deployment_guard (
 id integer PRIMARY KEY CHECK(id=1), environment text NOT NULL CHECK(environment IN ('demo','staging')),
 project_ref text, people_enabled boolean NOT NULL DEFAULT false,
 CHECK(environment<>'staging' OR project_ref ~ '^[a-z]{20}$'));
CREATE TABLE se_control_v1.user_requests (
 id uuid PRIMARY KEY, email text NOT NULL UNIQUE CHECK(email=lower(btrim(email))),
 full_name text NOT NULL CHECK(length(full_name) BETWEEN 1 AND 120),
 state text NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','processing','reconcile','ready','existing_review','failed')),
 auth_user_id uuid REFERENCES auth.users(id), attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 3),
 lease_token uuid, lease_until timestamptz, error_category text,
 created_by uuid NOT NULL REFERENCES auth.users(id), created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK((state='processing' AND lease_token IS NOT NULL AND lease_until IS NOT NULL)
 OR(state<>'processing' AND lease_token IS NULL AND lease_until IS NULL)));
CREATE INDEX user_requests_creator ON se_control_v1.user_requests(created_by,id);
CREATE INDEX user_requests_auth ON se_control_v1.user_requests(auth_user_id);
REVOKE ALL ON se_control_v1.deployment_guard,se_control_v1.user_requests FROM PUBLIC;
GRANT SELECT ON se_control_v1.deployment_guard TO se_control_runtime;
GRANT SELECT ON se_control_v1.migrations TO se_control_runtime;
GRANT SELECT,INSERT,UPDATE ON se_control_v1.user_requests TO se_control_runtime;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['deployment_guard','user_requests'] LOOP
  EXECUTE format('ALTER TABLE se_control_v1.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE se_control_v1.%I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('CREATE POLICY admin_only ON se_control_v1.%I TO se_control_runtime USING '
   ||'(EXISTS(SELECT 1 FROM se_control_v1.admin_users WHERE user_id=nullif(current_setting(''se_control.actor_id'',true),'''')::uuid)) '
   ||'WITH CHECK(EXISTS(SELECT 1 FROM se_control_v1.admin_users WHERE user_id=nullif(current_setting(''se_control.actor_id'',true),'''')::uuid))',t);
 END LOOP;
END $$;

-- Only known new request accounts may be repaired; existing profiles are never overwritten.
CREATE FUNCTION se_control_v1.inspect_account(requested_email text) RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM se_control_v1.admin_users WHERE user_id=nullif(current_setting('se_control.actor_id',true),'')::uuid)
  OR NOT se_control_v1.current_profile_active() THEN RAISE EXCEPTION 'CONTROL_ADMIN_REQUIRED' USING ERRCODE='42501'; END IF;
 RETURN (SELECT jsonb_build_object('id',u.id,'email',u.email,
  'request_id',u.raw_app_meta_data->>'control_request_id','profile_exists',p.id IS NOT NULL,
  'full_name',p.full_name,'is_active',p.is_active)
  FROM auth.users u LEFT JOIN public.user_profiles p ON p.id=u.id
  WHERE lower(u.email)=lower(btrim(requested_email)) LIMIT 1);
 END $$;
CREATE FUNCTION se_control_v1.finish_new_profile(request_id uuid, claimed_token uuid, expected_user uuid) RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$ DECLARE r se_control_v1.user_requests; result jsonb; BEGIN
 IF NOT EXISTS(SELECT 1 FROM se_control_v1.admin_users WHERE user_id=nullif(current_setting('se_control.actor_id',true),'')::uuid)
  OR NOT se_control_v1.current_profile_active() THEN RAISE EXCEPTION 'CONTROL_ADMIN_REQUIRED' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM se_control_v1.deployment_guard WHERE id=1 AND people_enabled=true) THEN
  RAISE EXCEPTION 'PEOPLE_DISABLED' USING ERRCODE='42501'; END IF;
 SELECT * INTO r FROM se_control_v1.user_requests WHERE id=request_id AND state='processing'
  AND lease_token=claimed_token AND lease_until>now() FOR UPDATE;
 IF r.id IS NULL THEN RAISE EXCEPTION 'LEASE_LOST' USING ERRCODE='40001'; END IF;
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=expected_user AND lower(email)=r.email
  AND raw_app_meta_data->>'control_request_id'=r.id::text) THEN
  RAISE EXCEPTION 'ACCOUNT_IDENTITY_MISMATCH' USING ERRCODE='42501'; END IF;
 INSERT INTO public.user_profiles(id,email,full_name,role,is_active)
  VALUES(expected_user,r.email,r.full_name,'owner',true) ON CONFLICT(id) DO NOTHING;
 IF NOT EXISTS(SELECT 1 FROM public.user_profiles WHERE id=expected_user AND lower(email)=r.email
  AND role='owner' AND is_active=true) THEN RAISE EXCEPTION 'PROFILE_REVIEW_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT jsonb_build_object('id',id,'email',email,'full_name',full_name,'is_active',is_active) INTO result
  FROM public.user_profiles WHERE id=expected_user;
 RETURN result;
 END $$;
CREATE FUNCTION se_control_v1.create_catalog_horse(new_id uuid, horse_name text, requested_stall text, requested_owner uuid) RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$ DECLARE result jsonb; BEGIN
 IF NOT EXISTS(SELECT 1 FROM se_control_v1.admin_users WHERE user_id=nullif(current_setting('se_control.actor_id',true),'')::uuid)
  OR NOT se_control_v1.current_profile_active() THEN RAISE EXCEPTION 'CONTROL_ADMIN_REQUIRED' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM se_control_v1.deployment_guard WHERE id=1 AND people_enabled=true) THEN
  RAISE EXCEPTION 'PEOPLE_DISABLED' USING ERRCODE='42501'; END IF;
 IF length(btrim(horse_name)) NOT BETWEEN 1 AND 120 OR length(btrim(requested_stall)) NOT BETWEEN 1 AND 120
  OR NOT EXISTS(SELECT 1 FROM public.user_profiles WHERE id=requested_owner AND is_active=true) THEN
  RAISE EXCEPTION 'INVALID_HORSE_IDENTITY' USING ERRCODE='22023'; END IF;
 INSERT INTO public.horses(id,name,stall_number,owner_id,is_active,photo_backend)
  VALUES(new_id,btrim(horse_name),btrim(requested_stall),requested_owner,true,'supabase');
 SELECT jsonb_build_object('id',id,'name',name,'stall_number',stall_number,'owner_id',owner_id,
  'is_active',is_active,'photo_backend',photo_backend,'installation_required',true) INTO result
  FROM public.horses WHERE id=new_id;
 RETURN result;
 END $$;
REVOKE ALL ON FUNCTION se_control_v1.inspect_account(text),se_control_v1.finish_new_profile(uuid,uuid,uuid),se_control_v1.create_catalog_horse(uuid,text,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION se_control_v1.inspect_account(text),se_control_v1.finish_new_profile(uuid,uuid,uuid),se_control_v1.create_catalog_horse(uuid,text,text,uuid) TO se_control_runtime;
CREATE FUNCTION se_control_v1.current_auth_session_active(requested_session uuid) RETURNS boolean
 LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT EXISTS(SELECT 1 FROM auth.sessions WHERE id=requested_session
  AND user_id=nullif(current_setting('se_control.actor_id',true),'')::uuid AND (not_after IS NULL OR not_after>now())) $$;
REVOKE ALL ON FUNCTION se_control_v1.current_auth_session_active(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION se_control_v1.current_auth_session_active(uuid) TO se_control_runtime;
CREATE FUNCTION se_control_v1.deployment_info() RETURNS jsonb LANGUAGE sql
 SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT jsonb_build_object('environment',environment,'project_ref',project_ref,'people_enabled',people_enabled)
 FROM se_control_v1.deployment_guard WHERE id=1 $$;
REVOKE ALL ON FUNCTION se_control_v1.deployment_info() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION se_control_v1.deployment_info() TO se_control_runtime;
