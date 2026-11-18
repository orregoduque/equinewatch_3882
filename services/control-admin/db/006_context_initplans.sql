-- Keep the scalar SELECT directly around current_setting so the planner/linter
-- recognizes its one-time evaluation, rather than wrapping nullif and its cast.
ALTER POLICY own_admin_membership ON se_control_v1.admin_users
 USING(user_id=nullif((SELECT current_setting('se_control.actor_id',true)),'')::uuid);
DO $migration$
 DECLARE t text; gate text := $gate$
 (SELECT se_control_v1.current_profile_active()) AND
 (SELECT EXISTS(SELECT 1 FROM se_control_v1.admin_users
  WHERE user_id=nullif((SELECT current_setting('se_control.actor_id',true)),'')::uuid))
 $gate$;
 BEGIN
 FOREACH t IN ARRAY ARRAY['sites','devices','cameras','bindings','audit','idempotency','release_guard',
  'inventory_observations','installation_plans','resource_claims','installation_runs','installation_steps','deployment_guard','user_requests'] LOOP
  EXECUTE format('ALTER POLICY admin_only ON se_control_v1.%I USING (%s) WITH CHECK (%s)',t,gate,gate);
 END LOOP;
 EXECUTE format('ALTER POLICY grants_read ON se_control_v1.grants USING '
  ||'((SELECT se_control_v1.current_profile_active()) AND '
  ||'(user_id=nullif((SELECT current_setting(''se_control.actor_id'',true)),'''')::uuid OR (%s)))',gate);
 EXECUTE format('ALTER POLICY grants_insert ON se_control_v1.grants WITH CHECK (%s)',gate);
 EXECUTE format('ALTER POLICY grants_update ON se_control_v1.grants USING (%s) WITH CHECK (%s)',gate,gate);
 END $migration$;
