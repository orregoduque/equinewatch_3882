-- Isolated control-panel onboarding. Never changes current media permissions or destinations.
CREATE TABLE se_control_v1.organization_owners(
 id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES se_control_v1.organizations(id),
 user_id uuid NOT NULL REFERENCES public.user_profiles(id), site_id uuid,
 active boolean NOT NULL DEFAULT true, revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 created_by uuid NOT NULL REFERENCES auth.users(id), created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(organization_id,site_id) REFERENCES se_control_v1.organization_sites(organization_id,site_id),
 UNIQUE(organization_id,user_id));
CREATE INDEX organization_owners_user ON se_control_v1.organization_owners(user_id);
CREATE INDEX organization_owners_site ON se_control_v1.organization_owners(organization_id,site_id);
CREATE INDEX organization_owners_creator ON se_control_v1.organization_owners(created_by);
CREATE TABLE se_control_v1.organization_horse_limits(
 organization_id uuid PRIMARY KEY REFERENCES se_control_v1.organizations(id),
 horse_limit integer NOT NULL DEFAULT 100 CHECK(horse_limit BETWEEN 0 AND 100000),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0));
INSERT INTO se_control_v1.organization_horse_limits(organization_id,horse_limit)
 SELECT o.id,greatest(100,count(h.horse_id)) FROM se_control_v1.organizations o
 LEFT JOIN se_control_v1.organization_horses h ON h.organization_id=o.id GROUP BY o.id;

DO $migration$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['organization_owners','organization_horse_limits'] LOOP
  EXECUTE format('ALTER TABLE se_control_v1.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE se_control_v1.%I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON se_control_v1.%I FROM PUBLIC',t);
  EXECUTE format('CREATE POLICY manager_read ON se_control_v1.%I FOR SELECT TO se_control_runtime USING '
   ||'((SELECT se_control_v1.control_admin_active()) OR se_control_v1.organization_role(organization_id)=''org_admin'')',t);
 END LOOP;
 END $migration$;
GRANT SELECT,INSERT,UPDATE ON se_control_v1.organization_owners TO se_control_runtime;
GRANT SELECT ON se_control_v1.organization_horse_limits TO se_control_runtime;
CREATE POLICY owners_insert ON se_control_v1.organization_owners FOR INSERT TO se_control_runtime
 WITH CHECK((SELECT se_control_v1.control_admin_active()));
CREATE POLICY owners_update ON se_control_v1.organization_owners FOR UPDATE TO se_control_runtime
 USING((SELECT se_control_v1.control_admin_active())) WITH CHECK((SELECT se_control_v1.control_admin_active()));

-- Trigger functions are private and cannot be invoked as an HTTP/database API.
CREATE FUNCTION se_control_v1.seed_organization_horse_limit() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$ BEGIN
 INSERT INTO se_control_v1.organization_horse_limits(organization_id) VALUES(NEW.id);
 RETURN NEW;
 END $$;
REVOKE ALL ON FUNCTION se_control_v1.seed_organization_horse_limit() FROM PUBLIC;
CREATE TRIGGER seed_horse_limit AFTER INSERT ON se_control_v1.organizations
 FOR EACH ROW EXECUTE FUNCTION se_control_v1.seed_organization_horse_limit();
CREATE FUNCTION se_control_v1.check_organization_horse_limit() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$ DECLARE maximum integer; used_count bigint; BEGIN
 -- All insert paths (including central assignment) serialize against limit updates.
 PERFORM 1 FROM se_control_v1.organizations WHERE id=NEW.organization_id FOR UPDATE;
 SELECT horse_limit INTO maximum FROM se_control_v1.organization_horse_limits WHERE organization_id=NEW.organization_id;
 SELECT count(*) INTO used_count FROM se_control_v1.organization_horses WHERE organization_id=NEW.organization_id;
 IF maximum IS NULL OR used_count>=maximum THEN RAISE EXCEPTION 'CONTROL_HORSE_QUOTA_REACHED' USING ERRCODE='PSE01'; END IF;
 RETURN NEW;
 END $$;
REVOKE ALL ON FUNCTION se_control_v1.check_organization_horse_limit() FROM PUBLIC;
CREATE TRIGGER check_horse_limit BEFORE INSERT ON se_control_v1.organization_horses
 FOR EACH ROW EXECUTE FUNCTION se_control_v1.check_organization_horse_limit();

