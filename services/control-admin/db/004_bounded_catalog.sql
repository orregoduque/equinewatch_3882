-- Narrow administrative reads; no changes to the existing public schema.
CREATE FUNCTION se_control_v1.operator_identity_active(requested_kind text, requested_id uuid) RETURNS boolean
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM se_control_v1.admin_users WHERE user_id=nullif(current_setting('se_control.actor_id',true),'')::uuid)
  OR NOT se_control_v1.current_profile_active() THEN RAISE EXCEPTION 'CONTROL_ADMIN_REQUIRED' USING ERRCODE='42501'; END IF;
 IF requested_kind='users' THEN RETURN EXISTS(SELECT 1 FROM public.user_profiles WHERE id=requested_id AND is_active=true);
 ELSIF requested_kind='horses' THEN RETURN EXISTS(SELECT 1 FROM public.horses WHERE id=requested_id AND is_active=true);
 ELSE RAISE EXCEPTION 'INVALID_KIND' USING ERRCODE='22023'; END IF;
 END $$;
CREATE FUNCTION se_control_v1.operator_catalog_counts() RETURNS jsonb LANGUAGE plpgsql
 SECURITY DEFINER SET search_path=pg_catalog AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM se_control_v1.admin_users WHERE user_id=nullif(current_setting('se_control.actor_id',true),'')::uuid)
  OR NOT se_control_v1.current_profile_active() THEN RAISE EXCEPTION 'CONTROL_ADMIN_REQUIRED' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object('horses',(SELECT count(*) FROM public.horses),'users',(SELECT count(*) FROM public.user_profiles),
 'cameras',(SELECT count(*) FROM se_control_v1.cameras),
 'current_grants',(SELECT count(*) FROM se_control_v1.grants WHERE revoked_at IS NULL AND(expires_at IS NULL OR expires_at>now())));
 END $$;
REVOKE ALL ON FUNCTION se_control_v1.operator_identity_active(text,uuid),se_control_v1.operator_catalog_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION se_control_v1.operator_identity_active(text,uuid),se_control_v1.operator_catalog_counts() TO se_control_runtime;
