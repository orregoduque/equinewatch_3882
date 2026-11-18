-- Complementary organization registry. No automatic adoption of existing resources.
-- Actor context is set by the trusted BFF, never by a browser/database API client.
CREATE TABLE se_control_v1.organizations(
 id uuid PRIMARY KEY, name text NOT NULL CHECK(length(btrim(name)) BETWEEN 1 AND 120),
 state text NOT NULL DEFAULT 'active' CHECK(state IN('active','suspended')),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 created_by uuid NOT NULL REFERENCES auth.users(id), created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX organizations_creator ON se_control_v1.organizations(created_by);
CREATE TABLE se_control_v1.organization_sites(
 site_id uuid PRIMARY KEY REFERENCES se_control_v1.sites(id),
 organization_id uuid NOT NULL REFERENCES se_control_v1.organizations(id),
 UNIQUE(organization_id,site_id));
CREATE TABLE se_control_v1.organization_memberships(
 id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES se_control_v1.organizations(id),
 user_id uuid NOT NULL REFERENCES auth.users(id),
 role text NOT NULL CHECK(role IN('org_admin','installer','viewer')),
 site_id uuid, active boolean NOT NULL DEFAULT true,
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 CHECK(role<>'org_admin' OR site_id IS NULL),
 FOREIGN KEY(organization_id,site_id) REFERENCES se_control_v1.organization_sites(organization_id,site_id),
 UNIQUE(organization_id,user_id));
CREATE INDEX organization_memberships_user ON se_control_v1.organization_memberships(user_id,organization_id) WHERE active;
CREATE INDEX organization_memberships_site ON se_control_v1.organization_memberships(organization_id,site_id);
CREATE TABLE se_control_v1.organization_horses(
 horse_id uuid PRIMARY KEY REFERENCES public.horses(id), organization_id uuid NOT NULL,
 site_id uuid NOT NULL,
 FOREIGN KEY(organization_id,site_id) REFERENCES se_control_v1.organization_sites(organization_id,site_id));
CREATE INDEX organization_horses_site ON se_control_v1.organization_horses(organization_id,site_id,horse_id);
CREATE TABLE se_control_v1.organization_events(
 id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES se_control_v1.organizations(id),
 site_id uuid, actor_id uuid NOT NULL REFERENCES auth.users(id), operation text NOT NULL,
 entity_id uuid NOT NULL, details jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(organization_id,site_id) REFERENCES se_control_v1.organization_sites(organization_id,site_id));
CREATE INDEX organization_events_page ON se_control_v1.organization_events(organization_id,id);
CREATE INDEX organization_events_site ON se_control_v1.organization_events(organization_id,site_id);
CREATE INDEX organization_events_actor ON se_control_v1.organization_events(actor_id);
CREATE TABLE se_control_v1.organization_idempotency(
 organization_id uuid NOT NULL REFERENCES se_control_v1.organizations(id), actor_id uuid NOT NULL REFERENCES auth.users(id),
 key text NOT NULL, request_hash text NOT NULL, response jsonb,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(organization_id,actor_id,key));
CREATE INDEX organization_idempotency_actor ON se_control_v1.organization_idempotency(actor_id);

-- Private lookup functions avoid recursive membership policies. They return only scope/booleans.
CREATE FUNCTION se_control_v1.control_admin_active() RETURNS boolean LANGUAGE sql STABLE
 SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT se_control_v1.current_profile_active() AND EXISTS(SELECT 1 FROM se_control_v1.admin_users
  WHERE user_id=nullif((SELECT current_setting('se_control.actor_id',true)),'')::uuid) $$;
CREATE FUNCTION se_control_v1.organization_role(requested_org uuid) RETURNS text LANGUAGE sql STABLE
 SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT CASE WHEN se_control_v1.control_admin_active() THEN 'control_admin'
  ELSE (SELECT m.role FROM se_control_v1.organization_memberships m
   WHERE m.organization_id=o.id AND m.user_id=nullif((SELECT current_setting('se_control.actor_id',true)),'')::uuid AND m.active) END
 FROM se_control_v1.organizations o WHERE o.id=requested_org AND o.state='active'
  AND se_control_v1.current_profile_active() $$;
CREATE FUNCTION se_control_v1.organization_site_allowed(requested_org uuid, requested_site uuid) RETURNS boolean LANGUAGE sql STABLE
 SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT se_control_v1.organization_role(requested_org) IS NOT NULL AND
  (se_control_v1.control_admin_active() OR EXISTS(SELECT 1 FROM se_control_v1.organization_memberships m
   WHERE m.organization_id=requested_org AND m.user_id=nullif((SELECT current_setting('se_control.actor_id',true)),'')::uuid
    AND m.active AND (m.site_id IS NULL OR m.site_id=requested_site))) $$;
CREATE FUNCTION se_control_v1.scoped_site_allowed(requested_site uuid) RETURNS boolean LANGUAGE sql STABLE
 SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT EXISTS(SELECT 1 FROM se_control_v1.organization_sites s WHERE s.site_id=requested_site
  AND se_control_v1.organization_site_allowed(s.organization_id,s.site_id)) $$;
CREATE FUNCTION se_control_v1.panel_member_active() RETURNS boolean LANGUAGE sql STABLE
 SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT se_control_v1.control_admin_active() OR (se_control_v1.current_profile_active() AND EXISTS(
  SELECT 1 FROM se_control_v1.organization_memberships m JOIN se_control_v1.organizations o ON o.id=m.organization_id
  WHERE m.user_id=nullif((SELECT current_setting('se_control.actor_id',true)),'')::uuid AND m.active AND o.state='active')) $$;

REVOKE ALL ON FUNCTION se_control_v1.control_admin_active(),se_control_v1.organization_role(uuid),
 se_control_v1.organization_site_allowed(uuid,uuid),se_control_v1.scoped_site_allowed(uuid),se_control_v1.panel_member_active() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION se_control_v1.control_admin_active(),se_control_v1.organization_role(uuid),
 se_control_v1.organization_site_allowed(uuid,uuid),se_control_v1.scoped_site_allowed(uuid),se_control_v1.panel_member_active() TO se_control_runtime;

DO $migration$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['organizations','organization_sites','organization_memberships','organization_horses','organization_events','organization_idempotency'] LOOP
  EXECUTE format('ALTER TABLE se_control_v1.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE se_control_v1.%I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON se_control_v1.%I FROM PUBLIC',t);
 END LOOP;
 END $migration$;
GRANT SELECT,INSERT,UPDATE ON se_control_v1.organizations,se_control_v1.organization_memberships TO se_control_runtime;
GRANT SELECT,INSERT ON se_control_v1.organization_sites,se_control_v1.organization_horses,se_control_v1.organization_events TO se_control_runtime;
GRANT SELECT,INSERT,UPDATE ON se_control_v1.organization_idempotency TO se_control_runtime;

CREATE POLICY organizations_read ON se_control_v1.organizations FOR SELECT TO se_control_runtime
 USING((SELECT se_control_v1.control_admin_active()) OR se_control_v1.organization_role(id) IS NOT NULL);
CREATE POLICY organizations_insert ON se_control_v1.organizations FOR INSERT TO se_control_runtime
 WITH CHECK((SELECT se_control_v1.control_admin_active()));
CREATE POLICY organizations_update ON se_control_v1.organizations FOR UPDATE TO se_control_runtime
 USING((SELECT se_control_v1.control_admin_active())) WITH CHECK((SELECT se_control_v1.control_admin_active()));
CREATE POLICY memberships_read ON se_control_v1.organization_memberships FOR SELECT TO se_control_runtime
 USING((SELECT se_control_v1.control_admin_active()) OR (user_id=nullif((SELECT current_setting('se_control.actor_id',true)),'')::uuid
  AND se_control_v1.organization_role(organization_id) IS NOT NULL));
CREATE POLICY memberships_insert ON se_control_v1.organization_memberships FOR INSERT TO se_control_runtime
 WITH CHECK((SELECT se_control_v1.control_admin_active()));
CREATE POLICY memberships_update ON se_control_v1.organization_memberships FOR UPDATE TO se_control_runtime
 USING((SELECT se_control_v1.control_admin_active())) WITH CHECK((SELECT se_control_v1.control_admin_active()));
CREATE POLICY organization_sites_read ON se_control_v1.organization_sites FOR SELECT TO se_control_runtime
 USING((SELECT se_control_v1.control_admin_active()) OR se_control_v1.organization_site_allowed(organization_id,site_id));
CREATE POLICY organization_sites_insert ON se_control_v1.organization_sites FOR INSERT TO se_control_runtime
 WITH CHECK((SELECT se_control_v1.control_admin_active()));
CREATE POLICY organization_horses_read ON se_control_v1.organization_horses FOR SELECT TO se_control_runtime
 USING((SELECT se_control_v1.control_admin_active()) OR se_control_v1.organization_site_allowed(organization_id,site_id));
CREATE POLICY organization_horses_insert ON se_control_v1.organization_horses FOR INSERT TO se_control_runtime
 WITH CHECK((SELECT se_control_v1.control_admin_active()));
CREATE POLICY organization_events_read ON se_control_v1.organization_events FOR SELECT TO se_control_runtime
 USING((SELECT se_control_v1.control_admin_active()) OR se_control_v1.organization_site_allowed(organization_id,site_id));
CREATE POLICY organization_events_insert ON se_control_v1.organization_events FOR INSERT TO se_control_runtime
 WITH CHECK(actor_id=nullif((SELECT current_setting('se_control.actor_id',true)),'')::uuid
  AND se_control_v1.organization_role(organization_id) IN('control_admin','org_admin','installer')
  AND se_control_v1.organization_site_allowed(organization_id,site_id));
CREATE POLICY organization_idempotency_own ON se_control_v1.organization_idempotency TO se_control_runtime
 USING(actor_id=nullif((SELECT current_setting('se_control.actor_id',true)),'')::uuid
  AND se_control_v1.organization_role(organization_id) IN('control_admin','org_admin','installer'))
 WITH CHECK(actor_id=nullif((SELECT current_setting('se_control.actor_id',true)),'')::uuid
  AND se_control_v1.organization_role(organization_id) IN('control_admin','org_admin','installer'));

-- Only SELECT is added to existing inventory. Old global write policies stay intact.
-- Combine reads into one policy per table; preserve central-only inserts.
DROP POLICY admin_only ON se_control_v1.sites;
DROP POLICY admin_only ON se_control_v1.devices;
DROP POLICY admin_only ON se_control_v1.cameras;
CREATE POLICY inventory_read ON se_control_v1.sites FOR SELECT TO se_control_runtime
 USING((SELECT se_control_v1.control_admin_active()) OR se_control_v1.scoped_site_allowed(id));
CREATE POLICY inventory_read ON se_control_v1.devices FOR SELECT TO se_control_runtime
 USING((SELECT se_control_v1.control_admin_active()) OR se_control_v1.scoped_site_allowed(site_id));
CREATE POLICY inventory_read ON se_control_v1.cameras FOR SELECT TO se_control_runtime
 USING((SELECT se_control_v1.control_admin_active()) OR se_control_v1.scoped_site_allowed(site_id));
CREATE POLICY inventory_insert ON se_control_v1.sites FOR INSERT TO se_control_runtime WITH CHECK((SELECT se_control_v1.control_admin_active()));
CREATE POLICY inventory_insert ON se_control_v1.devices FOR INSERT TO se_control_runtime WITH CHECK((SELECT se_control_v1.control_admin_active()));
CREATE POLICY inventory_insert ON se_control_v1.cameras FOR INSERT TO se_control_runtime WITH CHECK((SELECT se_control_v1.control_admin_active()));

-- Narrow definer projection: never returns owners, email, credentials, media URLs or unassigned horses.
CREATE FUNCTION se_control_v1.organization_horse_page(requested_org uuid, after_id uuid, page_size integer, search_text text) RETURNS jsonb
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$ BEGIN
 IF se_control_v1.organization_role(requested_org) IS NULL THEN RAISE EXCEPTION 'ORG_REQUIRED' USING ERRCODE='42501'; END IF;
 IF page_size IS NULL OR page_size NOT BETWEEN 1 AND 100 OR search_text IS NULL OR length(search_text)>120 THEN
  RAISE EXCEPTION 'INVALID_PAGE' USING ERRCODE='22023'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(to_jsonb(page) ORDER BY id),'[]'::jsonb) FROM (
  SELECT h.id,h.name,h.is_active,m.site_id FROM public.horses h JOIN se_control_v1.organization_horses m ON m.horse_id=h.id
  WHERE m.organization_id=requested_org AND se_control_v1.organization_site_allowed(requested_org,m.site_id)
   AND (after_id IS NULL OR h.id>after_id) AND strpos(lower(h.name),lower(search_text))>0 ORDER BY h.id LIMIT page_size) page);
 END $$;

