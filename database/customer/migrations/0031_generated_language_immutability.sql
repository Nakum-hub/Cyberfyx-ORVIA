-- Repairs an interaction between 0030's generated column and the configuration
-- immutability trigger that 0004 and 0005 built.
--
-- The trigger decides a version is immutable by comparing the whole row, minus
-- the two fields a publication is allowed to move. In a BEFORE UPDATE trigger a
-- STORED generated column is not yet computed, so NEW.language is NULL while
-- OLD.language holds its value. Publishing a notice therefore looked like an
-- attempt to blank the language, and every publication after 0030 was refused
-- with "Configuration version is immutable".
--
-- The fix is to leave `language` out of the comparison, and it costs nothing:
-- `language` is generated from `document`, and `document` is still compared. A
-- change to the language is a change to the document, which the trigger still
-- catches. Comparing a derived value separately from the value it derives from
-- can only ever add a false positive.

CREATE OR REPLACE FUNCTION app.immutable_configuration() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (to_jsonb(NEW)-'status'-'published_at'-'language') IS DISTINCT FROM (to_jsonb(OLD)-'status'-'published_at'-'language') THEN
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
