CREATE OR REPLACE FUNCTION app.immutable_configuration() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (to_jsonb(NEW)-'status'-'published_at') IS DISTINCT FROM (to_jsonb(OLD)-'status'-'published_at') THEN
  RAISE EXCEPTION 'Configuration version is immutable' USING ERRCODE='23514';
 END IF;
 -- Separate PL/pgSQL branches: a notice record has no status field.
 IF TG_TABLE_NAME='policy_versions' THEN
  IF NOT(OLD.status='DRAFT' AND NEW.status='PUBLISHED' AND OLD.published_at IS NULL AND NEW.published_at IS NOT NULL
    OR OLD.status='PUBLISHED' AND NEW.status='SUPERSEDED' AND OLD.published_at=NEW.published_at) THEN
   RAISE EXCEPTION 'Invalid publication transition' USING ERRCODE='23514';
  END IF;
 ELSIF TG_TABLE_NAME='purpose_versions' THEN
  IF NOT(OLD.status='DRAFT' AND NEW.status='PUBLISHED') THEN
   RAISE EXCEPTION 'Invalid purpose transition' USING ERRCODE='23514';
  END IF;
 ELSIF TG_TABLE_NAME='notice_versions' THEN
  IF NOT(OLD.published_at IS NULL AND NEW.published_at IS NOT NULL) THEN
   RAISE EXCEPTION 'Published notice is immutable' USING ERRCODE='23514';
  END IF;
 END IF;
 RETURN NEW;
END $$;