-- Delegates can create only a NEW site. Existing inventory is never adopted or reparented.
CREATE FUNCTION se_control_v1.create_organization_site(requested_org uuid, new_site uuid, site_name text) RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$ DECLARE role_name text; member_site uuid; BEGIN
 PERFORM 1 FROM se_control_v1.organizations WHERE id=requested_org FOR SHARE;
 role_name := se_control_v1.organization_role(requested_org);
 IF role_name IS NULL OR role_name='viewer' THEN RAISE EXCEPTION 'ORG_WRITE_REQUIRED' USING ERRCODE='42501'; END IF;
 IF role_name<>'control_admin' THEN
  SELECT site_id,role INTO member_site,role_name FROM se_control_v1.organization_memberships
   WHERE organization_id=requested_org AND user_id=nullif(current_setting('se_control.actor_id',true),'')::uuid AND active FOR SHARE;
  IF NOT FOUND OR member_site IS NOT NULL OR role_name NOT IN('org_admin','installer') THEN RAISE EXCEPTION 'ORG_SCOPE_REQUIRED' USING ERRCODE='42501'; END IF;
 END IF;
 IF site_name IS NULL OR length(btrim(site_name)) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'INVALID_NAME' USING ERRCODE='22023'; END IF;
 INSERT INTO se_control_v1.sites(id,name) VALUES(new_site,btrim(site_name));
 INSERT INTO se_control_v1.organization_sites(site_id,organization_id) VALUES(new_site,requested_org);
 RETURN jsonb_build_object('id',new_site,'name',btrim(site_name),'organization_id',requested_org);
 END $$;
REVOKE ALL ON FUNCTION se_control_v1.organization_horse_page(uuid,uuid,integer,text),se_control_v1.create_organization_site(uuid,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION se_control_v1.organization_horse_page(uuid,uuid,integer,text),se_control_v1.create_organization_site(uuid,uuid,text) TO se_control_runtime;