CREATE FUNCTION se_control_v1.organization_horse_capacity(requested_org uuid) RETURNS jsonb
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$ DECLARE used_count bigint; result jsonb; BEGIN
 IF se_control_v1.organization_role(requested_org) IS NULL OR se_control_v1.organization_role(requested_org) NOT IN('control_admin','org_admin') THEN
  RAISE EXCEPTION 'ORG_MANAGER_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT count(*) INTO used_count FROM se_control_v1.organization_horses WHERE organization_id=requested_org;
 SELECT jsonb_build_object('horse_limit',horse_limit,'used',used_count,'remaining',greatest(0,horse_limit-used_count),'revision',revision,
  'enabled',EXISTS(SELECT 1 FROM se_control_v1.deployment_guard WHERE id=1 AND environment IN('demo','staging') AND people_enabled))
 INTO result FROM se_control_v1.organization_horse_limits WHERE organization_id=requested_org;
 RETURN result;
 END $$;
CREATE FUNCTION se_control_v1.set_organization_horse_limit(requested_org uuid, requested_limit integer, expected_revision integer) RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$ DECLARE used_count bigint; updated_limit integer; BEGIN
 IF NOT se_control_v1.control_admin_active() THEN RAISE EXCEPTION 'CONTROL_ADMIN_REQUIRED' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM se_control_v1.organizations WHERE id=requested_org AND state='active' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_ORGANIZATION' USING ERRCODE='22023'; END IF;
 IF requested_limit IS NULL OR requested_limit NOT BETWEEN 0 AND 100000 OR expected_revision IS NULL OR expected_revision<1 THEN
  RAISE EXCEPTION 'INVALID_LIMIT' USING ERRCODE='22023'; END IF;
 SELECT count(*) INTO used_count FROM se_control_v1.organization_horses WHERE organization_id=requested_org;
 IF requested_limit<used_count THEN RAISE EXCEPTION 'CONTROL_LIMIT_BELOW_USAGE' USING ERRCODE='PSE05'; END IF;
 UPDATE se_control_v1.organization_horse_limits SET horse_limit=requested_limit,revision=revision+1
 WHERE organization_id=requested_org AND revision=expected_revision RETURNING horse_limit INTO updated_limit;
 IF NOT FOUND THEN RAISE EXCEPTION 'CONTROL_STALE_REVISION' USING ERRCODE='PSE04'; END IF;
 RETURN se_control_v1.organization_horse_capacity(requested_org)||jsonb_build_object('id',requested_org);
 END $$;

-- Only organizational managers can search approved owners. No global email/owner enumeration.
CREATE FUNCTION se_control_v1.organization_owner_page(requested_org uuid, requested_site uuid, after_id uuid, page_size integer, search_text text) RETURNS jsonb
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$ BEGIN
 IF se_control_v1.organization_role(requested_org) IS NULL OR se_control_v1.organization_role(requested_org) NOT IN('control_admin','org_admin') THEN
  RAISE EXCEPTION 'ORG_MANAGER_REQUIRED' USING ERRCODE='42501'; END IF;
 IF requested_site IS NULL OR NOT EXISTS(SELECT 1 FROM se_control_v1.organization_sites WHERE organization_id=requested_org AND site_id=requested_site) THEN
  RAISE EXCEPTION 'INVALID_SITE' USING ERRCODE='22023'; END IF;
 IF page_size IS NULL OR page_size NOT BETWEEN 1 AND 100 OR search_text IS NULL OR length(search_text)>120 THEN
  RAISE EXCEPTION 'INVALID_PAGE' USING ERRCODE='22023'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(to_jsonb(page) ORDER BY id),'[]'::jsonb) FROM (
  SELECT p.id,p.full_name FROM public.user_profiles p JOIN se_control_v1.organization_owners m ON m.user_id=p.id
  WHERE m.organization_id=requested_org AND m.active AND p.is_active=true AND (m.site_id IS NULL OR m.site_id=requested_site)
   AND (after_id IS NULL OR p.id>after_id) AND strpos(lower(p.full_name),lower(search_text))>0 ORDER BY p.id LIMIT page_size) page);
 END $$;

