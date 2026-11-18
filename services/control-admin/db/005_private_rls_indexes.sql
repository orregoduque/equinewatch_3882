-- Apply advisor findings only to the new private control schema.
-- Policies retain admin/own-grant scope and reject inactive operators at database level.
ALTER POLICY own_admin_membership ON se_control_v1.admin_users
 USING(user_id=(SELECT nullif(current_setting('se_control.actor_id',true),'')::uuid));
DO $migration$
 DECLARE t text; gate text := $gate$
 (SELECT se_control_v1.current_profile_active()) AND
 (SELECT EXISTS(SELECT 1 FROM se_control_v1.admin_users
  WHERE user_id=(SELECT nullif(current_setting('se_control.actor_id',true),'')::uuid)))
 $gate$;
 BEGIN
 FOREACH t IN ARRAY ARRAY['sites','devices','cameras','bindings','audit','idempotency','release_guard',
  'inventory_observations','installation_plans','resource_claims','installation_runs','installation_steps','deployment_guard','user_requests'] LOOP
  EXECUTE format('ALTER POLICY admin_only ON se_control_v1.%I USING (%s) WITH CHECK (%s)',t,gate,gate);
 END LOOP;
 DROP POLICY admin_only ON se_control_v1.grants;
 DROP POLICY own_grant_read ON se_control_v1.grants;
 EXECUTE format('CREATE POLICY grants_read ON se_control_v1.grants FOR SELECT TO se_control_runtime USING '
  ||'((SELECT se_control_v1.current_profile_active()) AND '
  ||'(user_id=(SELECT nullif(current_setting(''se_control.actor_id'',true),'''')::uuid) OR (%s)))',gate);
 EXECUTE format('CREATE POLICY grants_insert ON se_control_v1.grants FOR INSERT TO se_control_runtime WITH CHECK (%s)',gate);
 EXECUTE format('CREATE POLICY grants_update ON se_control_v1.grants FOR UPDATE TO se_control_runtime USING (%s) WITH CHECK (%s)',gate,gate);
 END $migration$;
CREATE INDEX audit_actor_lookup ON se_control_v1.audit(actor_id,created_at,id);
CREATE INDEX camera_device_site_lookup ON se_control_v1.cameras(device_id,site_id,id);
DROP INDEX se_control_v1.camera_device_lookup;
CREATE INDEX grant_creator_lookup ON se_control_v1.grants(created_by,id);
CREATE INDEX plan_creator_lookup ON se_control_v1.installation_plans(created_by,id);
CREATE INDEX run_creator_lookup ON se_control_v1.installation_runs(created_by,id);
CREATE INDEX observation_creator_lookup ON se_control_v1.inventory_observations(created_by,id);
DROP INDEX se_control_v1.installation_run_plan;
CREATE INDEX installation_run_plan ON se_control_v1.installation_runs(plan_id,created_at DESC,id DESC);
