-- Installation kind (revision 1.5 addendum, docs/engineering/V1_BASELINE_REV_1_5_AUDIT_EXCHANGE.md).
--
-- One ORVIA build installs two kinds. A customer database can only ever be a
-- CUSTOMER_INSTALLATION: the vendor's VENDOR_SERVICE installation runs on a
-- separate vendor database (database/vendor/migrations) that refuses this
-- schema. The record is written once here and can never be updated or deleted,
-- so the kind cannot be changed from the interface; a different kind needs a
-- fresh installation. The application reads it through app.installation_kind()
-- and refuses to serve if its own configuration disagrees.
CREATE TABLE app.installation_identity (
  singleton smallint PRIMARY KEY DEFAULT 1 CHECK (singleton = 1),
  kind text NOT NULL CHECK (kind = 'CUSTOMER_INSTALLATION'),
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp());
INSERT INTO app.installation_identity(kind) VALUES ('CUSTOMER_INSTALLATION');
REVOKE ALL ON app.installation_identity FROM PUBLIC;

CREATE FUNCTION app.installation_identity_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'installation_kind_immutable' USING ERRCODE = '42501'; END $$;
CREATE TRIGGER installation_identity_immutable BEFORE UPDATE OR DELETE ON app.installation_identity
  FOR EACH ROW EXECUTE FUNCTION app.installation_identity_immutable();
CREATE TRIGGER installation_identity_no_truncate BEFORE TRUNCATE ON app.installation_identity
  FOR EACH STATEMENT EXECUTE FUNCTION app.installation_identity_immutable();

CREATE FUNCTION app.installation_kind() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, app AS $$
  SELECT kind FROM app.installation_identity WHERE singleton = 1 $$;
REVOKE ALL ON FUNCTION app.installation_kind(), app.installation_identity_immutable() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.installation_kind() TO orvia_app;