CREATE FUNCTION se_control_v1.create_organization_horse(requested_org uuid, requested_site uuid, new_horse uuid, horse_name text, requested_stall text, requested_owner uuid) RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$ DECLARE actor uuid; role_name text; member_site uuid; owner_site uuid; result jsonb; BEGIN
 actor := nullif(current_setting('se_control.actor_id',true),'')::uuid;
 PERFORM 1 FROM se_control_v1.organizations WHERE id=requested_org FOR UPDATE;
 role_name := se_control_v1.organization_role(requested_org);
 IF role_name IS NULL OR role_name NOT IN('control_admin','org_admin') THEN RAISE EXCEPTION 'ORG_MANAGER_REQUIRED' USING ERRCODE='42501'; END IF;
 IF role_name<>'control_admin' THEN
  SELECT role,site_id INTO role_name,member_site FROM se_control_v1.organization_memberships
  WHERE organization_id=requested_org AND user_id=actor AND active FOR SHARE;
  IF NOT FOUND OR role_name<>'org_admin' OR member_site IS NOT NULL THEN RAISE EXCEPTION 'ORG_MANAGER_REQUIRED' USING ERRCODE='42501'; END IF;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM se_control_v1.deployment_guard WHERE id=1 AND environment IN('demo','staging') AND people_enabled) THEN
  RAISE EXCEPTION 'CONTROL_PEOPLE_DISABLED' USING ERRCODE='PSE03'; END IF;
 IF requested_site IS NULL OR NOT EXISTS(SELECT 1 FROM se_control_v1.organization_sites WHERE organization_id=requested_org AND site_id=requested_site) THEN
  RAISE EXCEPTION 'INVALID_SITE' USING ERRCODE='22023'; END IF;
 SELECT site_id INTO owner_site FROM se_control_v1.organization_owners
  WHERE organization_id=requested_org AND user_id=requested_owner AND active FOR SHARE;
 IF NOT FOUND OR (owner_site IS NOT NULL AND owner_site<>requested_site) THEN RAISE EXCEPTION 'CONTROL_OWNER_NOT_AUTHORIZED' USING ERRCODE='PSE02'; END IF;
 PERFORM 1 FROM public.user_profiles WHERE id=requested_owner AND is_active=true FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'CONTROL_OWNER_NOT_AUTHORIZED' USING ERRCODE='PSE02'; END IF;
 IF horse_name IS NULL OR requested_stall IS NULL OR length(btrim(horse_name)) NOT BETWEEN 1 AND 120
  OR length(btrim(requested_stall)) NOT BETWEEN 1 AND 120 OR horse_name~'[[:cntrl:]]' OR requested_stall~'[[:cntrl:]]' THEN
  RAISE EXCEPTION 'INVALID_HORSE_FIELDS' USING ERRCODE='22023'; END IF;
 INSERT INTO public.horses(id,name,stall_number,owner_id,is_active,photo_backend)
  VALUES(new_horse,btrim(horse_name),btrim(requested_stall),requested_owner,true,'supabase');
 INSERT INTO se_control_v1.organization_horses(horse_id,organization_id,site_id) VALUES(new_horse,requested_org,requested_site);
 INSERT INTO se_control_v1.organization_events(id,organization_id,site_id,actor_id,operation,entity_id,details)
  VALUES(gen_random_uuid(),requested_org,requested_site,actor,'horse.create',new_horse,jsonb_build_object('name',btrim(horse_name)));
 INSERT INTO se_control_v1.audit(id,actor_id,operation,entity_id,details)
  VALUES(gen_random_uuid(),actor,'organization.horse.create',new_horse,jsonb_build_object('organization_id',requested_org,'site_id',requested_site,'owner_id',requested_owner));
 SELECT jsonb_build_object('id',id,'name',name,'stall_number',stall_number,'owner_id',owner_id,'site_id',requested_site,'organization_id',requested_org,
  'is_active',is_active,'photo_backend',photo_backend,'installation_required',true) INTO result FROM public.horses WHERE id=new_horse;
 RETURN result;
 END $$;
REVOKE ALL ON FUNCTION se_control_v1.organization_horse_capacity(uuid),se_control_v1.set_organization_horse_limit(uuid,integer,integer),
 se_control_v1.organization_owner_page(uuid,uuid,uuid,integer,text),se_control_v1.create_organization_horse(uuid,uuid,uuid,text,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION se_control_v1.organization_horse_capacity(uuid),se_control_v1.set_organization_horse_limit(uuid,integer,integer),
 se_control_v1.organization_owner_page(uuid,uuid,uuid,integer,text),se_control_v1.create_organization_horse(uuid,uuid,uuid,text,text,uuid) TO se_control_runtime;
